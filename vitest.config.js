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
      // A floor, not a target: set where coverage already sits so it can only
      // rise. Nothing hard is carved out — App.jsx and VideoPlayer.jsx are the
      // two files that most need the gate, and excluding them would leave it
      // measuring only the easy ones, which is how a coverage gate becomes
      // decorative. `main.jsx` is the only exclusion: it is the ReactDOM
      // bootstrap, it has no branches, and there is nothing there to cover.
      coverage: {
        provider: "v8",
        reporter: ["text-summary", "lcov"],
        reportsDirectory: "coverage",
        all: true,
        include: ["src/**/*.{js,jsx}"],
        exclude: ["src/main.jsx"],
        thresholds: {
          statements: 64,
          branches: 47,
          functions: 55,
          lines: 66,
        },
      },
    },
  })
);
