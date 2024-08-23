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
	EditorSetTitleAction,
	EditorState,
	EditorUpdateContentAction,
} from "./useEditor";
import { Simulation, TestSimulationControls } from "./TranscriptionSimulator";
import { StatusBar } from "./StatusBar";
import { EditorControls } from "./EditorControls";

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
	kind: ElementUpdateKind;
};

interface Props {
	editorMode: EditorMode;
	contents: EditorState["contents"];
	onTitleChange(payload: EditorSetTitleAction["payload"]): void;
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

		textContainer.addEventListener(
			"programmaticTextChange",
			handleProgrammaticTextChange,
		);
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

		return () => {
			observer.disconnect();
			textContainer.removeEventListener(
				"programmaticTextChange",
				handleProgrammaticTextChange,
			);
		};
	}, []);

	const handleProgrammaticTextChange = (event: Event) => {
		const element = event.target as HTMLElement;
		if (isRelevantElement(element)) {
			processUpdates([
				createElementUpdate(element, ElementUpdateKind.CharacterUpdate),
			]);
		}
	};

	const insertIntoSelection = (textContent: string) => {
		const currentSelection = getCurrentCursorState();
		if (!currentSelection) return;

		currentSelection.insertTextContent(textContent);
	};

	const insertLineBreak = () => {
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
				const headline = createHeadline1(content.content);
				textContainer.appendChild(headline);
			}
			if (content.type === TranscriptContentType.Linebreak) {
				const linebreak = createLineBreak();
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

	const processUpdates = (updates: EditorElementUpdate[]) => {
		updates.forEach((update, index) => {
			console.log(`[ processUpdates.${index} ] update:`, update);
			switch (update.kind) {
				case ElementUpdateKind.Insertion:
					console.log("element to insert:", update);
					const treeLength = textContainerRef.current.childNodes.length;
					props.onAddContent({
						id: update.id,
						content: update.content,
						type: update.type,
						order: treeLength,
					});
					break;
				case ElementUpdateKind.CharacterUpdate:
					console.log("element to update:", update);
					props.onUpdateContent(update);
					break;
				case ElementUpdateKind.Deletion:
					console.log("element to remove:", update);
					// props.onRemoveContent(update);
					break;
			}
		});
	};

	const isNodeValidToUpdate = (node: Node, set: Set<Node>) =>
		node.nodeType === Node.ELEMENT_NODE && !set.has(node);

	const isRelevantElement = (
		node: Node,
	): node is HTMLParagraphElement | HTMLHeadingElement | HTMLBRElement =>
		["P", "H1", "BR"].includes(node.nodeName);

	const processNodeMutation = (
		node: Node,
		processedUpdates: Set<Node>,
		toUpdate: Array<EditorElementUpdate>,
		kind: ElementUpdateKind,
	) => {
		if (
			isRelevantElement(node) &&
			isNodeValidToUpdate(node, processedUpdates)
		) {
			processedUpdates.add(node);
			const element = node as HTMLElement;
			toUpdate.push(createElementUpdate(element, kind));
		}
	};

	const handleContentMutations = (mutations: MutationRecord[]) => {
		const updates: EditorElementUpdate[] = [];
		const processedElements = new Set<Node>();

		mutations.forEach((mutation) => {
			if (mutation.type === "childList") {
				// tracking added html nodes - new paragraphs, new headlines, new text segments
				mutation.addedNodes.forEach((node) =>
					processNodeMutation(
						node,
						processedElements,
						updates,
						ElementUpdateKind.Insertion,
					),
				);
				// tracking removed html nodes - on manual edit
				mutation.removedNodes.forEach((node) =>
					processNodeMutation(
						node,
						processedElements,
						updates,
						ElementUpdateKind.Deletion,
					),
				);
			} else if (mutation.type === "characterData") {
				console.log("Character update detected");
				// here we are tracking any text content changes, which can occur manually in
				// the editor by the user to update the content accordingly in the database.
				const parentElement = mutation.target.parentElement;
				if (parentElement && !processedElements.has(parentElement)) {
					processedElements.add(parentElement);
					updates.push(
						createElementUpdate(
							parentElement,
							ElementUpdateKind.CharacterUpdate,
						),
					);
				}
			}
		});

		console.log(
			"[ mutations ] updates, processed:",
			updates,
			processedElements,
		);

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
			id: dataset.id || "",
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
		Array.from(textContainer.childNodes).forEach((node) =>
			highlightNode(node, regex),
		);
	};

	const replaceSearchResults = (
		replaceText: string,
		searchText: string,
		replaceAll: boolean,
	) => {
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
	const handleReplace = (
		replaceText: string,
		searchText: string,
		replaceAll: boolean,
	) => {
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
			<EditorControls
				onSearchQuery={handleSearch}
				onReplaceResults={handleReplace}
			/>
			<div className="flex flex-col gap-2">
				<TestSimulationControls
					editorMode={props.editorMode}
					pauseSimulation={pauseDictation}
					resumeSimulation={resumeDictation}
					exportToClipboard={() =>
						copyTextContentsToClipboard(textContainerRef.current)
					}
					insertIntoSelection={insertIntoSelection}
					insertParagraph={insertLineBreak}
					insertHeadline={insertHeadline}
				/>
				<div
					contentEditable={props.editorMode !== EditorMode.DICTATING}
					ref={textContainerRef}
				></div>
			</div>
		</div>
	);
};
