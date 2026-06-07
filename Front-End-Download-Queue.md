# Here is a comprehensive summary of the Download Queue UX feature and all its nuances

## Fix

### The Core Feature

The frontend now maintains a global, visual download queue. When a user selects multiple videos and clicks download, the selected cards immediately uncheck themselves and transition into a "Queued" state, displaying a numbered badge (e.g., `#1`, `#2`) to indicate their place in line. When the backend actually starts processing a video, the card transitions into an "Actively Downloading" state while retaining its queue number.

### 1. Global State Management (`App.jsx`)

- **Cross-Playlist Persistence**: The queue state (`queuedItems`) was lifted to the root `App.jsx` component. This means if you queue 3 videos on Playlist A, navigate to Playlist B, and queue 2 more, the new videos correctly become `#4` and `#5`.
- **Data Structure**: The queue is stored as an object keyed by `videoUrl`. Each entry contains context about where the video came from and its position:

  ```javascript
  {
    "url1": { playlistUrl: "...", positionInPlaylist: 0, queuePosition: 1, requestId: "..." },
    "url2": { playlistUrl: "...", positionInPlaylist: 1, queuePosition: 2, requestId: "..." }
  }
  ```

- **Pure Queue Updates**: Queue positions are derived from the previous state rather than a mutable counter. This keeps state updater functions safe under React Strict Mode.
- **Request Tracking**: New items are tagged with the request that queued them. If the backend rejects all or part of a request, only entries added by that request are rolled back.
- **Socket Lifecycle**: The queue strictly follows backend truth via socket events:
  - `onDownloadDone` and `onDownloadFailed`: The item is immediately removed from the queue.
  - `onInit` (reconnection): The entire queue is wiped to prevent stale state if the backend restarts.

### 2. Auto-Renumbering & Promotion

- When a video leaves the queue (because its download finished successfully or failed), the remaining queued items are **automatically promoted**.
- If your queue is `#1`, `#2`, `#3` and `#2` finishes or fails, the old `#3` instantly renumbers to become the new `#2`. This ensures the UI never displays gaps in the queue numbers.
- Completion updates are linear in the queue size and do not sort the queue on every completed download.

### 3. Visual States & Transitions (`SubList.jsx`)

Cards now have three distinct visual states with smooth `0.2s` transitions between them:

1. **Default State**: Standard divider border, standard background.
2. **Queued (Waiting)**:
   - Border: 2px wide, `secondary.main` (purple).
   - Background: Very faint purple tint (adapts automatically to light/dark mode).
   - Chip: `secondary` colored (purple) `#N` badge appears next to the checkbox.
3. **Actively Downloading**:
   - Border: 2px wide, `success.main` (green).
   - Background: Faint green tint.
   - Chip: Remains visible but transitions to `success` colored (green) to match the border.

### 4. Background Refresh Protection

- **The Bug**: Previously, the UI listened to backend socket events to refetch the playlist page in the background. When this data arrived, `SubList` would brutally wipe all checkboxes, clearing any selections the user was actively making.
- **The Fix**: The selection effect was rewritten to act as a "diff". When background data arrives, it only initializes checkboxes for _new_ items and safely cleans up _removed_ items. Any items you have currently checked will stay checked, even if a background refresh occurs.
- **Immediate Feedback**: `downloadFunc` adds selected items to the visual queue before starting the request. This prevents a fast socket completion from arriving before the queue entry exists.
- **Partial Acceptance**: The JSON response identifies the URLs accepted by the backend. Accepted items are unchecked, while rejected items are removed from the visual queue and remain selected.

### 5. Render and Debugging Performance

- Queue updates return the previous state object when no item changed, avoiding redundant React renders.
- `PlayList` is memoized so download progress, queue, snackbar, and notification updates in `App` do not rerender it when its own props are unchanged.
- The dependency logger compares tracked values with `Object.is`, matching React dependency semantics. It logs only actual tracked changes and no longer serializes large queue or item objects after every render.

### Deferred Design Work

Backend-authoritative queue positions and reconnect reconciliation remain intentionally deferred. Their scope and proposed direction are documented in `TODO.md`.
