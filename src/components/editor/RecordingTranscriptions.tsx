import { useRef, useEffect } from "react";
import { api } from "@/utils/rendererElectronAPI";
import {
	copyTextContentsToClipboard,
	createHeadline1,
	createLineBreak,
	createParagraphText,
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
	EditorState,
	EditorUpdateContentAction,
} from "./useEditor";
import { Simulation, TestSimulationControls } from "./TranscriptionSimulator";
import { StatusBar } from "./StatusBar";
import { EditorControls } from "./EditorControls";
import cuid from "cuid";

const IS_SIMULATION_MODE = true;
const TRANSCRIPTION_RATE_IN_MS = 500;

async function getLatestTranscription() {
	const newTranscription = await api.getTranscription();
	return newTranscription;
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

			let newTranscriptions = await getLatestTranscription();
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

		textContainer.addEventListener("programmaticTextChange", handleProgrammaticTextChange);
		const observer = new MutationObserver((mutations) => {
			handleContentMutations(mutations);
		});

		observer.observe(textContainer, {
			attributes: true,
			childList: true,
			characterData: true,
			subtree: true,
			attributeOldValue: true,
		});

		textContainer.addEventListener("keydown", handleKeyDown);

		return () => {
			observer.disconnect();
			textContainer.removeEventListener("keydown", handleKeyDown);
			textContainer.removeEventListener("programmaticTextChange", handleProgrammaticTextChange);
		};
	}, []);

	const insertIntoSelection = (textContent: string) => {
		const currentSelection = getCurrentCursorState();
		if (!currentSelection) return;

		currentSelection.insertTextContent(textContent);
	};

	const insertLineBreak = () => {
		const textContainer = textContainerRef.current;
		if (!textContainer) return;

		const br = createLineBreak({ id: cuid() });
		textContainer.appendChild(br);
	};

	const insertLineBreakAfterSelection = () => {
		const textContainer = textContainerRef.current;
		const selection = window.getSelection();
		if (!textContainer || !selection) return;

		const range = selection.getRangeAt(0);
		const br = createLineBreak({ id: cuid() });

		let currentNode = range.startContainer;
		let offset = range.startOffset;

		while (currentNode && currentNode.nodeName !== "P") {
			currentNode = currentNode.parentNode;
		}

		if (!currentNode) return;

		const paragraph = currentNode as HTMLParagraphElement;

		if (offset === paragraph.textContent.length) {
			// Case 1: Cursor is at the end of the paragraph
			const newParagraph = createParagraphText("\u200B", {
				id: cuid(),
				partial: "false",
			});

			textContainer.insertBefore(br, paragraph.nextSibling);
			textContainer.insertBefore(newParagraph, br.nextSibling);

			range.setStart(newParagraph.firstChild, 0);
			range.setEnd(newParagraph.firstChild, 0);
			selection.removeAllRanges();
			selection.addRange(range);

			newParagraph.focus();
		} else {
			// Case 2: Cursor is somewhere in the middle of the paragraph
			const secondHalf = paragraph.textContent.slice(offset);
			paragraph.textContent = paragraph.textContent.slice(0, offset);

			const newParagraph = createParagraphText(secondHalf, {
				id: cuid(),
				partial: "false",
			});

			textContainer.insertBefore(br, paragraph.nextSibling);
			textContainer.insertBefore(newParagraph, br.nextSibling);

			if (newParagraph.firstChild) {
				range.setStart(newParagraph.firstChild, 0);
				range.setEnd(newParagraph.firstChild, 0);
				selection.removeAllRanges();
				selection.addRange(range);
			}
		}
	};

	const insertHeadline = (textContent: string) => {
		const textContainer = textContainerRef.current;
		if (!textContainer) return;

		const br1 = createLineBreak({ id: cuid() });
		const br2 = createLineBreak({ id: cuid() });
		const h1 = createHeadline1(textContent, { id: cuid() });

		textContainer.appendChild(br1);
		textContainer.appendChild(h1);
		textContainer.appendChild(br2);
	};

	const initContents = (contents: TranscriptContent[]) => {
		const textContainer = textContainerRef.current;

		for (const content of contents) {
			if (content.type === TranscriptContentType.Paragraph) {
				const paragraph = createParagraphText(content.content, {
					partial: String(false),
					id: String(content.id),
				});
				textContainer.appendChild(paragraph);
			}
			if (content.type === TranscriptContentType.Headline1) {
				const headline = createHeadline1(content.content, {
					id: String(content.id),
				});
				textContainer.appendChild(headline);
			}
			if (content.type === TranscriptContentType.Linebreak) {
				const linebreak = createLineBreak({
					id: String(content.id),
				});
				textContainer.appendChild(linebreak);
			}
		}
	};

	const insertTranscripts = (
		newTranscriptions: Awaited<ReturnType<typeof api.getTranscription>>,
	) => {
		for (let i = 0; i < newTranscriptions.segments.length; i++) {
			const textContainer = textContainerRef.current;
			if (!textContainer) return;

			const segment = newTranscriptions.segments[i];
			const lastText = textContainer.lastChild as HTMLParagraphElement;

			if (!lastText || lastText.dataset.partial === "false") {
				const paragraph = createParagraphText(segment.text, {
					partial: String(segment.isPartial),
				});
				textContainerRef.current.appendChild(paragraph);
			} else {
				lastText.textContent = segment.text;
				if (!segment.isPartial) {
					lastText.dataset.partial = "false";
				}
			}
		}
	};

	// Prevent default behavior of inserting <br> in empty paragraphs
	const handleKeyDown = (event: KeyboardEvent) => {
		if (event.key === "Enter") {
			event.preventDefault();
			insertLineBreakAfterSelection();
		}
	};

	const handleProgrammaticTextChange = (event: Event) => {
		const element = event.target as HTMLElement;
		if (isRelevantElement(element)) {
			processUpdates([createElementUpdate(element, ElementUpdateKind.CharacterUpdate)]);
		}
	};

	const processUpdates = (updates: EditorElementUpdate[]) => {
		updates.forEach((update, index) => {
			console.log(`[ processUpdates.${index} ] update:`, update);
			switch (update.kind) {
				case ElementUpdateKind.Insertion:
					const treeLength = textContainerRef.current.childNodes.length;
					props.onAddContent({
						id: update.id === null ? cuid() : update.id,
						content: update.content,
						type: update.type,
						order: treeLength,
					});
					break;
				case ElementUpdateKind.CharacterUpdate:
					props.onUpdateContent(update);
					break;
				case ElementUpdateKind.Deletion:
					if (!update.id) break;
					props.onRemoveContent({
						id: update.id,
						content: update.content,
						type: update.type,
						order: 0,
					});
					break;
			}
		});
	};

	const isNodeValidToUpdate = (node: Node, set: Set<Node>) =>
		node.nodeType === Node.ELEMENT_NODE && !set.has(node);

	const isRelevantElement = (
		node: Node,
	): node is HTMLParagraphElement | HTMLHeadingElement | HTMLBRElement =>
		["P", "H1", "BR", "#text"].includes(node.nodeName);

	const hasEmptyParentElement = (node: Node) =>
		node.parentElement &&
		node.parentElement.tagName === "P" &&
		node.parentElement.textContent?.trim() === "";

	const isElementEmpty = (element: HTMLElement) =>
		element.nodeName === "P" &&
		(element.textContent?.trim() === "" || element.innerHTML === "<br>");

	const removeEmptyElement = (element: HTMLElement) => {
		if (element.parentNode) {
			element.parentNode.removeChild(element);
			return true;
		}
		return false;
	};

	const processNodeMutation = (
		node: Node,
		processedUpdates: Set<Node>,
		toUpdate: Array<EditorElementUpdate>,
		kind: ElementUpdateKind,
	) => {
		if (isRelevantElement(node) && isNodeValidToUpdate(node, processedUpdates)) {
			processedUpdates.add(node);
			const element = node as HTMLElement;
			if (kind === ElementUpdateKind.Insertion && isElementEmpty(node)) {
				return;
			}

			toUpdate.push(createElementUpdate(element, kind));
			// if (kind === ElementUpdateKind.Insertion && !isElementEmpty(node)) {
			// } else if (kind !== ElementUpdateKind.Insertion) {
			// 	toUpdate.push(createElementUpdate(element, kind));
			// }
		}
	};

	const processCharacterDataMutation = (
		node: Node,
		processedUpdates: Set<Node>,
		toUpdate: Array<EditorElementUpdate>,
	) => {
		const parentElement = node.parentElement;
		if (!parentElement) {
			return;
		}

		if (isRelevantElement(parentElement) && !processedUpdates.has(parentElement)) {
			processedUpdates.add(parentElement);

			if (isElementEmpty(parentElement)) {
				removeEmptyElement(parentElement);
				toUpdate.push(createElementUpdate(parentElement, ElementUpdateKind.Deletion));
			} else {
				toUpdate.push(createElementUpdate(parentElement, ElementUpdateKind.CharacterUpdate));
			}
		}
	};

	const handleContentMutations = (mutations: MutationRecord[]) => {
		const updates: EditorElementUpdate[] = [];
		const processedElements = new Set<Node>();

		mutations.forEach((mutation) => {
			if (mutation.type === "childList") {
				// tracking added html nodes - new paragraphs, new headlines, new text segments
				mutation.addedNodes.forEach((node) => {
					if (isRelevantElement(node) && hasEmptyParentElement(node as HTMLElement)) {
						node.parentElement.removeChild(node);
						return;
					}

					processNodeMutation(node, processedElements, updates, ElementUpdateKind.Insertion);
				});

				// tracking removed html nodes - on manual edit
				mutation.removedNodes.forEach((node) =>
					processNodeMutation(node, processedElements, updates, ElementUpdateKind.Deletion),
				);
			} else if (mutation.type === "characterData") {
				// tracking character/text changes inside content editable paragraphs
				processCharacterDataMutation(mutation.target, processedElements, updates);
			}
		});

		// Check for and remove any empty paragraphs
		// if (textContainerRef.current) {
		// 	const emptyParagraphs = Array.from(textContainerRef.current.querySelectorAll("p")).filter(
		// 		(p) => isElementEmpty(p) && !processedElements.has(p),
		// 	);

		// 	emptyParagraphs.forEach((p) => {
		// 		if (removeEmptyElement(p)) {
		// 			console.log("removing empty paragraph.", p);
		// 			updates.push(createElementUpdate(p, ElementUpdateKind.Deletion));
		// 		}
		// 	});
		// }

		if (updates.length > 0) {
			processUpdates(updates);
		}
	};

	const createElementUpdate = (
		element: HTMLElement,
		kind: ElementUpdateKind,
	): EditorElementUpdate => {
		const { dataset } = element;
		const elementType = element.nodeName.toLowerCase();

		let textContent = element.textContent;
		let contentType: TranscriptContentType;
		switch (elementType) {
			case "p":
				contentType = TranscriptContentType.Paragraph;
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
			kind: kind,
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

	return (
		<div>
			<StatusBar editorMode={props.editorMode} />
			<EditorControls onSearchQuery={handleSearch} onReplaceResults={handleReplace} />
			<div className="flex flex-col gap-2">
				<TestSimulationControls
					editorMode={props.editorMode}
					pauseSimulation={pauseDictation}
					resumeSimulation={resumeDictation}
					exportToClipboard={() => copyTextContentsToClipboard(textContainerRef.current)}
					insertIntoSelection={insertIntoSelection}
					insertParagraph={insertLineBreak}
					insertHeadline={insertHeadline}
				/>
				<div
					contentEditable={props.editorMode !== EditorMode.DICTATING}
					ref={textContainerRef}
					className="focus:outline-none"
				></div>
			</div>
		</div>
	);
};
