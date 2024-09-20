import { dialog, systemPreferences } from "electron";

export function checkMicrophonePermission() {
  if (process.platform === "darwin") {
    return systemPreferences.getMediaAccessStatus("microphone");
  } else if (process.platform === "win32") {
    return true;
  } else {
    return true;
  }
}

export function requestMicrophonePermission() {
  if (process.platform === "darwin") {
    return systemPreferences.askForMediaAccess("microphone");
  } else if (process.platform === "win32") {
    dialog.showMessageBox({
      type: "info",
      title: "Mikrofonerlaubnis",
      message:
        "Diese Anwendung benötigt den Zugriff auf das Mikrofon, um Sprachaufnahmen in der Anwendung zu ermöglichen. Die Erlaubnis können sie in den Einstellungen erteilen.",
      buttons: ["Ok"],
    });
    return Promise.resolve(true);
  } else {
    return Promise.resolve(true);
  }
}
