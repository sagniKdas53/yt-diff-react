<!-- Auto-generated guidance for AI coding agents working on this repo -->
# Quick orientation — what this frontend is

This is a small React + Vite frontend for the `yt-diff` project. It's built with React 18, MUI components, SCSS and uses Socket.IO for realtime events. The repo is intended to be built and copied out to `../dist/` and consumed by a container build (see `readme.md`).

Key files to read first
- `src/components/App.jsx` — application entry, theme + socket setup, top-level state (tokens, reFetch, notifications).
- `src/components/PlayList.jsx` and `src/components/SubList.jsx` — the two main UI lists and the main HTTP API usage (`/getplay`, `/getsub`, `/download`, `/list`, `/watch`).
- `src/main.jsx` — app mounting.
- `vite.config.js` & `package.json` — dev/build commands, plugins (compression) and dependencies.

How the backend URL is built
- The frontend composes the backend URL at runtime in `App.jsx`:
  - `base = import.meta.env.PROD ? "" : "http://localhost:8888"`
  - `path = import.meta.env.VITE_BASE_PATH || "/ytdiff"`
  - `backEnd = base + path`

Dev / build / preview commands (npm)
- `npm run dev` — start vite dev server (binds host by default via `--host`).
- `npm run build` — produces a build with `--base=/ytdiff/` and writes to `../dist/` (important for Docker). The built assets assume the base path `/ytdiff/` unless `VITE_BASE_PATH` overrides the runtime path.
- `npm run preview` — preview the production build locally.

Runtime / environment notes
- The build base path matters: the app uses `/ytdiff/` by default (see `package.json` build script). Override with `VITE_BASE_PATH` if you host under a different prefix.
- In development the frontend expects the backend at `http://localhost:8888`. If the backend runs elsewhere, set `import.meta.env` properly or start vite with env replacements.

Auth, tokens and storage
- Token is stored in `localStorage` key `ytdiff_token`. Value `"null"` is treated as no token. The socket client attaches the token via `socket.auth = { token }` prior to connecting.
- Theme preference saved in `localStorage` key `ytdiff_theme` (boolean-like JSON).

HTTP APIs the UI calls (discoverable in `PlayList.jsx` / `SubList.jsx` / `Login.jsx`)
- `POST /login` — returns `{ token }` on success (used by `Login.jsx`).
- `POST /list` — add playlist(s) (used by `PlayList.jsx`).
- `POST /getplay` — lists playlists (pagination + sort + query).
- `POST /getsub` — lists sub-items for a playlist (pagination + query + sortDownloaded).
- `POST /download` — request download of selected items.
- `POST /watch` — change watch mode for a playlist item.

Websocket events (Socket.IO) used by App.jsx — agent should keep these in mind for feature work and tests
- From server to client: `init`, `error`, `token-expired`, `connection-error`,
  `download-started`, `download-done`, `download-failed`, `downloading-percent-update`,
  `listing-started`, `listing-playlist-complete`, `listing-playlist-chunk-complete`,
  `listing-single-item-complete`, `listing-error`.
- The client uses these events to drive UI state (progress bar, reFetch id, notifications). When changing socket behaviour keep the `reFetch` flow and `setIndeterminate` semantics in mind.

Patterns & conventions to follow
- UI uses lazy-loaded components with `React.Suspense` (see `App.jsx`) — keep chunk sizes small and preserve component boundaries when refactoring.
- Data fetching often uses a memoized async function (`useMemo(async () => ...)`) and `useEffect` that waits on the promise. This is non-standard (usually `useEffect` + `fetch` is used). If you change fetching, prefer `useEffect` with an AbortController for cancellation.
- Pagination: both lists calculate `start`/`stop` from `page` and `rowsPerPage`. Changing rowsPerPage resets page -> behaviour is intentional.
- Error handling: 401 responses set token to `null` and show a snackbar. Preserve that behaviour when modifying network code to avoid infinite loops.

Linting and formatting
- ESLint is configured (`.eslintrc.cjs`). Use `npm run lint` before opening large PRs.

Where to look for tests / TODOs
- There are no automated tests in this repo. Work-in-progress notes and known issues are in `TODO.md`.

Small safety notes for AI edits
- Do not commit real tokens or secrets. Token values live in `localStorage` at runtime and must not be added to the repo.
- Avoid changing the `backEnd` composition or `VITE_BASE_PATH` behaviour unless you update Docker or deployment scripts in parallel — builds assume `--base=/ytdiff/`.

If anything here is unclear tell me which area you want expanded (socket events, the paging/fetch pattern, or build/deploy path) and I'll extend this file.
