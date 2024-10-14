# Voice Typing

This is a simple voice typing application that uses the Whisper model to convert
speech to text. The application is built using Electron.

## Requirements

- [Node.js](https://nodejs.org/en/download/package-manager) > 22.0.0
- [yarn](https://yarnpkg.com/)
- [node-gyp](https://github.com/nodejs/node-gyp)
- Python >= 3.12
- C++ compiler (e.g. GCC)

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

# Build the Application

For platform specific information check .github/workflows scripts, where Linux,
MacOS and Windows builds are defined. Output gets generated in /out directory
for the current platform.

```bash
$ yarn make
```

# Sources

- [ggerganov/whisper.cpp](https://github.com/ggerganov/whisper.cpp)
- [openai/whisper](https://github.com/openai/whisper/)
