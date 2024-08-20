import { api } from "@/utils/rendererElectronAPI";
import { RecordControls } from "./RecordControls";
import { RecordingTranscriptions } from "./RecordingTranscriptions";
import { TitleWithInput } from "./TitleWithInput";

type QueryTranscriptData = Awaited<ReturnType<typeof api.queryTranscriptById>>;

interface Props {
	data: QueryTranscriptData;
}

export const Editor = (props: Props) => {
	return (
		<div className="flex flex-col gap-6 w-full h-full">
			<div className="flex items-center justify-between w-full">
				<TitleWithInput title={props.data.title} />
				<RecordControls />
			</div>
			<div>
				<RecordingTranscriptions textContent={props.data.contents} />
			</div>
		</div>
	);
};
