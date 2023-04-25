import { ThemeProvider, createTheme } from '@mui/material/styles';
import { useState, useCallback, useEffect } from 'react';
import Box from "@mui/material/Box";
import CloseIcon from '@mui/icons-material/Close';
import Grid from '@mui/material/Unstable_Grid2';
import IconButton from '@mui/material/IconButton';
import LinearProgress from "@mui/material/LinearProgress";
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';

import io from "socket.io-client";

import Navigation from './Nav';
import PlayList from './Playlist';

const backend = ["https://lenovo-ideapad-320-15ikb.tail9ece4.ts.net", "http://localhost:8888"];

const socket = io.connect(backend[0], {
    path: "/ytdiff/socket.io",
});

const theme = (mode) => createTheme({
    palette: {
        mode: mode ? 'dark' : 'light',
        primary: {
            main: '#3f51b5',
        },
        secondary: {
            main: '#f50057',
        },
    },
});


export default function App() {
    const [mode, modeSwitcher] = useState(true);
    const [listUrl, setListUrl] = useState("");
    //const [respIndex, setRespIndex] = useState(0);
    //const [showPlaylists, toggleView] = useState(false);
    const [connectionId, setConnectionId] = useState("");
    const [disableBtns, toggleDisable] = useState(false);
    const [disableProgress, toggleProgress] = useState(false);
    const [showSnackbar, setSnack] = useState(false);
    const [snackMsg, setSnackMsgTxt] = useState("");
    const [progress, setProgress] = useState(0);

    const toggleDisableCallBack = useCallback((next) => {
        toggleDisable(next);
    }, []);

    const toggleProgressCallBack = useCallback((next) => {
        toggleProgress(next);
    }, []);

    const setSnackMsg = (msg) => { setSnackMsgTxt(msg); setSnack(true); };

    useEffect(() => {
        // this one sets up sockets
        socket.on("init", function (data) {
            setConnectionId(data.id);
            setProgress(0);
            toggleProgressCallBack(false);
            toggleDisableCallBack(false);
            setSnackMsg("Connected: " + data.id);
            socket.emit("acknowledge", { data: "Connected", id: data.id });
        });
        // triggered when a download starts, as progress my not start right away
        socket.on("download-start", function () {
            // put the progress bar in an indeterminate state
            setProgress(101);
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
                setProgress(101);
                toggleProgressCallBack(true);
            } else if (!disableProgress) {
                // if the disableProgress is false then update percentage
                setProgress(data.percentage);
            }

            if (!disableBtns) {
                toggleDisableCallBack(true);
            }
        });
        // shows errors
        socket.on("error", function (data) {
            setSnackMsg(`${data.message} ❌`);
        });
        // shows when a download is done
        socket.on("download-done", function (data) {
            // enable the buttons and reset progress
            toggleDisableCallBack(false);
            setProgress(0);
            setSnackMsg(`${data.message} ✅`);
        });
        socket.on("download-failed", function (data) {
            // enable the buttons and reset progress
            toggleDisableCallBack(false);
            setProgress(0);
            toggleDisableCallBack(false);
            setProgress(0);
            setSnackMsg(`${data.message} ❌`);
        });
        // shows when listing is done
        socket.on("playlist-done", function (data) {
            // enable the buttons and reset progress
            toggleDisableCallBack(false);
            setProgress(0);
            setSnackMsg(`${data.message} ✅`);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [socket, toggleDisableCallBack, toggleProgressCallBack]);
    return (
        <ThemeProvider theme={theme(mode)}>
            <Navigation modeSwitcher={modeSwitcher} mode={mode} connectionId={connectionId} setListUrl={setListUrl} />
            <Grid container spacing={0}>
                <Grid xl={6} lg={6} md={12} sm={12} xs={12}>
                    <PlayList url={listUrl} setUrl={setListUrl} backend={backend[0]} />
                </Grid>
                <Grid xl={6} lg={6} md={12} sm={12} xs={12}>

                </Grid>
            </Grid>
            <Box sx={{ width: "100%", height: "2vh" }}>
                <LinearProgress sx={{ height: "100%", borderRadius: 5 }}
                    variant={progress === 101 ? "indeterminate" : "determinate"}
                    value={progress}
                />
            </Box>
            <Stack spacing={2} sx={{ maxWidth: 600 }}>
                <Snackbar
                    open={showSnackbar}
                    autoHideDuration={6000}
                    onClose={() => setSnack(false)}
                    message={snackMsg}
                    action={<>
                        <IconButton
                            size="small"
                            aria-label="close"
                            color="inherit"
                            onClick={() => setSnack(false)}
                        >
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </>}
                />
            </Stack>
        </ThemeProvider>
    );
}
