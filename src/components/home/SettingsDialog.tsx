import { UserPreferences } from "@/shared/models";
import { api } from "@/utils/rendererElectronAPI";
import { X } from "@phosphor-icons/react";
import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";

enum WhisperModelLanguage {
	English = "en",
	German = "de",
}

function convertIdToLanguage(languageId: number): WhisperModelLanguage {
	switch (languageId) {
		case 0:
			return WhisperModelLanguage.German;
			break;
		case 1:
			return WhisperModelLanguage.English;
			break;
	}
}

interface Props {
	defaultValues: UserPreferences;
	isOpen: boolean;
	setIsOpen: (value: boolean) => void;
}

export const SettingsDialog = (props: Props) => {
	const [language, setLanguage] = useState(
		convertIdToLanguage(props.defaultValues.speechRecognitionLanguageId ?? 0),
	);

	const handleSubmit = async () => {
		if (language === WhisperModelLanguage.German) {
			await api.reconfigure({
				mLanguageId: 0,
			});
		} else if (language === WhisperModelLanguage.English) {
			await api.reconfigure({
				mLanguageId: 1,
			});
		} else {
			return;
		}
	};

	return (
		<Dialog.Root open={props.isOpen} onOpenChange={props.setIsOpen}>
			<Dialog.Portal>
				<Dialog.Overlay className="bg-black/30 data-[state=open]:animate-overlayShow fixed inset-0 z-[90]" />
				<Dialog.Content className="no-drag data-[state=open]:animate-contentShow fixed top-[50%] left-[50%] max-h-[85vh] w-[90vw] max-w-[450px] translate-x-[-50%] translate-y-[-50%] rounded-2xl bg-white p-6 focus:outline-none z-[100]">
					<Dialog.Title className="text-gray-900 m-0 text-lg font-medium">
						Einstellungen
					</Dialog.Title>
					<Dialog.Description className="text-gray-600 mt-2 mb-2 text-base leading-normal">
						Hier können persönliche Einstellungen angepasst werden.
					</Dialog.Description>
					<div className="flex flex-col w-full h-auto">
						<fieldset className="my-[15px] h-full w-full flex flex-col gap-1">
							<label className="text-gray-900 text-base" htmlFor="language-select">
								Sprache für die Spracherkennung
							</label>
							<select
								className="text-gray-900 block h-8 w-full rounded px-3 text-[14px] leading-none shadow-[0_0_0_1px] outline-none focus:shadow-[0_0_0_2px]"
								id="language-select"
								name="language"
								value={language}
								onChange={(event) => {
									event.preventDefault();
									setLanguage(event.target.value as WhisperModelLanguage);
								}}
							>
								<option value="de">Deutsch</option>
								<option value="en">English</option>
							</select>
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
