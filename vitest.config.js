import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config.js";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      workspace: [
        "tests/desktop/vitest.config.js",
        "tests/mobile/vitest.config.js",
      ],
      projects: [
        "tests/desktop/vitest.config.js",
        "tests/mobile/vitest.config.js",
      ],
    },
  })
);
