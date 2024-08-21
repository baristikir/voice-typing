import {
	ArticleNyTimes,
	Clipboard,
	CursorText,
	Paragraph,
	Pause,
	Play,
} from "@phosphor-icons/react";
import { Button } from "../ui/Button";
import { EditorAddContentAction, EditorMode } from "./useEditor";
import { createParagraphText } from "./EditorElements";
import { TranscriptContentType } from "@/shared/models";

// DEVELOPMENT ONLY
export const TestSimulationControls = ({
	editorMode,
	resumeSimulation,
	pauseSimulation,
	exportToClipboard,
	insertIntoSelection,
	insertParagraph,
	insertHeadline,
}: {
	editorMode: EditorMode;
	resumeSimulation(): void;
	pauseSimulation(): void;
	exportToClipboard: () => void;
	insertIntoSelection: (text: string) => void;
	insertParagraph: () => void;
	insertHeadline: (text: string) => void;
}) => {
	return (
		<div className="flex items-center gap-2">
			<Button
				size="sm"
				variant="outline"
				disabled={editorMode !== EditorMode.DICTATING}
				onClick={pauseSimulation}
			>
				<Pause className="mr-2" weight="duotone" />
				Pause
			</Button>
			<Button
				size="sm"
				variant="outline"
				disabled={editorMode === EditorMode.DICTATING}
				onClick={resumeSimulation}
			>
				<Play className="mr-2" weight="duotone" />
				Resume
			</Button>
			<Button
				size="sm"
				variant="outline"
				disabled={editorMode === EditorMode.DICTATING}
				onClick={() => insertIntoSelection("Text")}
			>
				<CursorText className="mr-2" weight="regular" />
				Insert Text
			</Button>
			<Button
				size="sm"
				variant="outline"
				disabled={editorMode === EditorMode.DICTATING}
				onClick={insertParagraph}
			>
				<Paragraph className="mr-2" weight="regular" />
				Insert Paragraph
			</Button>
			<Button
				size="sm"
				variant="outline"
				disabled={editorMode === EditorMode.DICTATING}
				onClick={() => insertHeadline("Some Title")}
			>
				<ArticleNyTimes className="mr-2" weight="regular" />
				Insert Headline
			</Button>

			<Button
				size="sm"
				variant="outline"
				disabled={editorMode === EditorMode.DICTATING}
				onClick={exportToClipboard}
			>
				<Clipboard className="mr-2" weight="regular" />
				Copy to Clipboard
			</Button>
		</div>
	);
};

// DEVELOPMENT ONLY
export const Simulation = {
	testSegments: [
		"lorem ipsum dolor sit amet, consectetur adipiscing elit.",
		"Sed non risus. Suspendisse lectus tortor, dignissim sit amet, adipiscing nec, ultricies sed, dolor.",
		"Cras elementum ultrices diam. Maecenas ligula massa, varius a, semper congue, euismod non, mi.",
		"Proin porttitor, orci nec nonummy molestie, enim est eleifend mi, non fermentum diam nisl sit amet erat.",
		"Duis semper. Duis arcu massa, scelerisque vitae, consequat in, pretium a, enim.",
		"Pellentesque congue. Ut in risus volutpat libero pharetra tempor.",
	],
	simulateTranscription(
		textContainer: HTMLDivElement,
		currentIteration: number,
		onAddContent: (payload: EditorAddContentAction["payload"]) => void,
	) {
		const lastChild = textContainer.lastChild;
		const treeLength = textContainer.children.length;
		const isParagraphElement = lastChild?.nodeName === "P";
		const isBrElement = lastChild?.nodeName === "BR";
		const isPartial =
			(lastChild as HTMLParagraphElement)?.dataset.partial === "false";

		if (!lastChild || isBrElement || (isParagraphElement && isPartial)) {
			const segment = this.testSegments[currentIteration % 5];
			const paragraph = createParagraphText(
				segment,
				currentIteration % 5 !== 0,
			);
			textContainer.appendChild(paragraph);
		} else if (lastChild && isParagraphElement) {
			lastChild.textContent += ` ${this.testSegments[currentIteration % this.testSegments.length]}`;

			if (currentIteration % 5 === 0) {
				(lastChild as HTMLParagraphElement).dataset.partial = "false";
				onAddContent({
					type: TranscriptContentType.Paragraph,
					content: lastChild.textContent,
					order: treeLength,
				});
			}
		}
	},
};
