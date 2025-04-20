import { useEffect, useMemo, useState, useCallback } from "react";
import Box from "@mui/material/Box";
import CancelIcon from "@mui/icons-material/Cancel";
import Checkbox from "@mui/material/Checkbox";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ClearIcon from "@mui/icons-material/Clear";
import DownloadIcon from "@mui/icons-material/Download";
import Fab from "@mui/material/Fab";
import Link from "@mui/material/Link";
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
import TablePaginationActions from "./Pagination.jsx";

import debounce from "lodash.debounce";

export default function SubList({
    setUrl,
    url,
    respIndex,
    downloadedItem,
    backEnd,
    reFetch,
    tableHeight,
    rowsPerPage,
    setRowsPerPage,
    token,
    setToken,
    setSnack
}) {
    const [query, updateQuery] = useState("");
    const [sort, updateSort] = useState(false);
    // These are the controls
    const [start, setStart] = useState(0);
    const [stop, setStop] = useState(10);
    const [page, setPage] = useState(0);
    // const [rowsPerPage, setRowsPerPage] = useState(10);
    // actual table data
    const [items, setItems] = useState([]);
    const [itemCount, setItemCount] = useState(0);
    const [selectedItems, updateSelected] = useState({});
    const [selectAll, setSelectAll] = useState(false);
    const [lastUrl, setLastUrl] = useState("");

    // const functions and normal functions
    const handleChangePage = useCallback(
        (event, newPage) => {
            if (newPage >= 0) {
                //console.log("Page: ", newPage, "Start: ", newPage * rowsPerPage, "Stop: ", (newPage + 1) * rowsPerPage)
                setPage(newPage);
                setStart(newPage * rowsPerPage);
                setStop((newPage + 1) * rowsPerPage);
            }
        },
        [rowsPerPage, setPage, setStart, setStop]
    );

    const handleChangeRowsPerPage = (event) => {
        //console.log("handleChangeRowsPerPage: Page: ", page, "Start: ", start, "Stop: ", start + event.target.value, "Rows: ", event.target.value);
        // I plan to persist he relative page when rows change but not now
        setPage(0);
        setStart(0);
        setStop(parseInt(event.target.value));
        setRowsPerPage(parseInt(event.target.value));
    };

    const handleSelection = (event) => {
        const { id, checked } = event.target;
        updateSelected((prevItems) => ({ ...prevItems, [id]: checked }));
    };

    const bulkAction = () => {
        const tempState = {};
        items.forEach((element) => {
            tempState[element.video_list.video_url] = !selectAll;
        });
        updateSelected((prevSelected) => ({ ...prevSelected, ...tempState }));
        setSelectAll(!selectAll);
    };

    const handleSort = () => {
        updateSort(!sort);
    };

    const clearList = () => {
        setUrl("");
        handleChangePage(null, 0);
    };

    function downloadFunc() {
        const data = Object.keys(selectedItems).filter((key) => selectedItems[key]);
        //console.log(JSON.stringify({ urls: data }));
        fetch(backEnd + "/download", {
            method: "post",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
            mode: "cors",
            body: JSON.stringify({ urlList: data, playListUrl: url, token: token }),
        }).then((response) => {
            if (response.ok) {
                setSnack("Download started", "success");
            }
            if (response.status === 401) {
                setSnack("Token expired please re-login", "error");
                setToken(null);
            }
        })
    }


    // useEffects and useMemos
    // use the memoized fetch to set the items state
    const memoizedFetch = useMemo(async () => {
        // TODO: Use refetch to get the updates of the list operation from the backend
        // the socket one not the http one
        //console.log("start: ", start, "stop: ", stop, "sort: ",
        //    sort, "query: ", query, "url: ", url, "query: ", query, "lastUrl: ", lastUrl, "reFetch: ", reFetch);
        if (url !== "") {
            if (url !== lastUrl) {
                //console.log("changing page to zero")
                setLastUrl(url);
                handleChangePage(null, 0);
            }
            //console.log(url, lastUrl, start, stop, sort, query);
            const response = await fetch(backEnd + "/getsub", {
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
                    token: token
                }),
            });
            if (response.ok) {
                const data = await response.text();
                const json_data = JSON.parse(data);
                return json_data;
            } else {
                if (response.status === 401) {
                    setSnack("Token expired please re-login", "error");
                    setToken(null);
                }
                return {
                    "count": 1, "rows": [{
                        "index_in_playlist": 1,
                        "playlist_url": url,
                        "video_list": {
                            "title": `Error in fetching sub-lists: ${response.status} ${response.statusText}`,
                            "video_id": "",
                            "video_url": "",
                            "downloaded": false,
                            "available": false
                        }
                    }]
                };
            }
        } else {
            return { count: 0, rows: [] };
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [backEnd, start, stop, sort, url, query, reFetch]);

    useEffect(() => {
        memoizedFetch.then((data) => {
            setItems(data["rows"]);
            setItemCount(parseInt(data["count"]));
        });
    }, [memoizedFetch]);

    useEffect(() => {
        if (downloadedItem.url !== null) {
            //console.log(downloadedItem);
            setItems(prevItems => {
                return prevItems.map(item => {
                    if (item.video_list.video_url === downloadedItem.url) {
                        return {
                            ...item,
                            video_list: {
                                ...item.video_list,
                                downloaded: true,
                                title: downloadedItem.title
                            }
                        };
                    }
                    return item;
                });
            });
        }
    }, [downloadedItem]);


    useEffect(() => {
        updateSelected({});
        setSelectAll(false);
        updateSort(false);
    }, [url]);

    useEffect(() => {
        setSelectAll(false);
        items.map((element) => (selectedItems[element.video_list.video_url] = false));
        // Remove keys not present in data
        Object.keys(selectedItems).forEach((key) => {
            if (!items.find((element) => element.video_list.video_url === key)) {
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
        () => debounce((event) => updateQuery(event.target.value.trim()), 1000),
        []
    );

    useEffect(() => {
        if (respIndex === -1) {
            handleChangePage(null, 0); // Reset to the first page if respIndex is -1
        } else {
            //console.log("respIndex: ", respIndex, "itemCount: ", itemCount);
            // Calculate the current page based on the response index
            const currentIndex = respIndex < itemCount ? respIndex : itemCount - 1;
            const calculatedPage = Math.floor(currentIndex / rowsPerPage);
            //console.log("currentIndex: ", currentIndex, "calculatedPage: ", calculatedPage);
            handleChangePage(null, calculatedPage);
        }
    }, [respIndex, handleChangePage, rowsPerPage, itemCount]);

    return (
        <>
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
                                            checked={selectedItems[element.video_list.video_url] || false}
                                            onChange={handleSelection}
                                            id={element.video_list.video_url}
                                        />
                                    </TableCell>
                                    <TableCell
                                        key={index + "-title"}
                                        align="left"
                                        sx={{ width: "75%" }}
                                    >
                                        <Link
                                            href={element.video_list.video_url}
                                            color={
                                                element.available
                                                    ? "inherit"
                                                    : element.video_list.title === "[Deleted video]"
                                                        ? "error"
                                                        : element.video_list.title === "[Private video]"
                                                            ? "#f57c00"
                                                            : "inherit"
                                            }
                                            underline="hover"
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            {element.video_list.title}
                                        </Link>
                                    </TableCell>
                                    <TableCell
                                        key={index + "-status"}
                                        padding="checkbox"
                                        align="center"
                                        style={{ minWidth: 10 }}
                                    >
                                        {element.video_list.downloaded ? (
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
                    />
                </Box>
            </TableContainer>
            <TablePagination
                rowsPerPageOptions={[10, 25, 50, 100]}
                component="div"
                count={itemCount}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                ActionsComponent={TablePaginationActions}
            />

        </>
    );
}

SubList.propTypes = {
    setUrl: PropTypes.func.isRequired,
    url: PropTypes.string.isRequired,
    backEnd: PropTypes.string.isRequired,
    respIndex: PropTypes.number.isRequired,
    downloadedItem: PropTypes.object.isRequired,
    reFetch: PropTypes.string.isRequired,
    tableHeight: PropTypes.string.isRequired,
    rowsPerPage: PropTypes.number.isRequired,
    setRowsPerPage: PropTypes.func.isRequired,
    token: PropTypes.string.isRequired,
    setToken: PropTypes.func.isRequired,
    setSnack: PropTypes.func.isRequired
};

function SubListFab({ selectedItems, clear, download }) {
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
        >
            {icon}
        </Fab>
    );
}

SubListFab.propTypes = {
    selectedItems: PropTypes.object.isRequired,
    download: PropTypes.func.isRequired,
    clear: PropTypes.func.isRequired,
};
