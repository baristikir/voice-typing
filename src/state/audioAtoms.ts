import { atom } from "jotai";

export const selectedAudioDeviceAtom = atom<string>("");
export const handleUpdateAudioDeviceAtom = atom(
  null,
  (get, set, update: string) => {
    set(selectedAudioDeviceAtom, update);
  },
);
