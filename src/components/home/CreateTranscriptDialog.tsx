import { X } from "@phosphor-icons/react";
import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";

interface Props {
	isOpen: boolean;
	setIsOpen: (value: boolean) => void;
	onSubmit: (title?: string) => void;
}

export const CreateNewTranscriptDialog = (props: Props) => {
	const [value, setValue] = useState<string>("");

	const handleSubmit = () => {
		props.onSubmit(value.length > 0 ? value : undefined);
	};

	return (
		<Dialog.Root open={props.isOpen} onOpenChange={props.setIsOpen}>
			<Dialog.Portal>
				<Dialog.Overlay className="bg-black/30 data-[state=open]:animate-overlayShow fixed inset-0" />
				<Dialog.Content className="no-drag data-[state=open]:animate-contentShow fixed top-[50%] left-[50%] max-h-[85vh] w-[90vw] max-w-[450px] translate-x-[-50%] translate-y-[-50%] rounded-2xl bg-white p-6 focus:outline-none">
					<Dialog.Title className="text-gray-900 m-0 text-[17px] font-medium">
						Neue Diktieraufnahme Erstellen
					</Dialog.Title>
					<Dialog.Description className="text-gray-600 mt-[10px] mb-5 text-[15px] leading-normal">
						Wähle zunächst einen Titel für das Transkript aus.
					</Dialog.Description>
					<fieldset className="mb-[15px] flex items-center gap-5">
						<label className="text-gray-900 w-[60px] text-right text-base" htmlFor="title">
							Titel
						</label>
						<input
							className="text-gray-900 inline-flex h-8 w-full flex-1 items-center justify-center rounded px-3 text-[14px ]leading-none shadow-[0_0_0_1px] outline-none focus:shadow-[0_0_0_2px]"
							id="name"
							placeholder="Titel hier eingeben..."
							value={value}
							onChange={(event) => {
								event.preventDefault();
								setValue(event.target.value);
							}}
						/>
					</fieldset>
					<div className="mt-[25px] flex justify-end">
						<Dialog.Close asChild>
							<button
								type="button"
								className="bg-green-400 text-green-800 hover:bg-green-500 focus:shadow-green-700 inline-flex h-10 items-center justify-center rounded-lg px-[15px] font-medium leading-none focus:shadow-[0_0_0_2px] focus:outline-none"
								onClick={handleSubmit}
							>
								Erstellen
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
