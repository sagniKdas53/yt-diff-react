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
import { useSocketEvents } from "../hooks/useSocketEvents.js";
import { useNavigate, useRoute } from "../router/RouterProvider.jsx";
import { NO_PLAYLIST, UNLISTED } from "../router/routes.js";
import { AuthContext } from "../contexts/AuthContext";
import { SocketContext } from "../contexts/SocketContext";
import { NotificationContext } from "../contexts/NotificationContext";
import { DownloadContext } from "../contexts/DownloadContext";
import ErrorBoundary from "./ErrorBoundary.jsx";

const Navigation = lazy(() => import("./Nav.jsx"));
const PlayList = lazy(() => import("./PlayList.jsx"));
const SubList = lazy(() => import("./SubList.jsx"));
const Login = lazy(() => import("./Login.jsx"));
const Signup = lazy(() => import("./Signup.jsx"));

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

/**
 * The snackbar's filled alert.
 *
 * `forwardRef` infers nothing about props from the destructure, so the
 * component's own props are named here — otherwise every one of them is an
 * error where it is read, and passing them from the JSX is another.
 *
 * @typedef {Object} AlertProps
 * @property {import("@mui/material").AlertColor} [severity]
 * @property {import("@mui/material").SxProps} [sx]
 * @property {() => void} [onClose]
 * @property {import("react").ReactNode} [children]
 */

/**
 * `forwardRef`'s result does not declare `propTypes`, but React reads one at
 * runtime and eslint's `react/prop-types` requires it — as with the memo'd
 * components elsewhere in the tree.
 *
 * @type {import("react").ForwardRefExoticComponent<AlertProps & import("react").RefAttributes<HTMLDivElement>> & {propTypes?: object}}
 */
const Alert = forwardRef(
  /**
   * @param {AlertProps} props
   * @param {import("react").Ref<HTMLDivElement>} ref
   */
  function Alert({ severity, sx, onClose, children }, ref) {
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
  },
);

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

/**
 * A lazy region: its own error boundary, then its own Suspense.
 *
 * `Suspense` catches the wait, not the failure. Every one of these wraps a
 * dynamic import, and a rejected import is a throw during render — without a
 * boundary inside it, a chunk that 404s after a deploy takes the whole tree
 * down instead of the one panel that could not load. The boundary goes outside
 * `Suspense` because that is where React looks once the lazy promise rejects.
 */
/**
 * A lazy route's boundary pair: an error boundary outside a Suspense fence.
 *
 * Props are named here rather than left to `propTypes` inference, which types
 * `children` as prop-types' own `ReactNodeLike` — a type ordinary JSX elements
 * do not satisfy.
 *
 * @param {{label?: string, children?: import("react").ReactNode}} props
 */
const LazyRegion = ({ label, children }) => (
  <ErrorBoundary compact label={label}>
    <Suspense fallback={<Loader />}>{children}</Suspense>
  </ErrorBoundary>
);

LazyRegion.propTypes = {
  label: PropTypes.string,
  children: PropTypes.node,
};

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
  //
  // Which playlist is open is a location, not component state: it is the one
  // thing a link, a bookmark or the Back button has to be able to name. It is
  // read from the router and written through it, so the URL and the view
  // cannot disagree — there is only the one value.
  const { playlistUrl: playListUrl, videoUrl: routeVideoUrl } = useRoute();
  const navigate = useNavigate();

  /** A person clicked something: leave an entry for Back to return to. */
  const setPlayListUrl = useCallback(
    (url) => navigate({ playlistUrl: url, videoUrl: null }),
    [navigate],
  );

  /**
   * The app moved itself. A background listing finishing and pulling the view
   * to its playlist is not a place the user asked to be, so it must not become
   * an entry they have to press Back through to leave.
   */
  const replacePlayListUrl = useCallback(
    (url) => navigate({ playlistUrl: url, videoUrl: null }, { replace: true }),
    [navigate],
  );

  /** Opens or closes the player, within whatever list is currently open. */
  const setRouteVideoUrl = useCallback(
    (videoUrl, { replace = false } = {}) =>
      navigate({ playlistUrl: playListUrl, videoUrl }, { replace }),
    [navigate, playListUrl],
  );

  const [subListIndex, setSubListIndex] = useState(0);
  // this will be used to seek to the latest playlist
  const [playListIndex, setPlayListIndex] = useState(0);
  const [disableProgress, toggleProgress] = useState(false);

  // progress bar and re-fetch state
  // so the basic idea of reFetch is to use the socket to trigger a re-fetch of the playlist
  // and sub-list when an event needs to let the user know that something has changed
  // this is a bit of a hack, but it works, without it the app would need to poll
  // the server for changes, which is not ideal, will fix this later
  const [reFetchPlaylist, setReFetchPlaylist] = useState(Date.now().toString());
  const [reFetchSubList, setReFetchSubList] = useState(Date.now().toString());
  // TODO: Add separate reFetch states for playlist and sub-list to avoid unnecessary fetches
  const [rowsPerPageSubList, setRowsPerPageSubList] = useState(8);

  // Mobile slide navigation state.
  //
  // Which panel is showing follows from the route — a playlist is selected, or
  // it is not — so this is not a second source of truth for it. It lags the
  // route by exactly one slide animation, which is the only reason it is state
  // at all: a panel that is on its way out still has to be rendered.
  const routeShowsVideos = playListUrl !== NO_PLAYLIST;
  const [mobileView, setMobileView] = useState(
    routeShowsVideos ? "videos" : "playlists",
  ); // "playlists" | "videos"
  const [slideDirection, setSlideDirection] = useState("none"); // "in" | "out" | "none"
  const [activePlaylistTitle, setActivePlaylistTitle] = useState("");
  const mobileAddDialogRef = useRef(null); // ref to trigger PlayList's add dialog from SubList

  // Detect mobile — create the theme once and use it throughout
  const appliedTheme = useMemo(() => themeObj(theme), [theme]);
  const isMobileViewport = useMediaQuery(appliedTheme.breakpoints.down("md"));
  const isTouchDevice = useMediaQuery("(hover: none) and (pointer: coarse)");
  const isMobile = isMobileViewport || isTouchDevice;

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
  // The socket handlers register once per connection and must not
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

  // The socket handlers used to switch the mobile panel themselves. They no
  // longer have to: they set the playlist, the playlist is the route, and the
  // effect below slides whichever panel that implies. What is left for them to
  // say is the title, which the route does not carry.
  const slideInMobileVideosPanel = (title) =>
    setActivePlaylistTitle(title || "");

  // Every socket event the app reacts to, and the state they own: the listing
  // counter and batch-reindex tracker that drive the progress bar, and the
  // last-downloaded item the sublist patches itself with.
  const { activeListingCount, batchReindex, downloadedItem } = useSocketEvents({
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
    // Replaces: see `replacePlayListUrl`. Nothing in here is a navigation the
    // user asked for.
    setPlayListUrl: replacePlayListUrl,
    setPlayListIndex,
    setSubListIndex,
    setReFetchPlaylist,
    setReFetchSubList,
    toggleProgressCallBackRef,
    disableProgressRef,
    isMobileRef,
    onMobileSlideNeeded: slideInMobileVideosPanel,
  });

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
        <LazyRegion label="The sign-in form">
          {showSignUp ? (
            <Signup height={fullHeight} toggleSignUpComponent={setShowSignUp} />
          ) : (
            <Login height={fullHeight} toggleSignUpComponent={setShowSignUp} />
          )}
        </LazyRegion>
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

  /**
   * Plays the slide the route implies.
   *
   * Driving the animation from the route rather than from the tap is what
   * makes the browser's own Back gesture work on mobile: it arrives here as an
   * ordinary route change and slides out exactly as the in-app arrow does.
   * Sliding out is the asymmetric half — the outgoing panel has to stay
   * mounted until its animation finishes, which is why `mobileView` trails the
   * route instead of being read straight off it.
   */
  useEffect(() => {
    if (!isMobile) return undefined;

    if (routeShowsVideos && mobileView !== "videos") {
      setSlideDirection("in");
      setMobileView("videos");
      return undefined;
    }

    if (!routeShowsVideos && mobileView === "videos") {
      setSlideDirection("out");
      const timer = setTimeout(() => {
        setMobileView("playlists");
        setSlideDirection("none");
      }, 220);
      return () => clearTimeout(timer);
    }

    return undefined;
  }, [isMobile, routeShowsVideos, mobileView]);

  // Mobile navigation handlers
  const handleMobileLoadPlaylist = useCallback(
    (url, title) => {
      setSubListIndex(0);
      setActivePlaylistTitle(title || "");
      setPlayListUrl(url);
    },
    [setPlayListUrl],
  );

  // Back is "no playlist selected", which is a location like any other — so
  // the in-app arrow and the browser's own Back button end up in the same
  // place by the same route change.
  const handleMobileBack = useCallback(() => {
    setPlayListUrl(NO_PLAYLIST);
  }, [setPlayListUrl]);

  const handleMobileOpenAddDialog = useCallback(() => {
    if (mobileAddDialogRef.current) {
      mobileAddDialogRef.current();
    }
  }, []);

  // Nav's setter. The mobile branch it used to carry is gone — sliding follows
  // the route now — leaving only the title, which the route cannot supply.
  const handleNavSetPlayListUrl = useCallback(
    (url) => {
      if (isMobile) {
        handleMobileLoadPlaylist(url, url === UNLISTED ? "Unlisted" : "");
      } else {
        setPlayListUrl(url);
      }
    },
    [isMobile, handleMobileLoadPlaylist, setPlayListUrl],
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
    playerVideoUrl: routeVideoUrl,
    setPlayerVideoUrl: setRouteVideoUrl,
  };

  // renders mobile main with slide navigation
  const renderMobileMain = () => (
    <Box className="mobile-slide-container" sx={{ height: fullHeight }}>
      {/* Panel 1: Playlists — always rendered, sits behind */}
      <Box
        className="mobile-panel mobile-panel-playlist"
        sx={{ display: "flex", flexDirection: "column" }}
      >
        <LazyRegion label="The playlist list">
          <PlayList
            {...playListProps}
            isMobile
            onMobileLoad={handleMobileLoadPlaylist}
            mobileAddDialogRef={mobileAddDialogRef}
          />
        </LazyRegion>
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
          <LazyRegion label="The video list">
            <SubList
              {...subListProps}
              isMobile
              onBack={handleMobileBack}
              onOpenAddDialog={handleMobileOpenAddDialog}
              activePlaylistTitle={activePlaylistTitle}
            />
          </LazyRegion>
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
          <LazyRegion label="The playlist list">
            <PlayList {...playListProps} />
          </LazyRegion>
        </Grid>
        <Grid xl={8} lg={8} md={6} sm={12} xs={12} sx={{ height: fullHeight }}>
          <LazyRegion label="The video list">
            <SubList {...subListProps} />
          </LazyRegion>
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
        <LazyRegion label="The navigation bar">
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
        </LazyRegion>
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
