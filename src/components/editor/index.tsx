import { api, QueryTranscriptByIdData } from "@/utils/rendererElectronAPI";
import { RecordControls } from "./RecordControls";
import { RecordingTranscriptions } from "./RecordingTranscriptions";
import { TitleWithInput } from "./TitleWithInput";
import {
	EditorAddContentAction,
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
			contents: [{ ...payload }],
		});
		console.log("api.updateTranscript(new): ", transcript);

		const recentContent = transcript.contents[transcript.contents.length - 1];
		handlers.onAddContent(recentContent);
	};

	const handleUpdateContent = async (
		payload: EditorUpdateContentAction["payload"],
	) => {
		const transcript = await api.updateTranscript({
			id: state.id,
			contents: [{ ...payload }],
		});
		console.log("api.updateTranscript(update): ", transcript);

		const recentContent = transcript.contents[transcript.contents.length - 1];
		handlers.onUpdateContent(recentContent);
	};

	return (
		<div className="flex flex-col gap-6 w-full h-full">
			<div className="flex items-center justify-between w-full">
				<TitleWithInput title={props.data.title} />
				<RecordControls />
			</div>
			<div>
				<RecordingTranscriptions
					editorMode={state.mode}
					contents={state.contents as TranscriptContent[]}
					onTitleChange={handlers.onTitleChange}
					onAddContent={handleAddContent}
					onUpdateContent={handleUpdateContent}
					onRemoveContent={handlers.onRemoveContent}
					onEditorModeChange={handlers.onModeChange}
				/>
			</div>
		</div>
	);
};
