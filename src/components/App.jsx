import { ThemeProvider, createTheme } from "@mui/material/styles";
import { useState, useCallback, useEffect, forwardRef, useRef, lazy, Suspense, useMemo } from "react";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import CloseIcon from "@mui/icons-material/Close.js";
import Grid from "@mui/material/Unstable_Grid2";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import MuiAlert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
//import Typography from "@mui/material/Typography";

import io from "socket.io-client";

const Navigation = lazy(() => import("./Nav.jsx"));
const PlayList = lazy(() => import("./PlayList.jsx"));
const SubList = lazy(() => import("./SubList.jsx"));
const Login = lazy(() => import("./Login.jsx"));

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

export default function App() {
    // if it is not set in localStorage value is null, then !! will set as false
    const initialState = !!JSON.parse(localStorage.getItem("ytdiff_theme"));
    // If theme is unset it uses dark mode by default
    const [theme, themeSwitcher] = useState(initialState);
    // if it is not set in localStorage value is null, then !! will set as false
    const localToken = localStorage.getItem("ytdiff_token") === "null" ?
        null : localStorage.getItem("ytdiff_token");
    // now this will be done later
    const [token, setToken] = useState(localToken);
    const [listUrl, setListUrl] = useState("");
    const [respIndex, setRespIndex] = useState(0);
    const [connectionId, setConnectionId] = useState("");
    const [disableProgress, toggleProgress] = useState(false);
    const [showSnackbar, setSnackVisibility] = useState(false);
    const [snackMsg, setSnackMsgTxt] = useState("");
    const [snackSeverity, setSnackSeverity] = useState("success");
    const [indeterminate, setIndeterminate] = useState(false);
    // so the basic idea of reFetch is to use the socket to trigger a re-fetch of the playlist 
    // and sub-list when an event needs to let the user know that something has changed
    // this is a bit of a hack, but it works, without it the app would need to poll 
    // the server for changes, which is not ideal, will fix this later
    const [reFetch, setReFetch] = useState("");
    const [rowsPerPageSubList, setRowsPerPageSubList] = useState(10);
    const progressRef = useRef(0);
    const downloadedItem = useRef({ "url": null, "title": null });
    const socket = useMemo(() => {
        // for some reason socket.io likes to take base and path separately
        const sock = io.connect(base, {
            path: path + "/socket.io",
        });

        if (token) {
            sock.auth = { token };
            sock.connect();
        }

        return sock;
    }, [token]);

    // 53px table top, 52 px table pagination, 48 px app bar
    // Table top is included in the table height so no need to subtract it
    const progressHeight = 5;
    const adjust = 52 + 48 + progressHeight;
    const [tableHeight, setTableHeight] = useState(window.innerHeight - adjust);
    useEffect(() => {
        function handleResize() {
            setTableHeight(window.innerHeight - adjust)
        }

        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const toggleProgressCallBack = useCallback((next) => {
        toggleProgress(next);
    }, []);

    const setSnack = (msg, type) => {
        setSnackMsgTxt(msg);
        setSnackSeverity(type);
        setSnackVisibility(true);
    };

    useEffect(() => {
        // this one sets up sockets
        socket.on("init", function (data) {
            setConnectionId(data.id);
            setIndeterminate(false);
            progressRef.current = 0;
            toggleProgressCallBack(false);
            setSnack("Connected: " + data.id, "success");
            socket.emit("acknowledge", { data: "Connected", id: data.id });
        });
        // shows errors
        socket.on("error", function (data) {
            setSnack(`${data.message}`, "error");
        });
        // when token expires this receives the event and sets the token to null
        // also removes it from localStorage, there is reason to suspect that saving
        // the token as a ref would be better
        socket.on("token-expired", function () {
            setSnack("Token Expired", "error");
            setToken(null);
            localStorage.setItem("ytdiff_token", "null");
        });
        socket.on("connection-error", function () {
            setSnack("Max web-sockets reached", "error");
        })
        // Download events
        // triggered when a download starts, as progress my not start right away
        socket.on("download-started", function (data) {
            // put the progress bar in an indeterminate state
            setIndeterminate(true);
            progressRef.current = +data.percentage;
            // if socket is set to be disregarded then set it back to listen
            toggleProgressCallBack(false);
        });
        socket.on("download-done", function (data) {
            setIndeterminate(false);
            progressRef.current = 0;
            downloadedItem.current = { "url": data.url, "title": data.title };
            setSnack(`${data.title}`, "success");
        });
        socket.on("download-failed", function (data) {
            setIndeterminate(false);
            progressRef.current = 0;
            setSnack(`${data.title}`, "error");
        });
        // gives incremental progress updates at 10% intervals also
        // used to keep the state updated of background activity
        socket.on("downloading-percent-update", function (data) {
            //console.log(data.percentage);
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
        socket.on("listing-started", function (data) {
            // put the progress bar in an indeterminate state
            setIndeterminate(true);
            progressRef.current = +data.percentage;
            // if socket is set to be disregarded then set it back to listen
            toggleProgressCallBack(false);
        });
        socket.on("playlist-done", function (data) {
            // enable the buttons and reset progress
            // console.log("playlist-done: ", data);
            setIndeterminate(false);
            progressRef.current = 0;
            setSnack(`${data.message}`, "success");
            // use this to update the playlists, which will inturn update the sub-list if it is selected
            //reFetch.current = !reFetch.current;
            // This data.id is used to set the reFetch id so that requests can be made when websocket emits an event
            // although this is stupid, it works I don't like it at all it doesn't follow MVC pattern
            setReFetch(data.url);
        });
        socket.on("listing-failed", function (data) {
            // enable the buttons and reset progress
            setIndeterminate(false);
            progressRef.current = 0;
            setSnack(`${data.url}`, "error");
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [socket, toggleProgressCallBack]);

    return (
        <ThemeProvider theme={themeObj(theme)}>
            <Box sx={{ margin: "0px", padding: "0px", bgcolor: "background.default", height: "100%", position: "relative" }}>
                {/* nav bar */}
                <Suspense fallback={<Grid container justifyContent="center" key="NavSusGrid">
                    <CircularProgress color="secondary" key="NavSus" /></Grid>}>
                    <Box sx={{ position: "sticky", top: 0, left: 0, zIndex: 100 }}>
                        <Navigation
                            themeSwitcher={themeSwitcher}
                            theme={theme}
                            connectionId={connectionId}
                            setListUrl={setListUrl}
                            token={token}
                            setToken={setToken}
                            setConnectionId={setConnectionId}
                        />
                        <Box sx={{ width: "100%", height: progressHeight + "px" }}>
                            <LinearProgress
                                sx={{ height: "100%", borderRadius: 0 }}
                                variant={
                                    indeterminate ? "indeterminate" : "determinate"
                                }
                                color="secondary"
                                value={progressRef.current}
                            />
                        </Box>
                    </Box>
                </Suspense>
                {/* main grid */}
                <Paper sx={{ width: "100%", overflow: "hidden", position: "relative" }}>
                    {token === null ?
                        <Grid container spacing={0} key="LoginSignUpGrid">
                            <Grid xl={4} lg={4} md={2} sm={12} xs={12} key="StartSignUpGrid"
                                sx={{
                                    height: tableHeight + 52 + "px",
                                    display: { xs: "none", sm: "none", md: "block" },
                                    m: 0, p: 0
                                }}
                            ></Grid>
                            <Grid xl={4} lg={4} md={8} sm={12} xs={12} key="LoginGrid"
                                sx={{ height: tableHeight + 52 + "px", m: 0, p: 0 }}>
                                <Suspense fallback={
                                    <Grid container justifyContent="center" key="LoginSusGrid">
                                        <CircularProgress color="secondary" key="LoginSus" />
                                    </Grid>
                                }>
                                    <Login
                                        backEnd={backEnd}
                                        setToken={setToken}
                                        setSnack={setSnack}
                                        height={tableHeight + 52 + "px"}
                                    />
                                </Suspense>
                            </Grid>
                            <Grid xl={4} lg={4} md={2} sm={12} xs={12} key="EndSignUpGrid"
                                sx={{
                                    height: tableHeight + 52 + "px",
                                    display: { xs: "none", sm: "none", md: "block" },
                                    m: 0, p: 0
                                }}
                            ></Grid>
                        </Grid>
                        :
                        <Grid container spacing={0} key="MainGrid">
                            <Grid xl={6} lg={6} md={12} sm={12} xs={12} key="PlayGrid"
                                sx={{ height: tableHeight + 52 + "px" }}>
                                <Suspense fallback={<Grid container justifyContent="center" key="PlaySusGrid">
                                    <CircularProgress color="secondary" key="PlaySus" /></Grid>}>
                                    <PlayList
                                        url={listUrl}
                                        setUrl={setListUrl}
                                        backEnd={backEnd}
                                        setRespIndex={setRespIndex}
                                        disableButtons={false}
                                        setIndeterminate={setIndeterminate}
                                        setSnack={setSnack}
                                        reFetch={reFetch}
                                        tableHeight={tableHeight + "px"}
                                        rowsPerPageSubList={rowsPerPageSubList}
                                        token={token}
                                        setToken={setToken}
                                    />
                                </Suspense>
                            </Grid>
                            <Grid xl={6} lg={6} md={12} sm={12} xs={12} key="SubGrid"
                                sx={{ height: tableHeight + 52 + "px" }}>
                                <Suspense fallback={<Grid container justifyContent="center" key="SubSusGrid">
                                    <CircularProgress color="secondary" key="SubSus" /></Grid>}>
                                    <SubList
                                        url={listUrl}
                                        setUrl={setListUrl}
                                        backEnd={backEnd}
                                        respIndex={respIndex}
                                        downloadedItem={downloadedItem.current}
                                        reFetch={reFetch}
                                        tableHeight={tableHeight + "px"}
                                        rowsPerPage={rowsPerPageSubList}
                                        setRowsPerPage={setRowsPerPageSubList}
                                        token={token}
                                        setToken={setToken}
                                        setSnack={setSnack}
                                    />
                                </Suspense>
                            </Grid>
                        </Grid>
                    }
                </Paper>
                {/* snack bar */}
                <Stack spacing={2} sx={{ maxWidth: 600 }}>
                    <Snackbar
                        open={showSnackbar}
                        autoHideDuration={6000}
                        onClose={() => setSnackVisibility(false)}
                        action={
                            <>
                                <IconButton
                                    size="small"
                                    aria-label="close"
                                    color="inherit"
                                    onClick={() => setSnackVisibility(false)}
                                >
                                    <CloseIcon fontSize="small" />
                                </IconButton>
                            </>
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