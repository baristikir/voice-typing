/* Editor Controls
		- Search
		- Replace
		- Insert Headline
		- Insert Linebreak
*/
import { ChangeEvent, memo, useState } from "react";
import { Button } from "../ui/Button";
import { ArticleNyTimes, FloppyDisk, MagnifyingGlass, Paragraph } from "@phosphor-icons/react";
import { EditorMode } from "./useEditor";
import { AudioRecordingControl } from "./AudioRecordingControl";

interface Props {
	currentMode: EditorMode;
	onEditorModeChange(payload: EditorMode): void;
	onSaveContents(): void;
	onSearchQuery(query: string): void;
	onReplaceResults(replaceText: string, searchText: string, replaceAll?: boolean): void;
	handleInsertLineBreak(): void;
}
export const EditorControls = (props: Props) => {
	const [isSearchActive, setIsSearchActive] = useState(false);
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
	const handleSaveContents = () => {
		props.onSaveContents();
	};

	return (
		<div className="flex flex-col items-start justify-start gap-4 py-2 bg-gray-100 p-2 rounded-t-2xl border border-gray-200">
			<div className="flex items-center justify-between w-full">
				<div className="flex items-center gap-2">
					<AudioRecordingControl onEditorModeChange={props.onEditorModeChange} />
					<Button variant="outline" size="sm" onClick={props.handleInsertLineBreak}>
						<Paragraph className="w-4 h-4 mr-1" weight="regular" />
						Absatz einfügen
					</Button>
					<Button variant="outline" size="sm" disabled={props.currentMode === EditorMode.DICTATING}>
						<ArticleNyTimes className="w-4 h-4 mr-1" weight="regular" />
						Überschrift einfügen
					</Button>
					<Button
						variant={isSearchActive ? "default" : "outline"}
						size="sm"
						disabled={props.currentMode === EditorMode.DICTATING}
						onClick={() => setIsSearchActive(!isSearchActive)}
					>
						<MagnifyingGlass className="w-4 h-4 mr-1" weight="regular" />
						Suchen & Ersetzen
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={handleSaveContents}
						disabled={props.currentMode === EditorMode.DICTATING}
					>
						<FloppyDisk className="w-4 h-4 mr-1" weight="regular" />
						Transkript Speichern
					</Button>
				</div>
			</div>
			{isSearchActive ? (
				<div className="flex items-center gap-8">
					<div className="flex items-center gap-2">
						<Input
							value={searchQuery}
							onChange={handleSearchQueryChange}
							placeholder="Suche Eingabe"
						/>
						<Button size="sm" disabled={searchQuery.length <= 0} onClick={handleTriggerSearch}>
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
			) : null}
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
			className="w-72 h-9 bg-white flex items-center justify-start px-2 py-0.5 rounded-lg border border-gray-200 text-gray-900 placeholder:text-gray-400"
			placeholder={props.placeholder}
		/>
	),
);
