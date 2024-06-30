# Voice Typing

This is a simple voice typing application that uses the Whisper model to convert speech to text. The application is built using Electron.

## Requirements

- [Node.js](https://nodejs.org/en/download/package-manager) > 22.0.0
- [yarn](https://yarnpkg.com/)
- [node-gyp](https://github.com/nodejs/node-gyp)

## Development

Install dependencies:

```bash
yarn install
```

Prepare node-addon-api which is used to build the native module:

```bash
node-gyp configure
```

Build the native module:

```bash
node-gyp build
```

Run the application:

```bash
yarn start
```
