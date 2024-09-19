import { api, QueryTranscriptByIdData } from "@/utils/rendererElectronAPI";
import { EditorHeader } from "./EditorHeader";
import { RecordingTranscriptions } from "./RecordingTranscriptions";
import {
	EditorAddContentAction,
	EditorRemoveContentAction,
	EditorSaveContentsAction,
	EditorUpdateContentAction,
	useEditor,
} from "./useEditor";
import { TranscriptContent } from "@/shared/models";
import { useEffect } from "react";

interface Props {
	data: QueryTranscriptByIdData;
}

function startSpeechToTextService() {
	console.log("[ Editor ]: Starting SST Service");
	api.start();
}

function stopSpeechToTextService() {
	console.log("[ Editor ]: Stoping SST Service");
	api.stop();
}

export const Editor = (props: Props) => {
	const { state, ...handlers } = useEditor(props.data);
	// console.log("[ Editor ] editor state: ", state);

	useEffect(() => {
		startSpeechToTextService();
		return () => {
			stopSpeechToTextService();
		};
	}, []);
	const handleAddContent = async (payload: EditorAddContentAction["payload"]) => {
		const transcript = await api.updateTranscript({
			id: state.id,
			contents: [{ ...payload, actionKind: "insert" }],
		});
		console.log("api.updateTranscript(insert): ", transcript);

		const recentContent = transcript.contents[transcript.contents.length - 1];
		handlers.onAddContent(recentContent);
	};

	const handleUpdateTranscript = async (payload: string) => {
		const transcript = await api.updateTranscript({
			id: state.id,
			title: payload,
		});
		console.log("api.updateTranscript(title_update): ", transcript);

		handlers.onTitleChange(transcript.title);
	};

	const handleUpdateContent = async (payload: EditorUpdateContentAction["payload"]) => {
		const transcript = await api.updateTranscript({
			id: state.id,
			contents: [{ ...payload, actionKind: "update" }],
		});
		console.log("api.updateTranscript(update): ", transcript);

		const recentContent = transcript.contents[transcript.contents.length - 1];
		handlers.onUpdateContent(recentContent);
	};

	const handleRemoveContent = async (payload: EditorRemoveContentAction["payload"]) => {
		const transcript = await api.updateTranscript({
			id: state.id,
			contents: [{ ...payload, actionKind: "delete" }],
		});
		console.log("api.updateTranscript(delete): ", transcript);
		handlers.onRemoveContent(payload);
	};

	const handleSaveContents = async (payload: EditorSaveContentsAction["payload"]) => {
		const dbStatus = await api.saveTranscriptContents({
			id: state.id,
			contents: payload,
		});
		console.log("api.saveTranscriptContents(): ", dbStatus);
		handlers.onSaveContents(payload);
	};

	return (
		<div className="flex flex-col gap-6 w-full h-full">
			<EditorHeader id={state.id} title={state.title} onTitleChange={handleUpdateTranscript} />
			<RecordingTranscriptions
				editorMode={state.mode}
				contents={state.contents as TranscriptContent[]}
				onAddContent={handleAddContent}
				onUpdateContent={handleUpdateContent}
				onRemoveContent={handleRemoveContent}
				onSaveContents={handleSaveContents}
				onEditorModeChange={handlers.onModeChange}
			/>
		</div>
	);
};
