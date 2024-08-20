import { useEffect, useState } from "react";
import { Editor } from "../editor";

type QueryTranscript = Awaited<
	ReturnType<typeof window.electronAPI.queryTranscriptById>
>;
function useDbTranscript(id: number) {
	const [data, setData] = useState<QueryTranscript>();
	const queryTranscripts = async () => {
		const result = await window.electronAPI.queryTranscriptById(id);
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

interface Props {
	id: number;
}
export function TranscriptContent(props: Props) {
	const { data } = useDbTranscript(props.id);
	if (!data) {
		return <span>Loading..</span>;
	}

	return <Editor data={data} />;
}
