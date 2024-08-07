import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HomeRoute } from "./app/home";
import { NewDictationRoute } from "./app/new-dictation";
import { ProjectRoute } from "./app/project";
import { Button } from "./components/ui/Button";
import { Gear } from "@phosphor-icons/react";

export default function App() {
	// useRendererListener(MenuChannels.MENU_EVENT, onMenuEvent);
	// useThemeListener();

	return (
		<MemoryRouter initialEntries={["/new-dictation"]}>
			<div className="w-full relative h-full flex items-start justify-start min-h-screen drag">
				{/* <div className="flex flex-col items-start justify-start w-60 bg-gray-50 border-r border-gray-400/20 h-full fixed py-12 px-4 space-y-6">
					<div className="inline-flex w-full no-drag">
						<Button variant="default" className="w-full font-normal">
							+ Neue Aufnahme
						</Button>
					</div>
					<div className="border-t border-gray-400/20 w-full flex items-start flex-1 pt-4">
						<div className="w-full flex flex-col">
							<span className="font-medium">Test Skript</span>
							<div className="px-1.5 py-0.5 flex items-center justify-center rounded-lg bg-gray-100 shrink-0">
								<span className="text-xs">29.02</span>
							</div>
						</div>
					</div>
					<div className="inline-flex w-full no-drag">
						<Button
							variant="ghost"
							className="w-full font-medium items-center justify-start text-gray-500"
						>
							<Gear weight="duotone" className="w-5 h-5 mr-1" />
							Einstellungen
						</Button>
					</div>
				</div> */}
				<div className="py-16 px-8 w-full h-full no-drag">
					<Routes>
						<Route path="/" Component={HomeRoute} />
						<Route index path="/new-dictation" Component={NewDictationRoute} />
						<Route path="/projects/:project_id" Component={ProjectRoute} />
					</Routes>
				</div>
			</div>
		</MemoryRouter>
	);
}
