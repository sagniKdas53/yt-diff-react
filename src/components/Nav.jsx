import ClearAllIcon from '@mui/icons-material/ClearAll';
import DarkModeIcon from "@mui/icons-material/DarkMode";
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import LeakAddIcon from "@mui/icons-material/LeakAdd";
import LeakRemoveIcon from "@mui/icons-material/LeakRemove";
import LightModeIcon from "@mui/icons-material/LightMode";
import ListAltIcon from "@mui/icons-material/ListAlt";
import LoginIcon from "@mui/icons-material/Login";
import LogoutIcon from "@mui/icons-material/Logout";
import SyncIcon from "@mui/icons-material/Sync";
import AppBar from "@mui/material/AppBar";
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from '@mui/material/IconButton';
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import PropTypes from "prop-types";
import { useState } from 'react';

export default function Navigation({
    themeSwitcher,
    theme,
    connectionId,
    setPlayListUrl,
    token,
    setToken,
    setConnectionId,
                            notifications,
                            onDismissNotification,
                            backEnd,
                            setSnack
                        }) {
    const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

    const [reindexOpen, setReindexOpen] = useState(false);
    const [reindexStart, setReindexStart] = useState("");
    const [reindexStop, setReindexStop] = useState("");
    const [reindexSiteFilter, setReindexSiteFilter] = useState("");
    const [reindexChunkSize, setReindexChunkSize] = useState(8);

    const themeSwitcherHandler = (themeMode) => {
        localStorage.setItem("ytdiff_theme", themeMode);
        themeSwitcher(themeMode);
    };

    // const handleLogoutClick = () => {
    //     if (token) {
    //         setLogoutConfirmOpen(true);
    //     }
    // };

    const confirmLogout = () => {
        setToken(null);
        setConnectionId("");
        localStorage.setItem("ytdiff_token", "null");
        setLogoutConfirmOpen(false);
    };

    const handleBatchReindex = async () => {
        try {
            const body = {};
            if (reindexStart !== "") {
                const s = parseInt(reindexStart);
                if (s < 0) return setSnack("Start index cannot be negative", "error");
                body.start = s;
            }
            if (reindexStop !== "") {
                const e = parseInt(reindexStop);
                if (e < 0) return setSnack("Stop index cannot be negative", "error");
                body.stop = e;
            }

            if ('start' in body && 'stop' in body && body.start >= body.stop) {
                return setSnack("Stop index must be greater than Start index", "error");
            }
            if (reindexSiteFilter) body.siteFilter = reindexSiteFilter;
            body.chunkSize = reindexChunkSize;

            setReindexOpen(false);

            const response = await fetch(backEnd + "/reindexall", {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });

            const data = await response.json();
            if (response.ok) {
                setSnack(data.message || "Batch re-index started", "success");
            } else {
                setSnack(data.message || "Failed to start re-index", "error");
            }
        } catch (error) {
            setSnack("Network error: " + error.message, "error");
        }
    };

    return (
        <>
            <AppBar position="static">
                <Toolbar variant="dense">
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        yt-diff
                    </Typography>
                    <Button color="inherit" onClick={() => setReindexOpen(true)}>
                        <SyncIcon />
                        <Typography
                            variant="button"
                            display={{ xs: "none", sm: "none", md: "block" }}
                        >
                            Re-Index
                        </Typography>
                    </Button>
                    <Button color="inherit" onClick={() => setPlayListUrl("None")}>
                        <ListAltIcon />
                        <Typography
                            variant="button"
                            display={{ xs: "none", sm: "none", md: "block" }}
                        >
                            Unlisted
                        </Typography>
                    </Button>
                    <Button onClick={() => themeSwitcherHandler(!theme)} color="inherit">
                        {theme ? <DarkModeIcon /> : <LightModeIcon />}
                        <Typography
                            variant="button"
                            display={{ xs: "none", sm: "none", md: "block" }}
                        >
                            {theme ? "Dark" : "Light"}
                        </Typography>
                    </Button>
                    <NotificationDrawer
                        connectionId={connectionId}
                        badgeColor={theme ? "success" : "secondary"}
                        notifications={notifications}
                        onDismissNotification={onDismissNotification}
                    />
                    <Button
                        onClick={() => {
                            if (token) {
                                setLogoutConfirmOpen(true);
                            } else {
                                // If it's "Login", we just ensure state is clear or do nothing as App.jsx handles the view
                                setToken(null);
                            }
                        }}
                        color="inherit"
                    >
                        {token ? <LogoutIcon /> : <LoginIcon />}
                        <Typography
                            variant="button"
                            display={{ xs: "none", sm: "none", md: "block" }}
                        >
                            {token ? "Logout" : "Login"}
                        </Typography>
                    </Button>
                </Toolbar>
            </AppBar>

            <Dialog
                open={logoutConfirmOpen}
                onClose={() => setLogoutConfirmOpen(false)}
                aria-labelledby="confirm-logout-title"
            >
                <DialogTitle id="confirm-logout-title">Confirm Logout</DialogTitle>
                <DialogContent>
                    <Typography variant="body2">
                        Are you sure you want to logout?
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setLogoutConfirmOpen(false)} color="primary">
                        Cancel
                    </Button>
                    <Button onClick={confirmLogout} color="error" variant="contained">
                        Logout
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={reindexOpen} onClose={() => setReindexOpen(false)}>
                <DialogTitle>Batch Re-index Playlists</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField
                                label="Start (Exclusive)"
                                type="number"
                                size="small"
                                placeholder="0"
                                value={reindexStart}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === "" || parseInt(val) >= 0) setReindexStart(val);
                                }}
                                inputProps={{ min: 0 }}
                                helperText="Last ID before the batch"
                            />
                            <TextField
                                label="Stop (Inclusive)"
                                type="number"
                                size="small"
                                placeholder="10"
                                value={reindexStop}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === "" || parseInt(val) >= 0) setReindexStop(val);
                                }}
                                inputProps={{ min: 0 }}
                                helperText="Last ID in the batch"
                            />
                        </Box>
                        <TextField
                            label="Site Filter (Optional)"
                            type="text"
                            size="small"
                            placeholder="e.g. youtube.com"
                            value={reindexSiteFilter}
                            onChange={(e) => setReindexSiteFilter(e.target.value)}
                        />
                        <FormControl size="small">
                            <InputLabel id="reindex-chunk-size-label">Chunk Size</InputLabel>
                            <Select
                                labelId="reindex-chunk-size-label"
                                value={reindexChunkSize}
                                label="Chunk Size"
                                onChange={(e) => setReindexChunkSize(e.target.value)}
                            >
                                <MenuItem value={1}>1</MenuItem>
                                <MenuItem value={8}>8</MenuItem>
                                <MenuItem value={16}>16</MenuItem>
                                <MenuItem value={32}>32</MenuItem>
                                <MenuItem value={64}>64</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setReindexOpen(false)}>Cancel</Button>
                    <Button onClick={handleBatchReindex} variant="contained" color="primary">
                        Submit
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
Navigation.propTypes = {
    themeSwitcher: PropTypes.func.isRequired,
    theme: PropTypes.bool.isRequired,
    connectionId: PropTypes.string.isRequired,
    setPlayListUrl: PropTypes.func.isRequired,
    token: PropTypes.string,
    setToken: PropTypes.func.isRequired,
    setConnectionId: PropTypes.func.isRequired,
    notifications: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.string.isRequired,
            message: PropTypes.string.isRequired
        })
    ).isRequired,
    onDismissNotification: PropTypes.func.isRequired,
    backEnd: PropTypes.string,
    setSnack: PropTypes.func
};

function NotificationDrawer({
    connectionId,
    badgeColor,
    notifications,
    onDismissNotification
}) {
    const [open, setOpen] = useState(false);

    return (
        <>
            <Button onClick={() => setOpen(true)} color="inherit">
                <Badge color={badgeColor} badgeContent={notifications.length}
                    variant="dot" anchorOrigin={{
                        vertical: 'top',
                        horizontal: 'right',
                    }}>
                    {connectionId ? <LeakAddIcon /> : <LeakRemoveIcon />}
                </Badge>
                <Typography
                    variant="button"
                    display={{ xs: "none", sm: "none", md: "block" }}
                >
                    {connectionId ? "Connected" : "Disconnected"}
                </Typography>
            </Button>
            <Drawer anchor="right" open={open} onClose={() => setOpen(false)}>
                <div style={{ width: 300, padding: 16 }}>
                    <Typography variant="h6" gutterBottom>
                        <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ m: 0, p: 0 }}>
                            <Box component="span">Notifications</Box>
                            <IconButton
                                aria-label="clear all"
                                onClick={() => notifications.forEach(note => onDismissNotification(note.id))}
                                sx={{ p: 0 }}
                                size="large"
                            >
                                <ClearAllIcon fontSize="large" />
                            </IconButton>
                        </Box>
                    </Typography>
                    <Divider />
                    <List>
                        {notifications.map((note) => (
                            <ListItem
                                key={note.id}
                                divider
                                secondaryAction={
                                    <Button
                                        onClick={() => onDismissNotification(note.id)}
                                        size="small"
                                        sx={{ minWidth: 0 }}
                                    >
                                        <HighlightOffIcon />
                                    </Button>
                                }
                            >
                                <ListItemText primary={note.message} />
                            </ListItem>
                        ))}
                    </List>
                </div>
            </Drawer>
        </>
    );
}

NotificationDrawer.propTypes = {
    badgeColor: PropTypes.string.isRequired,
    connectionId: PropTypes.string.isRequired,
    notifications: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.string.isRequired,
            message: PropTypes.string.isRequired
        })
    ).isRequired,
    onDismissNotification: PropTypes.func.isRequired
};