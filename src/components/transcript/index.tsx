import { useEffect, useState } from "react";
import { Editor } from "../editor";
import { api, QueryTranscriptByIdData } from "@/utils/rendererElectronAPI";

function useDbTranscript(id: number) {
	const [data, setData] = useState<QueryTranscriptByIdData>();
	const queryTranscripts = async () => {
		const result = await api.queryTranscriptById(id);
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
