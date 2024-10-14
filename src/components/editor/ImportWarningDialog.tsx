import * as Dialog from "@radix-ui/react-dialog";
import { X } from "@phosphor-icons/react";

interface Props {
	isOpen: boolean;
	setIsOpen: (value: boolean) => void;
}

export const ImportWarningDialog = (props: Props) => {
	return (
		<Dialog.Root open={props.isOpen} onOpenChange={props.setIsOpen}>
			<Dialog.Portal>
				<Dialog.Overlay className="bg-black/30 data-[state=open]:animate-overlayShow fixed inset-0 z-[90]" />
				<Dialog.Content className="no-drag data-[state=open]:animate-contentShow fixed top-[50%] left-[50%] max-h-[85vh] w-[90vw] max-w-[450px] translate-x-[-50%] translate-y-[-50%] rounded-2xl bg-white p-6 focus:outline-none z-[100] overflow-auto">
					<Dialog.Title className="text-gray-900 m-0 text-lg font-medium">Audiodatei importieren</Dialog.Title>
					<Dialog.Description className="text-gray-600 mt-2 mb-2 text-base leading-normal">
						Es sind nur Audiodateien gültig die eine Abtastrate von 16kHz und Mono-Audio-Channel Kriterien erfüllen.
					</Dialog.Description>
					<div className="mt-[25px] flex justify-end">
						<Dialog.Close asChild>
							<button
								type="button"
								className="bg-orange-300 text-orange-800 hover:bg-orange-500 focus:shadow-orange-700 inline-flex h-10 items-center justify-center rounded-lg px-[15px] font-medium leading-none focus:shadow-[0_0_0_2px] focus:outline-none"
							>
								Schließen
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
