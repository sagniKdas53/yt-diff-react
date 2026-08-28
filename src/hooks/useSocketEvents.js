import { useEffect, useRef, useState } from "react";

// How long per-playlist completions are collapsed before one playlist-list
// re-fetch is issued during a batch re-index.
const BATCH_REFETCH_COALESCE_MS = 3000;

const emptyBatchReindex = () => ({
  active: false,
  batchId: null,
  total: 0,
  completed: 0,
  failed: 0,
});

/**
 * Everything a socket event does to the app, in one place.
 *
 * This was the 414-line `useEffect` inside `App.jsx`: eighteen `socket.on`
 * registrations against a hand-maintained block of eighteen `socket.off`
 * calls, closing over the listing counter, the batch-reindex tracker, the
 * download queue ops and half of App's navigation state. The registrations
 * and their cleanup now live here; what changed hands is stated below.
 *
 * Handlers are registered once per connection — every context callback they
 * read is stable for the life of a socket, and anything that actually varies
 * between renders reaches them through one of the refs passed in.
 *
 * @param {Object} deps
 * @param {import("socket.io-client").Socket | null} deps.socket
 * @param {(id: unknown) => void} deps.setConnectionId
 * @param {() => void} deps.logout
 * @param {(message: string, type?: string) => void} deps.setSnack - Snackbar only.
 * @param {(message: string, type?: string) => void} deps.addNotification - Log only.
 * @param {(fn: (prev: Record<string, number>) => Record<string, number>) => void} deps.updateActiveDownloads
 * @param {(url: string) => void} deps.removeActiveDownload
 * @param {(url: string) => void} deps.removeFromQueueAndRenumber
 * @param {() => void} deps.clearDownloadState
 * @param {(url: string, position: number) => void} deps.setQueuePosition
 * @param {() => Promise<number | null>} deps.syncQueueFromBackend
 * @param {{current: string}} deps.playListUrlRef - Current loaded playlist.
 * @param {(url: string) => void} deps.setPlayListUrl
 * @param {(index: number) => void} deps.setPlayListIndex
 * @param {(index: number) => void} deps.setSubListIndex
 * @param {(tag: string) => void} deps.setReFetchPlaylist
 * @param {(tag: string) => void} deps.setReFetchSubList
 * @param {{current: (next: boolean) => void}} deps.toggleProgressCallBackRef
 * @param {{current: boolean}} deps.disableProgressRef
 * @param {{current: boolean}} deps.isMobileRef
 * @param {(title: string) => void} deps.onMobileSlideNeeded - Slides the video
 *   panel in on mobile when an event should navigate to fresh content.
 * @returns {{
 *   activeListingCount: number,
 *   batchReindex: {active: boolean, batchId: ?string, total: number, completed: number, failed: number},
 *   downloadedItem: {current: DownloadedItem},
 * }} The state socket events own, for the progress bar and the sublist's
 *   last-downloaded patch. `downloadedItem` is a ref: it changes without a
 *   render by design, and the snackbar each completion fires provides the
 *   render that carries its new value down.
 */
/**
 * The last completed download, as the sublist patches it into its row.
 *
 * Every field the `download-done` frame carries, because `SubList` reads every
 * one of them — the initializer named four of the nine, so the ref's declared
 * shape and its assigned shape disagreed from the first render.
 *
 * @typedef {Object} DownloadedItem
 * @property {?string} url
 * @property {?string} title
 * @property {?string} fileName
 * @property {?string} saveDirectory
 * @property {?boolean} isMetaDataSynced
 * @property {?string} thumbNailFile
 * @property {?string} onlineThumbnail
 * @property {?string} subTitleFile
 * @property {?string} descriptionFile
 */

export function useSocketEvents({
  socket,
  setConnectionId,
  logout,
  setSnack,
  addNotification,
  updateActiveDownloads,
  removeActiveDownload,
  removeFromQueueAndRenumber,
  clearDownloadState,
  setQueuePosition,
  syncQueueFromBackend,
  playListUrlRef,
  setPlayListUrl,
  setPlayListIndex,
  setSubListIndex,
  setReFetchPlaylist,
  setReFetchSubList,
  toggleProgressCallBackRef,
  disableProgressRef,
  isMobileRef,
  onMobileSlideNeeded,
}) {
  const [activeListingCount, setActiveListingCount] = useState(0);
  const activeListingCountRef = useRef(0);
  const incrementListings = () => {
    setActiveListingCount((prev) => {
      const next = prev + 1;
      activeListingCountRef.current = next;
      return next;
    });
  };
  const decrementListings = () => {
    setActiveListingCount((prev) => {
      const next = Math.max(0, prev - 1);
      activeListingCountRef.current = next;
      return next;
    });
  };

  // Mirrors batchReindex so socket handlers read a value that is current within
  // the same tick, even when React batches the state updates.
  const [batchReindex, setBatchReindex] = useState(emptyBatchReindex);
  const batchReindexRef = useRef(emptyBatchReindex());
  const setBatchReindexState = (next) => {
    batchReindexRef.current = next;
    setBatchReindex(next);
  };
  /** Increments "completed" or "failed"; no-op (returns null) outside a batch. */
  const bumpBatchReindex = (field) => {
    const prev = batchReindexRef.current;
    if (!prev.active) return null;
    const next = { ...prev, [field]: prev[field] + 1 };
    batchReindexRef.current = next;
    setBatchReindex(next);
    return next;
  };

  // A batch can finish hundreds of playlists; refetching the playlist list on
  // each one is a request storm. Collapse them onto a trailing-edge timer.
  const batchRefetchTimerRef = useRef(null);
  const flushBatchPlaylistRefetch = () => {
    if (batchRefetchTimerRef.current) {
      clearTimeout(batchRefetchTimerRef.current);
      batchRefetchTimerRef.current = null;
    }
  };
  const scheduleBatchPlaylistRefetch = (tag) => {
    if (batchRefetchTimerRef.current) return;
    batchRefetchTimerRef.current = setTimeout(() => {
      batchRefetchTimerRef.current = null;
      setReFetchPlaylist(tag + "-coalesced-" + Date.now());
    }, BATCH_REFETCH_COALESCE_MS);
  };

  /** @type {import("react").MutableRefObject<DownloadedItem>} */
  const downloadedItem = useRef({
    url: null,
    title: null,
    fileName: null,
    saveDirectory: null,
    isMetaDataSynced: null,
    thumbNailFile: null,
    onlineThumbnail: null,
    subTitleFile: null,
    descriptionFile: null,
  });

  const connectionGenerationRef = useRef(null);

  useEffect(() => {
    if (!socket) return; // guard

    // helpers
    const nowTag = () => Date.now().toString();

    /** Pulls the backend snapshot and records the generation it reports. */
    const syncQueue = async () => {
      const generation = await syncQueueFromBackend();
      if (generation) {
        connectionGenerationRef.current = generation;
      }
    };

    // Helpers for mobile navigation once an event lands on new content
    const triggerMobileSlideIfNeeded = (title) => {
      if (isMobileRef.current) {
        onMobileSlideNeeded(title || "");
      }
    };

    // Handlers (use refs for any "current" state)
    const onInit = (data) => {
      setConnectionId(data.id);

      const isReconnect = connectionGenerationRef.current === data.generation;
      connectionGenerationRef.current = data.generation;

      if (!isReconnect) {
        // Backend restarted or first connect -> clear local state, then sync to
        // get any items that might exist
        clearDownloadState();
        setActiveListingCount((prev) => {
          activeListingCountRef.current = 0;
          return prev !== 0 ? 0 : prev;
        });
        // A batch cannot survive a backend restart, and leaving it "active"
        // would pin the progress bar forever.
        flushBatchPlaylistRefetch();
        if (batchReindexRef.current.active) {
          setBatchReindexState(emptyBatchReindex());
        }
      }

      // Either way the backend's queue is the truth.
      syncQueue();

      toggleProgressCallBackRef.current(false);
      setSnack("Connected to Backend", "success");
      socket.emit("acknowledge", { data: "Connected", id: data.id });
    };

    const onError = (data) => {
      setSnack(`${data.message}`, "error");
    };

    const onTokenExpired = () => {
      setSnack("Your session has expired.", "error");
      logout();
    };

    const onConnectionError = () =>
      setSnack("Server is currently at maximum capacity.", "error");

    const onDownloadStarted = (data) => {
      const url = data.url || "unknown";
      const percent = isNaN(+data.percentage) ? 0 : +data.percentage;
      updateActiveDownloads((prev) => ({ ...prev, [url]: percent }));
      setQueuePosition(url, data.queuePosition);

      toggleProgressCallBackRef.current(false);
    };

    const onDownloadDone = (data) => {
      removeActiveDownload(data.url);
      removeFromQueueAndRenumber(data.url);
      downloadedItem.current = {
        url: data.url,
        title: data.title,
        fileName: data.fileName || null,
        saveDirectory: data.saveDirectory || null,
        isMetaDataSynced: data.isMetaDataSynced || null,
        thumbNailFile: data.thumbNailFile || null,
        onlineThumbnail: data.onlineThumbnail || null,
        subTitleFile: data.subTitleFile || null,
        descriptionFile: data.descriptionFile || null,
      };
      setSnack(`${data.title}`, "success");
      addNotification(`Downloaded: ${data.title}`, "success");
    };

    const onDownloadFailed = (data) => {
      removeActiveDownload(data.url);
      removeFromQueueAndRenumber(data.url);
      setSnack(`${data.title}`, "error");
      addNotification(`Download Failed: ${data.title}`, "error");
    };

    const onDownloadingPercentUpdate = (data) => {
      const url = data.url || "unknown";
      const percent = parseFloat(data.percentage);

      if (isNaN(percent)) return;

      if (percent >= 99) {
        updateActiveDownloads((prev) => ({ ...prev, [url]: 100 }));
        toggleProgressCallBackRef.current(true);
      } else if (!disableProgressRef.current) {
        updateActiveDownloads((prev) => {
          if (prev[url] >= 100 && prev[url] !== 101) return prev;
          return { ...prev, [url]: percent };
        });
      }
    };

    const onListingStarted = () => {
      incrementListings();
      toggleProgressCallBackRef.current(false);
    };

    const onListingPlaylistComplete = (data) => {
      decrementListings();

      const batch = batchReindexRef.current;
      if (batch.active) {
        const next = bumpBatchReindex("completed");
        const done = next.completed + next.failed;
        const message = `${data.playlistTitle} re-indexed — ${done}/${next.total}`;
        setSnack(message, "success");
        addNotification(message, "success");

        const batchTag =
          "reindex-playlist-complete-" + data.url + "-" + nowTag();
        // Playlist list is refreshed on a timer; the open sublist is refreshed
        // immediately since we already know it just changed.
        scheduleBatchPlaylistRefetch(batchTag);
        if (playListUrlRef.current === data.url) {
          setReFetchSubList(batchTag);
        }
        // Deliberately no auto-load / mobile slide: a batch must not yank the
        // user to whichever playlist happened to finish first.
        return;
      }

      setSnack(`${data.playlistTitle}`, "success");
      const tag =
        "listing-playlist-complete-" +
        data.url +
        "-" +
        data.processedChunks +
        "-" +
        nowTag();
      const current = playListUrlRef.current;

      // Always re-fetch the playlist list to show final status
      setReFetchPlaylist(tag);

      if (current === "init") {
        // Load the playlist if none is loaded
        setPlayListUrl(data.url);
        setPlayListIndex(data.seekPlaylistListTo);
        triggerMobileSlideIfNeeded(data.playlistTitle);
      } else if (current === data.url) {
        // If viewing the completed playlist, refresh the sublist
        setReFetchSubList(tag);
      } else {
        // Just update the index
        setPlayListIndex(data.seekPlaylistListTo);
      }

      addNotification(
        `Successfully imported playlist: ${data.playlistTitle}`,
        "success",
      );
    };

    const onPlaylistSkipped = (data) => {
      decrementListings();
      setSnack(`${data.message}`, "info");
      addNotification(`${data.message}`, "info");
    };

    const onListingPlaylistChunkComplete = (data) => {
      const current = playListUrlRef.current;
      const tag =
        "listing-playlist-chunk-complete-" +
        data.url +
        "-" +
        data.processedChunks +
        "-" +
        nowTag();

      // Always re-fetch the playlist list to show updated status/counts
      setReFetchPlaylist(tag);

      // If the current url is init (i.e. No playlist is loaded) and the processed chunks is 1, then it is the first chunk so load it
      if (current === "init" && data.processedChunks === 1) {
        setPlayListUrl(data.url);
        setPlayListIndex(data.seekPlaylistListTo);
        triggerMobileSlideIfNeeded(data.playlistTitle || "");
      }
      // If the current url is the same as the data url, it means we are viewing the playlist being processed
      else if (current === data.url) {
        // Re-fetch the sublist to show new videos
        setReFetchSubList(tag);
        setPlayListIndex(data.seekPlaylistListTo);
      }
    };

    const onListingSingleItemComplete = (data) => {
      decrementListings();

      // A batch item normally completes as a playlist, but an entry the
      // pipeline reclassifies as a single item (x.com URLs) lands here. Count
      // it toward the batch and keep the no-navigation rule intact.
      if (batchReindexRef.current.active) {
        const next = bumpBatchReindex("completed");
        const done = next.completed + next.failed;
        const label = data.itemLabel || data.title || data.url;
        const message = `${label} re-indexed — ${done}/${next.total}`;
        setSnack(message, "success");
        addNotification(message, "success");
        return;
      }

      setReFetchSubList(
        "listing-single-item-complete-" + data.url + "-" + nowTag(),
      );

      const current = playListUrlRef.current;
      if (current === "init" || current === "None") {
        setPlayListUrl("None");
        setSubListIndex(data.seekSubListTo);
        triggerMobileSlideIfNeeded("Unlisted");
      }

      const existingPlaylists = Array.isArray(data.existingPlaylists)
        ? data.existingPlaylists
        : [];
      const firstExistingPlaylist = data.sourcePlaylist || existingPlaylists[0];
      const playlistNote = firstExistingPlaylist
        ? ` Already exists in playlist: ${firstExistingPlaylist.title}.`
        : "";
      const itemLabel = data.itemLabel || data.title || "video";

      if (data.alreadyExisted) {
        const duplicateMessage =
          data.duplicateScope === "none"
            ? `${itemLabel} is already in None at position ${data.seekSubListTo}.`
            : `Duplicate video encountered and navigated to ${data.title}.`;
        setSnack(duplicateMessage, "error");
        addNotification(duplicateMessage, "error");
      } else if (data.addedFromDownloaded) {
        const sourcePosition =
          typeof firstExistingPlaylist?.positionInPlaylist === "number"
            ? firstExistingPlaylist.positionInPlaylist + 1
            : null;
        const loadedMessage =
          sourcePosition !== null && firstExistingPlaylist?.title
            ? `Added ${data.title} to None. Already downloaded in ${firstExistingPlaylist.title} at position ${sourcePosition}.`
            : `Added ${data.title} to None.${playlistNote}`;
        setSnack(loadedMessage, "success");
        addNotification(loadedMessage, "success");
      } else {
        setSnack(`${data.title}`, "success");
        addNotification(`Successfully loaded video: ${data.title}`, "success");
      }
    };

    const onListingError = (data) => {
      decrementListings();

      const batch = batchReindexRef.current;
      if (batch.active) {
        const next = bumpBatchReindex("failed");
        const done = next.completed + next.failed;
        const message = `Failed re-indexing ${data.url} — ${done}/${next.total}`;
        setSnack(message, "error");
        addNotification(message, "error");
        return;
      }

      setSnack(`${data.url}`, "error");
      addNotification(`Failed Listing: ${data.url}`, "error");
    };

    const onListingVideoSkippedBecauseDownloaded = (data) => {
      decrementListings();
      const locationNote = data.downloadLocation
        ? ` Files: ${data.downloadLocation}.`
        : "";
      const message = `${data.message}${locationNote}`;
      setSnack(message, "info");
      addNotification(message, "info");
    };

    const onReindexBatchStarted = (data) => {
      const queued = data.queued ?? 0;
      setBatchReindexState({
        active: true,
        batchId: data.batchId ?? null,
        total: queued,
        completed: 0,
        failed: 0,
      });
      const message = `Batch re-index started — ${queued} playlist(s)`;
      setSnack(message, "info");
      addNotification(message, "info");
    };

    // Ignore lifecycle events from a batch other than the one being tracked,
    // e.g. a late arrival after the tab reconnected to a restarted backend.
    const isStaleBatch = (data) => {
      const tracked = batchReindexRef.current.batchId;
      return Boolean(tracked && data.batchId && tracked !== data.batchId);
    };

    const onReindexBatchComplete = (data) => {
      if (isStaleBatch(data)) return;
      flushBatchPlaylistRefetch();
      setBatchReindexState(emptyBatchReindex());

      const failed = data.failed ?? 0;
      const message =
        failed > 0
          ? `Batch re-index complete — ${data.completed}/${data.total} (${failed} failed)`
          : `Batch re-index complete — ${data.completed}/${data.total}`;
      const severity = failed > 0 ? "warning" : "success";
      setSnack(message, severity);
      addNotification(message, severity);

      // One final refresh so the list reflects every playlist the coalescer
      // may have skipped.
      setReFetchPlaylist("reindex-batch-complete-" + nowTag());
    };

    const onReindexBatchFailed = (data) => {
      if (isStaleBatch(data)) return;
      flushBatchPlaylistRefetch();
      setBatchReindexState(emptyBatchReindex());

      const message = `Batch re-index failed: ${data.error}`;
      setSnack(message, "error");
      addNotification(message, "error");
      setReFetchPlaylist("reindex-batch-failed-" + nowTag());
    };

    // Register listeners
    /** @type {Array<[string, (data: any) => void]>} */
    const listeners = [
      ["init", onInit],
      ["error", onError],
      ["token-expired", onTokenExpired],
      ["connection-error", onConnectionError],

      ["download-started", onDownloadStarted],
      ["download-done", onDownloadDone],
      ["download-failed", onDownloadFailed],
      ["downloading-percent-update", onDownloadingPercentUpdate],

      ["listing-started", onListingStarted],
      ["listing-playlist-complete", onListingPlaylistComplete],
      ["listing-playlist-chunk-complete", onListingPlaylistChunkComplete],
      ["listing-single-item-complete", onListingSingleItemComplete],
      ["listing-error", onListingError],
      [
        "listing-playlist-skipped-because-same-monitoring",
        onPlaylistSkipped,
      ],
      [
        "listing-video-skipped-because-downloaded",
        onListingVideoSkippedBecauseDownloaded,
      ],

      ["reindex-batch-started", onReindexBatchStarted],
      ["reindex-batch-complete", onReindexBatchComplete],
      ["reindex-batch-failed", onReindexBatchFailed],
    ];

    for (const [event, handler] of listeners) {
      socket.on(event, handler);
    }

    // Cleanup on unmount or when socket changes
    return () => {
      try {
        for (const [event, handler] of listeners) {
          socket.off(event, handler);
        }
      } catch (_e) {
        // socket might already be closed; ignore
      }
      flushBatchPlaylistRefetch();
    };
    // Every context callback below is stable for the life of a socket, so the
    // listener set is registered once per connection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  return { activeListingCount, batchReindex, downloadedItem };
}
