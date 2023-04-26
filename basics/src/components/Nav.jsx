import AppBar from '@mui/material/AppBar';
import Button from '@mui/material/Button';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LeakAddIcon from '@mui/icons-material/LeakAdd';
import LeakRemoveIcon from '@mui/icons-material/LeakRemove';
import LightModeIcon from '@mui/icons-material/LightMode';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import ListAltIcon from '@mui/icons-material/ListAlt';
import PropTypes from 'prop-types';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';

export default function Navigation({ themeSwitcher, theme, connectionId, setListUrl, showPlaylists, toggleView }) {
    return (<>
        <AppBar position="static">
            <Toolbar variant="dense">
                <Typography variant="h6" component="div" sx={{ flexGrow: 1 }} >yt-diff</Typography>
                <Button color="inherit" onClick={() => toggleView(!showPlaylists)}>{showPlaylists ? <PlaylistAddIcon /> : <FormatListNumberedIcon />}</Button>
                <Button color="inherit" onClick={() => setListUrl("None")}><ListAltIcon /></Button>
                <Button onClick={() => themeSwitcher(!theme)} color='inherit'> {!theme ? <DarkModeIcon /> : <LightModeIcon />}</Button>
                <Button color="inherit">{connectionId ? <LeakAddIcon /> : <LeakRemoveIcon />}</Button>
            </Toolbar>
        </AppBar>
    </>)
}
Navigation.propTypes = {
    themeSwitcher: PropTypes.func.isRequired,
    theme: PropTypes.bool.isRequired,
    connectionId: PropTypes.string.isRequired,
    setListUrl: PropTypes.func.isRequired,
    showPlaylists: PropTypes.bool.isRequired,
    toggleView: PropTypes.func.isRequired,
};