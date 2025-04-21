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
import { useState } from 'react';

export default function Navigation({
    themeSwitcher,
    theme,
    connectionId,
    setListUrl,
    token,
    setToken,
    setConnectionId
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
                    <Button color="inherit" onClick={() => setListUrl("None")}>
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
    setListUrl: PropTypes.func.isRequired,
    token: PropTypes.string,
    setToken: PropTypes.func.isRequired,
    setConnectionId: PropTypes.func.isRequired
};

function NotificationDrawer({
    connectionId,
    badgeColor
}) {
    const [open, setOpen] = useState(false);

    const notifications = [
        { id: 1, message: 'New message from Alice' },
        { id: 2, message: 'Server restarted at 3:21 PM' },
        { id: 3, message: 'Backup completed successfully' },
    ];

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
                        Notifications
                    </Typography>
                    <Divider />
                    <List>
                        {notifications.map((note) => (
                            <ListItem key={note.id} divider>
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
    connectionId: PropTypes.string.isRequired
};