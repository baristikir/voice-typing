# Project Structure

This projects integrates the Whisper.cpp module into an Electron application.

The entrypoint of the application is `main.ts` which also loads `preload.ts` and
`render.ts`. These are specific configuration of the Electron framework and are
used to initiate application and ipc endpoints. For the UI
[React.js](https://react.dev/) is being used.

Project Directories:

- `/cpp` - This directory contains all native addons and native module
  implementations.
- `/src` - This directory contains all application logic, including UI and
  business logic.
  - `/app` - Routes (Home Route, Editor Route)
  - `/components` - UI Components are stored here
  - `/ipc` - All IPC endpoints and main process implementations using Node.js
  - `/shared` - Shared files for render and main process. Its purpose is mainly
    to share type definitions between client and backend of the applciation
  - `/state` - Global UI application state
  - `/styles` - CSS Styles
  - `/utils` - Utility functions
- `/out` - Electron build directory. Every application build gets exported into
  the /out directory.
- `/resources` - MacOS build configuration (Info.plist, entitlements.plist)
  defining application permissions.
- `/build` & `/bin` - These directories contain node-addon specific exports and
  configurations. Native-Addon exports are created with
  [node-gyp](https://github.com/nodejs/node-gyp/)
- `/whisper.cpp` - Submodule of the
  [whisper.cpp](https://github.com/ggerganov/whisper.cpp)
- `/.github` - GitHub workflow actions to create application builds and publish
  to GitHub releases
