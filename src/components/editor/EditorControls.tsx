/* Editor Controls
		- Search
		- Replace
		- Insert Headline
		- Insert Linebreak
*/
import { ChangeEvent, memo, useState } from "react";
import { Button } from "../ui/Button";

interface Props {
	onSearchQuery(query: string): void;
	onReplaceResults(
		replaceText: string,
		searchText: string,
		replaceAll?: boolean,
	): void;
}
export const EditorControls = (props: Props) => {
	const [searchQuery, setSearchQuery] = useState("");
	const [replaceQuery, setReplaceQuery] = useState("");

	const handleTriggerSearch = () => {
		props.onSearchQuery(searchQuery);
	};
	const handleTriggerReplacement = (replaceAll: boolean = false) => {
		props.onReplaceResults(replaceQuery, searchQuery, replaceAll);
	};

	const handleSearchQueryChange = (event: ChangeEvent<HTMLInputElement>) => {
		setSearchQuery(event.currentTarget.value);
	};
	const handleReplaceQueryChange = (event: ChangeEvent<HTMLInputElement>) => {
		setReplaceQuery(event.currentTarget.value);
	};

	return (
		<div className="flex items-center justify-start gap-4 py-2">
			<div className="flex items-center gap-2">
				<Input
					value={searchQuery}
					onChange={handleSearchQueryChange}
					placeholder="Suche Eingabe"
				/>
				<Button
					size="sm"
					disabled={searchQuery.length <= 0}
					onClick={handleTriggerSearch}
				>
					Suchen
				</Button>
			</div>
			<div className="flex items-center gap-2">
				<Input
					value={replaceQuery}
					onChange={handleReplaceQueryChange}
					placeholder="Ersetzen Eingabe"
				/>
				<Button
					size="sm"
					disabled={replaceQuery.length <= 0}
					onClick={() => handleTriggerReplacement(false)}
				>
					Ersetzen
				</Button>
				<Button
					size="sm"
					disabled={replaceQuery.length <= 0}
					onClick={() => handleTriggerReplacement(true)}
				>
					Alle Ersetzen
				</Button>
			</div>
		</div>
	);
};

const Input = memo(
	(props: {
		value: string;
		onChange(e: ChangeEvent<HTMLInputElement>): void;
		placeholder: string;
	}) => (
		<input
			type="text"
			value={props.value}
			onChange={props.onChange}
			className="w-72 h-9 bg-gray-100 flex items-center justify-start px-2 py-0.5 rounded-xl text-gray-500"
			placeholder={props.placeholder}
		/>
	),
);
