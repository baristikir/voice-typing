/* Editor Controls
		- Search
		- Replace
		- Insert Headline
		- Insert Linebreak
*/

import { ChangeEvent, useState } from "react";
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
				<input
					type="text"
					value={searchQuery}
					onChange={handleSearchQueryChange}
					className="w-72 h-9 bg-gray-100 flex items-center justify-start px-2 py-0.5 rounded-xl text-gray-500"
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
				<input
					type="text"
					value={replaceQuery}
					onChange={handleReplaceQueryChange}
					className="w-72 h-9 bg-gray-100 flex items-center justify-start px-2 py-0.5 rounded-xl text-gray-500"
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
