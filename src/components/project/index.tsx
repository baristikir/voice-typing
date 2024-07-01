import { Link } from "react-router-dom";

interface Props {}

export function ProjectContent(props: Props) {
	return (
		<div>
			<h1 className="text-3xl font-semibold">Project</h1>
			<Link to={"/"}>Go back</Link>
		</div>
	);
}
