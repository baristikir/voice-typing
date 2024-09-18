import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HomeRoute } from "./app/home";
import { TranscriptRoute } from "./app/transcript";

export default function App() {
	return (
		<MemoryRouter initialEntries={["/"]}>
			<div className="w-full relative h-full flex items-start justify-start min-h-screen drag">
				<div className="py-16 px-8 w-full h-full no-drag">
					<Routes>
						<Route index path="/" Component={HomeRoute} />
						<Route path="/transcripts/:transcript_id" Component={TranscriptRoute} />
					</Routes>
				</div>
			</div>
		</MemoryRouter>
	);
}
