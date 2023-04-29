import { ThemeProvider, createTheme } from "@mui/material/styles";
import { useState, useCallback, useEffect, forwardRef, useRef, lazy, Suspense } from "react";
import Box from "@mui/material/Box";
import CloseIcon from "@mui/icons-material/Close";
import Grid from "@mui/material/Unstable_Grid2";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import MuiAlert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import CircularProgress from '@mui/material/CircularProgress';
import io from "socket.io-client";

// import Navigation from "./Nav";
// import PlayList from "./PlayList";
// import SubList from "./SubList";

const Navigation = lazy(() => import("./Nav.jsx"));
const PlayList = lazy(() => import("./PlayList.jsx"));
const SubList = lazy(() => import("./SubList.jsx"));

const backend = [
    "https://lenovo-ideapad-320-15ikb.tail9ece4.ts.net",
    "http://localhost:8888",
    "http://192.168.0.106:8888",
    "http://192.168.0.103:8888",
][0];

const socket = io.connect(backend, {
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
                main: "#f50057",
            },
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
    const [disableBtns, toggleDisable] = useState(false);
    const [disableProgress, toggleProgress] = useState(false);
    const [showSnackbar, setSnackVisibility] = useState(false);
    const [snackMsg, setSnackMsgTxt] = useState("");
    const [snackSeverity, setSnackSeverity] = useState("success");
    const [indeterminate, setIndeterminate] = useState(false);
    const [reFetch, setReFetch] = useState("");
    const progressRef = useRef(0);
    const downloaded = useRef("");
    // const reFetch = useRef(false);
    const [height, setHeight] = useState(window.innerHeight);
    const [tableHeight,setTableHeight] = useState(height-162);
    const [width, setWidth] = useState(window.innerWidth);
    //const { height, width } = { height: window.innerHeight, width: window.innerWidth };


    useEffect(() => {
        function handleResize() {
            setHeight(window.innerHeight);
            setWidth(window.innerWidth);
            setTableHeight(window.innerHeight-162)
        }

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
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

            if (!disableBtns) {
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
            downloaded.current = data.id;
            //console.log(downloaded.current);
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
            <Box sx={{ margin: "0px", padding: "0px", bgcolor: 'background.default' }}>
                <Box sx={{position:"absolute", left:0,top:0, color: "white", font: "menu"}}>
                    width: {width} ~ height: {height} ~ tableHeight: {tableHeight}
                </Box>
                <Suspense fallback={<Grid container justifyContent="center" key="NavSusGrid">
                    <CircularProgress color="secondary" key="NavSus" /></Grid>}>
                    <Navigation
                        themeSwitcher={themeSwitcher}
                        theme={theme}
                        connectionId={connectionId}
                        setListUrl={setListUrl}
                        showPlaylists={showPlaylists}
                        toggleView={toggleView}
                    />
                </Suspense>
                <Grid container spacing={0} key="MainGrid">
                    <Grid xl={6} lg={6} md={12} sm={12} xs={12} key="PlayGrid">
                        <Suspense fallback={<Grid container justifyContent="center" key="PlaySusGrid">
                            <CircularProgress color="secondary" key="PlaySus" /></Grid>}>
                            <PlayList
                                url={listUrl}
                                setUrl={setListUrl}
                                backend={backend}
                                setRespIndex={setRespIndex}
                                disableBtns={disableBtns}
                                setIndeterminate={setIndeterminate}
                                setSnack={setSnack}
                                reFetch={reFetch}
                                tableHeight={tableHeight}
                            />
                        </Suspense>
                    </Grid>
                    <Grid xl={6} lg={6} md={12} sm={12} xs={12} key="SubGrid">
                        <Suspense fallback={<Grid container justifyContent="center" key="SubSusGrid">
                            <CircularProgress color="secondary" key="SubSus" /></Grid>}>
                            <SubList
                                url={listUrl}
                                setUrl={setListUrl}
                                backend={backend}
                                respIndex={respIndex}
                                disableBtns={disableBtns}
                                downloaded={downloaded.current}
                                reFetch={reFetch}
                                tableHeight={tableHeight}
                            />
                        </Suspense>
                    </Grid>
                </Grid>
                <Box sx={{ width: "100%", height: "1vh" }}>
                    <LinearProgress
                        sx={{ height: "100%", borderRadius: 5 }}
                        variant={
                            indeterminate ? "indeterminate" : "determinate"
                        }
                        value={progressRef.current}
                    />
                </Box>
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