/**
 * Single source for where the backend lives.
 *
 * In development Vite serves the app from a different origin than the API, so
 * the host is spelled out. In production the bundle is served from under the
 * backend's own base path, where a root-relative URL is correct.
 */
const base = import.meta.env.PROD ? "" : "http://localhost:8888";

/** Base path the backend is mounted under, e.g. "/ytdiff". */
export const basePath = import.meta.env.VITE_BASE_PATH || "/ytdiff";

/** Prefix for every API call — `apiFetch` resolves relative paths against it. */
export const backEnd = base + basePath;

/** Where socket.io is mounted behind the same base path. */
export const socketPath = basePath + "/socket.io";

/**
 * Absolute prefix for URLs handed to the browser itself — <img src>, <video
 * src>, download anchors. These cannot be root-relative in development because
 * the dev server is not the backend, and cannot carry the dev host in
 * production because the origin is the backend.
 */
export const assetBase =
  (import.meta.env.PROD ? globalThis.location.origin : "") + backEnd;
