import AppBar from '@mui/material/AppBar';
import Button from '@mui/material/Button';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LeakAddIcon from '@mui/icons-material/LeakAdd';
import LeakRemoveIcon from '@mui/icons-material/LeakRemove';
import LightModeIcon from '@mui/icons-material/LightMode';
import ListIcon from '@mui/icons-material/List';
import PlaylistAddCircleIcon from '@mui/icons-material/PlaylistAddCircle';
import PropTypes from 'prop-types';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';

export default function Navigation({ themeSwitcher, theme, connectionId, setListUrl }) {
    return (<>
        <AppBar position="static">
            <Toolbar variant="dense">
                <Typography variant="h6" component="div" sx={{ flexGrow: 1 }} >yt-diff</Typography>
                <Button color="inherit"><ListIcon />Lists<PlaylistAddCircleIcon /></Button>
                <Button color="inherit" onClick={() => setListUrl("None")}>Videos</Button>
                <Button onClick={() => themeSwitcher(!theme)} color='inherit'> {!theme ? <DarkModeIcon /> : <LightModeIcon />}</Button>
                <Button color="inherit" disabled>{connectionId ? <LeakAddIcon /> : <LeakRemoveIcon />}</Button>
            </Toolbar>
        </AppBar>
    </>)
}
Navigation.propTypes = {
    themeSwitcher: PropTypes.func.isRequired,
    theme: PropTypes.bool.isRequired,
    connectionId: PropTypes.string.isRequired,
    setListUrl: PropTypes.func.isRequired
};