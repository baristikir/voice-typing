import { TitleWithInput } from "./TitleWithInput";
import { RecordControls } from "./RecordControls";
import { RecordingTranscriptions } from "./RecordingTranscriptions";

interface Props {}
export function NewDictationContent(_: Props) {
	return (
		<div className="flex flex-col gap-6 w-full h-full">
			<div className="flex items-center justify-between w-full">
				<TitleWithInput />
				<RecordControls />
			</div>
			<div>
				<RecordingTranscriptions />
			</div>
		</div>
	);
}
