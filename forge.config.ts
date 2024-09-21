import { ForgeConfig } from "@electron-forge/shared-types";
import { FusesPlugin } from "@electron-forge/plugin-fuses";
import { FuseV1Options, FuseVersion } from "@electron/fuses";
import { MakerSquirrel } from "@electron-forge/maker-squirrel";
import { MakerZIP } from "@electron-forge/maker-zip";
import { MakerRpm } from "@electron-forge/maker-rpm";
import { MakerDeb } from "@electron-forge/maker-deb";
import { MakerDMG } from "@electron-forge/maker-dmg";
import { VitePlugin } from "@electron-forge/plugin-vite";
import { AutoUnpackNativesPlugin } from "@electron-forge/plugin-auto-unpack-natives";
import path from "path";
import fs from "fs";

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    appVersion: "0.0.1",
    appCategoryType: "public.app-category.productivity",
    extendInfo: "./resources/Info.plist",
    extraResource: [
      "./whisper.cpp/models/ggml-base.bin",
      "./whisper.cpp/models/ggml-base.en.bin",
    ],
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({
      authors: "Baris Tikir",
      name: "Voice Typing (Win)",
    }),
    new MakerZIP({}, ["darwin"]),
    new MakerRpm({}, ["linux"]),
    new MakerDeb({}, ["linux"]),
    new MakerDMG({
      name: "Voice Typing (MacOS)",
    }, ["darwind"]),
  ],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be
      // Main process, Preload scripts, Worker process, etc.
      build: [
        {
          // `entry` is an alias for `build.lib.entry`
          entry: "src/main.ts",
          config: "vite.main.config.ts",
        },
        {
          entry: "src/preload.ts",
          config: "vite.preload.config.ts",
        },
      ],
      renderer: [
        {
          name: "main_window",
          config: "vite.renderer.config.ts",
        },
      ],
    }),
  ],
  hooks: {
    packageAfterCopy: async (
      config,
      buildPath,
      electronVersion,
      platform,
      arch,
    ) => {
      const nativeAddonPath = path.resolve(
        __dirname,
        "build",
        "Release",
        "addon.node",
      );
      const destPath = path.join(buildPath, "native_modules");

      await fs.promises.mkdir(destPath, { recursive: true });
      await fs.promises.copyFile(
        nativeAddonPath,
        path.join(destPath, "addon.node"),
      );
    },
  },
};

export default config;
