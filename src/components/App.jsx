import { ThemeProvider, createTheme } from "@mui/material/styles";
import { useState, useCallback, useEffect, forwardRef, useRef, lazy, Suspense } from "react";
import Box from "@mui/material/Box";
import CircularProgress from '@mui/material/CircularProgress';
import CloseIcon from "@mui/icons-material/Close";
import Grid from "@mui/material/Unstable_Grid2";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import MuiAlert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";

import io from "socket.io-client";

// import Navigation from "./Nav";
// import PlayList from "./PlayList";
// import SubList from "./SubList";

const Navigation = lazy(() => import("./Nav.jsx"));
const PlayList = lazy(() => import("./PlayList.jsx"));
const SubList = lazy(() => import("./SubList.jsx"));

/* 
These 4 are the urls that are supposed to work, they are necessary for development
"https://lenovo-ideapad-320-15ikb.tail9ece4.ts.net",
"http://localhost:8888",
"http://192.168.0.106:8888",
"http://192.168.0.103:8888",

but in production they can be replaced with "" which will make the fetches work automatically
*/
const backEnd = import.meta.env.PROD ? "" : "http://localhost:8888";

const socket = io.connect(backEnd, {
    path: "/ytdiff/socket.io",
});

const themeObj = (theme) =>
    createTheme({
        palette: {
            mode: theme ? "dark" : "light",
            primary: {
                main: "#3f51b5",
            },
            secondary: {
                main: theme ? "#f50057" : "#03a9f4",
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
    const [theme, themeSwitcher] = useState(true);
    const [listUrl, setListUrl] = useState("");
    const [respIndex, setRespIndex] = useState(0);
    const [showPlaylists, toggleView] = useState(true);
    const [connectionId, setConnectionId] = useState("");
    const [disableButtons, toggleDisable] = useState(false);
    const [disableProgress, toggleProgress] = useState(false);
    const [showSnackbar, setSnackVisibility] = useState(false);
    const [snackMsg, setSnackMsgTxt] = useState("");
    const [snackSeverity, setSnackSeverity] = useState("success");
    const [indeterminate, setIndeterminate] = useState(false);
    const [reFetch, setReFetch] = useState("");
    const [rowsPerPageSubList, setRowsPerPageSubList] = useState(10);
    const progressRef = useRef(0);
    const downloadedID = useRef("");

    // 53px table top, 52 px table pagination, 48 px app bar
    // Table top is included in the table height so no need to subtract it
    const progressHeight = 5;
    const adjust = 52 + 48 + progressHeight;
    const [tableHeight, setTableHeight] = useState(window.innerHeight - adjust);
    useEffect(() => {
        function handleResize() {
            setTableHeight(window.innerHeight - adjust)
        }

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const toggleDisableCallBack = useCallback((next) => {
        toggleDisable(next);
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
            toggleDisableCallBack(false);
            setSnack("Connected: " + data.id, "success");
            socket.emit("acknowledge", { data: "Connected", id: data.id });
        });
        // triggered when a download starts, as progress my not start right away
        socket.on("download-start", function () {
            // put the progress bar in an indeterminate state
            setIndeterminate(true);
            progressRef.current = 101;
            // if socket is set to be disregarded then set it back to listen
            toggleProgressCallBack(false);
            // if buttons are not disabled then disable them
            toggleDisableCallBack(true);
        });
        // gives incremental progress updates at 10% intervals also
        // used to keep the state updated of background activity
        socket.on("listing-or-downloading", function (data) {
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

            if (!disableButtons) {
                toggleDisableCallBack(true);
            }
        });
        // shows errors
        socket.on("error", function (data) {
            setSnack(`${data.message}`, "error");
        });
        // shows when a download is done
        socket.on("download-done", function (data) {
            // enable the buttons and reset progress
            toggleDisableCallBack(false);
            setIndeterminate(false);
            progressRef.current = 0;
            downloadedID.current = data.id;
            //console.log(downloadedID.current);
            setSnack(`${data.message}`, "success");
        });
        socket.on("download-failed", function (data) {
            // enable the buttons and reset progress
            toggleDisableCallBack(false);
            setIndeterminate(false);
            progressRef.current = 0;
            setSnack(`${data.message}`, "error");
        });
        // shows when listing is done
        socket.on("playlist-done", function (data) {
            // enable the buttons and reset progress
            //console.log(data);
            toggleDisableCallBack(false);
            setIndeterminate(false);
            progressRef.current = 0;
            setSnack(`${data.message}`, "success");
            // use this to update the playlists, which will inturn update the sublist if it's selected
            //reFetch.current = !reFetch.current;
            setReFetch(data.id);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [socket, toggleDisableCallBack, toggleProgressCallBack]);

    return (
        <ThemeProvider theme={themeObj(theme)}>
            <Box sx={{ margin: "0px", padding: "0px", bgcolor: 'background.default', height: "100vh", position: "relative" }}>
                {/* <Box sx={{ position: "absolute", m: 1, left: 0, top: 0, bgcolor: "white", color: "black", font: "menu", zIndex: 200 }}>
                    table: {tableHeight + "px"}
                    <br />
                    env: {JSON.stringify(import.meta.env)}
                </Box> */}
                <Suspense fallback={<Grid container justifyContent="center" key="NavSusGrid">
                    <CircularProgress color="secondary" key="NavSus" /></Grid>}>
                    <Box sx={{ position: "sticky", top: 0, left: 0, zIndex: 100 }}>
                        <Navigation
                            themeSwitcher={themeSwitcher}
                            theme={theme}
                            connectionId={connectionId}
                            setListUrl={setListUrl}
                            showPlaylists={showPlaylists}
                            toggleView={toggleView}
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
                <Grid container spacing={0} key="MainGrid">
                    <Grid xl={6} lg={6} md={12} sm={12} xs={12} key="PlayGrid" sx={{ height: tableHeight + 52 + "px" }}>
                        <Suspense fallback={<Grid container justifyContent="center" key="PlaySusGrid">
                            <CircularProgress color="secondary" key="PlaySus" /></Grid>}>
                            <PlayList
                                url={listUrl}
                                setUrl={setListUrl}
                                backEnd={backEnd}
                                setRespIndex={setRespIndex}
                                disableButtons={disableButtons}
                                setIndeterminate={setIndeterminate}
                                setSnack={setSnack}
                                reFetch={reFetch}
                                tableHeight={tableHeight + "px"}
                                rowsPerPageSubList={rowsPerPageSubList}
                            />
                        </Suspense>
                    </Grid>
                    <Grid xl={6} lg={6} md={12} sm={12} xs={12} key="SubGrid" sx={{ height: tableHeight + 52 + "px" }}>
                        <Suspense fallback={<Grid container justifyContent="center" key="SubSusGrid">
                            <CircularProgress color="secondary" key="SubSus" /></Grid>}>
                            <SubList
                                url={listUrl}
                                setUrl={setListUrl}
                                backEnd={backEnd}
                                respIndex={respIndex}
                                disableButtons={disableButtons}
                                downloadedID={downloadedID.current}
                                reFetch={reFetch}
                                tableHeight={tableHeight + "px"}
                                rowsPerPage={rowsPerPageSubList}
                                setRowsPerPage={setRowsPerPageSubList}
                            />
                        </Suspense>
                    </Grid>
                </Grid>
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