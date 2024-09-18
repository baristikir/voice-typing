#include "stream_whisper.h"

#include <cstdio>
#include <napi.h>

class STTAddon : public Napi::ObjectWrap<STTAddon>
{
 public:
  static Napi::Object Init(Napi::Env env, Napi::Object exports);
  STTAddon(const Napi::CallbackInfo& info);

 private:
  RealtimeSpeechToTextWhisper* instance;
  Napi::Value Start(const Napi::CallbackInfo& info);
  Napi::Value Stop(const Napi::CallbackInfo& info);
  Napi::Value AddAudioData(const Napi::CallbackInfo& info);
  Napi::Value ClearAudioData(const Napi::CallbackInfo& info);
  Napi::Value GetTranscribedText(const Napi::CallbackInfo& info);
  Napi::Value Reconfigure(const Napi::CallbackInfo& info);  
  void Destroy(const Napi::CallbackInfo& info);
};

Napi::Object STTAddon::Init(Napi::Env env, Napi::Object exports)
{
  Napi::Function func = DefineClass(
      env,
      "RealtimeSpeechToTextWhisper",
      {InstanceMethod<&STTAddon::Start>("start"),
       InstanceMethod<&STTAddon::Stop>("stop"),
       InstanceMethod<&STTAddon::AddAudioData>("addAudioData"),
       InstanceMethod<&STTAddon::ClearAudioData>("clearAudioData"),
       InstanceMethod<&STTAddon::GetTranscribedText>("getTranscribedText"),
       InstanceMethod<&STTAddon::Reconfigure>("reconfigure")});

  Napi::FunctionReference* constructor = new Napi::FunctionReference();
  *constructor = Napi::Persistent(func);
  env.SetInstanceData(constructor);
  exports.Set("RealtimeSpeechToTextWhisper", func);

  return exports;
}

STTAddon::STTAddon(const Napi::CallbackInfo& info)
    : Napi::ObjectWrap<STTAddon>(info)
{
  if (info.Length() < 2 || !info[0].IsString() || !info[1].IsString()){
    Napi::Error::New(info.Env(), "Expected a string for model path and language")
      .ThrowAsJavaScriptException();
    throw -1;
  }

  Napi::String path_model = info[0].As<Napi::String>();
  // https://github.com/nodejs/node-addon-api/blob/main/doc/string.md#new-1
  // from above source: const char* - represents a UTF8 string.   
  std::string m_language = info[0].As<Napi::String>().Utf8Value();

  instance = new RealtimeSpeechToTextWhisper(path_model, m_language);
}

Napi::Value STTAddon::AddAudioData(const Napi::CallbackInfo& info)
{
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

  std::vector<float> new_data(
      float32Array.Data(),
      float32Array.Data() + float32Array.ElementLength());

  instance->AddAudioData(new_data);

  return Napi::Number::New(info.Env(), 0);
}

Napi::Value STTAddon::GetTranscribedText(const Napi::CallbackInfo& info)
{
  std::vector<transcribed_segment> segments;
  segments = instance->GetTranscribedText();
  
  Napi::Env env = info.Env();
  Napi::Array js_segments= Napi::Array::New(env, segments.size());

  for (int i = 0; i < (int) segments.size(); i++) {
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

Napi::Value STTAddon::Start(const Napi::CallbackInfo& info) 
{
  try
  {
    instance->Start(instance);
  }
  catch(const std::exception& e)
  {
    return Napi::Number::New(info.Env(), 0);
  }
  
  return Napi::Number::New(info.Env(), 1);
}

Napi::Value STTAddon::Stop(const Napi::CallbackInfo& info) 
{
  try
  {
    instance->Stop(instance);
  }
  catch(const std::exception& e)
  {
    return Napi::Number::New(info.Env(), 0);
  }
  
  return Napi::Number::New(info.Env(), 1);
}

Napi::Value STTAddon::ClearAudioData(const Napi::CallbackInfo& info) 
{
  try
  {
    instance->ClearAudioData();
  }
  catch(const std::exception& e)
  {
    return Napi::Number::New(info.Env(), 0);
  }
  
  return Napi::Number::New(info.Env(), 1);
}

Napi::Value STTAddon::Reconfigure(const Napi::CallbackInfo& info)
{
  if (info.Length() < 2 || !info[0].IsString() || !info[1].IsString()){
    Napi::Error::New(info.Env(), "Expected a string for model path and language")
      .ThrowAsJavaScriptException();
    return Napi::Number::New(info.Env(), 0);
  }

  Napi::String path_model = info[0].As<Napi::String>();
  // https://github.com/nodejs/node-addon-api/blob/main/doc/string.md#new-1
  // from above source: const char* - represents a UTF8 string.   
  std::string m_language = info[1].As<Napi::String>().Utf8Value();

  if (instance) {
    instance->~RealtimeSpeechToTextWhisper();
  }

  instance = new RealtimeSpeechToTextWhisper(path_model, m_language);
  return Napi::Number::New(info.Env(), 1);
}

Napi::Object Init(Napi::Env env, Napi::Object exports)
{
  STTAddon::Init(env, exports);
  return exports;
}

NODE_API_MODULE(NODE_GYP_MODULE_NAME, Init)
