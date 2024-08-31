type Dataset = Record<string, string>;
function createDatasetFields(element: HTMLElement, dataset: Dataset) {
	Object.entries(dataset).forEach((data) => {
		element.dataset[String(data[0])] = data[1];
	});
}
function createParagraphText(textContent: string, dataset: Record<string, string>) {
	const paragraph = document.createElement("p");
	const textNode = document.createTextNode(textContent);
	paragraph.appendChild(textNode);

	paragraph.id = `segment-${new Date().getTime()}`;
	paragraph.className =
		"text-justify text-xl text-gray-950 data-[partial=true]:text-gray-400 data-[partial=true]:font-light";
	createDatasetFields(paragraph, dataset);
	return paragraph;
}

function createHeadline1(textContent: string, dataset: Dataset) {
	const h1 = document.createElement("h1");
	h1.textContent = textContent;
	h1.className = "text-3xl font-semibold text-gray-950 mt-4";
	createDatasetFields(h1, dataset);
	return h1;
}

function createLineBreak(dataset: Dataset) {
	const br = document.createElement("br");
	createDatasetFields(br, dataset);
	return br;
}

function getCurrentCursorState() {
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
}

function copyTextContentsToClipboard(textContainer: HTMLDivElement) {
	const textContainerChildren = textContainer.children;
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
}

function highlightNode(node: Node, regex: RegExp) {
	const { nodeType, nodeName } = node;
	if (nodeType === Node.ELEMENT_NODE && nodeName !== "MARK") {
		Array.from(node.childNodes).forEach((childNode) => highlightNode(childNode, regex));
	}

	if (nodeType === Node.TEXT_NODE) {
		const { parentNode: parent } = node;
		const isMarkElement = parent.nodeName === "MARK";
		if (!parent || isMarkElement) {
			console.log("Node is already mark element", parent);
			return;
		}

		const matches = node.textContent?.match(regex);
		if (!matches) {
			console.log("No matches found", node.textContent);
			return;
		}

		const fragment = document.createDocumentFragment();
		const parts = node.textContent?.split(regex);

		parts?.forEach((part, index) => {
			fragment.appendChild(document.createTextNode(part));
			if (index < parts.length - 1) {
				const mark = document.createElement("mark");
				mark.textContent = matches[index];
				fragment.appendChild(mark);
			}
		});

		parent.replaceChild(fragment, node);
	}
}

function removeHighlightFromNode(node: Node) {
	const { nodeType, nodeName } = node;
	if (nodeType !== Node.ELEMENT_NODE) {
		return;
	}

	if (nodeName === "MARK") {
		const { parentNode: parent } = node;
		if (parent) {
			parent.replaceChild(document.createTextNode(node.textContent || ""), node);
			parent.normalize();
		}

		return;
	}

	Array.from(node.childNodes).forEach(removeHighlightFromNode);
}

function replaceInNode(node: Node, regex: RegExp, replaceText: string, replaceAll: boolean) {
	const { nodeType } = node;
	if (nodeType === Node.TEXT_NODE) {
		const { parentNode: parent } = node;

		if (parent && parent.nodeName === "MARK") {
			const newText = node.textContent?.replace(regex, replaceText) || "";
			if (newText !== node.textContent) {
				node.textContent = newText;
				return true;
			}
		}
	}

	if (nodeType === Node.ELEMENT_NODE) {
		let replaced = false;
		Array.from(node.childNodes).forEach((child) => {
			if (replaced && !replaceAll) return;
			replaced = replaceInNode(child, regex, replaceText, replaceAll) || replaced;
		});
		return replaced;
	}

	return false;
}

export {
	createParagraphText,
	createHeadline1,
	createLineBreak,
	getCurrentCursorState,
	copyTextContentsToClipboard,
	highlightNode,
	removeHighlightFromNode,
	replaceInNode,
};
