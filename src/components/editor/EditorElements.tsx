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

export { createParagraphText, createHeadline1, createLineBreak };
