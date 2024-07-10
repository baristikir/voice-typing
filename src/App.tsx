import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HomeRoute } from "./app/home";
import { ProjectRoute } from "./app/project";
import { Button } from "./components/ui/Button";

export default function App() {
	// useRendererListener(MenuChannels.MENU_EVENT, onMenuEvent);
	// useThemeListener();

	return (
		<MemoryRouter>
			<div className="w-full relative h-full flex items-start justify-start min-h-screen drag">
				{/* <div className="flex flex-col items-start justify-start w-60 bg-gray-50 border-r border-gray-500/20 h-full fixed py-12 px-4 space-y-6">
					<div className="inline-flex w-full no-drag">
						<Button variant="outline" className="w-full font-medium">
							+ Neues Projekt
						</Button>
					</div>
					<div className="border-t border-gray-400/20 w-full flex items-start flex-1 pt-4">
						<div className="w-full">
							<span>filename</span>
						</div>
					</div>
				</div> */}
				<div className="py-12 px-4 w-full h-full no-drag">
					<Routes>
						<Route path="/" Component={HomeRoute} />
						<Route path="/projects/:project_id" Component={ProjectRoute} />
					</Routes>
				</div>
			</div>
		</MemoryRouter>
	);
}
