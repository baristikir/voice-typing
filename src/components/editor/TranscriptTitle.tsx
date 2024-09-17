import { cn } from "../utils/cn";

const DEFAULT_TITLE = "Untitled";

interface Props {
	title?: string;
}
export const TranscriptTitle = (props: Props) => {
	return (
		<div className="flex-1">
			<h1
				className={cn("text-4xl font-semibold text-gray-950", {
					"text-gray-400": props.title === DEFAULT_TITLE,
				})}
			>
				{props.title ?? DEFAULT_TITLE}
			</h1>
		</div>
	);
};
