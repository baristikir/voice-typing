import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HomeRoute } from "./app/home";
import { ProjectRoute } from "./app/project";

export default function App() {
	// useRendererListener(MenuChannels.MENU_EVENT, onMenuEvent);
	// useThemeListener();

	return (
		<MemoryRouter>
			<Routes>
				<Route path="/" Component={HomeRoute} />
				<Route path="/projects/:project_id" Component={ProjectRoute} />
			</Routes>
		</MemoryRouter>
	);
}
