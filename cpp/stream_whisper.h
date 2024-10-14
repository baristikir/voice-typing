#ifndef STT_WHISPER_H_
#define STT_WHISPER_H_

#include <atomic>
#include <mutex>
#include <string>
#include <thread>
#include <vector>

struct transcribed_segment {
  std::string text;
  bool is_partial;
};

struct whisper_configuration {
  const char *language;
  int n_threads;
};
struct stream_configuration {
  int trigger_ms;
};

typedef struct {
  unsigned int n_threads;
  unsigned int max_tokens;
  unsigned int audio_ctx;
  unsigned int max_len;
  float temperature_inc;

  char *language;
  bool detect_language;
  bool translate;

  bool print_progress;
  bool print_realtime;
  bool print_special;
  bool print_timestamps;
} whisper_stream_params;

class SpeechToTextEngine {
public:
  SpeechToTextEngine(const std::string &path_model, const char *language,
                     const int n_threads, const int trigger_ms,
                     const bool is_word_level_mode);
  ~SpeechToTextEngine();
  void Start();
  void Stop();
  void ClearAudioData();
  void AddAudioData(const std::vector<float> &new_data);
  std::vector<transcribed_segment> GetTranscribedText();
  std::vector<transcribed_segment>
  TranscribeFileInput(const std::string &file_path);

private:
  struct whisper_context *ctx;
  // Shared conditions
  std::atomic<bool> is_running;
  std::atomic<bool> is_clear_audio;
  std::atomic<bool> is_word_level_mode;
  // Shared audio buffer
  std::vector<float> s_queued_pcmf32;
  // Shared transcription results
  std::vector<transcribed_segment> s_transcribed_segments;
  // Whisper model & inference configuration
  whisper_configuration model_config;
  // Streaming configuration
  stream_configuration stream_config;
  // Thread for transcription processing in background
  std::mutex s_mutex;
  std::thread worker;
  void Process();
  std::chrono::time_point<std::chrono::high_resolution_clock> t_last_iter;
};

#endif // STT_WHISPER_H_
