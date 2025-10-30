import FirstPageIcon from '@mui/icons-material/FirstPage';
import KeyboardArrowLeft from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRight from '@mui/icons-material/KeyboardArrowRight';
import LastPageIcon from '@mui/icons-material/LastPage';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import { useTheme } from '@mui/material/styles';
import PropTypes from 'prop-types';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';

export default function TablePaginationActions({
    count,
    page,
    rowsPerPage,
    onPageChange,
}) {
    const theme = useTheme();

    const handleFirstPageButtonClick = (event) => {
        onPageChange(event, 0);
    };

    const handleBackButtonClick = (event) => {
        onPageChange(event, page - 1);
    };

    const handleNextButtonClick = (event) => {
        onPageChange(event, page + 1);
    };

    const handleLastPageButtonClick = (event) => {
        onPageChange(event, Math.max(0, Math.ceil(count / rowsPerPage) - 1));
    };

    return (
        <Box sx={{ flexShrink: 0, m: 0, p: 0 }}>
            <IconButton
                onClick={handleFirstPageButtonClick}
                disabled={page === 0}
                aria-label="first page"
            >
                {theme.direction === 'rtl' ? <LastPageIcon /> : <FirstPageIcon />}
            </IconButton>
            <IconButton
                onClick={handleBackButtonClick}
                disabled={page === 0}
                aria-label="previous page"
            >
                {theme.direction === 'rtl' ? <KeyboardArrowRight /> : <KeyboardArrowLeft />}
            </IconButton>
            {/* <Typography variant="body2"
                sx={{ m: 0, p: 0, display: 'inline-block' }}>
                    {page + 1} / {Math.max(1, Math.ceil(count / rowsPerPage))}
            </Typography> */}
            <Select value={page + 1} onChange={(e) => {
                const newPage = Math.max(0,
                    Math.min(Math.ceil(count / rowsPerPage) - 1,
                        e.target.value - 1));
                onPageChange(null, newPage);
            }} sx={{ m: 0, p: 0 }} autoWidth variant="standard">
                {Array.from({ length: Math.max(1, Math.ceil(count / rowsPerPage)) }, (_, i) => i + 1).map((pageNum) => (
                    <MenuItem key={pageNum} value={pageNum}>{pageNum}</MenuItem>
                ))}
            </Select>
            <IconButton
                onClick={handleNextButtonClick}
                disabled={page >= Math.ceil(count / rowsPerPage) - 1}
                aria-label="next page"
            >
                {theme.direction === 'rtl' ? <KeyboardArrowLeft /> : <KeyboardArrowRight />}
            </IconButton>
            <IconButton
                onClick={handleLastPageButtonClick}
                disabled={page >= Math.ceil(count / rowsPerPage) - 1}
                aria-label="last page"
            >
                {theme.direction === 'rtl' ? <FirstPageIcon /> : <LastPageIcon />}
            </IconButton>
        </Box >
    );
}

TablePaginationActions.propTypes = {
    count: PropTypes.number.isRequired,
    onPageChange: PropTypes.func.isRequired,
    page: PropTypes.number.isRequired,
    rowsPerPage: PropTypes.number.isRequired,
};