# Here is a comprehensive summary of the Download Queue UX feature and all its nuances

## Fix

### The Core Feature

The frontend now maintains a global, visual download queue. When a user selects multiple videos and clicks download, the selected cards immediately uncheck themselves and transition into a "Queued" state, displaying a numbered badge (e.g., `#1`, `#2`) to indicate their place in line. When the backend actually starts processing a video, the card transitions into an "Actively Downloading" state while retaining its queue number.

### 1. Global State Management (`App.jsx`)

- **Cross-Playlist Persistence**: The queue state (`queuedItems`) was lifted to the root `App.jsx` component. This means if you queue 3 videos on Playlist A, navigate to Playlist B, and queue 2 more, the new videos correctly become `#4` and `#5`.
- **Data Structure**: The queue is stored as an object keyed by `videoUrl`. Each entry contains context about where the video came from and its position:

  ```javascript
  { 
    "url1": { playlistUrl: "...", positionInPlaylist: 0, queuePosition: 1 },
    "url2": { playlistUrl: "...", positionInPlaylist: 1, queuePosition: 2 } 
  }
  ```

- **Socket Lifecycle**: The queue strictly follows backend truth via socket events:
  - `onDownloadDone` and `onDownloadFailed`: The item is immediately removed from the queue.
  - `onInit` (reconnection): The entire queue is wiped to prevent stale state if the backend restarts.

### 2. Auto-Renumbering & Promotion

- When a video leaves the queue (because its download finished successfully or failed), the remaining queued items are **automatically promoted**.
- If your queue is `#1`, `#2`, `#3` and `#2` finishes or fails, the old `#3` instantly renumbers to become the new `#2`. This ensures the UI never displays gaps in the queue numbers.

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
- **The Fix**: The selection effect was rewritten to act as a "diff". When background data arrives, it only initializes checkboxes for *new* items and safely cleans up *removed* items. Any items you have currently checked will stay checked, even if a background refresh occurs.
- **Immediate Feedback**: `downloadFunc` now `await`s the JSON response from the download API. It reads the exact URLs the backend accepted and immediately unchecks those specific items, leaving any rejected/failed items checked so the user knows what happened.
