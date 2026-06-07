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
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useDependencyLogger } from "../hooks/useDependencyLogger.js";

import io from "socket.io-client";

const Navigation = lazy(() => import("./Nav.jsx"));
const PlayList = lazy(() => import("./PlayList.jsx"));
const SubList = lazy(() => import("./SubList.jsx"));
const Login = lazy(() => import("./Login.jsx"));
const Signup = lazy(() => import("./Signup.jsx"));

const base = import.meta.env.PROD ? "" : "http://localhost:8888";
const path = import.meta.env.VITE_BASE_PATH || "/ytdiff";
const backEnd = base + path;

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
  // if it is not set in localStorage value is null, then !! will set as false
  const initialState = !!JSON.parse(localStorage.getItem("ytdiff_theme"));
  // If theme is unset it uses dark mode by default
  const [theme, themeSwitcher] = useState(initialState);

  // get token from localStorage, handles string "null"
  const getStoredToken = () => {
    const stored = localStorage.getItem("ytdiff_token");
    return stored && stored !== "null" ? stored : null;
  };
  // token state is managed here, persistence handled in Login component
  const [token, setToken] = useState(getStoredToken);

  // signup related state
  const [showSignUp, setShowSignUp] = useState(false);

  // playlist related states
  const [playListUrl, setPlayListUrl] = useState("init");
  const [subListIndex, setSubListIndex] = useState(0);
  // this will be used to seek to the latest playlist
  const [playListIndex, setPlayListIndex] = useState(0);
  const [connectionId, setConnectionId] = useState("");
  const [disableProgress, toggleProgress] = useState(false);

  // snackbar state
  const [showSnackbar, setSnackVisibility] = useState(false);
  const [snackMsg, setSnackMsgTxt] = useState("");
  const [snackSeverity, setSnackSeverity] = useState("success");

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
  const [notifications, setNotifications] = useState([]);
  const [activeDownloads, setActiveDownloads] = useState({});
  // Download queue state — lives here so it persists across playlist switches
  // Structure:
  // { videoUrl: { playlistUrl, positionInPlaylist, queuePosition, requestId } }
  const [queuedItems, setQueuedItems] = useState({});

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

  const notificationRef = useRef(0);
  const downloadedItem = useRef({
    url: null,
    title: null,
    fileName: null,
    saveDirectory: null,
  });

  // socket setup
  const socket = useMemo(() => {
    if (!token) return null;
    const sock = io(base, {
      path: path + "/socket.io",
      auth: { token },
      forceNew: true,
    });
    return sock;
  }, [token]);

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

  // stable callbacks
  const setSnack = useCallback((msg, type) => {
    setSnackMsgTxt(msg);
    setSnackSeverity(type);
    setSnackVisibility(true);
  }, []);

  const addNotification = useCallback((message, type = "info") => {
    const newNotification = {
      id: Date.now() + "-" + notificationRef.current.toString(),
      message,
      type,
    };
    notificationRef.current += 1;
    setNotifications((prev) => [...prev, newNotification]);
  }, []);

  const dismissNotification = (id) => {
    setNotifications((prev) => prev.filter((note) => note.id !== id));
  };

  // --- Refs to avoid stale closures ---
  // Synced in render phase instead of useEffect to avoid delay
  const playListUrlRef = useRef(playListUrl);
  playListUrlRef.current = playListUrl;

  const disableProgressRef = useRef(disableProgress);
  disableProgressRef.current = disableProgress;

  const toggleProgressCallBackRef = useRef(toggleProgressCallBack);
  toggleProgressCallBackRef.current = toggleProgressCallBack;

  const addNotificationRef = useRef(addNotification);
  addNotificationRef.current = addNotification;

  const setSnackRef = useRef(setSnack);
  setSnackRef.current = setSnack;

  const activeDownloadsRef = useRef(activeDownloads);

  // Mobile ref — so socket handlers can check mobile state without stale closures
  const isMobileRef = useRef(isMobile);
  isMobileRef.current = isMobile;

  // Helper for socket handlers to trigger mobile slide-in
  const triggerMobileSlideIfNeeded = (title) => {
    if (isMobileRef.current) {
      setActivePlaylistTitle(title || "");
      setSlideDirection("in");
      setMobileView("videos");
    }
  };

  // Wrapper: updates both state and ref synchronously so hasActiveDownloads() is never stale
  const updateActiveDownloads = (updater) => {
    setActiveDownloads((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      activeDownloadsRef.current = next;
      return next;
    });
  };

  // Queue management helpers
  const removeFromQueueAndRenumber = useCallback((url) => {
    setQueuedItems((prev) => {
      if (!Reflect.has(prev, url)) return prev;
      const removedPosition = prev[url].queuePosition;
      const next = {};

      Object.entries(prev).forEach(([itemUrl, data]) => {
        if (itemUrl === url) return;
        Reflect.set(
          next,
          itemUrl,
          data.queuePosition > removedPosition
            ? { ...data, queuePosition: data.queuePosition - 1 }
            : data,
        );
      });

      return next;
    });
  }, []);

  const removeFromQueueRef = useRef(removeFromQueueAndRenumber);
  useEffect(() => {
    removeFromQueueRef.current = removeFromQueueAndRenumber;
  }, [removeFromQueueAndRenumber]);

  const addToDownloadQueue = useCallback((entries, requestId) => {
    setQueuedItems((prev) => {
      const next = { ...prev };
      let counter = Object.keys(prev).length;
      let changed = false;

      entries.forEach((entry) => {
        if (!Reflect.has(next, entry.url)) {
          counter++;
          changed = true;
          Reflect.set(next, entry.url, {
            playlistUrl: entry.playlistUrl,
            positionInPlaylist: entry.positionInPlaylist,
            queuePosition: counter,
            requestId,
          });
        }
      });

      return changed ? next : prev;
    });
  }, []);

  const rollbackDownloadQueueRequest = useCallback(
    (requestId, acceptedUrls) => {
      const accepted = new Set(acceptedUrls);

      setQueuedItems((prev) => {
        const rejectedUrls = Object.entries(prev)
          .filter(
            ([url, data]) => data.requestId === requestId && !accepted.has(url),
          )
          .map(([url]) => url);

        if (rejectedUrls.length === 0) return prev;

        const rejected = new Set(rejectedUrls);
        const remaining = Object.entries(prev)
          .filter(([url]) => !rejected.has(url))
          .sort(([, a], [, b]) => a.queuePosition - b.queuePosition);
        const next = {};

        remaining.forEach(([url, data], index) => {
          const queuePosition = index + 1;
          Reflect.set(
            next,
            url,
            data.queuePosition === queuePosition
              ? data
              : { ...data, queuePosition },
          );
        });

        return next;
      });
    },
    [],
  );

  const queueDownloads = useCallback(
    async (entries) => {
      if (entries.length === 0) return [];

      const requestId =
        globalThis.crypto?.randomUUID?.() ??
        `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const urls = entries.map((entry) => entry.url);

      // Queue first so a fast socket completion cannot arrive before the item exists.
      addToDownloadQueue(entries, requestId);

      try {
        const response = await fetch(backEnd + "/download", {
          method: "post",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          mode: "cors",
          body: JSON.stringify({
            urlList: urls,
            playListUrl: entries[0].playlistUrl,
          }),
        });

        if (response.ok) {
          try {
            const result = await response.json();
            const acceptedUrls = (result.items || []).map((item) => item.url);
            rollbackDownloadQueueRequest(requestId, acceptedUrls);
            setSnack("Initiated download...", "success");
            return acceptedUrls;
          } catch (_error) {
            rollbackDownloadQueueRequest(requestId, []);
            setSnack("Could not confirm the download queue.", "error");
            return [];
          }
        }

        rollbackDownloadQueueRequest(requestId, []);

        if (response.status === 401) {
          setSnack("Session expired. Please log in again.", "error");
          addNotification("Session expired. Please log in again.", "error");
          setToken(null);
        } else if (response.status === 429) {
          setSnack("Too many downloads requested. Please wait.", "error");
          addNotification(
            "Too many downloads requested. Please wait.",
            "error",
          );
        } else {
          const message = `Failed to queue downloads: ${response.status} ${response.statusText}`;
          setSnack(message, "error");
          addNotification(message, "error");
        }
      } catch (error) {
        rollbackDownloadQueueRequest(requestId, []);
        setSnack(`Failed to queue downloads: ${error.message}`, "error");
        addNotification(`Failed to queue downloads: ${error.message}`, "error");
      }

      return [];
    },
    [
      addNotification,
      addToDownloadQueue,
      rollbackDownloadQueueRequest,
      setSnack,
      token,
    ],
  );

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
      backEnd,
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

    // Handlers (use refs for any "current" state / callbacks)
    const onInit = (data) => {
      setConnectionId(data.id);

      updateActiveDownloads((prev) => (Object.keys(prev).length ? {} : prev));
      setActiveListingCount((prev) => {
        activeListingCountRef.current = 0;
        return prev !== 0 ? 0 : prev;
      });
      // Clear download queue on reconnect
      setQueuedItems((prev) => (Object.keys(prev).length ? {} : prev));
      // call latest callback
      toggleProgressCallBackRef.current &&
        toggleProgressCallBackRef.current(false);
      setSnackRef.current &&
        setSnackRef.current("Connected to Backend", "success");
      socket.emit("acknowledge", { data: "Connected", id: data.id });
    };

    const onError = (data) => {
      setSnackRef.current && setSnackRef.current(`${data.message}`, "error");
    };

    const onTokenExpired = () => {
      setSnackRef.current &&
        setSnackRef.current("Your session has expired.", "error");
      setToken(null);
      localStorage.setItem("ytdiff_token", "null");
    };

    const onConnectionError = () =>
      setSnackRef.current &&
      setSnackRef.current("Server is currently at maximum capacity.", "error");

    const removeActiveDownload = (url) => {
      updateActiveDownloads((prev) => {
        const next = { ...prev };
        Reflect.deleteProperty(next, url);
        return next;
      });
    };

    const onDownloadStarted = (data) => {
      //console.log("[Socket] download-started", data);
      const url = data.url || "unknown";
      const percent = isNaN(+data.percentage) ? 0 : +data.percentage;
      updateActiveDownloads((prev) => ({ ...prev, [url]: percent }));
      toggleProgressCallBackRef.current &&
        toggleProgressCallBackRef.current(false);
    };

    const onDownloadDone = (data) => {
      //console.log("[Socket] download-done", data);
      removeActiveDownload(data.url);
      removeFromQueueRef.current && removeFromQueueRef.current(data.url);
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
      setSnackRef.current && setSnackRef.current(`${data.title}`, "success");
      addNotificationRef.current &&
        addNotificationRef.current(`Downloaded: ${data.title}`, "success");
    };

    const onDownloadFailed = (data) => {
      //console.log("[Socket] download-failed", data);
      removeActiveDownload(data.url);
      removeFromQueueRef.current && removeFromQueueRef.current(data.url);
      setSnackRef.current && setSnackRef.current(`${data.title}`, "error");
      addNotificationRef.current &&
        addNotificationRef.current(`Download Failed: ${data.title}`, "error");
    };

    const onDownloadingPercentUpdate = (data) => {
      //console.log("Downloading percent update", { url: data.url, percent: data.percentage });
      const url = data.url || "unknown";
      const percent = parseFloat(data.percentage);

      if (isNaN(percent)) return;

      if (percent >= 99) {
        updateActiveDownloads((prev) => ({ ...prev, [url]: 100 }));
        toggleProgressCallBackRef.current &&
          toggleProgressCallBackRef.current(true);
      } else if (!disableProgressRef.current) {
        updateActiveDownloads((prev) => {
          if (prev[url] >= 100 && prev[url] !== 101) return prev;
          return { ...prev, [url]: percent };
        });
      }
    };

    const onListingStarted = () =>
      //data
      {
        //console.log("Listing started: ", data);
        incrementListings();
        toggleProgressCallBackRef.current &&
          toggleProgressCallBackRef.current(false);
      };

    const onListingPlaylistComplete = (data) => {
      //console.log("Listing playlist done: ", data);
      decrementListings();
      setSnackRef.current &&
        setSnackRef.current(`${data.playlistTitle}`, "success");
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

      addNotificationRef.current &&
        addNotificationRef.current(
          `Successfully imported playlist: ${data.playlistTitle}`,
          "success",
        );
    };

    const onPlaylistSkipped = (data) => {
      decrementListings();
      setSnackRef.current && setSnackRef.current(`${data.message}`, "info");
      addNotificationRef.current &&
        addNotificationRef.current(`${data.message}`, "info");
    };

    const onListingPlaylistChunkComplete = (data) => {
      //console.log("Listing chunk complete: ", data);
      //console.log("Current playlist url (ref): ", playListUrlRef.current, " data url: ", data.url, " processed chunks: ", data.processedChunks);

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
        //setIndeterminate(false);
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
        setSnackRef.current && setSnackRef.current(duplicateMessage, "error");
        addNotificationRef.current &&
          addNotificationRef.current(duplicateMessage, "error");
      } else if (data.addedFromDownloaded) {
        const sourcePosition =
          typeof firstExistingPlaylist?.positionInPlaylist === "number"
            ? firstExistingPlaylist.positionInPlaylist + 1
            : null;
        const loadedMessage =
          sourcePosition !== null && firstExistingPlaylist?.title
            ? `Added ${data.title} to None. Already downloaded in ${firstExistingPlaylist.title} at position ${sourcePosition}.`
            : `Added ${data.title} to None.${playlistNote}`;
        setSnackRef.current && setSnackRef.current(loadedMessage, "success");
        addNotificationRef.current &&
          addNotificationRef.current(loadedMessage, "success");
      } else {
        setSnackRef.current && setSnackRef.current(`${data.title}`, "success");
        addNotificationRef.current &&
          addNotificationRef.current(
            `Successfully loaded video: ${data.title}`,
            "success",
          );
      }
    };

    const onListingError = (data) => {
      decrementListings();
      setSnackRef.current && setSnackRef.current(`${data.url}`, "error");
      addNotificationRef.current &&
        addNotificationRef.current(`Failed Listing: ${data.url}`, "error");
    };

    const onListingVideoSkippedBecauseDownloaded = (data) => {
      decrementListings();
      const locationNote = data.downloadLocation
        ? ` Files: ${data.downloadLocation}.`
        : "";
      const message = `${data.message}${locationNote}`;
      setSnackRef.current && setSnackRef.current(message, "info");
      addNotificationRef.current && addNotificationRef.current(message, "info");
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
      } catch (_e) {
        // socket might already be closed; ignore
        //console.warn("Error removing socket listeners", _e);
      }
    };
  }, [socket]); // only recreate if socket reference changes

  // Derive average progress and indeterminate state from active downloads and listings
  const { calculatedProgress, isActuallyIndeterminate } = useMemo(() => {
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
  }, [activeDownloads, activeListingCount]);

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
              backEnd={backEnd}
              setSnack={setSnack}
              height={fullHeight}
              toggleSignUpComponent={setShowSignUp}
            />
          ) : (
            <Login
              backEnd={backEnd}
              setToken={setToken}
              setSnack={setSnack}
              height={fullHeight}
              toggleSignUpComponent={setShowSignUp}
            />
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
  const handleMobileLoadPlaylist = useCallback(
    (url, title) => {
      setPlayListUrl(url);
      setSubListIndex(0);
      setActivePlaylistTitle(title || "");
      setSlideDirection("in");
      setMobileView("videos");
    },
    [setPlayListUrl, setSubListIndex],
  );

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
    [isMobile, handleMobileLoadPlaylist, setPlayListUrl],
  );

  // Shared PlayList component props
  const playListProps = {
    playListUrl,
    setPlayListUrl,
    backEnd,
    playListIndex,
    setPlayListIndex,
    disableButtons: false,
    setSnack,
    reFetch: reFetchPlaylist,
    setReFetch: setReFetchPlaylist,
    setSubListIndex,
    tableContainerHeight: `${tableContainerHeight}px`,
    rowsPerPageSubList,
    setRowsPerPageSubList,
    token,
    setToken,
    addNotification,
  };

  // Shared SubList component props
  const subListProps = {
    loadedPlayList: playListUrl,
    setPlayListUrl,
    backEnd,
    subListIndex,
    setSubListIndex,
    downloadedItem: downloadedItem.current,
    reFetch: reFetchSubList,
    setReFetch: setReFetchSubList,
    tableContainerHeight: `${tableContainerHeight}px`,
    rowsPerPage: rowsPerPageSubList,
    setRowsPerPage: setRowsPerPageSubList,
    token,
    setToken,
    setSnack,
    addNotification,
    activeDownloads,
    queuedItems,
    queueDownloads,
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
            playListUrl={playListProps.playListUrl}
            setPlayListUrl={playListProps.setPlayListUrl}
            backEnd={playListProps.backEnd}
            playListIndex={playListProps.playListIndex}
            setPlayListIndex={playListProps.setPlayListIndex}
            disableButtons={playListProps.disableButtons}
            setSnack={playListProps.setSnack}
            reFetch={playListProps.reFetch}
            setReFetch={playListProps.setReFetch}
            setSubListIndex={playListProps.setSubListIndex}
            tableContainerHeight={playListProps.tableContainerHeight}
            rowsPerPageSubList={playListProps.rowsPerPageSubList}
            setRowsPerPageSubList={playListProps.setRowsPerPageSubList}
            token={playListProps.token}
            setToken={playListProps.setToken}
            addNotification={playListProps.addNotification}
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
              loadedPlayList={subListProps.loadedPlayList}
              setPlayListUrl={subListProps.setPlayListUrl}
              backEnd={subListProps.backEnd}
              subListIndex={subListProps.subListIndex}
              setSubListIndex={subListProps.setSubListIndex}
              downloadedItem={subListProps.downloadedItem}
              reFetch={subListProps.reFetch}
              setReFetch={subListProps.setReFetch}
              tableContainerHeight={subListProps.tableContainerHeight}
              rowsPerPage={subListProps.rowsPerPage}
              setRowsPerPage={subListProps.setRowsPerPage}
              token={subListProps.token}
              setToken={subListProps.setToken}
              setSnack={subListProps.setSnack}
              addNotification={subListProps.addNotification}
              activeDownloads={subListProps.activeDownloads}
              queuedItems={subListProps.queuedItems}
              queueDownloads={subListProps.queueDownloads}
              rollbackDownloadQueueRequest={
                subListProps.rollbackDownloadQueueRequest
              }
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
            <PlayList
              playListUrl={playListProps.playListUrl}
              setPlayListUrl={playListProps.setPlayListUrl}
              backEnd={playListProps.backEnd}
              playListIndex={playListProps.playListIndex}
              setPlayListIndex={playListProps.setPlayListIndex}
              disableButtons={playListProps.disableButtons}
              setSnack={playListProps.setSnack}
              reFetch={playListProps.reFetch}
              setReFetch={playListProps.setReFetch}
              setSubListIndex={playListProps.setSubListIndex}
              tableContainerHeight={playListProps.tableContainerHeight}
              rowsPerPageSubList={playListProps.rowsPerPageSubList}
              setRowsPerPageSubList={playListProps.setRowsPerPageSubList}
              token={playListProps.token}
              setToken={playListProps.setToken}
              addNotification={playListProps.addNotification}
            />
          </Suspense>
        </Grid>
        <Grid xl={8} lg={8} md={6} sm={12} xs={12} sx={{ height: fullHeight }}>
          <Suspense fallback={<Loader />}>
            <SubList
              loadedPlayList={subListProps.loadedPlayList}
              setPlayListUrl={subListProps.setPlayListUrl}
              backEnd={subListProps.backEnd}
              subListIndex={subListProps.subListIndex}
              setSubListIndex={subListProps.setSubListIndex}
              downloadedItem={subListProps.downloadedItem}
              reFetch={subListProps.reFetch}
              setReFetch={subListProps.setReFetch}
              tableContainerHeight={subListProps.tableContainerHeight}
              rowsPerPage={subListProps.rowsPerPage}
              setRowsPerPage={subListProps.setRowsPerPage}
              token={subListProps.token}
              setToken={subListProps.setToken}
              setSnack={subListProps.setSnack}
              addNotification={subListProps.addNotification}
              activeDownloads={subListProps.activeDownloads}
              queuedItems={subListProps.queuedItems}
              queueDownloads={subListProps.queueDownloads}
              rollbackDownloadQueueRequest={
                subListProps.rollbackDownloadQueueRequest
              }
            />
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
              connectionId={connectionId}
              setPlayListUrl={handleNavSetPlayListUrl}
              token={token}
              setToken={setToken}
              setConnectionId={setConnectionId}
              notifications={notifications}
              onDismissNotification={dismissNotification}
              backEnd={backEnd}
              setSnack={setSnack}
              addNotification={addNotification}
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
