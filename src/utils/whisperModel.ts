import fs from "node:fs";
import path from "node:path";
import assert from "node:assert";
import { app } from "electron";

export function getWhisperModelConfiguration(languageId: number) {
  const modelName = getWhisperModelName(languageId as any);
  return {
    modelPath: getWhisperModelPath(modelName),
    modelLanguage: languageId,
  };
}

type WhisperModelName = "tiny" | "tiny.en" | "base" | "base.en";

export function getWhisperModelName(
  modelLangugage: 0 | 1 = 0,
): WhisperModelName {
  switch (modelLangugage) {
    case 0:
      return "base";
    case 1:
      return "base.en";
  }
}

export function getWhisperModelPath(modelName: WhisperModelName = "base.en") {
  let whisperCPPModelsPath: string;
  if (app.isPackaged) {
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

  const whipserModelsByName: Record<WhisperModelName, string> = {
    tiny: "ggml-tiny.bin",
    "tiny.en": "ggml-tiny.en.bin",
    base: "ggml-base.bin",
    "base.en": "ggml-base.en.bin",
  };

  assert.strictEqual(
    typeof whipserModelsByName[modelName],
    "string",
    `[ getWhisperModelPath ] Invalid model name: ${modelName}`,
  );

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
