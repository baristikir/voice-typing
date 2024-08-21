function createParagraphText(textContent: string, isPartial: boolean) {
	const paragraph = document.createElement("p");
	paragraph.textContent = " " + textContent;
	paragraph.id = `segment-${new Date().getTime()}`;
	paragraph.className =
		"text-justify text-xl text-gray-950 data-[partial=true]:text-gray-400 data-[partial=true]:font-light";
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

export {
	createParagraphText,
	createHeadline1,
	createLineBreak,
	getCurrentCursorState,
	copyTextContentsToClipboard,
};
