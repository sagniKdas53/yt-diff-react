import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config.js";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
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
      // `asyncUtilTimeout` is what every `waitFor` in the suite inherits, and
      // one second is not enough once the coverage instrumentation has every
      // core busy: renders cost several times what they do uninstrumented, and
      // the tests that failed were not broken, they were waiting for a machine
      // that was not there any more. These wait on a condition, not on a
      // duration, so a longer ceiling costs nothing when things are healthy.
      asyncUtilTimeout: 10000,
      coverage: {
        provider: "v8",
        reporter: ["text-summary", "lcov"],
        reportsDirectory: "coverage",
        all: true,
        include: ["src/**/*.{js,jsx}"],
        exclude: ["src/main.jsx"],
        thresholds: {
          statements: 72,
          branches: 56,
          functions: 63,
          lines: 73,
        },
      },
    },
  })
);
