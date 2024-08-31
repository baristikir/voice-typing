import { api, QueryTranscriptByIdData } from "@/utils/rendererElectronAPI";
import { RecordControls } from "./RecordControls";
import { RecordingTranscriptions } from "./RecordingTranscriptions";
import { TitleWithInput } from "./TitleWithInput";
import {
	EditorAddContentAction,
	EditorRemoveContentAction,
	EditorUpdateContentAction,
	useEditor,
} from "./useEditor";
import { TranscriptContent } from "@/shared/models";

interface Props {
	data: QueryTranscriptByIdData;
}

export const Editor = (props: Props) => {
	const { state, ...handlers } = useEditor(props.data);
	// console.log("[ Editor ] editor state: ", state);

	const handleAddContent = async (
		payload: EditorAddContentAction["payload"],
	) => {
		const transcript = await api.updateTranscript({
			id: state.id,
			contents: [{ ...payload, actionKind: "insert" }],
		});
		console.log("api.updateTranscript(insert): ", transcript);

		const recentContent = transcript.contents[transcript.contents.length - 1];
		handlers.onAddContent(recentContent);
	};

	const handleUpdateContent = async (
		payload: EditorUpdateContentAction["payload"],
	) => {
		const transcript = await api.updateTranscript({
			id: state.id,
			contents: [{ ...payload, actionKind: "update" }],
		});
		console.log("api.updateTranscript(update): ", transcript);

		const recentContent = transcript.contents[transcript.contents.length - 1];
		handlers.onUpdateContent(recentContent);
	};

	const handleRemoveContent = async (
		payload: EditorRemoveContentAction["payload"],
	) => {
		const transcript = await api.updateTranscript({
			id: state.id,
			contents: [{ ...payload, actionKind: "delete" }],
		});
		console.log("api.updateTranscript(delete): ", transcript);
		handlers.onRemoveContent(payload);
	};

	return (
		<div className="flex flex-col gap-6 w-full h-full">
			<div className="flex items-center justify-between w-full">
				<TitleWithInput title={props.data.title} />
				<RecordControls onEditorModeChange={handlers.onModeChange} />
			</div>
			<div>
				<RecordingTranscriptions
					editorMode={state.mode}
					contents={state.contents as TranscriptContent[]}
					onAddContent={handleAddContent}
					onUpdateContent={handleUpdateContent}
					onRemoveContent={handleRemoveContent}
					onEditorModeChange={handlers.onModeChange}
				/>
			</div>
		</div>
	);
};
