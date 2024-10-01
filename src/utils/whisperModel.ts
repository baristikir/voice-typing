import fs from "node:fs";
import path from "node:path";
import assert from "node:assert";
import { app } from "electron";
import { SpeechRecognitionModelType } from "@/shared/models";

export function getWhisperModelConfiguration(
  languageId: number,
  modelType: SpeechRecognitionModelType,
) {
  return {
    modelPath: getWhisperModelPath(modelType),
    modelLanguage: languageId,
  };
}

export function getWhisperModelPath(
  modelName: SpeechRecognitionModelType = "base",
) {
  let whisperCPPModelsPath: string;
  if (app.isPackaged) {
    // This returns the packaged application path where the models were stored.
    // Checkout forge.config.ts (packageAfterCopy) for more information.
    whisperCPPModelsPath = path.join(
      process.resourcesPath,
    );
  } else {
    whisperCPPModelsPath = path.resolve(
      // process.cwd instead of __dirname when using vite as build tool, also see here: https://v2.vitejs.dev/config/#root
      // __dirname will result in .vite/build directory instead of project root directory where as process.cwd will result in project root directory
      process.cwd(),
      "whisper.cpp",
      "models",
    );
  }
  // These are the matching names of the models stored which come packaged with the application.
  const whipserModelsByName: Record<SpeechRecognitionModelType, string> = {
    tiny: "ggml-tiny.bin",
    base: "ggml-base.bin",
    small: "ggml-small.bin",
    medium: "ggml-medium.bin",
    turbo: "ggml-large-v3-turbo.bin",
  };

  assert.strictEqual(
    typeof whipserModelsByName[modelName],
    "string",
    `[ getWhisperModelPath ] Invalid model name: ${modelName}`,
  );
  // Merging path to models directory with current selected model to final model path.
  const whisperModelPath = path.join(
    whisperCPPModelsPath,
    whipserModelsByName[modelName],
  );
  if (!fs.existsSync(whisperModelPath)) {
    console.error(
      `[ getWhisperModelPath ] Whisper model not found at ${whisperModelPath}.`,
    );
    process.exit(1);
  }

  return whisperModelPath;
}
