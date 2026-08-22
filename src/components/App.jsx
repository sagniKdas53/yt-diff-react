import { Close as CloseIcon } from "@mui/icons-material";
import MuiAlert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import Paper from "@mui/material/Paper";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import Grid from "@mui/material/Unstable_Grid2";
import PropTypes from "prop-types";
import {
  forwardRef,
  lazy,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useDependencyLogger } from "../hooks/useDependencyLogger.js";
import { useLatest } from "../hooks/useLatest.js";
import { AuthContext } from "../contexts/AuthContext";
import { SocketContext } from "../contexts/SocketContext";
import { NotificationContext } from "../contexts/NotificationContext";
import { DownloadContext } from "../contexts/DownloadContext";

const Navigation = lazy(() => import("./Nav.jsx"));
const PlayList = lazy(() => import("./PlayList.jsx"));
const SubList = lazy(() => import("./SubList.jsx"));
const Login = lazy(() => import("./Login.jsx"));
const Signup = lazy(() => import("./Signup.jsx"));

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

const themeObj = (theme) =>
  createTheme({
    palette: {
      mode: theme ? "light" : "dark",
      primary: {
        main: theme ? "#455a64" : "#82b1ff",
      },
      secondary: {
        main: theme ? "#5c6bc0" : "#b39ddb",
      },
      success: {
        main: theme ? "#43a047" : "#66bb6a",
      },
      background: {
        default: theme ? "#f5f5f5" : "#121212",
        paper: theme ? "#ffffff" : "#242424",
        menu: theme ? "#eceff1" : "#2e2e2e",
      },
    },
    typography: {
      fontFamily:
        '-apple-system, BlinkMacSystemFont, Roboto, "Segoe UI", Ubuntu, Cantarell, "Liberation Sans", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
      button: {
        fontWeight: 600,
      },
    },
    shape: {
      borderRadius: 8,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            transition:
              "background-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out",
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            boxShadow: theme
              ? "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)"
              : "0 1px 3px 0 rgb(0 0 0 / 0.4), 0 1px 2px -1px rgb(0 0 0 / 0.4)",
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottom: `1px solid ${theme ? "#e0e0e0" : "#333333"}`,
          },
        },
      },
      MuiFab: {
        styleOverrides: {
          root: {
            boxShadow: "0 3px 8px rgba(0,0,0,0.25)",
            transition: "box-shadow 0.15s ease-in-out",
            "&:hover": {
              boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
            },
          },
        },
      },
    },
  });

const Alert = forwardRef(function Alert(
  { severity, sx, onClose, children },
  ref,
) {
  return (
    <MuiAlert
      elevation={6}
      ref={ref}
      variant="filled"
      severity={severity}
      sx={sx}
      onClose={onClose}
    >
      {children}
    </MuiAlert>
  );
});

Alert.propTypes = {
  severity: PropTypes.string,
  sx: PropTypes.object,
  onClose: PropTypes.func,
  children: PropTypes.node,
};

// Common loader used in Suspense fallbacks
const Loader = () => (
  <Grid container justifyContent="center">
    <CircularProgress color="secondary" />
  </Grid>
);

export default function App() {
  // Auth, transport, messaging and the download queue all live in providers
  // above this component; App is the layout plus the socket event routing that
  // ties them to the playlist views.
  const { token, logout } = useContext(AuthContext);
  const { socket, setConnectionId } = useContext(SocketContext);
  const {
    snackMsg,
    snackSeverity,
    showSnackbar,
    setSnackVisibility,
    setSnack,
    addNotification,
  } = useContext(NotificationContext);
  const {
    activeDownloads,
    updateActiveDownloads,
    removeActiveDownload,
    removeFromQueueAndRenumber,
    setQueuePosition,
    clearDownloadState,
    syncQueueFromBackend,
  } = useContext(DownloadContext);

  // if it is not set in localStorage value is null, then !! will set as false
  const initialState = !!JSON.parse(localStorage.getItem("ytdiff_theme"));
  // If theme is unset it uses dark mode by default
  const [theme, themeSwitcher] = useState(initialState);

  // signup related state
  const [showSignUp, setShowSignUp] = useState(false);

  // playlist related states
  const [playListUrl, setPlayListUrl] = useState("init");
  const [subListIndex, setSubListIndex] = useState(0);
  // this will be used to seek to the latest playlist
  const [playListIndex, setPlayListIndex] = useState(0);
  const [disableProgress, toggleProgress] = useState(false);

  // progress bar and re-fetch state
  const [activeListingCount, setActiveListingCount] = useState(0);
  // so the basic idea of reFetch is to use the socket to trigger a re-fetch of the playlist
  // and sub-list when an event needs to let the user know that something has changed
  // this is a bit of a hack, but it works, without it the app would need to poll
  // the server for changes, which is not ideal, will fix this later
  const [reFetchPlaylist, setReFetchPlaylist] = useState(Date.now().toString());
  const [reFetchSubList, setReFetchSubList] = useState(Date.now().toString());
  // TODO: Add separate reFetch states for playlist and sub-list to avoid unnecessary fetches
  const [rowsPerPageSubList, setRowsPerPageSubList] = useState(8);

  // Batch re-index progress. A batch fans out over every playlist, so the
  // per-playlist listing events it emits must not drive the same navigation /
  // re-fetch side effects a single interactive listing does.
  const [batchReindex, setBatchReindex] = useState(emptyBatchReindex);

  // Mobile slide navigation state
  const [mobileView, setMobileView] = useState("playlists"); // "playlists" | "videos"
  const [slideDirection, setSlideDirection] = useState("none"); // "in" | "out" | "none"
  const [activePlaylistTitle, setActivePlaylistTitle] = useState("");
  const mobileAddDialogRef = useRef(null); // ref to trigger PlayList's add dialog from SubList

  // Detect mobile — create the theme once and use it throughout
  const appliedTheme = useMemo(() => themeObj(theme), [theme]);
  const isMobileViewport = useMediaQuery(appliedTheme.breakpoints.down("md"));
  const isTouchDevice = useMediaQuery("(hover: none) and (pointer: coarse)");
  const isMobile = isMobileViewport || isTouchDevice;

  const downloadedItem = useRef({
    url: null,
    title: null,
    fileName: null,
    saveDirectory: null,
  });

  // 53px table top, 52 px table pagination, 48 px app bar
  // Table top is included in the table height so no need to subtract it
  const progressBarHeight = 5;
  const appBarHeight = 48;
  const tablePaginationHeight = 52;
  const adjust = tablePaginationHeight + appBarHeight + progressBarHeight;
  // TODO: Analyze if globalThis is better than window
  const [tableContainerHeight, setTableContainerHeight] = useState(
    globalThis.innerHeight - adjust,
  );
  const fullHeight = `${tableContainerHeight + 52}px`;

  useEffect(() => {
    function handleResize() {
      setTableContainerHeight(globalThis.innerHeight - adjust);
    }
    globalThis.addEventListener("resize", handleResize);
    return () => globalThis.removeEventListener("resize", handleResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleProgressCallBack = useCallback(
    (next) => toggleProgress(next),
    [],
  );

  // --- Refs to avoid stale closures ---
  // The socket effect below registers its handlers once and must not
  // re-subscribe, so anything they read has to reach them through a box rather
  // than through the closure they were registered in. `useLatest` is that box;
  // see its own note for why it writes during render.
  //
  // Only for values that actually change between renders; the callbacks the
  // providers hand out are already stable.
  const playListUrlRef = useLatest(playListUrl);
  const disableProgressRef = useLatest(disableProgress);
  const toggleProgressCallBackRef = useLatest(toggleProgressCallBack);
  const isMobileRef = useLatest(isMobile);

  const connectionGenerationRef = useRef(null);

  // Mirrors batchReindex so socket handlers read a value that is current within
  // the same tick, even when React batches the state updates.
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

  // Helper for socket handlers to trigger mobile slide-in
  const triggerMobileSlideIfNeeded = (title) => {
    if (isMobileRef.current) {
      setActivePlaylistTitle(title || "");
      setSlideDirection("in");
      setMobileView("videos");
    }
  };

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

  useDependencyLogger(
    {
      socket,
      reFetchPlaylist,
      reFetchSubList,
      token,
      playListUrl,
      subListIndex,
      playListIndex,
    },
    "App",
  );

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
    socket.on("init", onInit);
    socket.on("error", onError);
    socket.on("token-expired", onTokenExpired);
    socket.on("connection-error", onConnectionError);

    socket.on("download-started", onDownloadStarted);
    socket.on("download-done", onDownloadDone);
    socket.on("download-failed", onDownloadFailed);
    socket.on("downloading-percent-update", onDownloadingPercentUpdate);

    socket.on("listing-started", onListingStarted);
    socket.on("listing-playlist-complete", onListingPlaylistComplete);
    socket.on(
      "listing-playlist-chunk-complete",
      onListingPlaylistChunkComplete,
    );
    socket.on("listing-single-item-complete", onListingSingleItemComplete);
    socket.on("listing-error", onListingError);
    socket.on(
      "listing-playlist-skipped-because-same-monitoring",
      onPlaylistSkipped,
    );
    socket.on(
      "listing-video-skipped-because-downloaded",
      onListingVideoSkippedBecauseDownloaded,
    );

    socket.on("reindex-batch-started", onReindexBatchStarted);
    socket.on("reindex-batch-complete", onReindexBatchComplete);
    socket.on("reindex-batch-failed", onReindexBatchFailed);

    // Cleanup on unmount or when socket changes
    return () => {
      try {
        socket.off("init", onInit);
        socket.off("error", onError);
        socket.off("token-expired", onTokenExpired);
        socket.off("connection-error", onConnectionError);

        socket.off("download-started", onDownloadStarted);
        socket.off("download-done", onDownloadDone);
        socket.off("download-failed", onDownloadFailed);
        socket.off("downloading-percent-update", onDownloadingPercentUpdate);

        socket.off("listing-started", onListingStarted);
        socket.off("listing-playlist-complete", onListingPlaylistComplete);
        socket.off(
          "listing-playlist-chunk-complete",
          onListingPlaylistChunkComplete,
        );
        socket.off("listing-single-item-complete", onListingSingleItemComplete);
        socket.off("listing-error", onListingError);
        socket.off(
          "listing-playlist-skipped-because-same-monitoring",
          onPlaylistSkipped,
        );
        socket.off(
          "listing-video-skipped-because-downloaded",
          onListingVideoSkippedBecauseDownloaded,
        );

        socket.off("reindex-batch-started", onReindexBatchStarted);
        socket.off("reindex-batch-complete", onReindexBatchComplete);
        socket.off("reindex-batch-failed", onReindexBatchFailed);
      } catch (_e) {
        // socket might already be closed; ignore
      }
      flushBatchPlaylistRefetch();
    };
    // Every context callback below is stable for the life of a socket, so the
    // listener set is registered once per connection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  // Derive average progress and indeterminate state from active downloads and listings
  const { calculatedProgress, isActuallyIndeterminate } = useMemo(() => {
    // A batch re-index knows its own denominator, so it can drive a real
    // determinate bar instead of the indeterminate one listings normally get.
    if (batchReindex.active && batchReindex.total > 0) {
      const done = batchReindex.completed + batchReindex.failed;
      return {
        calculatedProgress: (done / batchReindex.total) * 100,
        isActuallyIndeterminate: false,
      };
    }

    const keys = Object.keys(activeDownloads).filter(
      (k) => k !== "unknown" && k !== "listing",
    );
    let validCount = 0;
    const total = keys.reduce((acc, key) => {
      const val = Reflect.get(activeDownloads, key);
      if (!isNaN(val) && val <= 100) {
        validCount++;
        return acc + val;
      }
      return acc;
    }, 0);
    const progress = validCount > 0 ? total / validCount : 0;
    const values = keys
      .map((k) => Reflect.get(activeDownloads, k))
      .filter((v) => !isNaN(v));
    const allDownloadsWaiting =
      keys.length > 0 &&
      values.length > 0 &&
      values.every((v) => v >= 101 || v === 0);
    // Indeterminate when: listings are running with no active downloads, or all downloads are still queued/waiting
    const isIndet =
      (activeListingCount > 0 && keys.length === 0) || allDownloadsWaiting;
    return { calculatedProgress: progress, isActuallyIndeterminate: isIndet };
  }, [activeDownloads, activeListingCount, batchReindex]);

  // UI renders
  // renders login/signup grid
  const renderAuth = () => (
    <Grid container spacing={0}>
      {/* left spacer */}
      <Grid
        xl={4}
        lg={4}
        md={2}
        sm={12}
        xs={12}
        sx={{
          height: fullHeight,
          display: { xs: "none", sm: "none", md: "block" },
          m: 0,
          p: 0,
        }}
      />
      {/* login/signup */}
      <Grid
        xl={4}
        lg={4}
        md={8}
        sm={12}
        xs={12}
        sx={{ height: fullHeight, m: 0, p: 0 }}
      >
        <Suspense fallback={<Loader />}>
          {showSignUp ? (
            <Signup
              height={fullHeight}
              toggleSignUpComponent={setShowSignUp}
            />
          ) : (
            <Login height={fullHeight} toggleSignUpComponent={setShowSignUp} />
          )}
        </Suspense>
      </Grid>
      {/* right spacer */}
      <Grid
        xl={4}
        lg={4}
        md={2}
        sm={12}
        xs={12}
        sx={{
          height: fullHeight,
          display: { xs: "none", sm: "none", md: "block" },
          m: 0,
          p: 0,
        }}
      />
    </Grid>
  );

  // Mobile navigation handlers
  const handleMobileLoadPlaylist = useCallback((url, title) => {
    setPlayListUrl(url);
    setSubListIndex(0);
    setActivePlaylistTitle(title || "");
    setSlideDirection("in");
    setMobileView("videos");
  }, []);

  const handleMobileBack = useCallback(() => {
    setSlideDirection("out");
    // After the slide-out animation finishes, switch view
    setTimeout(() => {
      setMobileView("playlists");
      setSlideDirection("none");
    }, 220);
  }, []);

  const handleMobileOpenAddDialog = useCallback(() => {
    if (mobileAddDialogRef.current) {
      mobileAddDialogRef.current();
    }
  }, []);

  // Wrapper for Nav's setPlayListUrl — triggers mobile slide on Unlisted
  const handleNavSetPlayListUrl = useCallback(
    (url) => {
      if (isMobile) {
        handleMobileLoadPlaylist(url, url === "None" ? "Unlisted" : "");
      } else {
        setPlayListUrl(url);
      }
    },
    [isMobile, handleMobileLoadPlaylist],
  );

  const playListProps = {
    playListUrl,
    setPlayListUrl,
    playListIndex,
    setPlayListIndex,
    disableButtons: false,
    reFetch: reFetchPlaylist,
    setReFetch: setReFetchPlaylist,
    setSubListIndex,
    tableContainerHeight: `${tableContainerHeight}px`,
    rowsPerPageSubList,
    setRowsPerPageSubList,
  };

  const subListProps = {
    loadedPlayList: playListUrl,
    setPlayListUrl,
    subListIndex,
    setSubListIndex,
    downloadedItem: downloadedItem.current,
    reFetch: reFetchSubList,
    setReFetch: setReFetchSubList,
    tableContainerHeight: `${tableContainerHeight}px`,
    rowsPerPage: rowsPerPageSubList,
    setRowsPerPage: setRowsPerPageSubList,
  };

  // renders mobile main with slide navigation
  const renderMobileMain = () => (
    <Box className="mobile-slide-container" sx={{ height: fullHeight }}>
      {/* Panel 1: Playlists — always rendered, sits behind */}
      <Box
        className="mobile-panel mobile-panel-playlist"
        sx={{ display: "flex", flexDirection: "column" }}
      >
        <Suspense fallback={<Loader />}>
          <PlayList
            {...playListProps}
            isMobile
            onMobileLoad={handleMobileLoadPlaylist}
            mobileAddDialogRef={mobileAddDialogRef}
          />
        </Suspense>
      </Box>

      {/* Panel 2: Videos — slides in/out */}
      {mobileView === "videos" && (
        <Box
          className={`mobile-panel mobile-panel-videos ${slideDirection === "in" ? "slide-in" : ""} ${slideDirection === "out" ? "slide-out" : ""}`}
          sx={{
            display: "flex",
            flexDirection: "column",
            bgcolor: "background.default",
          }}
        >
          <Suspense fallback={<Loader />}>
            <SubList
              {...subListProps}
              isMobile
              onBack={handleMobileBack}
              onOpenAddDialog={handleMobileOpenAddDialog}
              activePlaylistTitle={activePlaylistTitle}
            />
          </Suspense>
        </Box>
      )}
    </Box>
  );

  // renders main app when token is available
  const renderMain = () => {
    if (isMobile) return renderMobileMain();
    return (
      <Grid container spacing={0}>
        <Grid xl={4} lg={4} md={6} sm={12} xs={12} sx={{ height: fullHeight }}>
          <Suspense fallback={<Loader />}>
            <PlayList {...playListProps} />
          </Suspense>
        </Grid>
        <Grid xl={8} lg={8} md={6} sm={12} xs={12} sx={{ height: fullHeight }}>
          <Suspense fallback={<Loader />}>
            <SubList {...subListProps} />
          </Suspense>
        </Grid>
      </Grid>
    );
  };

  // main app
  return (
    <ThemeProvider theme={appliedTheme}>
      <Box
        sx={{
          margin: 0,
          padding: 0,
          bgcolor: "background.default",
          height: "100%",
          position: "relative",
        }}
      >
        {/* nav bar */}
        <Suspense fallback={<Loader />}>
          <Box sx={{ position: "sticky", top: 0, left: 0, zIndex: 100 }}>
            <Navigation
              themeSwitcher={themeSwitcher}
              theme={theme}
              setPlayListUrl={handleNavSetPlayListUrl}
            />
            <Box sx={{ width: "100%", height: progressBarHeight + "px" }}>
              <LinearProgress
                sx={{ height: "100%", borderRadius: 0 }}
                variant={
                  isActuallyIndeterminate ? "indeterminate" : "determinate"
                }
                color="secondary"
                value={calculatedProgress}
              />
            </Box>
          </Box>
        </Suspense>
        {/* main grid */}
        <Paper sx={{ width: "100%", overflow: "hidden", position: "relative" }}>
          {token === null ? renderAuth() : renderMain()}
        </Paper>
        {/* snack bar */}
        <Stack spacing={2} sx={{ maxWidth: 600 }}>
          <Snackbar
            open={showSnackbar}
            autoHideDuration={6000}
            onClose={() => setSnackVisibility(false)}
            action={
              <IconButton
                size="small"
                aria-label="close"
                color="inherit"
                onClick={() => setSnackVisibility(false)}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            }
          >
            <Alert
              onClose={() => setSnackVisibility(false)}
              severity={snackSeverity}
              sx={{ width: "100%" }}
            >
              {snackMsg}
            </Alert>
          </Snackbar>
        </Stack>
      </Box>
    </ThemeProvider>
  );
}
