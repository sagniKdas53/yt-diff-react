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
const PlayList = lazy(() => import("./PlayList.jsx"));
const SubList = lazy(() => import("./SubList.jsx"));
const Login = lazy(() => import("./Login.jsx"));
const Signup = lazy(() => import("./Signup.jsx"));

const base = import.meta.env.PROD ? window.location.origin : "http://localhost:8888";
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
    const [reFetch, setReFetch] = useState("");
    const [rowsPerPageSubList, setRowsPerPageSubList] = useState(10);
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

    // helper for snackbar
    const setSnack = (msg, type) => {
        setSnackMsgTxt(msg);
        setSnackSeverity(type);
        setSnackVisibility(true);
    };

    // notification helpers
    const addNotification = (message) => {
        const newNotification = {
            id: Date.now() + "-" + notificationRef.current.toString(),
            message,
        };
        notificationRef.current += 1;
        setNotifications((prev) => [...prev, newNotification]);
    };

    const dismissNotification = (id) => {
        setNotifications((prev) => prev.filter((note) => note.id !== id));
    };

    // socket event handlers
    useEffect(() => {
        // this one sets up sockets
        socket.on("init", (data) => {
            setConnectionId(data.id);
            setIndeterminate(false);
            progressRef.current = 0;
            toggleProgressCallBack(false);
            setSnack("Connected: " + data.id, "success");
            socket.emit("acknowledge", { data: "Connected", id: data.id });
        });
        // shows errors
        socket.on("error", (data) => {
            //console.log("Error: ", data);
            setSnack(`${data.message}`, "error");
        });
        // when token expires this receives the event and sets the token to null
        // also removes it from localStorage, there is reason to suspect that saving
        // the token as a ref would be better
        socket.on("token-expired", () => {
            setSnack("Token Expired", "error");
            setToken(null);
            localStorage.setItem("ytdiff_token", "null");
        });
        socket.on("connection-error", () => setSnack("Max web-sockets reached", "error"));
        // Download events
        // triggered when a download starts, as progress may not start right away
        socket.on("download-started", (data) => {
            //console.log("Download started: ", data);
            // put the progress bar in an indeterminate state
            setIndeterminate(true);
            progressRef.current = +data.percentage;
            toggleProgressCallBack(false);
        });
        socket.on("download-done", (data) => {
            //console.log("Download done: ", data);
            setIndeterminate(false);
            progressRef.current = 0;
            downloadedItem.current = {
                url: data.url,
                title: data.title,
                fileName: data.fileName || null,
                saveDirectory: data.saveDirectory || null,
            };
            setSnack(`${data.title}`, "success");
            addNotification(`Downloaded: ${data.title}`);
        });
        socket.on("download-failed", (data) => {
            //console.log("Download failed: ", data);
            setIndeterminate(false);
            progressRef.current = 0;
            setSnack(`${data.title}`, "error");
            addNotification(`Download Failed: ${data.title}`);
        });
        // gives incremental progress updates at 10% intervals also
        // used to keep the state updated of background activity
        socket.on("downloading-percent-update", (data) => {
            //console.log("downloading-percent-update: ", data);
            if (data.percentage >= 99) {
                setIndeterminate(true);
                progressRef.current = 101;
                toggleProgressCallBack(true);
            } else if (!disableProgress) {
                // if the disableProgress is false then update percentage
                //setProgress(data.percentage);
                progressRef.current = data.percentage;
            }
        });
        // Listing events
        // Earlier this was not needed but now it may actually be needed
        // TODO: Fine tune the fetching of events to not be so aggressive
        // This is sent before any type of listing starts
        socket.on("listing-started", (data) => {
            //console.log("Listing started: ", data);
            // put the progress bar in an indeterminate state
            setIndeterminate(true);
            progressRef.current = +data.percentage;
            toggleProgressCallBack(false);
        });
        // Listing playlists
        socket.on("listing-playlist-complete", (data) => {
            //console.log("Listing playlist done: ", data);
            // enable the buttons and reset progress
            setIndeterminate(false);
            progressRef.current = 0;
            setSnack(`${data.playlistTitle}`, "success");
            // use this to update the playlists, which will in turn update the sub-list if it is selected
            //reFetch.current = !reFetch.current;
            // This data.id is used to set the reFetch id so that requests can be made when websocket emits an event
            // although this is stupid, it works I don't like it at all it doesn't follow MVC pattern
            // but it works, so I will leave it for now
            setReFetch(data.url + data.processedChunks);
            addNotification(`Successful Added Playlist: ${data.playlistTitle}`);
            //console.log("Listing done: ", data);
        });
        socket.on("playlist-skipped", (data) => {
            //console.log("Playlist item skipped: ", data);
            setIndeterminate(false);
            progressRef.current = 0;
            setSnack(`${data.message}`, "info");
            addNotification(`${data.message}`);
        });
        socket.on("listing-playlist-chunk-complete", (data) => {
            //console.log("Listing chunk complete: ", data);
            if (playListUrl === "init" && data.processedChunks === 1) {
                //console.log("Changing playlist url to: ", data.url);
                setIndeterminate(false);
                setPlayListUrl(data.url);
                setPlayListIndex(data.seekPlaylistListTo);
            } else if (playListUrl === data.url && data.processedChunks > 1) {
                //console.log("Setting refetch to: ", data.url + data.processedChunks);
                setIndeterminate(false);
                setReFetch(data.url + data.processedChunks);
                progressRef.current = 0;
            }
        });
        // Listing single item
        socket.on("listing-single-item-complete", (data) => {
            //console.log("Listing single item: ", data);
            setIndeterminate(false);
            progressRef.current = 0;
            setReFetch(data.url);
            if (playListUrl === "init" || playListUrl === "None") {
                setPlayListUrl("None");
                setSubListIndex(data.seekSubListTo);
            }
            addNotification(`Successful Added Video: ${data.title}`);
        });
        // Failed listing
        socket.on("listing-error", (data) => {
            //console.log("Listing failed: ", data);
            // enable the buttons and reset progress
            setIndeterminate(false);
            progressRef.current = 0;
            setSnack(`${data.url}`, "error");
            addNotification(`Failed Listing: ${data.url}`);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [socket, toggleProgressCallBack]);

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
            <Grid xl={6} lg={6} md={12} sm={12} xs={12}
                sx={{ height: fullHeight }}>
                <Suspense fallback={<Loader />}>
                    <PlayList
                        playListUrl={playListUrl}
                        setUrl={setPlayListUrl}
                        backEnd={backEnd}
                        playListIndex={playListIndex}
                        disableButtons={false}
                        setIndeterminate={setIndeterminate}
                        setSnack={setSnack}
                        reFetch={reFetch}
                        tableContainerHeight={`${tableContainerHeight}px`}
                        rowsPerPageSubList={rowsPerPageSubList}
                        setRowsPerPageSubList={setRowsPerPageSubList}
                        token={token}
                        setToken={setToken}
                    />
                </Suspense>
            </Grid>
            <Grid xl={6} lg={6} md={12} sm={12} xs={12}
                sx={{ height: fullHeight }}>
                <Suspense fallback={<Loader />}>
                    <SubList
                        loadedPlayList={playListUrl}
                        setPlayListUrl={setPlayListUrl}
                        backEnd={backEnd}
                        subListIndex={subListIndex}
                        downloadedItem={downloadedItem.current}
                        reFetch={reFetch}
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