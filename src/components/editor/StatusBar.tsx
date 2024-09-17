import clsx from "clsx";
import { EditorMode } from "./useEditor";

interface Props {
	editorMode: EditorMode;
}
export const StatusBar = (props: Props) => (
	<div className="flex-end">
		<div className="flex justify-end w-full">
			<span
				className={clsx("font-mono text-white uppercase text-xs px-2 py-1 rounded", {
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
);
