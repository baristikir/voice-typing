import {
	ArticleNyTimes,
	Clipboard,
	CursorText,
	Paragraph,
	Pause,
	Play,
} from "@phosphor-icons/react";
import cuid from "cuid";
import { Button } from "../ui/Button";
import { EditorMode } from "./useEditor";
import { createNewParagraph, createParagraph, createSpanText } from "./EditorElements";

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
	simulateTranscription(textContainer: HTMLDivElement, currentIteration: number) {
		const lastChild = textContainer.lastChild;
		const isParagraphElement = lastChild?.nodeName === "P";
		if (!lastChild || !isParagraphElement) {
			const segment = this.testSegments[currentIteration % 5];
			const paragraph = createNewParagraph({
				text: segment as string,
				isPartial: true,
			});
			textContainer.appendChild(paragraph);
			return;
		}

		const hasSpanChild = lastChild.lastChild.nodeName === "SPAN";
		const isPartial =
			hasSpanChild && (lastChild.lastChild as HTMLSpanElement).dataset.partial === "true";
		if (hasSpanChild && isPartial) {
			const segment = this.testSegments[currentIteration % 5];
			const paragraph = createNewParagraph({
				text: segment,
				isPartial: currentIteration % 5 !== 0,
			});
			textContainer.appendChild(paragraph);
			return;
		}

		if (isParagraphElement) {
			const hasSpanChild = lastChild.lastChild?.nodeName === "SPAN";
			const isPartial = (lastChild.lastChild as HTMLSpanElement)?.dataset?.partial === "true";

			if (hasSpanChild && isPartial) {
				lastChild.lastChild.textContent += ` ${this.testSegments[currentIteration % this.testSegments.length]}`;
				if (currentIteration % 5 === 0) {
					(lastChild.lastChild as HTMLSpanElement).dataset.partial = "false";
					lastChild.lastChild.dispatchEvent(
						new CustomEvent("programmaticTextChange", { bubbles: true }),
					);
				}
			} else if (hasSpanChild) {
				const segment = this.testSegments[currentIteration % 5];
				const span = createSpanText(segment, {
					id: cuid(),
					partial: String(currentIteration % 5 !== 0),
				});
				// append new span to latest paragraph
				lastChild.appendChild(span);
			}
		}

		// if (!lastChild || isBrElement) {
		// 	const segment = this.testSegments[currentIteration % 5];
		// 	const span = createSpanText(segment, {
		// 		id: cuid(),
		// 		partial: String(currentIteration % 5 !== 0),
		// 	});

		// 	if (isParagraphElement) {
		// 		textContainer.lastChild.appendChild(span);
		// 		return;
		// 	}

		// 	textContainer.appendChild(span);
		// } else if (lastChild && isParagraphElement) {
		// 	lastChild.textContent += ` ${this.testSegments[currentIteration % this.testSegments.length]}`;

		// 	if (currentIteration % 5 === 0) {
		// 		(lastChild as HTMLParagraphElement).dataset.partial = "false";

		// 		// Dispatch custom event
		// 		lastChild.dispatchEvent(new CustomEvent("programmaticTextChange", { bubbles: true }));
		// 	}
		// }
	},
};
