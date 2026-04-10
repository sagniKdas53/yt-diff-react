import { ClearAll as ClearAllIcon } from "@mui/icons-material";
import { DarkMode as DarkModeIcon } from "@mui/icons-material";
import { HighlightOff as HighlightOffIcon } from "@mui/icons-material";
import { LeakAdd as LeakAddIcon } from "@mui/icons-material";
import { LeakRemove as LeakRemoveIcon } from "@mui/icons-material";
import { LightMode as LightModeIcon } from "@mui/icons-material";
import { ListAlt as ListAltIcon } from "@mui/icons-material";
import { Login as LoginIcon } from "@mui/icons-material";
import { Logout as LogoutIcon } from "@mui/icons-material";
import { Sync as SyncIcon } from "@mui/icons-material";
import { Error as ErrorIcon } from "@mui/icons-material";
import { Info as InfoIcon } from "@mui/icons-material";
import { CheckCircle as SuccessIcon } from "@mui/icons-material";
import { Warning as WarningIcon } from "@mui/icons-material";
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
import ListItemIcon from "@mui/material/ListItemIcon";
import Toolbar from "@mui/material/Toolbar";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
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
    setSnack,
    addNotification
}) {
    const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

    const [reindexOpen, setReindexOpen] = useState(false);
    const [reindexStart, setReindexStart] = useState(0);
    const [reindexStop, setReindexStop] = useState(10);
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
                addNotification(data.message || "Batch re-index started", "success");
            } else {
                setSnack(data.message || "Failed to start re-index", "error");
                addNotification(data.message || "Failed to start re-index", "error");
            }
        } catch (error) {
            setSnack("Network error: " + error.message, "error");
            addNotification("Network error: " + error.message, "error");
        }
    };

    return (
        <>
            <AppBar position="static">
                <Toolbar variant="dense">
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1, whiteSpace: "nowrap" }}>
                        yt-diff
                    </Typography>
                    {token && (
                        <>
                            <Button color="inherit" onClick={() => setReindexOpen(true)} sx={{ minWidth: "auto", p: { xs: 0.5, sm: 1 } }}>
                                <SyncIcon />
                                <Typography
                                    variant="button"
                                    display={{ xs: "none", sm: "none", md: "block" }}
                                >
                                    Re-Index
                                </Typography>
                            </Button>
                            <Button color="inherit" onClick={() => setPlayListUrl("None")} sx={{ minWidth: "auto", p: { xs: 0.5, sm: 1 } }}>
                                <ListAltIcon />
                                <Typography
                                    variant="button"
                                    display={{ xs: "none", sm: "none", md: "block" }}
                                >
                                    Unlisted
                                </Typography>
                            </Button>
                        </>
                    )}
                    <Button onClick={() => themeSwitcherHandler(!theme)} color="inherit" sx={{ minWidth: "auto", p: { xs: 0.5, sm: 1 } }}>
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
                        sx={{ minWidth: "auto", p: { xs: 0.5, sm: 1 } }}
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
                <DialogContent sx={{ m: 0, paddingBlockEnd: 0 }}>
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
                    <Button onClick={() => setReindexOpen(false)} variant="contained" color="primary">Cancel</Button>
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
            message: PropTypes.string.isRequired,
            type: PropTypes.string
        })
    ).isRequired,
    onDismissNotification: PropTypes.func.isRequired,
    backEnd: PropTypes.string,
    setSnack: PropTypes.func,
    addNotification: PropTypes.func
};

function NotificationDrawer({
    connectionId,
    badgeColor,
    notifications,
    onDismissNotification
}) {
    const [open, setOpen] = useState(false);
    const [filter, setFilter] = useState("all");

    const handleFilterChange = (event, newFilter) => {
        if (newFilter !== null) {
            setFilter(newFilter);
        }
    };

    const filteredNotifications = notifications.filter((note) => {
        if (filter === "all") return true;
        return note.type === filter;
    });

    const getIcon = (type) => {
        switch (type) {
            case "error":
                return <ErrorIcon color="error" />;
            case "success":
                return <SuccessIcon color="success" />;
            case "warning":
                return <WarningIcon color="warning" />;
            case "info":
            default:
                return <InfoIcon color="info" />;
        }
    };

    return (
        <>
            <Button onClick={() => setOpen(true)} color="inherit" sx={{ minWidth: "auto", p: { xs: 0.5, sm: 1 } }}>
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
                <Box sx={{ width: 320, display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <Box sx={{ p: 2, position: 'sticky', top: 0, bgcolor: 'background.paper', zIndex: 1, borderBottom: 1, borderColor: 'divider' }}>
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
                        <ToggleButtonGroup
                            value={filter}
                            exclusive
                            onChange={handleFilterChange}
                            aria-label="notification filter"
                            size="small"
                            fullWidth
                            sx={{ mt: 1 }}
                        >
                            <ToggleButton value="all" aria-label="all">All</ToggleButton>
                            <ToggleButton value="info" aria-label="info">Info</ToggleButton>
                            <ToggleButton value="success" aria-label="success">Success</ToggleButton>
                            <ToggleButton value="error" aria-label="error">Error</ToggleButton>
                        </ToggleButtonGroup>
                    </Box>
                    <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
                        <List sx={{ p: 0 }}>
                            {filteredNotifications.length === 0 ? (
                                <ListItem>
                                    <ListItemText
                                        primary={filter === "all" ? "No notifications" : `No ${filter} notifications`}
                                        secondary="All clear!"
                                        sx={{ textAlign: 'center', mt: 4, opacity: 0.6 }}
                                    />
                                </ListItem>
                            ) : (
                                filteredNotifications.map((note) => (
                                    <ListItem
                                        key={note.id}
                                        divider
                                        secondaryAction={
                                            <IconButton
                                                onClick={() => onDismissNotification(note.id)}
                                                size="small"
                                                edge="end"
                                                aria-label="delete"
                                            >
                                                <HighlightOffIcon />
                                            </IconButton>
                                        }
                                    >
                                        <ListItemIcon sx={{ minWidth: 40 }}>
                                            {getIcon(note.type)}
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={note.message}
                                            primaryTypographyProps={{
                                                variant: 'body2',
                                                sx: { wordBreak: 'break-word' }
                                            }}
                                        />
                                    </ListItem>
                                ))
                            )}
                        </List>
                    </Box>
                </Box>
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
            message: PropTypes.string.isRequired,
            type: PropTypes.string
        })
    ).isRequired,
    onDismissNotification: PropTypes.func.isRequired
};