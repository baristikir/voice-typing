#include "stream_whisper.h"

#include <cstdio>
#include <napi.h>

class STTAddon : public Napi::ObjectWrap<STTAddon> {
public:
  static Napi::Object Init(Napi::Env env, Napi::Object exports);
  STTAddon(const Napi::CallbackInfo &info);

private:
  SpeechToTextEngine *instance;
  Napi::Value Start(const Napi::CallbackInfo &info);
  Napi::Value Stop(const Napi::CallbackInfo &info);
  Napi::Value AddAudioData(const Napi::CallbackInfo &info);
  Napi::Value ClearAudioData(const Napi::CallbackInfo &info);
  Napi::Value GetTranscribedText(const Napi::CallbackInfo &info);
  Napi::Value TranscribeFileInput(const Napi::CallbackInfo &info);
  Napi::Value Reconfigure(const Napi::CallbackInfo &info);
  void Destroy(const Napi::CallbackInfo &info);
};

Napi::Object STTAddon::Init(Napi::Env env, Napi::Object exports) {
  Napi::Function func = DefineClass(
      env, "SpeechToTextEngine",
      {InstanceMethod<&STTAddon::Start>("start"),
       InstanceMethod<&STTAddon::Stop>("stop"),
       InstanceMethod<&STTAddon::AddAudioData>("addAudioData"),
       InstanceMethod<&STTAddon::ClearAudioData>("clearAudioData"),
       InstanceMethod<&STTAddon::GetTranscribedText>("getTranscribedText"),
       InstanceMethod<&STTAddon::TranscribeFileInput>("transcribeFileInput"),
       InstanceMethod<&STTAddon::Reconfigure>("reconfigure")});

  Napi::FunctionReference *constructor = new Napi::FunctionReference();
  *constructor = Napi::Persistent(func);
  env.SetInstanceData(constructor);
  exports.Set("SpeechToTextEngine", func);

  return exports;
}

whisper_configuration get_whisper_configuration(const Napi::CallbackInfo &info,
                                                const Napi::Object &params) {
  if (!params.Get("language_id").IsNumber() ||
      !params.Get("n_threads").IsNumber()) {
    Napi::Error::New(info.Env(),
                     "Expected different data types for whisper configuration. "
                     "Check language_id, n_threads")
        .ThrowAsJavaScriptException();
    throw -1;
  }

  Napi::Number language_id = params.Get("language_id").As<Napi::Number>();
  Napi::Number n_threads = params.Get("n_threads").As<Napi::Number>();

  const char *language;
  switch (static_cast<int>(language_id)) {
  case 0:
    language = "de";
    break;
  case 1:
    language = "en";
    break;
  default:
    Napi::Error::New(info.Env(), "Expected a language_id of 0 or 1")
        .ThrowAsJavaScriptException();
    throw -1;
  }

  return {language, static_cast<int>(n_threads)};
}

stream_configuration get_stream_configuration(const Napi::CallbackInfo &info,
                                              const Napi::Object &params) {
  if (!params.Get("trigger_ms").IsNumber()) {
    Napi::Error::New(
        info.Env(),
        "Expected trigger_ms data type as a number for stream configuration. ")
        .ThrowAsJavaScriptException();
    throw -1;
  }

  Napi::Number trigger_ms = params.Get("trigger_ms").As<Napi::Number>();
  return {trigger_ms};
}

Napi::String get_whisper_model_path(const Napi::CallbackInfo &info,
                                    const Napi::Object &params) {
  if (!params.Get("model_path").IsString()) {
    Napi::Error::New(info.Env(), "Expected a string for model path.")
        .ThrowAsJavaScriptException();
    throw -1;
  }

  Napi::String model_path = params.Get("model_path").As<Napi::String>();
  return model_path;
}

Napi::Boolean get_dictation_mode(const Napi::CallbackInfo &info,
                                 const Napi::Object &params) {
  if (!params.Get("is_word_level_mode").IsBoolean()) {
    Napi::Error::New(info.Env(), "Expected a boolean for dictation mode.")
        .ThrowAsJavaScriptException();
    throw -1;
  }

  Napi::Boolean is_word_level_mode =
      params.Get("is_word_level_mode").As<Napi::Boolean>();
  return is_word_level_mode;
}

STTAddon::STTAddon(const Napi::CallbackInfo &info)
    : Napi::ObjectWrap<STTAddon>(info) {
  if (info.Length() <= 0 || !info[0].IsObject()) {
    Napi::Error::New(
        info.Env(), "Passed arguments via addon do not match the requirements.")
        .ThrowAsJavaScriptException();
    throw -1;
  }

  const Napi::Object params = info[0].As<Napi::Object>();

  Napi::String model_path = get_whisper_model_path(info, params);
  // Napi::Boolean is_word_level_mode = get_dictation_mode(info, params);
  whisper_configuration whisper_config =
      get_whisper_configuration(info, params);
  stream_configuration stream_config = get_stream_configuration(info, params);
  instance = new SpeechToTextEngine(model_path, whisper_config.language,
                                    whisper_config.n_threads,
                                    stream_config.trigger_ms, false);
}

Napi::Value STTAddon::AddAudioData(const Napi::CallbackInfo &info) {
  if (info.Length() < 1 || !info[0].IsTypedArray()) {
    Napi::Error::New(info.Env(), "Expected a TypedArray")
        .ThrowAsJavaScriptException();
    return Napi::Number::New(info.Env(), 1);
  }

  Napi::TypedArray typedArray = info[0].As<Napi::TypedArray>();

  if (typedArray.TypedArrayType() != napi_float32_array) {
    Napi::Error::New(info.Env(), "Expected a Float32Array")
        .ThrowAsJavaScriptException();
    return Napi::Number::New(info.Env(), 1);
  }

  Napi::Float32Array float32Array = typedArray.As<Napi::Float32Array>();
  size_t length = float32Array.ElementLength();

  std::vector<float> new_data(float32Array.Data(),
                              float32Array.Data() + length);

  instance->AddAudioData(new_data);

  return Napi::Number::New(info.Env(), 0);
}

Napi::Value STTAddon::GetTranscribedText(const Napi::CallbackInfo &info) {
  std::vector<transcribed_segment> segments;
  segments = instance->GetTranscribedText();

  Napi::Env env = info.Env();
  Napi::Array js_segments = Napi::Array::New(env, segments.size());

  for (int i = 0; i < (int)segments.size(); i++) {
    transcribed_segment segment = segments[i];
    Napi::Object js_segment = Napi::Object::New(env);
    js_segment.Set("text", segment.text);
    js_segment.Set("isPartial", segment.is_partial);
    js_segments.Set(i, js_segment);
  }

  Napi::Object js_payload = Napi::Object::New(env);
  js_payload.Set("segments", js_segments);

  return js_payload;
}

Napi::Value STTAddon::TranscribeFileInput(const Napi::CallbackInfo &info) {
  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::Error::New(info.Env(), "Expected a String as first argument")
        .ThrowAsJavaScriptException();
    return Napi::Number::New(info.Env(), 1);
  }

  std::vector<transcribed_segment> segments;
  Napi::String file_path = info[0].As<Napi::String>();
  segments = instance->TranscribeFileInput(file_path);

  Napi::Env env = info.Env();
  Napi::Array js_segments = Napi::Array::New(env, segments.size());

  int i = 0;
  for (const transcribed_segment &segment : segments) {
    Napi::Object js_segment = Napi::Object::New(env);
    js_segment.Set("text", segment.text);
    js_segment.Set("isPartial", segment.is_partial);
    js_segments.Set(i, js_segment);
    i++;
  }

  Napi::Object js_payload = Napi::Object::New(env);
  js_payload.Set("segments", js_segments);

  return js_payload;
}

Napi::Value STTAddon::Start(const Napi::CallbackInfo &info) {
  try {
    instance->Start();
  } catch (const std::exception &e) {
    return Napi::Number::New(info.Env(), 0);
  }

  return Napi::Number::New(info.Env(), 1);
}

Napi::Value STTAddon::Stop(const Napi::CallbackInfo &info) {
  try {
    instance->Stop();
  } catch (const std::exception &e) {
    return Napi::Number::New(info.Env(), 0);
  }

  return Napi::Number::New(info.Env(), 1);
}

Napi::Value STTAddon::ClearAudioData(const Napi::CallbackInfo &info) {
  try {
    instance->ClearAudioData();
  } catch (const std::exception &e) {
    return Napi::Number::New(info.Env(), 0);
  }

  return Napi::Number::New(info.Env(), 1);
}

Napi::Value STTAddon::Reconfigure(const Napi::CallbackInfo &info) {
  if (info.Length() <= 0 || !info[0].IsObject()) {
    Napi::Error::New(
        info.Env(), "Passed arguments via addon do not match the requirements.")
        .ThrowAsJavaScriptException();
    throw -1;
  }

  const Napi::Object params = info[0].As<Napi::Object>();

  Napi::String model_path = get_whisper_model_path(info, params);
  // Napi::Boolean is_word_level_mode = get_dictation_mode(info, params);
  whisper_configuration whisper_config =
      get_whisper_configuration(info, params);
  stream_configuration stream_config = get_stream_configuration(info, params);

  if (instance) {
    instance->~SpeechToTextEngine();
  }

  instance = new SpeechToTextEngine(model_path, whisper_config.language,
                                    whisper_config.n_threads,
                                    stream_config.trigger_ms, false);

  return Napi::Number::New(info.Env(), 1);
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  STTAddon::Init(env, exports);
  return exports;
}

NODE_API_MODULE(NODE_GYP_MODULE_NAME, Init)
