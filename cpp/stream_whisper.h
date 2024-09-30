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

class SpeechToTextEngine
{
 public:
  SpeechToTextEngine(const std::string& path_model, const char* language);
  ~SpeechToTextEngine();
  void Start();
  void Stop();
  void ClearAudioData();
  void AddAudioData(const std::vector<float>& new_data);
  std::vector<transcribed_segment> GetTranscribedText();
  std::vector<transcribed_segment> TranscribeFileInput(const std::string& file_path);

 private:
  struct whisper_context* ctx;
  std::atomic<bool> is_running;
  std::atomic<bool> is_clear_audio;
  const char* m_language;
  std::vector<float> s_queued_pcmf32;
  std::vector<transcribed_segment> s_transcribed_segments;
  std::mutex s_mutex;
  std::thread worker;
  void Process();
  std::chrono::time_point<std::chrono::high_resolution_clock> t_last_iter;
};

#endif  // STT_WHISPER_H_
