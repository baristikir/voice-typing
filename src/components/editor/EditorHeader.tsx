import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { PencilSimple, X } from "@phosphor-icons/react";
import { EditorSetTitleAction } from "./useEditor";
import { Button } from "../ui/Button";
import { TranscriptTitle } from "./TranscriptTitle";
import { Trash } from "@phosphor-icons/react/dist/ssr";
import { api } from "@/utils/rendererElectronAPI";

interface Props {
	id: number;
	title: string;
	onTitleChange: (payload: EditorSetTitleAction["payload"]) => void;
}
export const EditorHeader = (props: Props) => {
	const navigate = useNavigate();
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

	const handleUpdateTranscript = async (title?: string) => {
		props.onTitleChange(title);
	};

	const handleDeleteTranscript = async () => {
		await api.deleteTranscript(props.id);
		navigate("/");
	};

	return (
		<div className="flex items-center justify-between w-full">
			<TranscriptTitle title={props.title} />
			<div className="flex gap-2 items-center">
				<DeleteTranscriptDialog
					isOpen={isDeleteDialogOpen}
					setIsOpen={setIsDeleteDialogOpen}
					onSubmit={handleDeleteTranscript}
				/>
				<Button size="sm" variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}>
					<Trash weight="fill" className="w-4 h-4 mr-1" />
					Transkript Löschen
				</Button>
				<EditTranscriptDialog
					isOpen={isEditDialogOpen}
					setIsOpen={setIsEditDialogOpen}
					title={props.title}
					onSubmit={handleUpdateTranscript}
				/>
				<Button size="sm" variant="default" onClick={() => setIsEditDialogOpen(true)}>
					<PencilSimple weight="fill" className="w-4 h-4 mr-1" />
					Titel bearbeiten
				</Button>
				<Link to={"/"}>
					<Button size="sm" variant="default">
						Beenden
					</Button>
				</Link>
			</div>
		</div>
	);
};

const DeleteTranscriptDialog = (props: {
	isOpen: boolean;
	setIsOpen: (value: boolean) => void;
	onSubmit: () => void;
}) => {
	const handleSubmit = () => {
		props.onSubmit();
	};

	return (
		<AlertDialog.Root open={props.isOpen} onOpenChange={props.setIsOpen}>
			<AlertDialog.Portal>
				<AlertDialog.Overlay className="bg-black/60 data-[state=open]:animate-overlayShow fixed inset-0 z-[90]" />
				<AlertDialog.Content className="no-drag data-[state=open]:animate-contentShow fixed top-[50%] left-[50%] max-h-[85vh] w-[90vw] max-w-[450px] translate-x-[-50%] translate-y-[-50%] rounded-2xl bg-white p-6 focus:outline-none z-[100]">
					<AlertDialog.Title className="text-gray-900 m-0 text-[17px] font-medium">
						Transkript Löschen
					</AlertDialog.Title>
					<AlertDialog.Description className="text-mauve11 mt-4 mb-5 text-[15px] leading-normal">
						Bist du dir sicher? Diese Aktion kann nicht rückgängig gemacht werden.
					</AlertDialog.Description>
					<div className="flex justify-end gap-5">
						<AlertDialog.Cancel asChild>
							<Button>Abbrechen</Button>
						</AlertDialog.Cancel>
						<AlertDialog.Action onClick={handleSubmit} asChild>
							<Button variant="destructive">Ja, ich bin mir sicher</Button>
						</AlertDialog.Action>
					</div>
				</AlertDialog.Content>
			</AlertDialog.Portal>
		</AlertDialog.Root>
	);
};

const EditTranscriptDialog = (props: {
	isOpen: boolean;
	title: string;
	setIsOpen: (value: boolean) => void;
	onSubmit: (title?: string) => void;
}) => {
	const [value, setValue] = useState(props.title);

	const handleSubmit = () => {
		props.onSubmit(value.length > 0 ? value : undefined);
	};

	return (
		<Dialog.Root open={props.isOpen} onOpenChange={props.setIsOpen}>
			<Dialog.Portal>
				<Dialog.Overlay className="bg-black/30 data-[state=open]:animate-overlayShow fixed inset-0 z-[90]" />
				<Dialog.Content className="no-drag data-[state=open]:animate-contentShow fixed top-[50%] left-[50%] max-h-[85vh] w-[90vw] max-w-[450px] translate-x-[-50%] translate-y-[-50%] rounded-2xl bg-white p-6 focus:outline-none z-[100]">
					<Dialog.Title className="text-gray-900 m-0 text-[17px] font-medium">
						Transkript Bearbeiten
					</Dialog.Title>
					<Dialog.Description className="text-gray-600 mt-[10px] mb-5 text-[15px] leading-normal">
						Wähle einen neuen Titel für das Transkript aus.
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
