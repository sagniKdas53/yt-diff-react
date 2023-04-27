import PropTypes from "prop-types";
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
const bull = (
    <Box
        component="span"
        sx={{ display: 'inline-block', mx: '2px', transform: 'scale(0.8)' }}
    >
        •
    </Box>
);
// eslint-disable-next-line no-unused-vars
export default function InputForm({ setUrl,
    // eslint-disable-next-line no-unused-vars
    setRespIndex,
    // eslint-disable-next-line no-unused-vars
    disableBtns,
    // eslint-disable-next-line no-unused-vars
    progressRef,
    // eslint-disable-next-line no-unused-vars
    backend = "" }) {

    return (<Paper sx={{ height: "89.7vh", width: "100%", overflow: "hidden" }}>
        <Card variant="outlined">
            <CardContent>
                <Typography sx={{ fontSize: 14 }} color="text.secondary" gutterBottom>
                    Word of the Day
                </Typography>
                <Typography variant="h5" component="div">
                    be{bull}nev{bull}o{bull}lent
                </Typography>
                <Typography sx={{ mb: 1.5 }} color="text.secondary">
                    adjective
                </Typography>
                <Typography variant="body2">
                    well meaning and kindly.
                    <br />
                    {'"a benevolent smile"'}
                </Typography>
            </CardContent>
            <CardActions>
                <Button size="small">Learn More</Button>
            </CardActions>
        </Card>
    </Paper>)

}

InputForm.propTypes = {
    setUrl: PropTypes.func.isRequired,
    setRespIndex: PropTypes.func.isRequired,
    backend: PropTypes.string,
    disableBtns: PropTypes.bool.isRequired,
    progressRef: PropTypes.number.isRequired
};
