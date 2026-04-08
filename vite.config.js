"use strict";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { compression } from "vite-plugin-compression2";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    compression({
      algorithm: "gzip",
      exclude: [/\.(br)$/, /\.(gz)$/],
      deleteOriginalAssets: false
    }),
    compression({
      algorithm: "brotliCompress",
      exclude: [/\.(br)$/, /\.(gz)$/],
      deleteOriginalAssets: false
    }),
  ],
  resolve: {
    alias: {
      '@mui/icons-material': '@mui/icons-material/esm',
    }
  }
})