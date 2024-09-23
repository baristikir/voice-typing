import { useRef, useEffect } from "react";
import { api } from "@/utils/rendererElectronAPI";
import {
	createHeadline1,
	createNewParagraph,
	createParagraph,
	createSpanText,
	getCurrentCursorState,
	highlightNode,
	removeHighlightFromNode,
	replaceInNode,
} from "./EditorElements";
import { TranscriptContent, TranscriptContentType } from "@/shared/models";
import {
	EditorAddContentAction,
	EditorMode,
	EditorRemoveContentAction,
	EditorSaveContentsAction,
	EditorState,
	EditorUpdateContentAction,
} from "./useEditor";
import { Simulation, TestSimulationControls } from "./TranscriptionSimulator";
import { EditorControls } from "./EditorControls";
import cuid from "cuid";
import { Button } from "../ui/Button";

const IS_SIMULATION_MODE = false;
const TRANSCRIPTION_RATE_IN_MS = 300;

async function getLatestTranscribedText() {
	const newTranscript = await api.getTranscribedText();
	return newTranscript;
}

export type RecorderProcessorMessageData = {
	recordBuffer: Float32Array[];
	sampleRate: number;
	currentFrame: number;
};
enum ElementUpdateKind {
	Insertion,
	CharacterUpdate,
	Deletion,
}
type EditorElementUpdate = Omit<TranscriptContent, "order"> & {
	id: string | null;
	kind: ElementUpdateKind;
};

interface Props {
	editorMode: EditorMode;
	contents: EditorState["contents"];
	onAddContent(payload: EditorAddContentAction["payload"]): void;
	onUpdateContent(payload: EditorUpdateContentAction["payload"]): void;
	onRemoveContent(payload: EditorRemoveContentAction["payload"]): void;
	onSaveContents(payload: EditorSaveContentsAction["payload"]): void;
	onEditorModeChange(payload: EditorMode): void;
}
export const RecordingTranscriptions = (props: Props) => {
	const textContainerRef = useRef<HTMLDivElement>(null);

	// Sync with db contents on startup
	useEffect(() => {
		if (!textContainerRef.current) return;
		if (props.contents && props.contents.length > 0) {
			initContents(props.contents);
		}
	}, []);

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

			let newTranscriptions = await getLatestTranscribedText();
			if (!newTranscriptions) return;
			insertTranscripts(newTranscriptions);
		}, TRANSCRIPTION_RATE_IN_MS);

		if (props.editorMode !== EditorMode.DICTATING) {
			clearInterval(timer);
			return;
		}

		return () => {
			clearInterval(timer);
		};
	}, [props.editorMode]);

	// Register Selection Listeners
	useEffect(() => {
		const checkSelection = (_: Event) => {
			const selection = window.getSelection();
			const rangeCount = window.getSelection().rangeCount;
			if (rangeCount < 0 || selection.isCollapsed) {
				props.onEditorModeChange(EditorMode.EDITING);
			}

			const rangeAt = window.getSelection()?.getRangeAt(0);
			if (!rangeAt.collapsed && props.editorMode !== EditorMode.SELECTION) {
				props.onEditorModeChange(EditorMode.SELECTION);
			}
		};

		document.addEventListener("selectionchange", checkSelection);

		return () => {
			document.removeEventListener("selectionchange", checkSelection);
		};
	}, [props.editorMode]);

	// Text Mutation Observer, for detecting text changes
	useEffect(() => {
		const textContainer = textContainerRef.current;
		if (!textContainer) return;

		textContainer.addEventListener("keydown", handleKeyDown);

		return () => {
			textContainer.removeEventListener("keydown", handleKeyDown);
		};
	}, []);

	const insertIntoSelection = (textContent: string) => {
		const currentSelection = getCurrentCursorState();
		if (!currentSelection) return;

		currentSelection.insertTextContent(textContent);
	};

	const getFirstSelectionRange = (): Range | null => {
		const selection = window.getSelection();
		try {
			const range = selection.getRangeAt(0);
			return range;
		} catch (error) {
			return null;
		}
	};

	const insertLineBreak = () => {
		const textContainer = textContainerRef.current;
		if (!textContainer) return;

		const range = getFirstSelectionRange();

		if (range) {
			insertLineBreakAfterSelection();
			return;
		}

		const newParagraph = createParagraph();
		textContainer.appendChild(newParagraph);
	};

	const insertLineBreakAfterSelection = () => {
		const textContainer = textContainerRef.current;
		const selection = window.getSelection();
		if (!textContainer || !selection) return;

		const range = selection.getRangeAt(0);
		const newParagraph = createParagraph();

		const findNearestSpan = (node: Node): HTMLSpanElement | null => {
			while (node && node !== textContainer) {
				if (node.nodeName === "SPAN") {
					return node as HTMLSpanElement;
				}

				node = node.parentNode;
			}
			return null;
		};

		const findCurrentSpan = (node: Node) => {
			while (node && node !== textContainer) {
				if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).nodeName === "P") {
					return node as HTMLParagraphElement;
				}
				node = node.parentNode;
			}
			return null;
		};

		const nearestSpan = findNearestSpan(range.startContainer);
		const currentParagraph = findCurrentSpan(range.startContainer);
		if (!currentParagraph) {
			console.log("No closest paragraph was found.");
			return;
		}

		let currentSpan =
			range.startContainer.nodeType === Node.TEXT_NODE
				? range.startContainer.parentElement
				: (range.startContainer as HTMLElement);
		if (currentSpan.nodeName !== "SPAN") {
			console.log("Selection not in a span element.");
			return;
		}
		console.log("c_span: ", currentSpan);

		// Split the current span's text
		const spanText = currentSpan.textContent;
		const splitIndex = range.startOffset;
		const firstHalf = spanText.slice(0, splitIndex);
		const secondHalf = spanText.slice(splitIndex);

		// Update the current span with the first half of the text
		currentSpan.textContent = firstHalf;
		const isAtEndOfSpan = range.startOffset === currentSpan.textContent.length;

		console.log("text contents: ", { firstHalf, secondHalf, isAtEndOfSpan });
		// const newParagraph = createParagraph();
		const newSpanTextContent = isAtEndOfSpan ? "\u200B" : secondHalf;
		const newSpan = createSpanText(newSpanTextContent, { id: cuid(), partial: "false" });
		newParagraph.appendChild(newSpan);

		let nextSpan = currentSpan.nextElementSibling;
		while (nextSpan) {
			const spanToMove = nextSpan;
			nextSpan = nextSpan.nextElementSibling;
			newParagraph.appendChild(spanToMove);
		}

		currentParagraph.after(br, newParagraph);

		const newRange = document.createRange();
		if (isAtEndOfSpan) {
			// Set cursor position to empty new created span element
			newRange.setStart(newSpan.firstChild, 1);
			newRange.setEnd(newSpan.firstChild, 1);
		} else {
			newRange.setStart(newSpan.firstChild, 0);
			newRange.setEnd(newSpan.firstChild, 0);
		}
		// Set the cursor position after the <br>
		selection.removeAllRanges();
		selection.addRange(newRange);
	};

	const insertHeadline = (textContent: string) => {
		const textContainer = textContainerRef.current;
		if (!textContainer) return;

		const h1 = createHeadline1(textContent, { id: cuid() });
		textContainer.appendChild(h1);
	};

	const initContents = (contents: TranscriptContent[]) => {
		const textContainer = textContainerRef.current;

		for (const content of contents) {
			if (content.type === TranscriptContentType.Text) {
				const span = createSpanText(content.content, {
					partial: String(false),
					id: String(content.id),
					order: String(content.order),
				});

				if (textContainer.lastChild && textContainer.lastChild.nodeName === "P") {
					textContainer.lastChild.appendChild(span);
					continue;
				}
				const newParagraph = createParagraph();
				newParagraph.appendChild(span);
				textContainer.appendChild(newParagraph);
			}
			if (content.type === TranscriptContentType.Headline1) {
				const headline = createHeadline1(content.content, {
					id: String(content.id),
					order: String(content.order),
				});
				textContainer.appendChild(headline);
			}
			if (content.type === TranscriptContentType.Linebreak) {
				// We are using the margin of a paragraph to render line breaks,
				// this will help making editor changes easier,
				// since HTMLBrElement's will not be recognised in a Selection Range.
				const newParagraph = createParagraph();
				textContainer.appendChild(newParagraph);
			}
		}
	};

	const insertTranscripts = (
		newTranscriptions: Awaited<ReturnType<typeof api.getTranscribedText>>,
	) => {
		const textContainer = textContainerRef.current;
		if (!textContainer) return;

		appendTranscripts(newTranscriptions);
		return;

		const selection = window.getSelection();
		let insertionNode: Node | null = null;
		let insertionOffset = 0;

		// Determine the insertion point
		if (selection && selection.rangeCount > 0) {
			const range = selection.getRangeAt(0);
			if (textContainer.contains(range.commonAncestorContainer)) {
				insertionNode = range.startContainer;
				insertionOffset = range.startOffset;
			}
		}

		// If no valid insertion point, append to the end
		if (!insertionNode) {
			insertionNode = textContainer;
			insertionOffset = textContainer.childNodes.length;
		}

		let currentSpan: HTMLSpanElement | null = null;

		for (const segment of newTranscriptions.segments) {
			if (!currentSpan || !segment.isPartial) {
				// Create a new span
				currentSpan = createSpanText(segment.text, {
					id: cuid(),
					partial: String(segment.isPartial),
				});

				// Insert the new span
				if (insertionNode.nodeType === Node.TEXT_NODE) {
					const parentNode = insertionNode.parentNode;
					const newTextNode = insertionNode.splitText(insertionOffset);
					parentNode.insertBefore(currentSpan, newTextNode);
				} else {
					insertionNode.insertBefore(currentSpan, insertionNode.childNodes[insertionOffset]);
				}

				// Update insertion point
				insertionNode = currentSpan;
				insertionOffset = currentSpan.textContent.length;
			} else {
				// Update existing span
				currentSpan.textContent = segment.text;
				currentSpan.dataset.partial = String(segment.isPartial);
				insertionOffset = currentSpan.textContent.length;
				// if (currentSpan && !segment.isPartial) {
				// 	currentSpan = null;
				// }
			}
		}

		// Update the selection to the end of the inserted text
		if (currentSpan) {
			const range = document.createRange();
			range.setStart(currentSpan, currentSpan.textContent.length);
			range.setEnd(currentSpan, currentSpan.textContent.length);
			selection.removeAllRanges();
			selection.addRange(range);
		}
	};

	const appendTranscripts = (
		newTranscriptions: Awaited<ReturnType<typeof api.getTranscribedText>>,
	) => {
		const textContainer = textContainerRef.current;
		if (!textContainer) return;

		for (let i = 0; i < newTranscriptions.segments.length; i++) {
			const segment = newTranscriptions.segments[i];

			const lastChild = textContainer.lastChild;
			const isParagraphElement = lastChild?.nodeName === "P";
			if (!lastChild || !isParagraphElement) {
				const paragraph = createNewParagraph(segment);
				textContainer.appendChild(paragraph);
				return;
			}

			const hasSpanChild = lastChild.lastChild ? lastChild.lastChild?.nodeName === "SPAN" : false;
			const isPartial =
				hasSpanChild && (lastChild.lastChild as HTMLSpanElement).dataset.partial === "true";

			if (hasSpanChild && isPartial) {
				const lastText = lastChild.lastChild as HTMLSpanElement;
				lastText.textContent = segment.text;
				if (!segment.isPartial) {
					lastText.dataset.partial = "false";
				}
			} else {
				const newText = createSpanText(segment.text, {
					id: cuid(),
					partial: String(segment.isPartial),
				});
				lastChild.appendChild(newText);
			}
		}
	};

	const isCursorInContainer = (container: HTMLElement) => {
		const selection = window.getSelection();
		if (!selection || selection.rangeCount === 0) return false;

		try {
			const range = selection.getRangeAt(0);
			return container.contains(range.commonAncestorContainer);
		} catch (_) {
			return false;
		}
	};

	const getCursorPosition = (container: HTMLElement) => {
		const selection = window.getSelection();
		if (!selection || selection.rangeCount === 0) return null;

		const range = selection.getRangeAt(0);
		if (!container.contains(range.commonAncestorContainer)) return null;

		let node = range.startContainer;
		let offset = range.startOffset;

		// If current node is an html element node, find the first text node
		if (node.nodeType === Node.ELEMENT_NODE) {
			const textNodes = Array.from(node.childNodes).filter(
				(child) => child.nodeType === Node.TEXT_NODE,
			);
			if (textNodes.length > 0) {
				node = textNodes[0];
				offset = 0;
			}
		}

		while (node && node.parentNode !== container) {
			node = node.parentNode;
		}

		return { node, offset };
	};

	// Prevent default behavior of inserting <br> in empty paragraphs
	const handleKeyDown = (event: KeyboardEvent) => {
		if (event.key === "Enter") {
			event.preventDefault();
			insertLineBreakAfterSelection();
		}
	};

	const isRelevantElement = (
		node: Node,
	): node is HTMLParagraphElement | HTMLHeadingElement | HTMLBRElement =>
		["P", "SPAN", "H1", "BR", "#text"].includes(node.nodeName);

	const hasEmptyParentElement = (node: Node) =>
		node.parentElement &&
		node.parentElement.tagName === "SPAN" &&
		node.parentElement.textContent?.trim() === "";

	const isElementEmpty = (element: HTMLElement) =>
		element.nodeName === "SPAN" &&
		(element.textContent?.trim() === "" || element.innerHTML === "<br>");

	const removeEmptyElement = (element: HTMLElement) => {
		if (element.parentNode) {
			element.parentNode.removeChild(element);
			return true;
		}
		return false;
	};

	const createTranscriptContentShape = (element: HTMLElement, order: number): TranscriptContent => {
		const { dataset } = element;
		const elementType = element.nodeName.toLowerCase();

		let textContent = element.textContent;
		let contentType: TranscriptContentType;
		switch (elementType) {
			case "span":
				contentType = TranscriptContentType.Text;
				break;
			case "h1":
				contentType = TranscriptContentType.Headline1;
				break;
			case "br":
				contentType = TranscriptContentType.Linebreak;
				textContent = "\n";
				break;
		}

		return {
			id: dataset.id || null,
			content: textContent || "",
			type: contentType,
			order: order,
		};
	};

	const highlightSearchResults = (query: string) => {
		const textContainer = textContainerRef.current;
		if (!query || !textContainerRef.current) return;

		Array.from(textContainer.childNodes).forEach(removeHighlightFromNode);

		const regex = new RegExp(query, "gi");
		Array.from(textContainer.childNodes).forEach((node) => highlightNode(node, regex));
	};

	const replaceSearchResults = (replaceText: string, searchText: string, replaceAll: boolean) => {
		const textContainer = textContainerRef.current;
		if (!replaceText || !searchText || !textContainerRef.current) return;

		const regex = new RegExp(searchText, "gi");
		let replaced = false;

		Array.from(textContainer.childNodes).forEach((node) => {
			if (replaced && !replaceAll) return;
			replaced = replaceInNode(node, regex, replaceText, replaceAll);
		});
	};

	const handleSearch = (query: string) => {
		highlightSearchResults(query);
	};
	const handleReplace = (replaceText: string, searchText: string, replaceAll: boolean) => {
		replaceSearchResults(replaceText, searchText, replaceAll);
	};

	const pauseDictation = () => {
		props.onEditorModeChange(EditorMode.EDITING);
	};

	const resumeDictation = () => {
		props.onEditorModeChange(EditorMode.DICTATING);
	};

	const handleSaveContents = async () => {
		const textContainer = textContainerRef.current;
		if (!textContainer) return;

		const contents = convertNodesToTranscriptContents(textContainer.childNodes);
		props.onSaveContents(contents);
	};

	const convertNodesToTranscriptContents = (nodes: NodeListOf<ChildNode>) => {
		const contents: TranscriptContent[] = [];
		let n_iter = 0;

		for (const child of nodes) {
			const elementType = child.nodeName.toLowerCase();
			const isParagraphElement = elementType === "p";
			const isHeadlineElement = elementType === "h1";
			const hasChildNodes = child.hasChildNodes();

			if (isParagraphElement && hasChildNodes) {
				const textElements = child.childNodes;
				if (child.parentElement.nodeName !== "DIV") {
					contents.push({
						id: cuid(),
						content: "",
						type: TranscriptContentType.Linebreak,
						order: n_iter,
					});
					n_iter++;
				}

				textElements.forEach((element, idx) => {
					if (
						!element.textContent ||
						element.textContent.length === 0 ||
						element.textContent.trim().length === 0 ||
						element.textContent === "\u200B"
					) {
						element.parentElement.removeChild(element);
						return;
					}
					contents.push(createTranscriptContentShape(element as HTMLElement, n_iter));
					n_iter++;
				});
			} else if (isHeadlineElement) {
				contents.push(createTranscriptContentShape(child as HTMLElement, n_iter));
				n_iter++;
			}
		}

		return contents;
	};

	return (
		<>
			<div>
				<Button
					size="sm"
					variant="outline"
					onClick={() => {
						const cursorPosition = getCursorPosition(textContainerRef.current);
						console.log(cursorPosition);
					}}
				>
					Print Cursor State
				</Button>
			</div>
			<div className="rounded-xl p-2">
				<EditorControls
					currentMode={props.editorMode}
					onEditorModeChange={props.onEditorModeChange}
					onSaveContents={handleSaveContents}
					onSearchQuery={handleSearch}
					onReplaceResults={handleReplace}
					handleInsertLineBreak={insertLineBreak}
				/>

				<div className="flex flex-col gap-2 bg-white h-full p-2 border-x border-b border-gray-200 min-h-[50vh] rounded-b-2xl drop-shadow-sm">
					{/*
				<TestSimulationControls
					editorMode={props.editorMode}
					pauseSimulation={pauseDictation}
					resumeSimulation={resumeDictation}
					exportToClipboard={() => copyTextContentsToClipboard(textContainerRef.current)}
					insertIntoSelection={insertIntoSelection}
					insertParagraph={insertLineBreak}
					insertHeadline={insertHeadline}
				/>
*/}
					<div
						contentEditable={textContainerRef.current?.childNodes?.length > 0}
						ref={textContainerRef}
						className="focus:outline-none"
					></div>
				</div>
			</div>
		</>
	);
};
