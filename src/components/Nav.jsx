import AppBar from "@mui/material/AppBar";
import Button from "@mui/material/Button";
import DarkModeIcon from "@mui/icons-material/DarkMode";

//import FormatListNumberedIcon from "@mui/icons-material/FormatListNumbered";
import LeakAddIcon from "@mui/icons-material/LeakAdd";
import LeakRemoveIcon from "@mui/icons-material/LeakRemove";
import LightModeIcon from "@mui/icons-material/LightMode";
import ListAltIcon from "@mui/icons-material/ListAlt";
//import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
import PropTypes from "prop-types";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";

export default function Navigation({
    themeSwitcher,
    theme,
    connectionId,
    setListUrl,
    // eslint-disable-next-line no-unused-vars
    showPlaylists,
    // eslint-disable-next-line no-unused-vars
    toggleView,
}) {
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
                    <Button onClick={() => themeSwitcher(!theme)} color="inherit">
                        {!theme ? <DarkModeIcon /> : <LightModeIcon />}
                        <Typography
                            variant="caption"
                            display={{ xs: "none", sm: "none", md: "block" }}
                        >
                            {!theme ? "Dark" : "Light"}
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
    showPlaylists: PropTypes.bool.isRequired,
    toggleView: PropTypes.func.isRequired,
};
