import { SpeechRecognitionModelType, UserPreferences } from "@/shared/models";
import { selectedAudioDeviceAtom } from "@/state/audioAtoms";
import { api } from "@/utils/rendererElectronAPI";
import { X } from "@phosphor-icons/react";
import * as Dialog from "@radix-ui/react-dialog";
import { useAtom } from "jotai";
import { EventHandler, useEffect, useState } from "react";

export enum WhisperModelLanguage {
	English = "en",
	German = "de",
}

export function convertIdToLanguage(languageId: number): WhisperModelLanguage {
	switch (languageId) {
		case 0:
			return WhisperModelLanguage.German;
		case 1:
			return WhisperModelLanguage.English;
	}
}

function convertLanguageToId(language: WhisperModelLanguage): number {
	switch (language) {
		case WhisperModelLanguage.German:
			return 0;
		case WhisperModelLanguage.English:
			return 1;
	}
}

interface Props {
	defaultValues: UserPreferences;
	isOpen: boolean;
	setIsOpen: (value: boolean) => void;
	optimisticUpdater: (data: UserPreferences) => void;
}

export const SettingsDialog = (props: Props) => {
	const [deviceId, setDeviceId] = useAtom(selectedAudioDeviceAtom);
	const [selectedDeviceId, setSelectedDeviceId] = useState(props.defaultValues.deviceId);
	const [language, setLanguage] = useState(convertIdToLanguage(props.defaultValues.speechRecognitionLanguageId ?? 0));
	const [modelType, setModelType] = useState(props.defaultValues.speechRecognitionModelType);
	const [threads, setThreads] = useState(props.defaultValues.speechRecognitionThreads);
	const [triggerMs, setTriggerMs] = useState(props.defaultValues.speechRecognitionTriggerMs);

	const handleSubmit = async () => {
		let data: UserPreferences;
		// Save Device ID (only when changed)
		if (selectedDeviceId && selectedDeviceId !== deviceId) {
			setDeviceId(selectedDeviceId);
			data = await api.updateUserPreferences({
				deviceId: selectedDeviceId,
			});
		}

		// Save language or model type (only when changed)
		const defaultModelType = props.defaultValues.speechRecognitionModelType;
		const defaultLanguage = convertIdToLanguage(props.defaultValues.speechRecognitionLanguageId);
		const defaultThreads = props.defaultValues.speechRecognitionThreads;
		const defaultTriggersMs = props.defaultValues.speechRecognitionTriggerMs;
		if (
			(language && language !== defaultLanguage) ||
			(modelType && modelType !== defaultModelType) ||
			(threads && threads !== defaultThreads) ||
			(triggerMs && triggerMs !== defaultTriggersMs)
		) {
			// Convert into language id
			const languageId = convertLanguageToId(language);
			// Trigger speech to text engine reconfiguration with related whisper parameter changes via IPC call.
			data = await api.reconfigure({
				mLanguageId: languageId,
				mType: modelType,
				mThreads: threads,
				mTriggerMs: triggerMs,
			});
		}
		// Optimistic UI Update: Replaces current states with latest states from the database to avoid stale data on UI.
		props.optimisticUpdater(data);
	};

	const handleThreadsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		setThreads(Number(event.target.value));
	};

	const handleChangeTriggerMs = (event: React.ChangeEvent<HTMLInputElement>) => {
		setTriggerMs(Number(event.target.value));
	};

	return (
		<Dialog.Root open={props.isOpen} onOpenChange={props.setIsOpen}>
			<Dialog.Portal>
				<Dialog.Overlay className="bg-black/30 data-[state=open]:animate-overlayShow fixed inset-0 z-[90]" />
				<Dialog.Content className="no-drag data-[state=open]:animate-contentShow fixed top-[50%] left-[50%] max-h-[85vh] w-[90vw] max-w-[450px] translate-x-[-50%] translate-y-[-50%] rounded-2xl bg-white p-6 focus:outline-none z-[100] overflow-auto">
					<Dialog.Title className="text-gray-900 m-0 text-lg font-medium">Einstellungen</Dialog.Title>
					<Dialog.Description className="text-gray-600 mt-2 mb-2 text-base leading-normal">
						Hier können persönliche Einstellungen angepasst werden.
					</Dialog.Description>
					<div className="flex flex-col w-full h-auto gap-4">
						<AudioInputSelection value={selectedDeviceId} handleInputChange={setSelectedDeviceId} />
						<ModelLanguageSelection value={language} handleInputChange={setLanguage} />
						<ModelTypeSelection value={modelType} handleInputChange={setModelType} />
						<fieldset>
							<label htmlFor="configuration-threads">Anzahl CPU Threads für Spracherkennung</label>
							<input
								id="configuration-threads"
								name="configuration-threads"
								className="text-gray-900 block h-8 w-full rounded px-3 text-[14px] leading-none shadow-[0_0_0_1px] outline-none focus:shadow-[0_0_0_2px]"
								value={threads}
								onChange={handleThreadsChange}
								type="number"
								min={1}
							/>
						</fieldset>
						<fieldset>
							<label htmlFor="configuration-trigger">Minimum Audiolänge zur Spracherkennung</label>
							<div className="flex items-center justify-start gap-4">
								<input
									id="configuration-trigger"
									name="configuration-trigger"
									className="text-gray-900 block h-8 w-full rounded px-3 text-[14px] leading-none shadow-[0_0_0_1px] outline-none focus:shadow-[0_0_0_2px]"
									value={triggerMs}
									onChange={handleChangeTriggerMs}
									type="number"
									min={1}
								/>
								<span className="w-auto whitespace-nowrap text-lg font-medium">in ms</span>
							</div>
						</fieldset>
					</div>
					<div className="mt-[25px] flex justify-end">
						<Dialog.Close asChild>
							<button
								type="button"
								className="bg-green-300 text-green-800 hover:bg-green-500 focus:shadow-green-700 inline-flex h-10 items-center justify-center rounded-lg px-[15px] font-medium leading-none focus:shadow-[0_0_0_2px] focus:outline-none"
								onClick={handleSubmit}
							>
								Speichern
							</button>
						</Dialog.Close>
					</div>
					<Dialog.Close asChild>
						<button
							className="text-violet11 hover:bg-violet4 focus:shadow-violet7 absolute top-[10px] right-[10px] inline-flex h-[25px] w-[25px] appearance-none items-center justify-center rounded-full focus:shadow-[0_0_0_2px] focus:outline-none"
							aria-label="Close"
						>
							<X className="w-4 h-4" />
						</button>
					</Dialog.Close>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
};

const ModelLanguageSelection = (props: { value: string; handleInputChange: (value: WhisperModelLanguage) => void }) => {
	return (
		<fieldset className="h-full w-full flex flex-col gap-1">
			<label className="text-gray-900 text-base" htmlFor="language-select">
				Sprache für die Spracherkennung
			</label>
			<select
				className="text-gray-900 block h-8 w-full rounded px-3 text-[14px] leading-none shadow-[0_0_0_1px] outline-none focus:shadow-[0_0_0_2px]"
				id="language-select"
				name="language"
				value={props.value}
				onChange={(event) => {
					event.preventDefault();
					props.handleInputChange(event.target.value as WhisperModelLanguage);
				}}
			>
				<option value="de">Deutsch</option>
				<option value="en">English</option>
			</select>
		</fieldset>
	);
};

const ModelTypeSelection = (props: {
	value: string;
	handleInputChange: (value: SpeechRecognitionModelType) => void;
}) => {
	return (
		<fieldset className="h-full w-full flex flex-col gap-1">
			<label className="text-gray-900 text-base" htmlFor="model-select">
				Whisper Modelart für die Spracherkennung
			</label>
			<select
				className="text-gray-900 block h-8 w-full rounded px-3 text-[14px] leading-none shadow-[0_0_0_1px] outline-none focus:shadow-[0_0_0_2px]"
				id="model-select"
				name="language"
				value={props.value}
				onChange={(event) => {
					event.preventDefault();
					props.handleInputChange(event.target.value as SpeechRecognitionModelType);
				}}
			>
				<option value="tiny">Tiny</option>
				<option value="base">Base</option>
				<option value="small">Small</option>
				<option value="medium">Medium</option>
			</select>
		</fieldset>
	);
};

const AudioInputSelection = (props: { value: string; handleInputChange: (deviceId: string) => void }) => {
	const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

	// Displays available audio `MediaDevices`
	const getAudioDevices = async () => {
		try {
			const allDevices = await navigator.mediaDevices.enumerateDevices();
			const audioInputDevices = allDevices.filter((device) => device.kind === "audioinput");
			setDevices(audioInputDevices);
		} catch (error) {
			console.error("Error accessing media devices: ", error);
		}
	};

	useEffect(() => {
		getAudioDevices();
		// Updating UI accordingly when device changes were detected by the browser.
		navigator.mediaDevices.addEventListener("devicechange", getAudioDevices);
		return () => {
			navigator.mediaDevices.removeEventListener("devicechange", getAudioDevices);
		};
	}, []);

	return (
		<fieldset className="h-full w-full flex flex-col gap-1">
			<label className="text-gray-900 text-base" htmlFor="audio-input-select">
				Audio Eingabegerät
			</label>
			<select
				className="text-gray-900 block h-8 w-full rounded px-3 text-[14px] leading-none shadow-[0_0_0_1px] outline-none focus:shadow-[0_0_0_2px]"
				id="audio-input-select"
				name="audioInput"
				value={props.value}
				onChange={(event) => {
					event.preventDefault();
					props.handleInputChange(event.target.value);
				}}
			>
				{devices.map((device) => (
					<option key={device.deviceId} value={device.deviceId}>
						{device.label || `Microphone ${device.deviceId.slice(0, 5)}`}
					</option>
				))}
			</select>
		</fieldset>
	);
};
