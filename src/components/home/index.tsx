import { FileAudio, Gear, MagnifyingGlass, Plus } from "@phosphor-icons/react";
import { Button } from "../ui/Button";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import dayjs from "../utils/dayjs";
import { api, QueryTranscriptsData, QueryUserPreferencesData } from "@/utils/rendererElectronAPI";
import { SettingsDialog } from "./SettingsDialog";
import { CreateNewTranscriptDialog } from "./CreateTranscriptDialog";
import { LoadingSectionspinner } from "../ui/LoadingSpinner";
import { useSetAtom } from "jotai";
import { handleUpdateAudioDeviceAtom } from "@/state/audioAtoms";
import { UserPreferences } from "@/shared/models";
import { ImportWarningDialog } from "../editor/ImportWarningDialog";

// Loads transcripts data from db on initial load.
function useDbTranscripts() {
	const [data, setData] = useState<QueryTranscriptsData>();
	const queryTranscripts = async () => {
		// Data is provided by IPC call
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

// Loads user preferences from the database on initial load
function useDbUserPreferences() {
	const [data, setData] = useState<QueryUserPreferencesData>();
	const [isLoading, setLoading] = useState(true);
	const queryUserPreferences = async () => {
		// Data is provided by IPC call
		const result = await api.getUserPreferences();
		setLoading(false);
		setData(result);
	};

	useEffect(() => {
		queryUserPreferences();
	}, []);

	const refetch = () => {
		queryUserPreferences();
	};

	const update = (data: UserPreferences) => {
		setData(data);
	};

	return {
		data,
		isLoading,
		refetch,
		update,
	};
}

interface Props {}
export function HomeContent(_: Props) {
	const navigate = useNavigate();
	// Fetch db datas
	const { data: transcriptsData } = useDbTranscripts();
	const { data: preferencesData, isLoading, update: updatePreferencesData } = useDbUserPreferences();

	const setDeviceId = useSetAtom(handleUpdateAudioDeviceAtom);
	const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
	const [isImportWarningOpen, setIsImportWarningOpen] = useState(false);
	const [isImportingFile, setIsImportingFile] = useState(false);

	useEffect(() => {
		if (preferencesData) {
			setDeviceId(preferencesData.deviceId);
		}
	}, [preferencesData]);

	const handleOpenSettingsDialog = () => setIsSettingsDialogOpen(true);
	const handleImportFileDialog = async () => {
		// File selection is provided by Electron via an API which has to be called from the main process.
		const filePath = await api.openDialog({
			properties: ["openFile"],
			// Enabling selection for only .wav files, since its required for whisper to work with.
			filters: [{ name: "Audio", extensions: ["wav"] }],
			title: "Audiodatei Importieren",
		});

		if (filePath) {
			setIsImportingFile(true);
		}

		try {
			const transcribedSegments = await api.transcribeFileInput(filePath.filePaths[0]);
			if (!transcribedSegments.segments || transcribedSegments.segments.length === 0) {
				// Update loading UI
				setIsImportingFile(false);
				// Transcription failed, show warning dialog with audio file criterias
				setIsImportWarningOpen(true);
				return;
			}

			if (transcribedSegments) {
				// Update loading UI
				setIsImportingFile(false);

				// Create new transcript in db and navigate to editor view
				const data = await api.createTranscript("Untitled", transcribedSegments);
				navigate(`transcripts/${String(data.id)}?languageId=${String(preferencesData.speechRecognitionLanguageId)}`);
			}
		} catch (error) {
			setIsImportingFile(false);
			console.error("File transcription failed abruptly.");
		}
	};

	return (
		<>
			{isImportingFile && (
				<div className="z-[999] absolute inset-0 w-full h-full bg-black/70 flex flex-col items-center justify-center gap-2 text-white">
					<LoadingSectionspinner size="sm" />
					<div className="flex flex-col items-center max-w-md">
						<h1 className="text-xl text-center font-semibold">Importierte Datei wird transkribiert...</h1>
						<h3 className="font-normal">(Anwendung nicht schliessen!)</h3>
					</div>
				</div>
			)}
			<div className="flex flex-col gap-6 w-full h-full">
				<div className="flex items-start justify-between w-full">
					<div className="flex flex-col gap-2">
						<h1 className="text-4xl font-semibold">Übersicht</h1>
						<div className="w-72 h-9 bg-gray-100 flex items-center justify-start px-2 py-0.5 rounded-xl text-gray-500">
							<MagnifyingGlass className="w-4 h-4 mr-2" />
							Skript suchen..
						</div>
					</div>

					<div className="flex items-center gap-1">
						<ImportWarningDialog isOpen={isImportWarningOpen} setIsOpen={setIsImportWarningOpen} />
						{!isLoading && (
							<SettingsDialog
								defaultValues={preferencesData}
								isOpen={isSettingsDialogOpen}
								setIsOpen={setIsSettingsDialogOpen}
								optimisticUpdater={updatePreferencesData}
							/>
						)}
						<Button size="sm" variant="default" onClick={handleImportFileDialog}>
							<FileAudio weight="fill" className="w-5 h-5 mr-1" />
							Audiodatei Importieren
						</Button>
						<Button size="sm" variant="default" onClick={handleOpenSettingsDialog}>
							<Gear weight="fill" className="w-4 h-4 mr-1" />
							Einstellungen
						</Button>
					</div>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full max-w-full">
					<CreateNewDictation />
					{preferencesData &&
						transcriptsData?.map((item) => {
							return (
								<DictationCard
									key={item.id}
									id={item.id}
									languageId={preferencesData.speechRecognitionLanguageId}
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
		</>
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
			<CreateNewTranscriptDialog isOpen={isOpen} setIsOpen={setIsOpen} onSubmit={handleCreateNewDictation} />
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
	// preferences
	languageId: number;
}
const DictationCard = (props: DictationCardProps) => {
	return (
		<Link
			to={`/transcripts/${String(props.id)}?languageId=${String(props.languageId)}`}
			className="h-64 col-span-1 flex flex-col items-start justify-between border rounded-2xl bg-white px-4 pt-6 pb-4 gap-2 drop-shadow-sm hover:bg-gray-100 cursor-pointer"
		>
			<div className="flex flex-col items-start">
				<h3 className="text-2xl font-semibold">{props.title}</h3>
				<span className="text-gray-700">{props.shortDescription}</span>
			</div>

			<div className="flex flex-col items-start gap-1">
				<span className="text-gray-500 text-sm">Zuletzt bearbeitet</span>
				<div className="flex items-start bg-gray-100 rounded-lg px-1.5 py-0.5 justify-center shrink-0">
					<span className="text-gray-600 text-sm font-medium ">{dayjs(props.lastEdited).fromNow()}</span>
				</div>
			</div>
		</Link>
	);
};
