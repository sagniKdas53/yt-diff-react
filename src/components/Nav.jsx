import AppBar from "@mui/material/AppBar";
import Button from "@mui/material/Button";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LeakAddIcon from "@mui/icons-material/LeakAdd";
import LeakRemoveIcon from "@mui/icons-material/LeakRemove";
import LightModeIcon from "@mui/icons-material/LightMode";
import ListAltIcon from "@mui/icons-material/ListAlt";
import LogoutIcon from '@mui/icons-material/Logout';
import PropTypes from "prop-types";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import LoginIcon from '@mui/icons-material/Login';

export default function Navigation({
    themeSwitcher,
    theme,
    connectionId,
    setListUrl,
    token,
    setToken
}) {
    const themeSwitcherHandler = (themeMode) => {
        localStorage.setItem("ytdiff_theme", themeMode);
        themeSwitcher(themeMode);
    };
    const logoutHandler = () => {
        setToken(null);
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
                    <Button color="inherit">
                        {connectionId ? <LeakAddIcon /> : <LeakRemoveIcon />}
                        <Typography
                            variant="caption"
                            display={{ xs: "none", sm: "none", md: "block" }}
                        >
                            {connectionId ? "Connected" : "Disconnected"}
                        </Typography>
                    </Button>
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
    setToken: PropTypes.func.isRequired
};
