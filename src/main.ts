import { app, BrowserWindow } from "electron";
import assert from "node:assert";
import path from "node:path";
import { getWhisperModelPath } from "./utils/whisper_model";

// Import the compiled C++ addon
const addon = require("bindings")("addon.node");
assert.strictEqual(typeof addon, "object");
assert.strictEqual(typeof addon.RealtimeSpeechToTextWhisper, "function");

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
	app.quit();
}

const createWindow = () => {
	const mainWindow = new BrowserWindow({
		width: 1000,
		height: 600,
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
		},
	});

	if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
		mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
	} else {
		mainWindow.loadFile(
			path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
		);
	}

	// Open the DevTools.
	mainWindow.webContents.openDevTools();
};

app.whenReady().then(() => {
	const whisperModelPath = getWhisperModelPath();
	const whisper = new addon.RealtimeSpeechToTextWhisper(whisperModelPath);
	assert.strictEqual(typeof whisper, "object");

	createWindow();

	// On OS X it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow();
		}
	});
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});
