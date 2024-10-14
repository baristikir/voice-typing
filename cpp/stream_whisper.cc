#include "stream_whisper.h"
#include "whisper.h"
#include <algorithm>
#include <stdio.h>

#define DR_WAV_IMPLEMENTATION
#include "dr_wav.h"

#include <atomic>
#include <cmath>
#include <cstdio>
#include <mutex>
#include <string>
#include <thread>
#include <vector>

/* Source from
 * https://github.com/ggerganov/whisper.cpp/blob/22fcd5fd110ba1ff592b4e23013d870831756259/examples/common.cpp#L750C1-L750C5
 */
void high_pass_filter(std::vector<float> &data, float cutoff,
                      float sample_rate) {
  const float rc = 1.0f / (2.0f * M_PI * cutoff);
  const float dt = 1.0f / sample_rate;
  const float alpha = dt / (rc + dt);

  float y = data[0];

  for (size_t i = 1; i < data.size(); i++) {
    y = alpha * (y + data[i] - data[i - 1]);
    data[i] = y;
  }
}

/* Source from
 * https://github.com/ggerganov/whisper.cpp/blob/22fcd5fd110ba1ff592b4e23013d870831756259/examples/common.cpp#L763
 */
/* Simple implementation for Voice Activity Detection and mostly used for
 * detecting when a speech has ended. */
bool vad_simple(std::vector<float> &pcmf32, int sample_rate, int last_ms,
                float vad_thold, float freq_thold, bool verbose) {
  const int n_samples = pcmf32.size();
  const int n_samples_last = (sample_rate * last_ms) / 1000;

  if (n_samples_last >= n_samples) {
    // not enough samples - assume no speech
    return false;
  }

  if (freq_thold > 0.0f) {
    high_pass_filter(pcmf32, freq_thold, sample_rate);
  }

  float energy_all = 0.0f;
  float energy_last = 0.0f;

  for (int i = 0; i < n_samples; i++) {
    energy_all += fabsf(pcmf32[i]);

    if (i >= n_samples - n_samples_last) {
      energy_last += fabsf(pcmf32[i]);
    }
  }

  energy_all /= n_samples;
  energy_last /= n_samples_last;

  if (verbose) {
    fprintf(
        stderr,
        "%s: energy_all: %f, energy_last: %f, vad_thold: %f, freq_thold: %f\n",
        __func__, energy_all, energy_last, vad_thold, freq_thold);
  }

  if ((energy_all < 0.0001f && energy_last < 0.0001f) ||
      energy_last > vad_thold * energy_all) {
    return false;
  }

  return true;
}

// Extracting audio data from a Waveform audio file (.wav)
// fname - File path
// pcmf32 - Audio buffer
// ref: https://github.com/mackron/dr_libs/blob/master/dr_wav.h
bool read_wav(const std::string &fpath, std::vector<float> &pcmf32) {
  drwav wav;
  std::vector<uint8_t> wav_data;

  if (drwav_init_file(&wav, fpath.c_str(), nullptr) == false) {
    if (drwav_init_memory(&wav, wav_data.data(), wav_data.size(), nullptr) ==
        false) {
      fprintf(stderr, "error: failed to read wav data as wav \n");
      return false;
    }

    fprintf(stderr, "error: failed to open '%s' as WAV file\n", fpath.c_str());
    return false;
  }
  // Check for audio channels. Whisper.cpp limited to mono and stereo audio
  // channels.
  if (wav.channels != 1 && wav.channels != 2) {
    fprintf(stderr, "%s: WAV file '%s' must be mono or stereo\n", __func__,
            fpath.c_str());
    drwav_uninit(&wav);
    return false;
  }
  // Whisper performs best on 16kHz sample rate.
  if (wav.sampleRate != WHISPER_SAMPLE_RATE) {
    fprintf(stderr, "%s: WAV file '%s' must be %i kHz\n", __func__,
            fpath.c_str(), WHISPER_SAMPLE_RATE / 1000);
    drwav_uninit(&wav);
    return false;
  }

  if (wav.bitsPerSample != 16) {
    fprintf(stderr, "%s: WAV file '%s' must be 16-bit\n", __func__,
            fpath.c_str());
    drwav_uninit(&wav);
    return false;
  }

  const uint64_t n =
      wav_data.empty()
          ? wav.totalPCMFrameCount
          : wav_data.size() / (wav.channels * wav.bitsPerSample / 8);

  std::vector<int16_t> pcm16;
  pcm16.resize(n * wav.channels);
  drwav_read_pcm_frames_s16(&wav, n, pcm16.data());
  drwav_uninit(&wav);

  // convert to mono, float
  pcmf32.resize(n);
  if (wav.channels == 1) {
    for (uint64_t i = 0; i < n; i++) {
      pcmf32[i] = float(pcm16[i]) / 32768.0f;
    }
  } else {
    for (uint64_t i = 0; i < n; i++) {
      pcmf32[i] = float(pcm16[2 * i] + pcm16[2 * i + 1]) / 65536.0f;
    }
  }

  return true;
}

SpeechToTextEngine::SpeechToTextEngine(const std::string &path_model,
                                       const char *language,
                                       const int n_threads,
                                       const int trigger_ms,
                                       const bool is_word_level_mode = false)
    : is_running(false), is_clear_audio(false),
      is_word_level_mode(is_word_level_mode) {
  fprintf(stdout, "path_model: %s\n", path_model.c_str());
  fprintf(stdout, "language: %s\n", language);
  fprintf(stdout, "n_threads: %d\n", n_threads);
  fprintf(stdout, "trigger_ms: %d\n", trigger_ms);

  model_config.language = language;
  model_config.n_threads = n_threads;
  stream_config.trigger_ms = trigger_ms;
  // Load Whisper model from local filesystem
  ctx = whisper_init_from_file(path_model.c_str());
}

SpeechToTextEngine::~SpeechToTextEngine() {
  is_running = false;
  if (worker.joinable())
    worker.join();
  whisper_free(ctx);
}

// Initiate the speech to text processing
void SpeechToTextEngine::Start() {
  if (!is_running) {
    // For continuous processing we are running the speech to text process in a
    // separate thread.
    worker = std::thread(&SpeechToTextEngine::Process, this);
    is_running = true;
    t_last_iter = std::chrono::high_resolution_clock::now();
  }
}

// In order to stop the background process of transcribing
void SpeechToTextEngine::Stop() {
  is_running = false;
  if (worker.joinable())
    worker.join();
}

// Utility to clear current queued audio buffer. For controlling purposes like
// stopping the audio recording in the client.
void SpeechToTextEngine::ClearAudioData() {
  std::lock_guard<std::mutex> lock(s_mutex);
  is_clear_audio = true;
  s_queued_pcmf32.clear();
}

// Receives audio data (in PCM f32 format) from render process and inserts data
// in a queue
void SpeechToTextEngine::AddAudioData(const std::vector<float> &data) {
  std::lock_guard<std::mutex> lock(s_mutex);
  s_queued_pcmf32.insert(s_queued_pcmf32.end(), data.begin(), data.end());
}

// Recent transcribed text will be shared from the thread via shared array
std::vector<transcribed_segment> SpeechToTextEngine::GetTranscribedText() {
  std::vector<transcribed_segment> transcribed;
  std::lock_guard<std::mutex> lock(s_mutex);
  transcribed = std::move(s_transcribed_segments);
  s_transcribed_segments.clear();
  return transcribed;
}

// Experimental, do not use in real-time
// wlt stands for word-level-timestamp
// Custom parameters for whisper inference configuration:
// struct whisper_wlt_params {
//   int32_t n_threads = std::min(4, (int32_t)std::thread::hardware_concurrency());
//   int32_t max_tokens = 32;
//   int32_t audio_ctx = 512;

//   bool translate = false;
//   bool no_context = true;
//   bool no_fallback = false;
//   bool no_timestamps = false;
//   bool use_gpy = true;
//   bool flash_attn = false;

//   bool split_on_word = true;
//   bool token_timestamps = true;
//   int max_len = 1;
// };

void SpeechToTextEngine::Process() {
  struct whisper_full_params wparams = whisper_full_default_params(
      whisper_sampling_strategy::WHISPER_SAMPLING_GREEDY);
  // Threads to use for whisper, use of 4 threads are showing great results
  // when using smaller models and especially on CPU inference. Increasing the
  // number of threads above 8 will not result in greater performance/quality.
  wparams.n_threads = model_config.n_threads;
  // wparams.n_threads = std::min(4, (int32_t)
  // std::thread::hardware_concurrency()); Whisper allows to inject initial
  // prompts into the decoder. These are constructed by tokens, or text. In
  // terms of real time transcription it seems to be a performance bottleneck,
  // so we disable it by default.
  wparams.no_context = true;
  // Modifies the output sequence of whisper.cpp which results in improvements
  // for streaming use cases.
  wparams.single_segment = true;
  // Disabling whisper.cpp logging
  wparams.print_progress = false;
  wparams.print_realtime = false;
  wparams.print_special = false;
  wparams.print_timestamps = false;
  // Maximum Token Length for decoding process
  wparams.max_tokens = 64;
  // Model language from client settings
  wparams.language = model_config.language;
  // Disabling auto detection of spoken language. Instead we are using
  // preconfigurable language settings from the client.
  wparams.detect_language = false;
  // Disabling translation
  wparams.translate = false;
  // Reducing the default audio context, max defined as 1500. This will result
  // in 1/2 audio length which was 30s chunks, so now its 15s. Longer context is
  // not needed in real time application and boosts model performance by 2x.
  wparams.audio_ctx = 768;
  wparams.temperature_inc = 0.0f;
  // When sentence dictation mode is activated, we need to modify whisper model
  // parameters in order to receive word level timestamps.
  // wparams.split_on_word = is_word_level_mode;
  // wparams.token_timestamps = is_word_level_mode;
  // wparams.max_len = is_word_level_mode == true ? 1 : 0;

  fprintf(stdout, "trigger_ms: %d", stream_config.trigger_ms);
  // Audio data gets piped in and this defines the minimum treshold of audio
  // length needed to be processed with the whisper model
  const int trigger_ms = stream_config.trigger_ms;
  const int n_samples_trigger = (trigger_ms / 1000.0) * WHISPER_SAMPLE_RATE;
  // This defines the maximum treshold of the audio length.
  const int iter_threshold_ms = trigger_ms * 35;
  const int n_samples_iter_threshold =
      (iter_threshold_ms / 1000.0) * WHISPER_SAMPLE_RATE;

  // VAD sliding window of audio length from 3s
  const int vad_window_s = 3;
  const int n_samples_vad_window = WHISPER_SAMPLE_RATE * vad_window_s;
  // In VAD, compare the energy of the last 500ms
  const int vad_last_ms = 500;
  // Keep the last 0.3s of an iteration to the next one for better
  // transcription at begin/end.
  const int n_samples_keep_iter = WHISPER_SAMPLE_RATE * 0.3;
  const float vad_thold = 0.3f;
  const float freq_thold = 200.0f;

  // Accumulated audio buffer (PCM-F32)
  std::vector<float> pcmf32;

  // Main Loop for running the inference.
  while (is_running) {
    {
      std::lock_guard<std::mutex> lock(s_mutex);
      // Shared condition with the client over node-addon-api. Mainly used for
      // stopping the recording and clearing the left over state from the buffer
      // and text segments.
      if (is_clear_audio) {
        pcmf32.clear();
        s_transcribed_segments.clear();
        is_clear_audio = false;
      }
    }

    {
      std::unique_lock<std::mutex> lock(s_mutex);
      // When there is not enough audio data availabe, skip whisper inference.
      if (s_queued_pcmf32.size() < n_samples_trigger) {
        lock.unlock();
        std::this_thread::sleep_for(std::chrono::milliseconds(100));
        continue;
      }
    }

    {
      std::lock_guard<std::mutex> lock(s_mutex);
      // Copying from the queued shared buffer to local buffer which will be
      // processed by whisper.
      pcmf32.insert(pcmf32.end(), s_queued_pcmf32.begin(),
                    s_queued_pcmf32.end());
      // After copy we clear the shared buffer.
      s_queued_pcmf32.clear();
    }

    {
      // Contains the current transcription result
      transcribed_segment segment;
      // Running whisper inference on copied audio buffer with preconfigured
      // model parameters. This will create the transcription and store it in
      // whisper context.
      int ret = whisper_full(ctx, wparams, pcmf32.data(), pcmf32.size());
      if (ret != 0) {
        fprintf(stderr, "Failed to process audio, returned %d\n", ret);
        continue;
      }
      // Extracting text data from the segments of the inference process.
      const int segments_size = whisper_full_n_segments(ctx);
      for (int segment_index = 0; segment_index < segments_size;
           ++segment_index) {
        // Get text information of segment
        const char *segment_text =
            whisper_full_get_segment_text(ctx, segment_index);
        // for word level timestamps:
        // const int64_t word_start_ms =
        //     is_word_level_mode == true
        //         ? whisper_full_get_segment_t0(ctx, segment_index)
        //         : 0;
        // const int64_t word_end_ms =
        //     is_word_level_mode == true
        //         ? whisper_full_get_segment_t1(ctx, segment_index)
        //         : 0;

        segment.text += segment_text;
        // segment.start_time_ms = word_start_ms;
        // segment.end_time_ms = word_end_ms;
      }

      bool speech_has_end = false;

      // Check for Voice-Activity-Detection when enough audio was accumulated.
      // This is used to check if the speech has ended and ensures a smoother
      // transition to the next iteration.
      // ref:
      // https://github.com/ggerganov/whisper.cpp/blob/ccc2547210e09e3a1785817383ab770389bb442b/examples/stream/stream.cpp#L288
      if ((int)pcmf32.size() >= n_samples_vad_window) {
        std::vector<float> pcmf32_window(pcmf32.end() - n_samples_vad_window,
                                         pcmf32.end());
        speech_has_end = vad_simple(pcmf32_window, WHISPER_SAMPLE_RATE,
                                    vad_last_ms, vad_thold, freq_thold, false);
      }

      // Clearing audio buffer when:
      // 1. Buffer size exceeds the iteration threshold.
      // 2. End of speech was detected.
      if (pcmf32.size() > n_samples_iter_threshold || speech_has_end) {
        const auto t_now = std::chrono::high_resolution_clock::now();
        const auto t_diff =
            std::chrono::duration_cast<std::chrono::milliseconds>(t_now -
                                                                  t_last_iter)
                .count();
        printf("iter took: %ldms\n", t_diff);
        t_last_iter = t_now;
        // Shared variable with the client which holds the processing state of
        // the segment.
        segment.is_partial = false;
        std::vector<float> last(pcmf32.end() - n_samples_keep_iter,
                                pcmf32.end());
        // Copy the recent 0.5s into the cleared buffer for a better transition
        pcmf32 = std::move(last);
      } else {
        segment.is_partial = true;
      }

      std::lock_guard<std::mutex> lock(s_mutex);
      // Moving the segment to a shared array with client.
      s_transcribed_segments.insert(s_transcribed_segments.end(),
                                    std::move(segment));
    }
  }
}

// This function reads a WAV file and transcribe it with the whisper model.
std::vector<transcribed_segment>
SpeechToTextEngine::TranscribeFileInput(const std::string &file_path) {
  if (file_path.empty()) {
    fprintf(stdout, "[ stream_whisper ] Error: no input files specified.\n");
  }

  struct whisper_full_params wparams = whisper_full_default_params(
      whisper_sampling_strategy::WHISPER_SAMPLING_GREEDY);

  // Whisper params configuration
  wparams.n_threads = std::max(4, model_config.n_threads);
  // Disable whisper.cpp logging
  wparams.print_progress = false;
  wparams.print_realtime = false;
  wparams.print_special = false;
  wparams.print_timestamps = false;
  // Load model language
  wparams.language = model_config.language;
  // Disabling language detection
  wparams.detect_language = false;
  // Disabling translation
  wparams.translate = false;
  // Audio buffer accumulated from file input
  std::vector<float> pcmf32;
  // Transcribed segments from the whisper model
  std::vector<transcribed_segment> segments;

  // For WAV files we are using a library to read its contents and extract the
  // audio buffer
  if (!read_wav(file_path, pcmf32)) {
    fprintf(stdout, "error: Reading WAV file failed.\n");
    return segments;
  }

  // Running whisper model on accumulated audio data
  int ret = whisper_full(ctx, wparams, pcmf32.data(), pcmf32.size());
  if (ret != 0) {
    fprintf(stderr, "Failed to process audio, returned %d\n", ret);
    return segments;
  }

  // Extracting text contents from transcribed segments
  const int n_segments = whisper_full_n_segments(ctx);
  for (int segment_index = 0; segment_index < n_segments; ++segment_index) {
    transcribed_segment segment;
    const char *segment_text =
        whisper_full_get_segment_text(ctx, segment_index);

    segment.text += segment_text;
    // We do not provide word level editing on file uploads. The whole file is
    // processed by default whisper settings for transcription.
    // segment.start_time_ms = 0;
    // segment.end_time_ms = 0;
    segment.is_partial = false;
    segments.push_back(segment);
  }

  return segments;
}
