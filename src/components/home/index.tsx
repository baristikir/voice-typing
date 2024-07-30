import { Gear, MagnifyingGlass, Plus } from "@phosphor-icons/react";
import { Button } from "../ui/Button";
import { Link } from "react-router-dom";

const testDescription =
	"Lorem ipsum dolor sit amet consectetur adipisicing elit. Ipsam animi, eum provident est omnis ea doloribus repellat. Libero soluta delectus perspiciatis, incidunt, illo hic dolorem, eligendi animi optio eum facilis.";

interface Props {}
export function HomeContent(props: Props) {
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
				<DictationCard
					title="Test Skript #1"
					shortDescription={
						testDescription.substring(0, 100) +
						(testDescription.length > 100 ? "..." : "")
					}
					lastEdited="Vor 2 Tagen"
				/>
				<DictationCard
					title="Test Skript #2"
					shortDescription={
						testDescription.substring(0, 100) +
						(testDescription.length > 100 ? "..." : "")
					}
					lastEdited="Vor 7 Tagen"
				/>
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
						{props.lastEdited}
					</span>
				</div>
			</div>
		</div>
	);
};
