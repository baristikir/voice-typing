# Voice Typing

This is a simple voice typing application that uses the Whisper model to convert
speech to text. The application is built using Electron.

# TO-DOs

- Editor:
- [x] Insert text (transcripts) programmatically
- [x] Different editor states to derive content editable state
  - [x] Dictate Mode
  - [x] Edit Mode
  - [x] Selection Mode
- [x] Make content editable
- [x] Get selection in editor
- [x] Paste into selection programmatically
  - [ ] Scroll down to latest insertion (Dictation Mode)
- [ ] Put cursor position after insertion
- [x] Formatting Elements
  - [x] Text
  - [x] Headline
  - [x] Empty Paragraphs
- [x] Search for texts inside editor
- [x] Replace previous searched instance with words
- [x] Copy content to clipboard
- [ ] Export content as PDF
- [x] Autosave text contents to DB
- Dictation:
- [x] Capture audio input from microphone
- [x] Transcribe audio segments and return to JS thread
- [ ] Pause / Resume transcription
  - [ ] Clear whisper state
- [ ] Controls
  - [ ] Push to talk -> Configurable keyboard shortcuts
  - [ ] Toggle to talk
- Voice Commands:
- [ ] Convert formatting elements into voice commands
- [ ] Convert search into voice command
- [ ] Convert replace into voice command
- Database:
- [x] Setup SQLite DB
- [x] Create tables
- [x] Add IPC handlers
- Settings:
- [ ] Configurable dictation (toggle or push-to-talk)
- [ ] Customizable keyboard shortcuts
  - [ ] Dictationmode Shortcut (either for toggling or push-to-talk)
  - [ ] Editmode Shortcut

## Requirements

- [Node.js](https://nodejs.org/en/download/package-manager) > 22.0.0
- [yarn](https://yarnpkg.com/)
- [node-gyp](https://github.com/nodejs/node-gyp)

## Development

> [!IMPORTANT] Important note: The relying node version needs to match the cpu
> architecture of the device where this application is going to be used.

To ensure the node version matches the cpu architecture, run the following
commands and compare the outputs. If they match, you are good to go. If they
don't match, you need to install the correct node version for the cpu
architecture.

```bash
$ arch
arm64

$ node -e "console.log(process.arch)"
arm64
```

### Install Dependencies + Build Native Modules

Install dependencies with prepration for node-addon-api, which will start the
build process for the native modules:

```bash
$ yarn install
```

If you want to install dependencies without building the native modules, run the
following command:

```bash
$ yarn install --ignore-scripts
```

### Manually Build Native Modules (Optional)

Prepare node-addon-api which is used to build the native module:

```bash
$ node-gyp configure
```

Build the native module:

```bash
$ node-gyp build
```

### Run the Application

```bash
$ yarn start
```
