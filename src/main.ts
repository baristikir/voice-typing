import { app, BrowserWindow, dialog } from "electron";
import assert from "node:assert";
import path from "node:path";
import { registerWhisperIPCHandler } from "./ipc/whisperIPCHandlers";
import { getWhisperModelConfiguration } from "./utils/whisperModel";
import {
  closeDatabase,
  setupDatabase,
  UserPreferencesDbService,
} from "./backend/db";
import { registerDbIPCHandler } from "./ipc/dbIPCHandlers";
import { registerPreferencesIPCHandler } from "./ipc/preferencesIPCHandlers";
import {
  checkMicrophonePermission,
  requestMicrophonePermission,
} from "./utils/microphone";
import { registerDialogIPCHandler } from "./ipc/dialogIPCHandlers";

// Disable security warnings in devtools
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = "true";

// Path to native addon binary which can vary in development and production.
let addonPath;
if (app.isPackaged) {
  // Native addon binary is shipped with the application builds contents.
  // 'native_modules' directory was created at build time and can be configured through `forge.config.ts`.
  addonPath = path.join(
    process.resourcesPath,
    "app.asar.unpacked",
    "native_modules",
    "addon.node",
  );
} else {
  // Development path to native addon binary which will needs to be build manually.
  addonPath = path.resolve(
    process.cwd(),
    "build",
    "Release",
    "addon.node",
  );
}
// Import the compiled C++ addon
const addon = require(addonPath);
assert.strictEqual(typeof addon, "object");
assert.strictEqual(typeof addon.SpeechToTextEngine, "function");

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  app.quit();
}

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 800,
    titleBarStyle: "default",
    titleBarOverlay: true,
    movable: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Open the DevTools in Development.
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }
};

app.whenReady().then(() => {
  // Create or connect to existing SQLite db
  setupDatabase();
  // Darwin and Windows do have specific requirements to access a systems microphone.
  // First we check the current status and request if needed. Electron.js provides
  // a way to prompt a request for Darwin.
  const micPermission = checkMicrophonePermission();
  if (micPermission !== "granted") {
    requestMicrophonePermission().then((isGranted) => {
      if (!isGranted) {
        dialog.showErrorBox(
          "Zugriff verweigert",
          "Damit diese Anwendung ordnungsgemäß funktioniert, ist der Zugriff auf das Mikrofon erforderlich.",
        );
      }
    });
  }
  // Initialising Whisper model configuration and application preferences
  // from the users preferences.
  const userPreferences = UserPreferencesDbService.getUserPreferences();
  const whisperConfiguration = getWhisperModelConfiguration(
    userPreferences.speechRecognitionLanguageId,
    userPreferences.speechRecognitionModelType,
  );

  // Initializing native addon instance
  const sttWhisperStreamingModule = new addon.SpeechToTextEngine(
    whisperConfiguration.modelPath,
    whisperConfiguration.modelLanguage,
  );
  assert.strictEqual(typeof sttWhisperStreamingModule, "object");

  // Registering IPC-Endpoints and there handlers for renderer processes.
  // Main purpose is to communicate with the Database and Whisper engine.
  registerDialogIPCHandler();
  registerPreferencesIPCHandler();
  registerWhisperIPCHandler(sttWhisperStreamingModule);
  registerDbIPCHandler();

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

app.on("will-quit", () => {
  closeDatabase();
});
