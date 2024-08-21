import { useRef, useEffect } from "react";
import { api } from "@/utils/rendererElectronAPI";
import {
	copyTextContentsToClipboard,
	createHeadline1,
	createLineBreak,
	createParagraphText,
	getCurrentCursorState,
} from "./EditorElements";
import { TranscriptContent, TranscriptContentType } from "@/shared/models";
import {
	EditorAddContentAction,
	EditorMode,
	EditorRemoveContentAction,
	EditorSetTitleAction,
	EditorUpdateContentAction,
} from "./useEditor";
import { Simulation, TestSimulationControls } from "./TranscriptionSimulator";
import { StatusBar } from "./StatusBar";

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

interface Props {
	editorMode: EditorMode;
	contents: TranscriptContent[];
	onTitleChange(payload: EditorSetTitleAction["payload"]): void;
	onAddContent(payload: EditorAddContentAction["payload"]): void;
	onUpdateContent(payload: EditorUpdateContentAction["payload"]): void;
	onRemoveContent(payload: EditorRemoveContentAction["payload"]): void;
	onEditorModeChange(payload: EditorMode): void;
}
export const RecordingTranscriptions = (props: Props) => {
	const textContainerRef = useRef<HTMLDivElement>(null);

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
				Simulation.simulateTranscription(
					textContainerRef.current,
					sim_i,
					props.onAddContent,
				);
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

		props.onAddContent({
			type: TranscriptContentType.Linebreak,
			content: "\n",
			order: textContainer.children.length,
		});
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

		props.onAddContent({
			type: TranscriptContentType.Headline1,
			content: textContent,
			order: textContainer.children.length,
		});
	};

	const initContents = (contents: TranscriptContent[]) => {
		const textContainer = textContainerRef.current;

		for (const content of contents) {
			if (content.type === TranscriptContentType.Paragraph) {
				const paragraph = createParagraphText(content.content, false);
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
				const paragraph = createParagraphText(segment.text, segment.isPartial);
				textContainerRef.current.appendChild(paragraph);
			} else {
				lastText.textContent = segment.text;
				if (!segment.isPartial) {
					lastText.dataset.partial = "false";
					props.onAddContent({
						type: TranscriptContentType.Paragraph,
						content: lastText.textContent,
						order: textContainer.children.length,
					});
				}
			}
		}
	};

	const handleContentChange = (content: {
		type: "p" | "h1" | "br";
		action: "add" | "update";
		text: string;
	}) => {
		let data: { type: TranscriptContentType; content: string };

		switch (content.type) {
			case "h1":
				data.type = TranscriptContentType.Headline1;
				data.content = content.text;
			case "p":
				data.type = TranscriptContentType.Paragraph;
				data.content = content.text;
			case "br":
				data.type = TranscriptContentType.Linebreak;
				data.content = "\n";
		}
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
