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

import io from "socket.io-client";

const Navigation = lazy(() => import("./Nav.jsx"));
const PlayList = lazy(() => import("./PlayListDel.jsx"));
const SubList = lazy(() => import("./SubListMedia.jsx"));
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
    const prevDepsRef = useRef();

    useEffect(() => {
        const prev = prevDepsRef.current;
        const curr = { backEnd, reFetchPlaylist, reFetchSubList, token, playListUrl, subListIndex, playListIndex };

        if (!prev) {
            console.log("[effect] app initial deps:", curr);
        } else {
            const changed = Object.keys(curr).filter(k => {
                try {
                    return JSON.stringify(prev[k]) !== JSON.stringify(curr[k]);
                } catch {
                    return prev[k] !== curr[k];
                }
            });

            if (changed.length) {
                console.group(`[effect] app deps changed: ${changed.join(", ")}`);
                changed.forEach(k => {
                    console.log(k, "prev:", prev[k], "curr:", curr[k]);
                });
                //console.trace();
                console.groupEnd();
            } else {
                console.log("[effect] ran but no dep change detected (unexpected)");
            }
        }

        prevDepsRef.current = { ...curr };

        // --- rest of your effect follows ---
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [backEnd, reFetchPlaylist, reFetchSubList, token, playListUrl, subListIndex, playListIndex]);

    useEffect(() => {
        if (!socket) return; // guard

        // helpers
        const nowTag = () => Date.now().toString();

        // Handlers (use refs for any "current" state / callbacks)
        const onInit = (data) => {
            setConnectionId(data.id);
            setIndeterminate(false);
            progressRef.current = 0;
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
            setIndeterminate(true);
            progressRef.current = +data.percentage;
            toggleProgressCallBackRef.current && toggleProgressCallBackRef.current(false);
        };

        const onDownloadDone = (data) => {
            setIndeterminate(false);
            progressRef.current = 0;
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
            setIndeterminate(false);
            progressRef.current = 0;
            setSnackRef.current && setSnackRef.current(`${data.title}`, "error");
            addNotificationRef.current && addNotificationRef.current(`Download Failed: ${data.title}`);
        };

        const onDownloadingPercentUpdate = (data) => {
            // use the ref for disableProgress
            if (data.percentage >= 99) {
                setIndeterminate(true);
                progressRef.current = 101;
                toggleProgressCallBackRef.current && toggleProgressCallBackRef.current(true);
            } else if (!disableProgressRef.current) {
                progressRef.current = data.percentage;
            }
        };

        const onListingStarted = (data) => {
            setIndeterminate(true);
            progressRef.current = +data.percentage;
            toggleProgressCallBackRef.current && toggleProgressCallBackRef.current(false);
        };

        const onListingPlaylistComplete = (data) => {
            console.log("Listing playlist done: ", data);
            setIndeterminate(false);
            progressRef.current = 0;
            setSnackRef.current && setSnackRef.current(`${data.playlistTitle}`, "success");

            const current = playListUrlRef.current;
            if (current === "init") {
                setPlayListUrl(data.url);
                setPlayListIndex(data.seekPlaylistListTo);
            } else if (current === data.url) {
                const tag = "listing-playlist-complete-" + data.url + "-" + data.processedChunks + "-" + nowTag();
                setReFetchPlaylist(tag);
                setReFetchSubList(tag);
            } else {
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
            console.log("Listing chunk complete: ", data);
            console.log("Current playlist url (ref): ", playListUrlRef.current, " data url: ", data.url, " processed chunks: ", data.processedChunks);

            const current = playListUrlRef.current;
            if ((current === "init") && (data.processedChunks === 1)) {
                console.log("Changing playlist url to: ", data.url, " and seeking to index: ", data.seekPlaylistListTo);
                setIndeterminate(false);
                setPlayListUrl(data.url);
                setPlayListIndex(data.seekPlaylistListTo);
            } else if ((current === data.url) && (data.processedChunks > 1)) {
                const msg = "listing-playlist-chunk-complete-" + data.url + "-" + data.processedChunks + "-" + nowTag();
                console.log("Setting refetch to: ", msg);
                setIndeterminate(false);
                progressRef.current = 0;
                setReFetchSubList(msg);
                setPlayListIndex(data.seekPlaylistListTo);
            } else {
                // optional: ignore or handle chunks for other playlists
                console.log("Chunk event ignored (other playlist or state mismatch).");
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
        socket.on("playlist-skipped", onPlaylistSkipped);
        socket.on("listing-playlist-chunk-complete", onListingPlaylistChunkComplete);
        socket.on("listing-single-item-complete", onListingSingleItemComplete);
        socket.on("listing-error", onListingError);

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
                socket.off("playlist-skipped", onPlaylistSkipped);
                socket.off("listing-playlist-chunk-complete", onListingPlaylistChunkComplete);
                socket.off("listing-single-item-complete", onListingSingleItemComplete);
                socket.off("listing-error", onListingError);
            } catch (e) {
                // socket might already be closed; ignore
                console.warn("Error removing socket listeners", e);
            }
        };
    }, [socket]); // only recreate if socket reference changes

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
                        setUrl={setPlayListUrl}
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
                        progressRef={progressRef}
                    />
                </Suspense>
            </Grid>
        </Grid>
    );

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
                                variant={indeterminate ? "indeterminate" : "determinate"}
                                color="secondary"
                                value={progressRef.current}
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