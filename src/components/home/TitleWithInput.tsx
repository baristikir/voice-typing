import { useState } from "react";
import { cn } from "../utils/cn";

const DEFAULT_TITLE = "Untitled";

export const TitleWithInput = () => {
	const [title, setTitle] = useState<string>(DEFAULT_TITLE);

	const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		e.preventDefault();
		setTitle(e.target.value);
	};

	const handleTitleClick = (_: React.MouseEvent<HTMLInputElement>) => {
		if (title === DEFAULT_TITLE) {
			setTitle("");
			return;
		}
	};

	const handleTitleBlur = (_: React.FocusEvent<HTMLInputElement>) => {
		if (title === "") {
			setTitle(DEFAULT_TITLE);
			return;
		}
	};

	return (
		<div className="flex-1">
			<input
				id="project.title"
				type="text"
				className={cn(
					"outline-none border-0 border-transparent",
					"text-3xl font-semibold text-gray-950",
					{
						"text-gray-400": title === DEFAULT_TITLE,
					}
				)}
				value={title}
				onChange={handleTitleChange}
				onClick={handleTitleClick}
				onBlur={handleTitleBlur}
			/>
		</div>
	);
};
