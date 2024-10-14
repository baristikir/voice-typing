import { useRef, useEffect } from "react";
import { api } from "@/utils/rendererElectronAPI";
import {
	copyTextContentsToClipboard,
	createNewParagraph,
	createParagraph,
	createSpanText,
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
import { Simulation } from "./TranscriptionSimulator";
import { EditorControls } from "./EditorControls";
import cuid from "cuid";

const IS_SIMULATION_MODE = false;
// Polling speed in ms
const TRANSCRIPTION_RATE_IN_MS = 300;

// Fetches recent transcription contents from the native addon via IPC call
async function getLatestTranscribedText() {
	const newTranscript = await api.getTranscribedText();
	return newTranscript;
}

export type RecorderProcessorMessageData = {
	recordBuffer: Float32Array[];
	sampleRate: number;
	currentFrame: number;
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
	// Used to control editor html contents
	const textContainerRef = useRef<HTMLDivElement>(null);
	const lastEditedElementRef = useRef<HTMLSpanElement>(null);

	// Sync with editor contents on startup with database state
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
			// Test purposes
			if (IS_SIMULATION_MODE) {
				Simulation.simulateTranscription(textContainerRef.current, sim_i);
				sim_i++;
				return;
			}

			let newTranscriptions = await getLatestTranscribedText();
			if (!newTranscriptions) return;
			// Inserting transcribed segments into editor container
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
			const { rangeCount, isCollapsed, getRangeAt } = window.getSelection();
			if (rangeCount < 0 || isCollapsed) {
				props.onEditorModeChange(EditorMode.EDITING);
			}

			const rangeAt = getRangeAt(0);
			if (!rangeAt.collapsed && props.editorMode !== EditorMode.SELECTION) {
				props.onEditorModeChange(EditorMode.SELECTION);
			}
		};

		// document.addEventListener("selectionchange", checkSelection);

		return () => {
			document.removeEventListener("selectionchange", checkSelection);
		};
	}, [props.editorMode]);

	// Overriding default behavior for Enter keyboard. Inserting paragraph elements when pressed inside the editor container
	useEffect(() => {
		const textContainer = textContainerRef.current;
		if (!textContainer) return;

		textContainer.addEventListener("keydown", handleKeyDown);

		return () => {
			textContainer.removeEventListener("keydown", handleKeyDown);
		};
	}, []);

	const getFirstSelectionRange = (): Range | null => {
		const selection = window.getSelection();
		if (!selection.rangeCount) {
			return null;
		}

		try {
			const range = selection.getRangeAt(0);
			let node = range.commonAncestorContainer;
			while (node) {
				if (node === textContainerRef.current) {
					return range;
				}
				node = node.parentNode;
			}

			return null;
		} catch (error) {
			return null;
		}
	};

	const findNearestParagraph = (node: Node): HTMLParagraphElement | null => {
		while (node && node !== textContainerRef.current) {
			if (node.nodeName === "P") {
				return node as HTMLParagraphElement;
			}
			node = node.parentNode;
		}
		return null;
	};

	// Insert linebreak by creating new paragraph element into current selection or appending, when there is no cursor selection.
	const insertLineBreak = () => {
		const textContainer = textContainerRef.current;
		if (!textContainer) return;

		const range = getFirstSelectionRange();

		if (range) {
			console.log("has range");
			insertLineBreakAfterSelection(range);
			return;
		}

		const newParagraph = createParagraph();
		textContainer.appendChild(newParagraph);
	};

	// When inserting a new linebreak inside existing content, we need to respect the current editor structure and split accordingly, when the cursor is in between a span element.
	const insertLineBreakAfterSelection = (range: Range) => {
		const textContainer = textContainerRef.current;
		if (!textContainer) return;

		const newParagraph = createParagraph();

		const currentParagraph = findNearestParagraph(range.startContainer);
		if (!currentParagraph) {
			console.log("[ insertLineBreakAfterSelection ] No closest paragraph node was found.");
			textContainer.appendChild(newParagraph);
			return;
		}

		const { startOffset, startContainer } = range;
		// Prepend new paragraph to beginning of the current paragraph selection, when the cursor position is at the start.
		if (startOffset === 0 && startContainer === currentParagraph.firstChild) {
			prependParagraph(currentParagraph, newParagraph);
			return;
		}

		// Append new paragraph after the current paragraph selection.
		if (
			startOffset ===
			(startContainer?.nodeType === Node.TEXT_NODE ? (startContainer as Text).length : startContainer.childNodes.length)
		) {
			if (!startContainer.parentNode.nextSibling || startContainer.parentNode.nextSibling.nodeName !== "SPAN") {
				appendParagraph(currentParagraph, newParagraph);
				return;
			}
		}

		let currentSpan =
			startContainer.nodeType === Node.TEXT_NODE ? startContainer.parentElement : (startContainer as HTMLElement);

		if (currentSpan.nodeName !== "SPAN") {
			console.log("Selection not in a span element");
			return;
		}

		const spanText = currentSpan.textContent;
		const splitIndex = startOffset;
		const firstHalf = spanText.slice(0, splitIndex);
		const secondHalf = spanText.slice(splitIndex);

		currentSpan.textContent = firstHalf;

		const newSpan = createSpanText(secondHalf, {
			id: cuid(),
			partial: String(false),
		});
		newParagraph.appendChild(newSpan);

		let nextSpan = currentSpan.nextElementSibling;
		while (nextSpan) {
			const spanToMove = nextSpan;
			nextSpan = nextSpan.nextElementSibling;
			newParagraph.appendChild(spanToMove);
		}

		currentParagraph.parentNode.insertBefore(newParagraph, currentParagraph.nextSibling);

		resetSelectionToStart(newSpan.firstChild);
	};

	const prependParagraph = (cParagraph: Node, nParagraph: Node) => {
		cParagraph.parentNode.insertBefore(nParagraph, cParagraph);
		resetSelectionToStart(nParagraph);
	};

	const appendParagraph = (cParagraph: Node, nParagraph: Node) => {
		const nextSibling = cParagraph.nextSibling;
		if (nextSibling) {
			cParagraph.parentNode.insertBefore(nParagraph, nextSibling);
		} else {
			cParagraph.parentNode.appendChild(nParagraph);
		}

		resetSelectionToStart(nParagraph);
	};

	// Sets the cursor position to the start of the html element
	const resetSelectionToStart = (node: Node) => {
		const newRange = document.createRange();
		newRange.setStart(node, 0);
		newRange.collapse(true);

		const selection = window.getSelection();
		selection.removeAllRanges();
		selection.addRange(newRange);
	};

	// Creating html elements from the database content.
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
			if (content.type === TranscriptContentType.Linebreak) {
				// We are using the margin of a paragraph to render line breaks,
				// this will help making editor changes easier,
				// since HTMLBrElement's will not be recognised in a Selection Range.
				const newParagraph = createParagraph();
				textContainer.appendChild(newParagraph);
			}
		}
	};

	// When inserting transcripts, we only care about the cursor position inside the editor container. This function checks if the current selection is inside the editor.
	const isSelectionInEditor = () => {
		const selection = window.getSelection();
		const textContainer = textContainerRef.current;
		if (!selection || selection.rangeCount <= 0 || !textContainer) return false;

		const range = selection.getRangeAt(0);
		const startNode = range.startContainer;
		const endNode = range.endContainer;
		return textContainer.contains(startNode) && textContainer.contains(endNode);
	};

	const insertTranscripts = (newTranscriptions: Awaited<ReturnType<typeof api.getTranscribedText>>) => {
		const textContainer = textContainerRef.current;
		if (!textContainer) return;

		const selection = window.getSelection();
		if (!isSelectionInEditor()) {
			appendTranscripts(newTranscriptions);
			return;
		}

		insertTranscriptsIntoSelection(selection, newTranscriptions);
	};

	// Append new paragraph/span element with transcript contents to the end of the current paragraph.
	const appendTranscripts = (newTranscriptions: Awaited<ReturnType<typeof api.getTranscribedText>>) => {
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
			const isPartial = hasSpanChild && (lastChild.lastChild as HTMLSpanElement).dataset.partial === "true";

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

	const insertTranscriptsIntoSelection = (
		selection: Selection,
		newTranscriptions: Awaited<ReturnType<typeof api.getTranscribedText>>,
	) => {
		const { startContainer, startOffset } = selection.getRangeAt(0);
		const currentParagraph = findNearestParagraph(startContainer);
		if (!currentParagraph) {
			console.log("No closest paragraph node was found.", currentParagraph, startContainer);
			appendTranscripts(newTranscriptions);
			return;
		}

		for (let i = 0; i < newTranscriptions.segments.length; i++) {
			const segment = newTranscriptions.segments[i];
			const lastChild = lastEditedElementRef.current;
			if (lastChild?.dataset?.partial === "true") {
				const currentSpan = lastChild as HTMLSpanElement;
				currentSpan.textContent = segment.text;
				if (!segment.isPartial) {
					lastChild.dataset.partial = "false";
				}
				return;
			}

			let newSpan = createSpanText(segment.text, {
				id: cuid(),
				partial: String(segment.isPartial),
			});

			if (startOffset === 0 && startContainer.parentElement === currentParagraph.firstChild) {
				currentParagraph.insertBefore(newSpan, currentParagraph.firstChild);
			} else if (
				startOffset ===
				(startContainer.nodeType === Node.TEXT_NODE
					? (startContainer as Text).length
					: startContainer.childNodes.length)
			) {
				if (
					(startContainer.parentNode.nodeName === "SPAN" && !startContainer.parentNode.nextSibling) ||
					currentParagraph === startContainer
				) {
					currentParagraph.appendChild(newSpan);
				} else if (startContainer.parentNode.nodeName === "SPAN" && startContainer.parentNode.nextSibling) {
					currentParagraph.insertBefore(newSpan, startContainer.parentElement.nextSibling);
				}
			} else if (startContainer.nodeType === Node.TEXT_NODE) {
				let currentSpan =
					startContainer.nodeType === Node.TEXT_NODE ? startContainer.parentElement : (startContainer as HTMLElement);

				const splitIndex = startOffset;
				const firstHalf = startContainer.textContent.slice(0, splitIndex);
				const secondHalf = startContainer.textContent.slice(splitIndex);

				currentSpan.textContent = firstHalf;
				const secondSpan = createSpanText(secondHalf, {
					id: cuid(),
					partial: String(false),
				});

				currentSpan.after(newSpan);
				newSpan.after(secondSpan);
			} else {
				if (startContainer.nodeName !== "SPAN" && startContainer === currentParagraph && lastEditedElementRef.current) {
					lastEditedElementRef.current.after(newSpan);
				} else {
					currentParagraph.appendChild(newSpan);
				}
			}

			lastEditedElementRef.current = newSpan;

			const newRange = document.createRange();
			newRange.setStartAfter(newSpan);
			newRange.collapse(false);
			selection.removeAllRanges();
			selection.addRange(newRange);
		}
	};

	// Prevent default behavior of inserting <br> in empty paragraphs
	const handleKeyDown = (event: KeyboardEvent) => {
		if (event.key === "Enter") {
			event.preventDefault();
			insertLineBreak();
		}
	};

	// Create database compatible shapes for transcript contents
	// HTML -> JS - converts html elements into objects, which are saved to the database later.
	const createTranscriptContentShape = (element: HTMLElement, order: number): TranscriptContent => {
		const { dataset } = element;
		const elementType = element.nodeName.toLowerCase();

		let textContent = element.textContent;
		let contentType: TranscriptContentType;
		switch (elementType) {
			case "span":
				contentType = TranscriptContentType.Text;
				break;
			// case "h1":
			// 	contentType = TranscriptContentType.Headline1;
			// 	break;
		}

		return {
			id: dataset.id || null,
			content: textContent || "",
			type: contentType,
			order: order,
		};
	};

	// Highlighting html elements that match a search query inside the editor content.
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
				if (n_iter > 0) {
					contents.push({
						id: cuid(),
						content: "",
						type: TranscriptContentType.Linebreak,
						order: n_iter,
					});
					n_iter++;
				}

				textElements.forEach((element) => {
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

	const handleResetHighlightedNodes = () => {
		const textContainer = textContainerRef.current;
		if (!textContainer) return;
		Array.from(textContainer.childNodes).forEach(removeHighlightFromNode);
	};

	const handleExportContents = () => {
		const textContainer = textContainerRef.current;
		if (!textContainer) return;
		copyTextContentsToClipboard(textContainer);
	};

	return (
		<>
			<div></div>
			<div className="rounded-xl p-2">
				<EditorControls
					currentMode={props.editorMode}
					onEditorModeChange={props.onEditorModeChange}
					onSaveContents={handleSaveContents}
					onSearchQuery={handleSearch}
					onReplaceResults={handleReplace}
					handleInsertLineBreak={insertLineBreak}
					handleResetHighlightedNodes={handleResetHighlightedNodes}
					handleExportContents={handleExportContents}
				/>

				<div className="flex flex-col gap-2 bg-white h-full p-2 border-x border-b border-gray-200 min-h-[50vh] rounded-b-2xl drop-shadow-sm">
					<div ref={textContainerRef} contentEditable={true} className="focus:outline-none"></div>
				</div>
			</div>
		</>
	);
};
