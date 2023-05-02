import { useEffect, useMemo, useState, useCallback } from "react";
import Box from "@mui/material/Box";
import CancelIcon from "@mui/icons-material/Cancel";
import Checkbox from "@mui/material/Checkbox";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ClearIcon from "@mui/icons-material/Clear";
import DownloadIcon from "@mui/icons-material/Download";
import Fab from "@mui/material/Fab";
import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import PropTypes from "prop-types";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import TextField from "@mui/material/TextField";

import debouce from "lodash.debounce";

export default function SubList({
    setUrl,
    url,
    respIndex,
    disableBtns,
    downloaded,
    backEnd,
    reFetch,
    tableHeight,
    rowsPerPage,
    setRowsPerPage,
    start, setStart,
    stop, setStop
}) {
    const [query, updateQuery] = useState("");
    const [sort, updateSort] = useState(false);
    // These are the controls
    // const [start, setStart] = useState(0);
    // const [stop, setStop] = useState(10);
    const [page, setPage] = useState(0);
    // const [rowsPerPage, setRowsPerPage] = useState(10);
    // actual table data
    const [items, setItems] = useState([]);
    const [totalItems, setTotalItems] = useState(0);
    const [selectedItems, updateSelected] = useState({});
    const [selectAll, setSelectAll] = useState(false);

    const memoizedFetch = useMemo(async () => {
        //console.log('Fetching Sublists');
        if (url !== "") {
            const response = await fetch(backEnd + "/ytdiff/getsub", {
                method: "post",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
                mode: "cors",
                body: JSON.stringify({
                    start: start,
                    stop: stop,
                    sortDownloaded: sort,
                    query: query,
                    url: url,
                }),
            });
            const data = await response.text();
            const json_data = JSON.parse(data);
            return json_data;
        } else {
            return { count: 0, rows: [] };
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [backEnd, start, stop, sort, url, query, reFetch]);

    // use the memoized fetch result to set the items state
    useEffect(() => {
        memoizedFetch.then((data) => {
            setItems(data["rows"]);
            setTotalItems(+data["count"]);
        });
    }, [memoizedFetch]);

    useEffect(() => {
        if (downloaded !== "") {
            const updatedItems = [...items];
            const itemIndex = updatedItems.findIndex(
                (item) => item.id === downloaded
            );
            const updatedItem = {
                ...updatedItems[itemIndex],
                downloaded: true,
            };
            updatedItems[itemIndex] = updatedItem;
            setItems(updatedItems);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [downloaded]);

    const handleChangePage = useCallback(
        (event, newPage) => {
            setPage(newPage);
            //console.log("Start: ", newPage * rowsPerPage, "Stop: ", (newPage + 1) * rowsPerPage)
            setStart(newPage * rowsPerPage);
            setStop((newPage + 1) * rowsPerPage);
        },
        [rowsPerPage, setStart, setStop]
    );

    const handleChangeRowsPerPage = (event) => {
        setStop(start + +event.target.value);
        setRowsPerPage(+event.target.value);
        setPage(0);
    };

    const handleSelection = (event) => {
        const { id, checked } = event.target;
        updateSelected((prevItems) => ({ ...prevItems, [id]: checked }));
    };

    const bulkAction = () => {
        const tempState = {};
        items.forEach((element) => {
            tempState[element.id] = !selectAll;
        });
        updateSelected((prevSelected) => ({ ...prevSelected, ...tempState }));
        setSelectAll(!selectAll);
    };

    const handleSort = () => {
        updateSort(!sort);
    };

    useEffect(() => {
        updateSelected({});
        setSelectAll(false);
        updateSort(false);
    }, [url]);

    useEffect(() => {
        setSelectAll(false);
        items.map((element) => (selectedItems[element.id] = false));
        // Remove keys not present in data
        Object.keys(selectedItems).forEach((key) => {
            if (!items.find((element) => element.id === key)) {
                delete selectedItems[key];
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items]);

    useEffect(() => {
        if (
            !(
                Object.keys(selectedItems).length === 0 &&
                selectedItems.constructor === Object
            )
        )
            setSelectAll(
                Object.values(selectedItems).every((value) => {
                    return value === true;
                })
            );
    }, [selectedItems]);

    const debouncedQuery = useMemo(
        () => debouce((event) => updateQuery(event.target.value.trim()), 1000),
        []
    );

    const clearList = () => {
        setUrl("");
        handleChangePage(null, 0);
    };

    useEffect(() => {
        //console.log(respIndex, Math.floor(respIndex / rowsPerPage))
        if (respIndex === -1) {
            handleChangePage(null, 0);
        } else {
            handleChangePage(null, Math.floor(respIndex / rowsPerPage));
        }
    }, [respIndex, handleChangePage, rowsPerPage]);

    function downloadFunc() {
        const data = Object.keys(selectedItems).filter((key) => selectedItems[key]);
        //console.log(JSON.stringify({ id: data }));
        fetch(backEnd + "/ytdiff/download", {
            method: "post",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
            mode: "cors",
            body: JSON.stringify({ id: data }),
        });
    }

    return (
        <>
            <Paper sx={{ width: "100%", overflow: "hidden", position: "relative" }}>
                <TableContainer sx={{ height: tableHeight }}>
                    <Table stickyHeader size="small" aria-label="sub-list table">
                        <TableHead>
                            <TableRow>
                                <TableCell
                                    padding="checkbox"
                                    key="check-head"
                                    align="center"
                                    style={{ minWidth: 10 }}
                                >
                                    <Checkbox
                                        color="primary"
                                        indeterminate={
                                            selectAll
                                                ? false
                                                : Object.values(selectedItems).filter((value) => value)
                                                    .length > 0
                                        }
                                        checked={selectAll}
                                        onChange={bulkAction}
                                        inputProps={{
                                            "aria-label": "select all items",
                                        }}
                                    />
                                </TableCell>
                                <TableCell
                                    key="title-head"
                                    align="center"
                                    style={{ minWidth: 10 }}
                                    sx={{ width: "75%" }}
                                >
                                    <TextField
                                        id="title-input"
                                        label="Title"
                                        variant="outlined"
                                        size="small"
                                        sx={{ width: "100%" }}
                                        onKeyUp={debouncedQuery}
                                    />
                                </TableCell>
                                <TableCell
                                    key="saved-head"
                                    align="center"
                                    style={{ minWidth: 10 }}
                                >
                                    <TableSortLabel
                                        active={sort}
                                        direction={sort ? "asc" : "desc"}
                                        onClick={handleSort}
                                        sx={{ paddingInlineStart: 2 }}
                                    >
                                        Saved
                                    </TableSortLabel>
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {items.map((element, index) => {
                                return (
                                    <TableRow hover role="checkbox" tabIndex={-1} key={index}>
                                        <TableCell
                                            padding="checkbox"
                                            key={index + "-check"}
                                            align="center"
                                            style={{ minWidth: 10 }}
                                        >
                                            <Checkbox
                                                color="primary"
                                                checked={selectedItems[element.id] || false}
                                                onChange={handleSelection}
                                                id={element.id}
                                            />
                                        </TableCell>
                                        <TableCell
                                            key={index + "-title"}
                                            align="left"
                                            sx={{ width: "75%" }}
                                        >
                                            <Link
                                                href={element.url}
                                                color={
                                                    element.available
                                                        ? "inherit"
                                                        : element.title === "[Deleted video]"
                                                            ? "error"
                                                            : element.title === "[Private video]"
                                                                ? "#f57c00"
                                                                : "inherit"
                                                }
                                                underline="hover"
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                {element.title}
                                            </Link>
                                        </TableCell>
                                        <TableCell
                                            key={index + "-status"}
                                            padding="checkbox"
                                            align="center"
                                            style={{ minWidth: 10 }}
                                        >
                                            {element.downloaded ? (
                                                <CheckCircleIcon color="success" />
                                            ) : (
                                                <CancelIcon color="error" />
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                    <Box
                        sx={{
                            zIndex: 50,
                            position: "absolute",
                            bottom: "10%",
                            right: "10%",
                        }}
                    >
                        <SubListFab
                            selectedItems={selectedItems}
                            clear={clearList}
                            download={downloadFunc}
                            disableBtns={disableBtns}
                        />
                    </Box>
                </TableContainer>
                <TablePagination
                    rowsPerPageOptions={[10, 25, 50, 100]}
                    component="div"
                    count={totalItems}
                    rowsPerPage={rowsPerPage}
                    page={!totalItems || totalItems <= 0 ? 0 : page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                />
            </Paper>
        </>
    );
}

SubList.propTypes = {
    setUrl: PropTypes.func.isRequired,
    url: PropTypes.string.isRequired,
    backEnd: PropTypes.string.isRequired,
    respIndex: PropTypes.number.isRequired,
    disableBtns: PropTypes.bool.isRequired,
    downloaded: PropTypes.string.isRequired,
    reFetch: PropTypes.string.isRequired,
    tableHeight: PropTypes.string.isRequired,
    rowsPerPage: PropTypes.number.isRequired,
    setRowsPerPage: PropTypes.func.isRequired,
    stop: PropTypes.number.isRequired,
    setStop: PropTypes.func.isRequired,
    start: PropTypes.number.isRequired,
    setStart: PropTypes.func.isRequired
};

function SubListFab({ selectedItems, clear, download, disableBtns }) {
    const isNoItemsSelected =
        Object.keys(selectedItems).length === 0 ||
        Object.values(selectedItems).every((val) => !val);

    //const color = isNoItemsSelected ? "secondary" : "primary";

    const handleClick = isNoItemsSelected ? clear : download;

    const icon = isNoItemsSelected ? <ClearIcon /> : <DownloadIcon />;

    return (
        <Fab
            color="primary"
            aria-label="action"
            onClick={handleClick}
            disabled={isNoItemsSelected ? false : disableBtns}
        >
            {icon}
        </Fab>
    );
}

SubListFab.propTypes = {
    selectedItems: PropTypes.object.isRequired,
    disableBtns: PropTypes.bool.isRequired,
    download: PropTypes.func.isRequired,
    clear: PropTypes.func.isRequired,
};
