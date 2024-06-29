#include "stream_whisper.h"
#include "whisper.h"

#include <atomic>
#include <cmath>
#include <mutex>
#include <string>
#include <thread>
#include <vector>

void print_array(const std::vector<float>& data)
{
  fprintf(stdout, "print array: [");
  for (int i = 0; i < std::min((int)data.size(), 10); i++) {
    fprintf(stdout, " %.8f,", data[i]);
  }
  fprintf(stdout, " ]\n");
}

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

/** Check if speech is ending. */
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

struct whisper_params {
    int32_t n_threads  = std::min(4, (int32_t) std::thread::hardware_concurrency());
    int32_t step_ms    = 3000;
    int32_t length_ms  = 10000;
    int32_t keep_ms    = 200;
    int32_t capture_id = -1;
    int32_t max_tokens = 32;
    int32_t audio_ctx  = 0;

    float vad_thold    = 0.6f;
    float freq_thold   = 100.0f;

    bool translate     = false;
    bool no_fallback   = false;
    bool print_special = false;
    bool no_context    = true;
    bool no_timestamps = false;
    bool tinydiarize   = false;
    bool save_audio    = false; // save audio to wav file
    bool use_gpu       = false;
    bool flash_attn    = false;

    std::string language  = "en";
    std::string model     = "models/ggml-base.en.bin";
    std::string fname_out;
};

RealtimeSpeechToTextWhisper::RealtimeSpeechToTextWhisper(const std::string& path_model)
{
  fprintf(stdout, "initializing whisper\n");
  // print path_model
  fprintf(stdout, "path_model: %s\n", path_model.c_str());
  ctx = whisper_init_from_file(path_model.c_str());
  fprintf(stdout, "whisper initialized\n");
  is_running = true;
  // worker = std::thread(&RealtimeSpeechToTextWhisper::Run, this);
  // t_last_iter = std::chrono::high_resolution_clock::now();
}

RealtimeSpeechToTextWhisper::~RealtimeSpeechToTextWhisper()
{
  is_running = false;
  if (worker.joinable())
    worker.join();
  whisper_free(ctx);
}

/** Add audio data in PCM f32 format. */
void RealtimeSpeechToTextWhisper::AddAudioData(const std::vector<float>& data)
{
  std::lock_guard<std::mutex> lock(s_mutex);
  // printf("AddAudioData: remaining: %d, new: %d\n", (int)s_queued_pcmf32.size(), (int)data.size());
  s_queued_pcmf32.insert(s_queued_pcmf32.end(), data.begin(), data.end());
}

/** Get newly transcribed text. */
std::vector<transcribed_msg> RealtimeSpeechToTextWhisper::GetTranscription()
{
  std::vector<transcribed_msg> transcribed;
  std::lock_guard<std::mutex> lock(s_mutex);
  transcribed = std::move(s_transcribed_msgs);
  s_transcribed_msgs.clear();
  return transcribed;
}

/** Run Whisper in its own thread to not block the main thread. */
void RealtimeSpeechToTextWhisper::Run()
{
  struct whisper_full_params wparams = whisper_full_default_params(whisper_sampling_strategy::WHISPER_SAMPLING_GREEDY);

  // See here for example https://github.com/ggerganov/whisper.cpp/blob/master/examples/stream/stream.cpp#L302
  wparams.n_threads = 4;
  wparams.no_context = true;
  wparams.single_segment = true;
  wparams.print_progress = false;
  wparams.print_realtime = false;
  wparams.print_special = false;
  wparams.print_timestamps = false;
  wparams.max_tokens = 64;
  wparams.language = "en";
  wparams.translate = false;

  /**
   * Experimental optimization: Reduce audio_ctx to 15s (half of the chunk
   * size whisper is designed for) to speed up 2x.
   * https://github.com/ggerganov/whisper.cpp/issues/137#issuecomment-1318412267
   */
  wparams.audio_ctx = 768;

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
  // Keep the last 0.5s of an iteration to the next one for better
  // transcription at begin/end.
  const int n_samples_keep_iter = WHISPER_SAMPLE_RATE * 0.5;
  const float vad_thold = 0.3f;
  const float freq_thold = 200.0f;

  /* Audio buffer */
  std::vector<float> pcmf32;

  /* Processing loop */
  while (is_running) {
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

      // printf("existing: %d, new: %d, will process: %d, threshold: %d\n",
      //        n_samples_old, n_samples_new, (int)pcmf32.size(), n_samples_iter_threshold);

      // print_array(pcmf32);

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
      transcribed_msg msg;

      const int n_segments = whisper_full_n_segments(ctx);
      for (int i = 0; i < n_segments; ++i) {
        const char* text = whisper_full_get_segment_text(ctx, i);
        msg.text += text;
      }

      /**
       * Simple VAD from the "stream" example in whisper.cpp
       * https://github.com/ggerganov/whisper.cpp/blob/231bebca7deaf32d268a8b207d15aa859e52dbbe/examples/stream/stream.cpp#L378
       */
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

        msg.is_partial = false;
        /**
         * Keep the last few samples in the audio buffer, so the next
         * iteration has a smoother start.
         */
        std::vector<float> last(pcmf32.end() - n_samples_keep_iter, pcmf32.end());
        pcmf32 = std::move(last);
      } else {
        msg.is_partial = true;
      }

      std::lock_guard<std::mutex> lock(s_mutex);
      s_transcribed_msgs.insert(s_transcribed_msgs.end(), std::move(msg));
    }
  }
}