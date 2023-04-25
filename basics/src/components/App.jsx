import Grid from '@mui/material/Unstable_Grid2';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import Box from "@mui/material/Box";
import LinearProgress from "@mui/material/LinearProgress";
import { useState } from 'react';

import Navigation from './Nav';
import PlayList from './Playlist';

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
    // const [respIndex, setRespIndex] = useState(0);

    // const [sock, retry] = useState("");
    // const [disableBtns, toggleDisable] = useState(false);
    // const [disregardSocket, toggelDisregard] = useState(false);
    // const [showPlaylists, toggleView] = useState(false);
    // const [progress, setProgress] = useState(0);
    const progress = 0;
    return (
        <ThemeProvider theme={theme(mode)}>
            <Navigation modeSwitcher={modeSwitcher} mode={mode} />
            <Grid container spacing={0}>
                <Grid xl={6} lg={6} md={12} sm={12} xs={12}>
                    <PlayList url={listUrl} setUrl={setListUrl} />
                </Grid>
                <Grid xl={6} lg={6} md={12} sm={12} xs={12}>

                </Grid>
            </Grid>
            <Box sx={{ width: "100%", height: "2vh" }}>
                <LinearProgress sx={{height: "100%",borderRadius: 5}}
                    variant={progress === 101 ? "indeterminate" : "determinate"}
                    value={progress}
                />
            </Box>
        </ThemeProvider>
    );
}
