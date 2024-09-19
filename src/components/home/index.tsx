import { Gear, MagnifyingGlass, Plus, X } from "@phosphor-icons/react";
import { Button } from "../ui/Button";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import dayjs from "../utils/dayjs";
import { api } from "@/utils/rendererElectronAPI";
import * as Dialog from "@radix-ui/react-dialog";

type QueryTranscripts = Awaited<ReturnType<typeof api.queryTranscripts>>;

function useDbTranscripts() {
	const [data, setData] = useState<QueryTranscripts>();
	const queryTranscripts = async () => {
		const result = await api.queryTranscripts();
		setData(result);
	};

	useEffect(() => {
		queryTranscripts();
	}, []);

	const refetch = () => {
		queryTranscripts();
	};

	return {
		data,
		refetch,
	};
}

interface Props {}
export function HomeContent(_: Props) {
	const { data } = useDbTranscripts();
	const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
	const handleOpenSettingsDialog = () => setIsSettingsDialogOpen(true);

	return (
		<div className="flex flex-col gap-6 w-full h-full">
			<div className="flex items-start justify-between w-full">
				<div className="flex flex-col gap-2">
					<h1 className="text-4xl font-semibold">Übersicht</h1>
					<div className="w-72 h-9 bg-gray-100 flex items-center justify-start px-2 py-0.5 rounded-xl text-gray-500">
						<MagnifyingGlass className="w-4 h-4 mr-2" />
						Skript suchen..
					</div>
				</div>

				<div>
					<SettingsDialog isOpen={isSettingsDialogOpen} setIsOpen={setIsSettingsDialogOpen} />
					<Button variant="default" onClick={handleOpenSettingsDialog}>
						<Gear weight="fill" className="w-4 h-4 mr-1" />
						Einstellungen
					</Button>
				</div>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-4xl">
				<CreateNewDictation />
				{data?.map((item) => {
					return (
						<DictationCard
							key={item.id}
							id={item.id}
							title={item.title}
							shortDescription={
								item.contents?.[0]?.content?.substring(0, 100) +
								(item.contents?.[0]?.content?.length > 100 ? "..." : "")
							}
							lastEdited={item.updatedAt}
						/>
					);
				})}
			</div>
		</div>
	);
}

const CreateNewDictation = () => {
	const navigate = useNavigate();
	const [isOpen, setIsOpen] = useState(false);

	const handleOpenDialog = () => setIsOpen(true);
	const handleCreateNewDictation = async (title?: string) => {
		const data = await api.createTranscript(title ?? "Untitled");
		navigate(`transcripts/${String(data.id)}`);
	};

	return (
		<>
			<CreateNewTranscriptDialog
				isOpen={isOpen}
				setIsOpen={setIsOpen}
				onSubmit={handleCreateNewDictation}
			/>
			<button
				type="button"
				onClick={handleOpenDialog}
				className="h-64 w-full col-span-1 flex flex-col items-center justify-center p-6 gap-4 border bg-gray-50 shadow-sm rounded-2xl text-gray-500 hover:bg-gray-100 transition-colors duration-100"
			>
				<Plus weight="bold" className="w-5 h-5" />
				<h3 className="font-normal text-lg text-center">Neue Diktieraufnahme beginnen</h3>
			</button>
		</>
	);
};

interface DictationCardProps {
	id: number;
	title: string;
	// max 14 words
	shortDescription: string;
	lastEdited: Date;
}
const DictationCard = (props: DictationCardProps) => {
	return (
		<Link
			to={`/transcripts/${String(props.id)}`}
			className="h-64 col-span-1 flex flex-col items-start justify-between border rounded-2xl bg-white px-4 pt-6 pb-4 gap-2 shadow-sm hover:bg-gray-100 cursor-pointer"
		>
			<div className="flex flex-col items-start">
				<h3 className="text-2xl font-semibold">{props.title}</h3>
				<span className="text-gray-700">{props.shortDescription}</span>
			</div>

			<div className="flex flex-col items-start gap-1">
				<span className="text-gray-500 text-sm">Zuletzt bearbeitet</span>
				<div className="flex items-start bg-gray-100 rounded-lg px-1.5 py-0.5 justify-center shrink-0">
					<span className="text-gray-600 text-sm font-medium ">
						{dayjs(props.lastEdited).fromNow()}
					</span>
				</div>
			</div>
		</Link>
	);
};

const CreateNewTranscriptDialog = (props: {
	isOpen: boolean;
	setIsOpen: (value: boolean) => void;
	onSubmit: (title?: string) => void;
}) => {
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

enum WhisperModelLanguage {
	English = "en",
	German = "de",
}
const SettingsDialog = (props: { isOpen: boolean; setIsOpen: (value: boolean) => void }) => {
	const [language, setLanguage] = useState(WhisperModelLanguage.English);

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
					<Dialog.Title className="text-gray-900 m-0 text-[17px] font-medium">
						Einstellungen
					</Dialog.Title>
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
