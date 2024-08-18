import { useRef, useState, useEffect } from "react";
import { Button } from "../ui/Button";
import {
	ArticleNyTimes,
	Clipboard,
	CursorText,
	Paragraph,
	Pause,
	Play,
} from "@phosphor-icons/react";
import clsx from "clsx";

const IS_SIMULATION_MODE = true;
const TRANSCRIPTION_RATE_IN_MS = 300;

async function getLatestTranscription() {
	const newTranscription = await window.electronAPI.getTranscription();
	return newTranscription;
}

function createParagraphText(textContent: string, isPartial: boolean) {
	const paragraph = document.createElement("p");
	paragraph.textContent = " " + textContent;
	paragraph.id = `segment-${new Date().getTime()}`;
	paragraph.className =
		"text-xl text-gray-950 data-[partial=true]:text-gray-400 data-[partial=true]:font-light";
	paragraph.dataset.partial = `${isPartial}`;

	return paragraph;
}
function createHeadline1(textContent: string) {
	const h1 = document.createElement("h1");
	h1.textContent = textContent;
	h1.className = "text-3xl font-semibold text-gray-950 mt-4";
	return h1;
}
function createLineBreak() {
	const br = document.createElement("br");
	return br;
}

export type RecorderProcessorMessageData = {
	recordBuffer: Float32Array[];
	sampleRate: number;
	currentFrame: number;
};

export enum EditorState {
	DICTATING,
	EDITING,
	SELECTION,
}

interface Props {}
export const RecordingTranscriptions = (_: Props) => {
	const textContainerRef = useRef<HTMLDivElement>(null);
	const [editorState, setEditorState] = useState(EditorState.DICTATING);

	// Register Transcription/Simulation Processes
	useEffect(() => {
		if (!textContainerRef.current) return;

		let sim_i = 1;
		let timer = setInterval(async () => {
			if (IS_SIMULATION_MODE) {
				Simulation.simulateTranscription(textContainerRef.current, sim_i);
				sim_i++;
				return;
			}

			let newTranscriptions = await getLatestTranscription();
			if (!newTranscriptions) return;
			insertTranscripts(newTranscriptions);
		}, TRANSCRIPTION_RATE_IN_MS);

		if (editorState !== EditorState.DICTATING) {
			clearInterval(timer);
			return;
		}

		return () => {
			clearInterval(timer);
		};
	}, [editorState]);

	// Register Selection Listeners
	useEffect(() => {
		const checkSelection = (_: Event) => {
			const selection = window.getSelection();
			const range = window.getSelection().rangeCount;
			if (range < 0 || selection.isCollapsed) {
				setEditorState(EditorState.EDITING);
			}

			const rangeAt = window.getSelection()?.getRangeAt(0);

			// console.log({
			// 	type: _.type,
			// 	collapsed: rangeAt?.collapsed,
			// });

			if (!rangeAt.collapsed) setEditorState(EditorState.SELECTION);
			else setEditorState(EditorState.EDITING);
		};

		document.addEventListener("selectionchange", checkSelection);

		return () => {
			document.removeEventListener("selectionchange", checkSelection);
		};
	}, []);

	const getCurrentCursorState = () => {
		const selection = window.getSelection();
		if (selection.rangeCount === 0) return; // no selection was made

		const range = selection.getRangeAt(0);
		range.deleteContents();

		return {
			insertTextContent: (text: string) => {
				// insert new text content into selected range
				const textNode = document.createTextNode(text);

				const startContainer = range.startContainer;
				const endContainer = range.endContainer;
				const commonAnchestor = range.commonAncestorContainer;

				let targetNode: Node;

				if (
					commonAnchestor.nodeType === Node.ELEMENT_NODE &&
					(commonAnchestor as any).tagName === "P" &&
					startContainer === commonAnchestor.firstChild &&
					endContainer === commonAnchestor.lastChild
				) {
					targetNode = commonAnchestor;
					range.deleteContents();
				} else {
					targetNode = startContainer;
					range.deleteContents();
				}

				if (targetNode.nodeType === Node.TEXT_NODE) {
					targetNode.parentNode.insertBefore(textNode, targetNode);
				} else {
					targetNode.appendChild(textNode);
				}

				range.setStartAfter(textNode);
				range.setEndAfter(textNode);
				selection.removeAllRanges();
				selection.addRange(range);
			},
		};
	};

	const insertIntoSelection = (textContent: string) => {
		const currentSelection = getCurrentCursorState();
		if (!currentSelection) return;

		currentSelection.insertTextContent(textContent);
	};

	const insertParagraph = () => {
		const textContainer = textContainerRef.current;
		if (!textContainer) return;

		const br = createLineBreak();
		textContainer.appendChild(br);
	};

	const insertHeadline = (textContent: string) => {
		const textContainer = textContainerRef.current;
		if (!textContainer) return;

		const br1 = createLineBreak();
		const br2 = createLineBreak();
		const h1 = createHeadline1(textContent);

		textContainer.appendChild(br1);
		textContainer.appendChild(h1);
		textContainer.appendChild(br2);
	};

	const insertTranscripts = (
		newTranscriptions: Awaited<
			ReturnType<typeof window.electronAPI.getTranscription>
		>,
	) => {
		for (let i = 0; i < newTranscriptions.segments.length; i++) {
			const textContainer = textContainerRef.current;
			if (!textContainer) return;

			const segment = newTranscriptions.segments[i];
			const lastText = textContainer.lastChild as HTMLParagraphElement;

			if (!lastText || lastText.dataset.partial === "false") {
				const paragraph = createParagraphText(segment.text, segment.isPartial);
				textContainerRef.current.appendChild(paragraph);
			} else {
				lastText.textContent = segment.text;
				if (!segment.isPartial) {
					lastText.dataset.partial = "false";
				}
			}
		}
	};

	const copyTextContentsToClipboard = () => {
		if (!textContainerRef.current) return;

		const textContainerChildren = textContainerRef.current.children;
		const texts: string[] = [];

		Array.from(textContainerChildren).forEach((child, index) => {
			const { tagName, textContent } = child;
			const prevChild = textContainerChildren[index - 1];

			if (tagName === "H1") {
				texts.push(textContent);
				return;
			}

			if (tagName === "BR") {
				texts.push(" ");
				return;
			}

			if (tagName === "P") {
				if (!prevChild || prevChild.tagName !== "P") {
					texts.push(textContent);
				} else {
					texts[texts.length - 1] += textContent;
				}
			}
		});

		const text = texts.join("\n");
		navigator.clipboard.writeText(text);
	};

	const pauseDictation = () => {
		setEditorState(EditorState.EDITING);
	};

	const resumeDictation = () => {
		setEditorState(EditorState.DICTATING);
	};

	return (
		<div>
			<div className="flex-end">
				<div className="flex justify-end w-full">
					<span
						className={clsx(
							"font-mono text-white uppercase text-sm px-2 py-1",
							{
								"bg-blue-500": editorState === EditorState.DICTATING,
								"bg-red-500": editorState === EditorState.EDITING,
								"bg-yellow-500": editorState === EditorState.SELECTION,
							},
						)}
					>
						{editorState === EditorState.DICTATING
							? "Diktiermodus"
							: editorState === EditorState.EDITING
								? "Bearbeitung"
								: "Auswahl"}
					</span>
				</div>
			</div>
			<div className="flex flex-col gap-2">
				<TestSimulationControls
					editorState={editorState}
					pauseSimulation={pauseDictation}
					resumeSimulation={resumeDictation}
					exportToClipboard={copyTextContentsToClipboard}
					insertIntoSelection={insertIntoSelection}
					insertParagraph={insertParagraph}
					insertHeadline={insertHeadline}
				/>
				<div
					contentEditable={editorState !== EditorState.DICTATING}
					ref={textContainerRef}
				></div>
			</div>
		</div>
	);
};

// DEVELOPMENT ONLY
const TestSimulationControls = ({
	editorState,
	resumeSimulation,
	pauseSimulation,
	exportToClipboard,
	insertIntoSelection,
	insertParagraph,
	insertHeadline,
}: {
	editorState: EditorState;
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
				disabled={editorState !== EditorState.DICTATING}
				onClick={pauseSimulation}
			>
				<Pause className="mr-2" weight="duotone" />
				Pause
			</Button>
			<Button
				size="sm"
				variant="outline"
				disabled={editorState === EditorState.DICTATING}
				onClick={resumeSimulation}
			>
				<Play className="mr-2" weight="duotone" />
				Resume
			</Button>
			<Button
				size="sm"
				variant="outline"
				disabled={editorState === EditorState.DICTATING}
				onClick={() => insertIntoSelection("Text")}
			>
				<CursorText className="mr-2" weight="regular" />
				Insert Text
			</Button>
			<Button
				size="sm"
				variant="outline"
				disabled={editorState === EditorState.DICTATING}
				onClick={insertParagraph}
			>
				<Paragraph className="mr-2" weight="regular" />
				Insert Paragraph
			</Button>
			<Button
				size="sm"
				variant="outline"
				disabled={editorState === EditorState.DICTATING}
				onClick={() => insertHeadline("Some Title")}
			>
				<ArticleNyTimes className="mr-2" weight="regular" />
				Insert Headline
			</Button>

			<Button
				size="sm"
				variant="outline"
				disabled={editorState === EditorState.DICTATING}
				onClick={exportToClipboard}
			>
				<Clipboard className="mr-2" weight="regular" />
				Copy to Clipboard
			</Button>
		</div>
	);
};

// DEVELOPMENT ONLY
const Simulation = {
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
	) {
		const lastChild = textContainer.lastChild;
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
			}
		}
	},
};
