import { dialog, systemPreferences } from "electron";

export function checkMicrophonePermission() {
  if (process.platform === "darwin" || process.platform === "win32") {
    return systemPreferences.getMediaAccessStatus("microphone");
  } else {
    return true;
  }
}

export async function requestMicrophonePermission() {
  if (process.platform === "darwin") {
    const result = await systemPreferences.askForMediaAccess("microphone");
    return result;
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
