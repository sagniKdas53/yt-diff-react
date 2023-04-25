import AppBar from '@mui/material/AppBar';
import Typography from '@mui/material/Typography';
import Toolbar from '@mui/material/Toolbar';
import Button from '@mui/material/Button';
import PropTypes from 'prop-types';

export default function Navigation({ modeSwitcher, mode }) {
    return (<>
        <AppBar position="static">
            <Toolbar variant="dense">
                <Typography variant="h6" component="div" sx={{ flexGrow: 1 }} >yt-diff</Typography>
                <Button onClick={()=>modeSwitcher(!mode)} color='inherit'> {!mode ? 'dark' : 'light'}</Button>
                <Button color="inherit">Connect</Button>
                <Button color="inherit">Lists</Button>
                <Button color="inherit">Videos</Button>
            </Toolbar>
        </AppBar>
    </>)
}
Navigation.propTypes = {
    modeSwitcher: PropTypes.func.isRequired, 
    mode: PropTypes.bool.isRequired
};