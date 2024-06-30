import fs from "node:fs";
import path from "node:path";
import assert from "node:assert";

type WhisperModelName = "tiny" | "tiny.en" | "base" | "base.en";

export function getWhisperModelPath(modelName: WhisperModelName = "base.en") {
	const whisperCPPModelsPath = "../whisper.cpp/models";
	const whipserModelsByName: Record<WhisperModelName, string> = {
		tiny: "ggml-tiny.bin",
		"tiny.en": "ggml-tiny.en.bin",
		base: "ggml-base.bin",
		"base.en": "ggml-base.en.bin",
	};

	assert.strictEqual(
		whipserModelsByName[modelName],
		"string",
		`[ getWhisperModelPath ] Invalid model name: ${modelName}.`
	);

	const whisperModelPath = path.join(
		__dirname,
		`${whisperCPPModelsPath}/${whipserModelsByName[modelName]}`
	);

	if (!fs.existsSync(whisperModelPath)) {
		console.error(
			"[ getWhisperModelPath ] Whisper model not found at ${whisperModelPath}."
		);
		process.exit(1);
	}

	return whisperModelPath;
}
