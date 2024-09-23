import clsx from "clsx";
import { EditorMode } from "./useEditor";
import { WhisperModelLanguage } from "../home/SettingsDialog";

interface Props {
	editorMode: EditorMode;
	language: WhisperModelLanguage;
}
export const StatusBar = (props: Props) => (
	<div className="flex-end">
		<div className="flex justify-end items-center w-full px-2 gap-2 divide-x">
			<div className="flex items-center">
				<span className="mr-2 text-sm">Sprache:</span>
				<span className="font-mono text-white text-xs px-2 py-1 rounded-md bg-gray-950">
					{props.language === WhisperModelLanguage.English ? "English" : "Deutsch"}
				</span>
			</div>
			<div className="flex items-center pl-2">
				<span className="mr-2 text-sm">Status:</span>
				<span
					className={clsx("font-mono text-white text-xs px-2 py-1 rounded-md", {
						"bg-blue-500": props.editorMode === EditorMode.DICTATING,
						"bg-red-500": props.editorMode === EditorMode.EDITING,
						"bg-yellow-500": props.editorMode === EditorMode.SELECTION,
					})}
				>
					{props.editorMode === EditorMode.DICTATING
						? "Diktiermodus"
						: props.editorMode === EditorMode.EDITING
							? "Bearbeitung"
							: "Auswahl"}
				</span>
			</div>
		</div>
	</div>
);
