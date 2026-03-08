import CloseIcon from "@mui/icons-material/Close.js";
import MuiAlert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import Paper from "@mui/material/Paper";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import Grid from "@mui/material/Unstable_Grid2";
import { forwardRef, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDependencyLogger } from "../hooks/useDependencyLogger";

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
                main: "#3f51b5",
            },
            secondary: {
                main: theme ? "#03a9f4" : "#f50057",
            },
            success: {
                main: "#2CCB36",
            }
        },
    });

const Alert = forwardRef(function Alert(props, ref) {
    return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

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
    const [indeterminate, setIndeterminate] = useState(false);
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
    const progressRef = useRef(0);
    const notificationRef = useRef(0);
    const downloadedItem = useRef({ url: null, title: null, fileName: null, saveDirectory: null });

    // socket setup
    const socket = useMemo(() => {
        // for some reason socket.io likes to take base and path separately
        const sock = io.connect(base, { path: path + "/socket.io" });
        if (token) {
            sock.auth = { token };
            sock.connect();
        }
        return sock;
    }, [token]);

    // 53px table top, 52 px table pagination, 48 px app bar
    // Table top is included in the table height so no need to subtract it
    const progressBarHeight = 5;
    const appBarHeight = 48;
    const tablePaginationHeight = 52;
    const adjust = tablePaginationHeight + appBarHeight + progressBarHeight;
    const [tableContainerHeight, setTableContainerHeight] = useState(window.innerHeight - adjust);
    const fullHeight = `${tableContainerHeight + 52}px`;

    useEffect(() => {
        function handleResize() {
            setTableContainerHeight(window.innerHeight - adjust);
        }
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const toggleProgressCallBack = useCallback((next) => toggleProgress(next), []);

    // stable callbacks
    const setSnack = useCallback((msg, type) => {
        setSnackMsgTxt(msg);
        setSnackSeverity(type);
        setSnackVisibility(true);
    }, []);

    const addNotification = useCallback((message) => {
        const newNotification = {
            id: Date.now() + "-" + notificationRef.current.toString(),
            message,
        };
        notificationRef.current += 1;
        setNotifications((prev) => [...prev, newNotification]);
    }, []);

    // keep refs in sync so socket handlers use latest functions
    useEffect(() => { setSnackRef.current = setSnack; }, [setSnack]);
    useEffect(() => { addNotificationRef.current = addNotification; }, [addNotification]);

    const dismissNotification = (id) => {
        setNotifications((prev) => prev.filter((note) => note.id !== id));
    };

    // --- Refs to avoid stale closures ---
    const playListUrlRef = useRef(playListUrl);
    useEffect(() => { playListUrlRef.current = playListUrl; }, [playListUrl]);

    const disableProgressRef = useRef(disableProgress);
    useEffect(() => { disableProgressRef.current = disableProgress; }, [disableProgress]);

    const toggleProgressCallBackRef = useRef(toggleProgressCallBack);
    useEffect(() => { toggleProgressCallBackRef.current = toggleProgressCallBack; }, [toggleProgressCallBack]);

    const addNotificationRef = useRef(addNotification);
    useEffect(() => { addNotificationRef.current = addNotification; }, [addNotification]);

    const setSnackRef = useRef(setSnack);
    useEffect(() => { setSnackRef.current = setSnack; }, [setSnack]);

    useDependencyLogger({ socket, backEnd, reFetchPlaylist, reFetchSubList, token, playListUrl, subListIndex, playListIndex, activeDownloads }, "App");

    useEffect(() => {
        if (!socket) return; // guard

        // helpers
        const nowTag = () => Date.now().toString();

        // Handlers (use refs for any "current" state / callbacks)
        const onInit = (data) => {
            setConnectionId(data.id);
            setIndeterminate(false);
            progressRef.current = 0;
            setActiveDownloads(prev => Object.keys(prev).length ? {} : prev);
            // call latest callback
            toggleProgressCallBackRef.current && toggleProgressCallBackRef.current(false);
            setSnackRef.current && setSnackRef.current("Connected: " + data.id, "success");
            socket.emit("acknowledge", { data: "Connected", id: data.id });
        };

        const onError = (data) => {
            setSnackRef.current && setSnackRef.current(`${data.message}`, "error");
        };

        const onTokenExpired = () => {
            setSnackRef.current && setSnackRef.current("Token Expired", "error");
            setToken(null);
            localStorage.setItem("ytdiff_token", "null");
        };

        const onConnectionError = () => setSnackRef.current && setSnackRef.current("Max web-sockets reached", "error");

        const onDownloadStarted = (data) => {
            // TODO: Remove the console.logs
            console.log("[Socket] download-started", data);
            const url = data.url || "unknown";
            const percent = isNaN(+data.percentage) ? 0 : +data.percentage;
            // No need to setIndeterminate(true) here! The calculation block below will handle it based on the queue state.
            setActiveDownloads(prev => ({ ...prev, [url]: percent }));
            toggleProgressCallBackRef.current && toggleProgressCallBackRef.current(false);
        };

        const onDownloadDone = (data) => {
            // TODO: Remove the console.logs
            console.log("[Socket] download-done", data);
            // Not sure if making this false is a good idea as other items could still be downloading,
            // Once all the downloads are done the use-effct down the file will set it false (should?)
            //setIndeterminate(false);
            setActiveDownloads(prev => {
                const newDownloads = { ...prev };
                delete newDownloads[data.url];
                return newDownloads;
            });
            downloadedItem.current = {
                url: data.url,
                title: data.title,
                fileName: data.fileName || null,
                saveDirectory: data.saveDirectory || null,
                isMetaDataSynced: data.isMetaDataSynced || null,
                thumbNailFile: data.thumbNailFile || null,
                subTitleFile: data.subTitleFile || null,
                descriptionFile: data.descriptionFile || null,
            };
            setSnackRef.current && setSnackRef.current(`${data.title}`, "success");
            addNotificationRef.current && addNotificationRef.current(`Downloaded: ${data.title}`);
        };

        const onDownloadFailed = (data) => {
            // TODO: Remove the console.logs
            console.log("[Socket] download-failed", data);
            //setIndeterminate(false);
            setActiveDownloads(prev => {
                const newDownloads = { ...prev };
                delete newDownloads[data.url];
                return newDownloads;
            });
            setSnackRef.current && setSnackRef.current(`${data.title}`, "error");
            addNotificationRef.current && addNotificationRef.current(`Download Failed: ${data.title}`);
        };

        const onDownloadingPercentUpdate = (data) => {
            // TODO: Remove the console.logs
            console.log("[Socket] downloading-percent-update", data);
            const url = data.url || "unknown";
            const percent = parseFloat(data.percentage);

            if (isNaN(percent)) return; // Ignore NaN updates to prevent breaking math

            // Manipulating determinsm here seems like a bad idea as it gets updated far too often
            if (percent >= 99) {
                //setIndeterminate(true);
                setActiveDownloads(prev => ({ ...prev, [url]: 100 }));
                toggleProgressCallBackRef.current && toggleProgressCallBackRef.current(true);
            } else if (!disableProgressRef.current) {
                //setIndeterminate(false);
                setActiveDownloads(prev => {
                    // It finished downloading once (100) or is queued (101), ignore any post-processing reverse progress
                    if (prev[url] >= 100 && prev[url] !== 101) return prev;
                    return { ...prev, [url]: percent };
                });
            }
        };

        const onListingStarted = (data) => {
            //console.log("Listing started: ", data);
            setIndeterminate(true);
            progressRef.current = +data.percentage;
            toggleProgressCallBackRef.current && toggleProgressCallBackRef.current(false);
        };

        const onListingPlaylistComplete = (data) => {
            //console.log("Listing playlist done: ", data);
            setIndeterminate(false);
            progressRef.current = 0;
            setSnackRef.current && setSnackRef.current(`${data.playlistTitle}`, "success");
            const tag = "listing-playlist-complete-" + data.url + "-" + data.processedChunks + "-" + nowTag();
            const current = playListUrlRef.current;

            // Always re-fetch the playlist list to show final status
            setReFetchPlaylist(tag);

            if (current === "init") {
                // Load the playlist if none is loaded
                setPlayListUrl(data.url);
                setPlayListIndex(data.seekPlaylistListTo);
            } else if (current === data.url) {
                // If viewing the completed playlist, refresh the sublist
                setReFetchSubList(tag);
            } else {
                // Just update the index
                setPlayListIndex(data.seekPlaylistListTo);
            }

            addNotificationRef.current && addNotificationRef.current(`Successful Added Playlist: ${data.playlistTitle}`);
        };

        const onPlaylistSkipped = (data) => {
            setIndeterminate(false);
            progressRef.current = 0;
            setSnackRef.current && setSnackRef.current(`${data.message}`, "info");
            addNotificationRef.current && addNotificationRef.current(`${data.message}`);
        };

        const onListingPlaylistChunkComplete = (data) => {
            //console.log("Listing chunk complete: ", data);
            //console.log("Current playlist url (ref): ", playListUrlRef.current, " data url: ", data.url, " processed chunks: ", data.processedChunks);

            const current = playListUrlRef.current;
            const tag = "listing-playlist-chunk-complete-" + data.url + "-" + data.processedChunks + "-" + nowTag();

            // Always re-fetch the playlist list to show updated status/counts
            setReFetchPlaylist(tag);

            // If the current url is init (i.e. No playlist is loaded) and the processed chunks is 1, then it is the first chunk so load it
            if ((current === "init") && (data.processedChunks === 1)) {
                //setIndeterminate(false);
                setPlayListUrl(data.url);
                setPlayListIndex(data.seekPlaylistListTo);
            }
            // If the current url is the same as the data url, it means we are viewing the playlist being processed
            else if (current === data.url) {
                // Re-fetch the sublist to show new videos
                setReFetchSubList(tag);
                setPlayListIndex(data.seekPlaylistListTo);
            }
        };

        const onListingSingleItemComplete = (data) => {
            setIndeterminate(false);
            progressRef.current = 0;
            setReFetchSubList("listing-single-item-complete-" + data.url + "-" + nowTag());

            const current = playListUrlRef.current;
            if (current === "init" || current === "None") {
                setPlayListUrl("None");
                setSubListIndex(data.seekSubListTo);
            }
            addNotificationRef.current && addNotificationRef.current(`Successful Added Video: ${data.title}`);
        };

        const onListingError = (data) => {
            setIndeterminate(false);
            progressRef.current = 0;
            setSnackRef.current && setSnackRef.current(`${data.url}`, "error");
            addNotificationRef.current && addNotificationRef.current(`Failed Listing: ${data.url}`);
        };

        const onListingVideoSkippedBecauseDownloaded = (data) => {
            setIndeterminate(false);
            progressRef.current = 0;
            setSnackRef.current && setSnackRef.current(`${data.message}`, "info");
            addNotificationRef.current && addNotificationRef.current(`${data.message}`);
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
        socket.on("listing-playlist-chunk-complete", onListingPlaylistChunkComplete);
        socket.on("listing-single-item-complete", onListingSingleItemComplete);
        socket.on("listing-error", onListingError);
        socket.on("listing-playlist-skipped-because-same-monitoring", onPlaylistSkipped);
        socket.on("listing-video-skipped-because-downloaded", onListingVideoSkippedBecauseDownloaded);

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
                socket.off("listing-playlist-chunk-complete", onListingPlaylistChunkComplete);
                socket.off("listing-single-item-complete", onListingSingleItemComplete);
                socket.off("listing-error", onListingError);
                socket.off("listing-playlist-skipped-because-same-monitoring", onPlaylistSkipped);
                socket.off("listing-video-skipped-because-downloaded", onListingVideoSkippedBecauseDownloaded);
            } catch (e) {
                // socket might already be closed; ignore
                //console.warn("Error removing socket listeners", e);
            }
        };
    }, [socket]); // only recreate if socket reference changes

    // Calculate average progress and log it
    // Filter out 'unknown' tasks that might be spurious, and ignore NaN values
    const activeDownloadKeys = Object.keys(activeDownloads).filter(k => k !== "unknown" && k !== "listing");
    let validCount = 0;
    const totalProgress = activeDownloadKeys.reduce((acc, key) => {
        const val = activeDownloads[key];
        // Only include in average if it hasn't finished (99 cutoff usually, but safe checking > 100)
        // If it's >= 101, it means it's queued/starting, so we shouldn't inflate the average.
        if (!isNaN(val) && val <= 100) {
            validCount++;
            return acc + val;
        }
        return acc;
    }, 0);

    // If no active downloads, use progressRef for listing progress
    const calculatedProgress = validCount > 0 ? totalProgress / validCount : progressRef.current;

    // It's indeterminate if explicit indeterminate state is true, or if no active tasks have started downloading yet (all >=101)
    const activeValues = activeDownloadKeys.map(k => activeDownloads[k]).filter(v => !isNaN(v));
    const isActuallyIndeterminate = indeterminate || (activeDownloadKeys.length > 0 && activeValues.length > 0 && activeValues.every(v => v >= 101 || v === 0));

    useEffect(() => {
        console.log("[State] activeDownloads:", activeDownloads, "avgProgress:", calculatedProgress, "indeterminate:", isActuallyIndeterminate);
    }, [activeDownloads, calculatedProgress, isActuallyIndeterminate]);

    // UI renders
    // renders login/signup grid
    const renderAuth = () => (
        <Grid container spacing={0}>
            {/* left spacer */}
            <Grid xl={4} lg={4} md={2} sm={12} xs={12}
                sx={{ height: fullHeight, display: { xs: "none", sm: "none", md: "block" }, m: 0, p: 0 }}
            />
            {/* login/signup */}
            <Grid xl={4} lg={4} md={8} sm={12} xs={12}
                sx={{ height: fullHeight, m: 0, p: 0 }}>
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
            <Grid xl={4} lg={4} md={2} sm={12} xs={12}
                sx={{ height: fullHeight, display: { xs: "none", sm: "none", md: "block" }, m: 0, p: 0 }}
            />
        </Grid>
    );

    // renders main app when token is available
    const renderMain = () => (
        <Grid container spacing={0}>
            <Grid xl={4} lg={4} md={6} sm={12} xs={12}
                sx={{ height: fullHeight }}>
                <Suspense fallback={<Loader />}>
                    <PlayList
                        playListUrl={playListUrl}
                        setPlayListUrl={setPlayListUrl}
                        backEnd={backEnd}
                        playListIndex={playListIndex}
                        setPlayListIndex={setPlayListIndex}
                        disableButtons={false}
                        setIndeterminate={setIndeterminate}
                        setSnack={setSnack}
                        reFetch={reFetchPlaylist}
                        setReFetch={setReFetchPlaylist}
                        setSubListIndex={setSubListIndex}
                        tableContainerHeight={`${tableContainerHeight}px`}
                        rowsPerPageSubList={rowsPerPageSubList}
                        setRowsPerPageSubList={setRowsPerPageSubList}
                        token={token}
                        setToken={setToken}
                    />
                </Suspense>
            </Grid>
            <Grid xl={8} lg={8} md={6} sm={12} xs={12}
                sx={{ height: fullHeight }}>
                <Suspense fallback={<Loader />}>
                    <SubList
                        loadedPlayList={playListUrl}
                        setPlayListUrl={setPlayListUrl}
                        backEnd={backEnd}
                        subListIndex={subListIndex}
                        setSubListIndex={setSubListIndex}
                        downloadedItem={downloadedItem.current}
                        reFetch={reFetchSubList}
                        setReFetch={setReFetchSubList}
                        tableContainerHeight={`${tableContainerHeight}px`}
                        rowsPerPage={rowsPerPageSubList}
                        setRowsPerPage={setRowsPerPageSubList}
                        token={token}
                        setToken={setToken}
                        setSnack={setSnack}
                        activeDownloads={activeDownloads}
                    />
                </Suspense>
            </Grid>
        </Grid>
    );

    // main app
    return (
        <ThemeProvider theme={themeObj(theme)}>
            <Box sx={{ margin: 0, padding: 0, bgcolor: "background.default", height: "100%", position: "relative" }}>
                {/* nav bar */}
                <Suspense fallback={<Loader />}>
                    <Box sx={{ position: "sticky", top: 0, left: 0, zIndex: 100 }}>
                        <Navigation
                            themeSwitcher={themeSwitcher}
                            theme={theme}
                            connectionId={connectionId}
                            setPlayListUrl={setPlayListUrl}
                            token={token}
                            setToken={setToken}
                            setConnectionId={setConnectionId}
                            notifications={notifications}
                            onDismissNotification={dismissNotification}
                        />
                        <Box sx={{ width: "100%", height: progressBarHeight + "px" }}>
                            <LinearProgress
                                sx={{ height: "100%", borderRadius: 0 }}
                                variant={isActuallyIndeterminate ? "indeterminate" : "determinate"}
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