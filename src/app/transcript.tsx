import { TranscriptContent } from "@/components/transcript";
import { useParams } from "react-router-dom";

export function TranscriptRoute() {
	const params = useParams();
	return <TranscriptContent id={parseInt(params.transcript_id)} />;
}
