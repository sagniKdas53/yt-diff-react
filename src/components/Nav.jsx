import AppBar from "@mui/material/AppBar";
import Button from "@mui/material/Button";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LeakAddIcon from "@mui/icons-material/LeakAdd";
import LeakRemoveIcon from "@mui/icons-material/LeakRemove";
import LightModeIcon from "@mui/icons-material/LightMode";
import ListAltIcon from "@mui/icons-material/ListAlt";
import LogoutIcon from "@mui/icons-material/Logout";
import PropTypes from "prop-types";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import LoginIcon from "@mui/icons-material/Login";
import Badge from '@mui/material/Badge';
import Drawer from "@mui/material/Drawer";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import ClearAllIcon from '@mui/icons-material/ClearAll';
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
    onDismissNotification
}) {
    const themeSwitcherHandler = (themeMode) => {
        localStorage.setItem("ytdiff_theme", themeMode);
        themeSwitcher(themeMode);
    };
    const logoutHandler = () => {
        setToken(null);
        setConnectionId("");
        localStorage.setItem("ytdiff_token", "null");
    }
    return (
        <>
            <AppBar position="static">
                <Toolbar variant="dense">
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        yt-diff
                    </Typography>
                    <Button color="inherit" onClick={() => setPlayListUrl("None")}>
                        <ListAltIcon />
                        <Typography
                            variant="caption"
                            display={{ xs: "none", sm: "none", md: "block" }}
                        >
                            Unlisted
                        </Typography>
                    </Button>
                    <Button onClick={() => themeSwitcherHandler(!theme)} color="inherit">
                        {theme ? <DarkModeIcon /> : <LightModeIcon />}
                        <Typography
                            variant="caption"
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
                    <Button onClick={() => logoutHandler()} color="inherit">
                        {token ? <LogoutIcon /> : <LoginIcon />}
                        <Typography
                            variant="caption"
                            display={{ xs: "none", sm: "none", md: "block" }}
                        >
                            {token ? "Logout" : "Login"}
                        </Typography>
                    </Button>
                </Toolbar>
            </AppBar>
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
    onDismissNotification: PropTypes.func.isRequired
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
                    variant="caption"
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