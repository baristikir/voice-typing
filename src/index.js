const { app, BrowserWindow } = require("electron");
const path = require("node:path");
const fs = require("node:fs");

const addon = require("bindings")("addon.node");

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
	app.quit();
}

const createWindow = () => {
	// Create the browser window.
	const mainWindow = new BrowserWindow({
		width: 1000,
		height: 600,
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
		},
	});

	// and load the index.html of the app.
	mainWindow.loadFile(path.join(__dirname, "index.html"));

	// Open the DevTools.
	mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
	// const whisperModelPath = getWhisperModelPath();
	const whisperModelPath = path.join(__dirname, "../ggml-base.en.bin");

	console.log(addon);
	if (!fs.existsSync(whisperModelPath)) {
		console.error(
			"[ getWhisperModelPath ] Whisper model not found at ${whisperModelPath}."
		);
		process.exit(1);
	}

	console.log("[ main ] Whisper model path: ", whisperModelPath);

	try {
		const whisper = new addon.RealtimeSpeechToTextWhisper(whisperModelPath);
		console.log("[ main ] Whisper: ", whisper);
	} catch (error) {
		console.log("[ main ] Error: ", error);
	}

	createWindow();

	// On OS X it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow();
		}
	});
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});

//! Make sure the model was downloaded before.
// via bash script: `../whisper.cpp/models/download-ggml-model.sh`
function getWhisperModelPath(modelName = "base.en") {
	const whisperCPPModelsPath = "../whisper.cpp/models";
	const whipserModelsByName = {
		tiny: "ggml-tiny.bin",
		"tiny.en": "ggml-tiny.en.bin",
		base: "ggml-base.bin",
		"base.en": "ggml-base.en.bin",
	};

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
