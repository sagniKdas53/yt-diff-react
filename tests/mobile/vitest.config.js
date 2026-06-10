import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    name: "mobile",
    globals: true,
    environment: "jsdom",
    include: ["**/*.test.{js,jsx}"],
    setupFiles: ["../setup.mobile.js"],
  },
});
