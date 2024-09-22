#include "stream_whisper.h"
#include "whisper.h"
#include <algorithm>

#define DR_WAV_IMPLEMENTATION
#include "dr_wav.h"

#include <atomic>
#include <cmath>
#include <cstdio>
#include <mutex>
#include <string>
#include <thread>
#include <vector>

/* Source from https://github.com/ggerganov/whisper.cpp/blob/22fcd5fd110ba1ff592b4e23013d870831756259/examples/common.cpp#L750C1-L750C5 */
void high_pass_filter(std::vector<float>& data, float cutoff, float sample_rate)
{
  const float rc = 1.0f / (2.0f * M_PI * cutoff);
  const float dt = 1.0f / sample_rate;
  const float alpha = dt / (rc + dt);

  float y = data[0];

  for (size_t i = 1; i < data.size(); i++) {
    y = alpha * (y + data[i] - data[i - 1]);
    data[i] = y;
  }
}

/* Source from https://github.com/ggerganov/whisper.cpp/blob/22fcd5fd110ba1ff592b4e23013d870831756259/examples/common.cpp#L763 */
/* Simple implementation for Voice Activity Detection and mostly used for detecting when a speech has ended. */
bool vad_simple(std::vector<float>& pcmf32, int sample_rate, int last_ms, float vad_thold, float freq_thold, bool verbose)
{
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
    fprintf(stderr, "%s: energy_all: %f, energy_last: %f, vad_thold: %f, freq_thold: %f\n", __func__, energy_all, energy_last, vad_thold, freq_thold);
  }

  if ((energy_all < 0.0001f && energy_last < 0.0001f) || energy_last > vad_thold * energy_all) {
    return false;
  }

  return true;
}

bool read_wav(const std::string & fname, std::vector<float>& pcmf32) {
    drwav wav;
    std::vector<uint8_t> wav_data; // used for pipe input from stdin or ffmpeg decoding output

    if (drwav_init_file(&wav, fname.c_str(), nullptr) == false) {
        if (drwav_init_memory(&wav, wav_data.data(), wav_data.size(), nullptr) == false) {
            fprintf(stderr, "error: failed to read wav data as wav \n");
            return false;
        }
        
        fprintf(stderr, "error: failed to open '%s' as WAV file\n", fname.c_str());
        return false;
    }

    if (wav.channels != 1 && wav.channels != 2) {
        fprintf(stderr, "%s: WAV file '%s' must be mono or stereo\n", __func__, fname.c_str());
        drwav_uninit(&wav);
        return false;
    }

    if (wav.sampleRate != WHISPER_SAMPLE_RATE) {
        fprintf(stderr, "%s: WAV file '%s' must be %i kHz\n", __func__, fname.c_str(), WHISPER_SAMPLE_RATE/1000);
        drwav_uninit(&wav);
        return false;
    }

    if (wav.bitsPerSample != 16) {
        fprintf(stderr, "%s: WAV file '%s' must be 16-bit\n", __func__, fname.c_str());
        drwav_uninit(&wav);
        return false;
    }

    const uint64_t n = wav_data.empty() ? wav.totalPCMFrameCount : wav_data.size()/(wav.channels*wav.bitsPerSample/8);

    std::vector<int16_t> pcm16;
    pcm16.resize(n*wav.channels);
    drwav_read_pcm_frames_s16(&wav, n, pcm16.data());
    drwav_uninit(&wav);

    // convert to mono, float
    pcmf32.resize(n);
    if (wav.channels == 1) {
        for (uint64_t i = 0; i < n; i++) {
            pcmf32[i] = float(pcm16[i])/32768.0f;
        }
    } else {
        for (uint64_t i = 0; i < n; i++) {
            pcmf32[i] = float(pcm16[2*i] + pcm16[2*i + 1])/65536.0f;
        }
    }

    return true;
}


RealtimeSpeechToTextWhisper::RealtimeSpeechToTextWhisper(const std::string& path_model, const char* language)
: is_running(false), is_clear_audio(false), m_language(language)
{
  fprintf(stdout, "path_model: %s\n", path_model.c_str());
  fprintf(stdout, "Hardware concurrency: %u\n", std::thread::hardware_concurrency());
  ctx = whisper_init_from_file(path_model.c_str());
}

void RealtimeSpeechToTextWhisper::Start()
{
  if (!is_running) {
    worker = std::thread(&RealtimeSpeechToTextWhisper::Process, this);
    is_running = true;
    t_last_iter = std::chrono::high_resolution_clock::now();
  }
}

void RealtimeSpeechToTextWhisper::Stop()
{
  is_running = false;
  if (worker.joinable())
    worker.join();
}

void RealtimeSpeechToTextWhisper::ClearAudioData()
{
  std::lock_guard<std::mutex> lock(s_mutex);
  
  is_clear_audio = true;
  s_queued_pcmf32.clear();
}

RealtimeSpeechToTextWhisper::~RealtimeSpeechToTextWhisper()
{
  is_running = false;
  if (worker.joinable())
    worker.join();
  whisper_free(ctx);
}

// Receives audio data in PCM f32 format from render process
void RealtimeSpeechToTextWhisper::AddAudioData(const std::vector<float>& data)
{
  std::lock_guard<std::mutex> lock(s_mutex);
  s_queued_pcmf32.insert(s_queued_pcmf32.end(), data.begin(), data.end());
}

// Get newly transcribed text.
//
// ---
// Draft:
// Extend this with more information about each segment from the text, including
// timestamp informations and confidence scores.
//
// Example data structure: 
// struct SegmentBounds {
//   std::size_t char_start;
//   std::size_t char_end;
//   float time_start;
//   float time_end;
//   float confidence;
// };
//
// How to get segment details from the whisper state:
// for i -> whisper_full_n_segments(ctx)
//  for j -> whisper_full_n_tokens(ctx, i) 
//    const char * text = whisper_full_get_token_text(ctx, i, j);
//    const float  prob = whisper_full_get_token_p(ctx, i, j);
// Draft end ---
std::vector<transcribed_segment> RealtimeSpeechToTextWhisper::GetTranscribedText()
{
  std::vector<transcribed_segment> transcribed;
  std::lock_guard<std::mutex> lock(s_mutex);
  transcribed = std::move(s_transcribed_segments);
  s_transcribed_segments.clear();
  return transcribed;
}

void RealtimeSpeechToTextWhisper::Process()
{
  struct whisper_full_params wparams = whisper_full_default_params(whisper_sampling_strategy::WHISPER_SAMPLING_GREEDY);
  wparams.n_threads = 8;
  wparams.no_context = true;
  wparams.single_segment = true;
  wparams.print_progress = false;
  wparams.print_realtime = false;
  wparams.print_special = false;
  wparams.print_timestamps = false;
  wparams.max_tokens = 64;
  fprintf(stdout, "m_language: %s\n", m_language);
  wparams.language = m_language;
  wparams.detect_language = false;
  wparams.translate = false;
  wparams.audio_ctx = 768;
  wparams.temperature_inc = 0.0f;

  /* When more than this amount of audio received, run an iteration. */
  const int trigger_ms = 400;
  const int n_samples_trigger = (trigger_ms / 1000.0) * WHISPER_SAMPLE_RATE;
  /**
   * When more than this amount of audio accumulates in the audio buffer,
   * force finalize current audio context and clear the buffer. Note that
   * VAD may finalize an iteration earlier.
   */
  // This is recommended to be smaller than the time wparams.audio_ctx
  // represents so an iteration can fit in one chunk.
  const int iter_threshold_ms = trigger_ms * 35;
  const int n_samples_iter_threshold = (iter_threshold_ms / 1000.0) * WHISPER_SAMPLE_RATE;

  /**
   * ### Reminders
   *
   * - Note that whisper designed to process audio in 30-second chunks, and
   *   the execution time of processing smaller chunks may not be shorter.
   * - The design of trigger and threshold allows inputing audio data at
   *   arbitrary rates with zero config. Inspired by Assembly.ai's
   *   real-time transcription API
   *   (https://github.com/misraturp/Real-time-transcription-from-microphone/blob/main/speech_recognition.py)
   */

  /* VAD parameters */
  // The most recent 3s.
  const int vad_window_s = 3;
  const int n_samples_vad_window = WHISPER_SAMPLE_RATE * vad_window_s;
  // In VAD, compare the energy of the last 500ms to that of the total 3s.
  const int vad_last_ms = 500;
  // Keep the last 0.3s of an iteration to the next one for better
  // transcription at begin/end.
  const int n_samples_keep_iter = WHISPER_SAMPLE_RATE * 0.3;
  const float vad_thold = 0.3f;
  const float freq_thold = 200.0f;

  /* Audio buffer */
  std::vector<float> pcmf32;

  /* Processing loop */
  while (is_running) {
    {
      std::lock_guard<std::mutex> lock(s_mutex);    
      if (is_clear_audio) {
        pcmf32.clear();
        is_clear_audio = false;
      }
    }

    {
      std::unique_lock<std::mutex> lock(s_mutex);
      if (s_queued_pcmf32.size() < n_samples_trigger) {
        lock.unlock();
        std::this_thread::sleep_for(std::chrono::milliseconds(10));
        continue;
      }
    }

    {
      std::lock_guard<std::mutex> lock(s_mutex);
      if (s_queued_pcmf32.size() > 2 * n_samples_iter_threshold) {
        fprintf(stderr, "\n\n%s: WARNING: too much audio is going to be processed, result may not come out in real time\n\n", __func__);
      }
    }

    {
      std::lock_guard<std::mutex> lock(s_mutex);
      pcmf32.insert(pcmf32.end(), s_queued_pcmf32.begin(), s_queued_pcmf32.end());
      s_queued_pcmf32.clear();
    }

    {
      int ret = whisper_full(ctx, wparams, pcmf32.data(), pcmf32.size());
      if (ret != 0) {
        fprintf(stderr, "Failed to process audio, returned %d\n", ret);
        continue;
      }
    }

    {
      transcribed_segment segment;

      const int n_segments = whisper_full_n_segments(ctx);
      for (int i = 0; i < n_segments; ++i) {
        const char* text = whisper_full_get_segment_text(ctx, i);
        segment.text += text;
      }

      bool speech_has_end = false;

      /* Need enough accumulated audio to do VAD. */
      if ((int)pcmf32.size() >= n_samples_vad_window) {
        std::vector<float> pcmf32_window(pcmf32.end() - n_samples_vad_window, pcmf32.end());
        speech_has_end = vad_simple(pcmf32_window, WHISPER_SAMPLE_RATE, vad_last_ms,
                                    vad_thold, freq_thold, false);
        if (speech_has_end)
          printf("speech end detected\n");
      }

      /**
       * Clear audio buffer when the size exceeds iteration threshold or
       * speech end is detected.
       */
      if (pcmf32.size() > n_samples_iter_threshold || speech_has_end) {
        const auto t_now = std::chrono::high_resolution_clock::now();
        const auto t_diff = std::chrono::duration_cast<std::chrono::milliseconds>(t_now - t_last_iter).count();
        printf("iter took: %ldms\n", t_diff);
        t_last_iter = t_now;

        segment.is_partial = false;
        /**
         * Keep the last few samples in the audio buffer, so the next
         * iteration has a smoother start.
         */
        std::vector<float> last(pcmf32.end() - n_samples_keep_iter, pcmf32.end());
        pcmf32 = std::move(last);
      } else {
        segment.is_partial = true;
      }

      std::lock_guard<std::mutex> lock(s_mutex);
      s_transcribed_segments.insert(s_transcribed_segments.end(), std::move(segment));
    }
  }
}

std::vector<transcribed_segment> RealtimeSpeechToTextWhisper::TranscribeFileInput(const std::string& file_path)
{
  if (file_path.empty()) {
    fprintf(stdout, "[ stream_whisper ] Error: no input files specified.\n");
  }  

  
  struct whisper_full_params wparams = whisper_full_default_params(whisper_sampling_strategy::WHISPER_SAMPLING_GREEDY);
  wparams.n_threads = 8;
  wparams.print_progress = false;
  wparams.print_realtime = false;
  wparams.print_special = false;
  wparams.print_timestamps = false;
  wparams.language = m_language;
  wparams.detect_language = false;
  wparams.translate = false;

  std::vector<float> pcmf32;
  std::vector<transcribed_segment> segments;

  if (!read_wav(file_path, pcmf32)) {
    fprintf(stdout, "error: Reading WAV file failed.\n");
    return segments;
  }

  int ret = whisper_full(ctx, wparams, pcmf32.data(), pcmf32.size());
  if (ret != 0) {
    fprintf(stderr, "Failed to process audio, returned %d\n", ret);
    return segments;
  }

  const int n_segments = whisper_full_n_segments(ctx);
  for (int i = 0; i < n_segments; ++i) {
    transcribed_segment segment;
    const char * text = whisper_full_get_segment_text(ctx, i);
    segment.text += text;
    segment.is_partial = false;
    segments.push_back(segment);
  }

  return segments;
}


