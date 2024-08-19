import { Gear, MagnifyingGlass, Plus } from "@phosphor-icons/react";
import { Button } from "../ui/Button";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import dayjs from "../utils/dayjs";

type QueryTranscripts = Awaited<
	ReturnType<typeof window.electronAPI.queryTranscripts>
>;
function useDbTranscripts() {
	const [data, setData] = useState<QueryTranscripts>();
	const queryTranscripts = async () => {
		const result = await window.electronAPI.queryTranscripts();
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
					<Button variant="default">
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
							title={item.title}
							shortDescription={
								item.text.substring(0, 100) +
								(item.text.length > 100 ? "..." : "")
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
	return (
		<Link
			to={"/new-dictation"}
			className="h-64 w-full col-span-1 flex flex-col items-center justify-center p-6 gap-4 border bg-gray-50 shadow-sm rounded-2xl text-gray-500 hover:bg-gray-100 transition-colors duration-100"
		>
			<Plus weight="bold" className="w-5 h-5" />
			<h3 className="font-normal text-lg text-center">
				Neue Diktieraufnahme beginnen
			</h3>
		</Link>
	);
};

interface DictationCardProps {
	title: string;
	// max 14 words
	shortDescription: string;
	lastEdited: string;
}
const DictationCard = (props: DictationCardProps) => {
	return (
		<div className="h-64 col-span-1 flex flex-col items-start justify-between border rounded-2xl bg-white px-4 pt-6 pb-4 gap-2 shadow-sm">
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
		</div>
	);
};
