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
	// onReplacementQuery(query: string): void;
}
export const EditorControls = (props: Props) => {
	const [searchQuery, setSearchQuery] = useState("");
	const [replacementQuery, setReplacementQuery] = useState("");

	const handleTriggerSearch = () => {
		props.onSearchQuery(searchQuery);
	};
	const handleTriggerReplacement = () => {
		props.onSearchQuery(replacementQuery);
	};

	const handleSearchQueryChange = (event: ChangeEvent<HTMLInputElement>) => {
		setSearchQuery(event.currentTarget.value);
	};
	const handleReplacementQueryChange = (
		event: ChangeEvent<HTMLInputElement>,
	) => {
		setReplacementQuery(event.currentTarget.value);
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
					value={replacementQuery}
					onChange={handleReplacementQueryChange}
					className="w-72 h-9 bg-gray-100 flex items-center justify-start px-2 py-0.5 rounded-xl text-gray-500"
					placeholder="Ersetzen Eingabe"
				/>
				<Button
					size="sm"
					disabled={replacementQuery.length <= 0}
					onClick={handleTriggerReplacement}
				>
					Ersetzen
				</Button>
			</div>
		</div>
	);
};
