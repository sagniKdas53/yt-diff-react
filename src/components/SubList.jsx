import CancelIcon from "@mui/icons-material/Cancel";
import ClearIcon from "@mui/icons-material/Clear";
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import DownloadIcon from "@mui/icons-material/Download";
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import Box from "@mui/material/Box";
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import CardMedia from "@mui/material/CardMedia";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Fab from "@mui/material/Fab";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import { useTheme } from "@mui/material/styles";
import Table from "@mui/material/Table";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import debounce from "lodash.debounce";
import PropTypes from "prop-types";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDependencyLogger } from "../hooks/useDependencyLogger.js";
import TablePaginationActions from "./Pagination.jsx";

export default function SubList({
    setPlayListUrl,
    loadedPlayList,
    subListIndex,
    setSubListIndex,
    downloadedItem,
    backEnd,
    reFetch,
    setReFetch,
    tableContainerHeight,
    rowsPerPage,
    setRowsPerPage,
    token,
    setToken,
    setSnack
}) {
    // Query and sort state
    const [query, updateQuery] = useState("");
    const [sort, updateSort] = useState(false);
    // These are the controls
    const [start, setStart] = useState(0);
    const [stop, setStop] = useState(8);
    const [page, setPage] = useState(0);
    // actual table data
    const [items, setItems] = useState([]);
    const [itemCount, setItemCount] = useState(0);
    const [selectedItems, updateSelected] = useState({});
    const [selectAll, setSelectAll] = useState(false);
    const [playlistDirectory, setPlaylistDirectory] = useState("init");
    const [thumbUrls, setThumbUrls] = useState({});
    // Confirmation dialog state for delete actions on sub list items
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmPayload, setConfirmPayload] = useState(null);
    const baseUrl = import.meta.env.PROD ? window.location.origin : "";
    // const functions and normal functions
    const handleChangePage = useCallback(
        (_event, newPage) => {
            //console.log("handleChangePage: Page: ", newPage);
            const validPage = Math.max(0, newPage);
            setPage(validPage);
            setStart(validPage * rowsPerPage);
            setStop((validPage + 1) * rowsPerPage);
        },
        [rowsPerPage, setPage, setStart, setStop]
    );

    const handleChangeRowsPerPage = (event) => {
        //console.log("handleChangeRowsPerPage: Rows per page: ", event.target.value);
        // I plan to persist he relative page when rows change but not now
        setPage(0);
        setStart(0);
        setSubListIndex(0);
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
            tempState[element.video_metadatum.videoUrl] = !selectAll;
        });
        updateSelected((prevSelected) => ({ ...prevSelected, ...tempState }));
        setSelectAll(!selectAll);
    };

    const handleSort = () => {
        updateSort(!sort);
    };

    const clearList = () => {
        setPlayListUrl("init");
        setPlaylistDirectory("init");
        handleChangePage(null, 0);
        setSubListIndex(0);
    };

    function downloadFunc() {
        const data = Object.keys(selectedItems).filter((key) => selectedItems[key]);
        //console.log(JSON.stringify({ urls: data }));
        fetch(backEnd + "/download", {
            method: "post",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            },
            mode: "cors",
            body: JSON.stringify({
                urlList: data,
                playListUrl: loadedPlayList
            }),
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


    const getFileAndDownload = async (saveDirectory, fileName) => {
        if (!fileName) {
            setSnack("No file available", "error");
            return;
        }

        try {
            // perform the request and stream the response so we can report progress
            //console.log("Requesting file: ", { saveDirectory, fileName });
            setSnack(`Downloading: ${fileName}`, "info");
            const response = await fetch(backEnd + "/getfile", {
                method: "post",
                headers: {
                    Accept: "application/octet-stream",
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                mode: "cors",
                body: JSON.stringify({ saveDirectory, fileName }),
            });

            if (!response.ok) {
                if (response.status === 401) {
                    setSnack("Token expired please re-login", "error");
                    setToken(null);
                } else {
                    const text = await response.json().catch(() => response.statusText);
                    setSnack(`Failed to download file: ${text.message}`, "error");
                }
                return;
            }

            // Now the backend sends a json response with the signed
            const data = await response.text();
            const json_data = JSON.parse(data);
            if (json_data.status === "success" && json_data.signedUrlId) {
                // When on PROD use window.location.origin else use ""
                // the backEnd will have the correct path on dev
                const downloadUrl = new URL(baseUrl + backEnd + "/getfile");
                downloadUrl.searchParams.append("fileId", json_data.signedUrlId);
                //console.log("Opening download URL: ", downloadUrl.toString());
                // open in new tab
                window.open(downloadUrl.toString(), "_blank", "noopener,noreferrer");
                setSnack(`Download started: ${fileName}`, "success");
            } else {
                setSnack(`Failed to get download URL`, "error");
            }
        } catch (error) {
            setSnack(`Error downloading file: ${error.message}`, "error");
        }
    }

    /**
     * Delete a video from the playlist.
     * @param {string} playListUrl The playlist to delete from.
     * @param {string} videoUrl The URL of the video to delete.
     * @param {string} title The title of the video to delete.
     * @param {boolean} cleanUp Whether to clean up the downloaded files.
     * @param {boolean} deleteVideoMappings Whether to delete the video mappings from the database.
     * @param {boolean} deleteVideosInDB Whether to delete the video itself from the database.
     * @returns {Promise<void>} A promise that resolves when the deletion is complete.
     */
    const deleteVideo = async (playListUrl, videoUrl, title, cleanUp, deleteVideoMappings, deleteVideosInDB) => {
        setSnack(`Deleting: ${videoUrl}`, "info");
        const response = await fetch(backEnd + "/delsub", {
            method: "post",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            },
            mode: "cors",
            body: JSON.stringify(
                {
                    "playListUrl": playListUrl,
                    "videoUrls": [
                        videoUrl
                    ],
                    "cleanUp": cleanUp,
                    "deleteVideoMappings": deleteVideoMappings,
                    "deleteVideosInDB": deleteVideosInDB
                }
            ),
        });
        if (response.ok) {
            setSnack(`Deleted: ${title ? title : videoUrl}`, "success");
            //console.log(`Deleted: ${videoUrl}`);
            setReFetch("delete-sublist-item" + playListUrl + videoUrl + Date.now().toString());
            setSubListIndex(start); // Reset to start index after deletion
        }
        if (!response.ok) {
            setSnack(`Failed to delete: ${title ? title : videoUrl}`, "error");
        }
    }

    useDependencyLogger({ backEnd, start, stop, sort, query, reFetch, loadedPlayList, items, itemCount, page }, "SubList");



    /**
     * Fetches sub-list items from the backend with the given parameters
     * @param {AbortController} controller - an AbortController to handle aborting the request
     * @returns {Promise<void>} - a promise that resolves when the request is complete
     */
    const fetchData = async (controller) => {
        //console.log("Fetching items with params: ", { start, stop, sort, query, url: loadedPlayList });

        try {
            const response = await fetch(backEnd + "/getsub", {
                method: "post",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                mode: "cors",
                body: JSON.stringify({
                    start, stop,
                    sortDownloaded: sort,
                    query, url: loadedPlayList
                }),
            });

            if (controller.signal.aborted) return; // Don't update state if component unmounted

            if (response.ok) {
                const data = await response.text();
                const json_data = JSON.parse(data);
                setItems(json_data["rows"]);
                setPlaylistDirectory(json_data["saveDirectory"]);
                setItemCount(parseInt(json_data["count"]));
            } else {
                if (response.status === 401) {
                    setSnack("Token expired please re-login", "error");
                    setToken(null);
                }
                setItems([{
                    "positionInPlaylist": 1,
                    "playlistUrl": loadedPlayList,
                    "video_metadatum": {
                        "title": `Error in fetching sub-lists: ${response.status} ${response.statusText}`,
                        "videoId": "", "videoUrl": "",
                        "downloadStatus": false, "isAvailable": false
                    }
                }]);
                setItemCount(1);
            }
        } catch (error) {
            if (!controller.signal.aborted) {
                //console.error("Fetch error:", error);
            }
        }
    };
    // useEffects  to load items
    // Fetch data when dependencies change
    useEffect(() => {
        // Handle initial "init" playlist state
        if (loadedPlayList === "init") {
            setItems([]);
            setItemCount(0);
            return;
        }
        const abortController = new AbortController();
        fetchData(abortController);
        return () => abortController.abort();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [backEnd, start, stop, sort, query, loadedPlayList, reFetch]);

    // Responsive card media height using MUI breakpoints
    const theme = useTheme();
    const isXs = useMediaQuery(theme.breakpoints.down("sm"));
    const isSm = useMediaQuery(theme.breakpoints.between("sm", "md"));
    const isMd = useMediaQuery(theme.breakpoints.between("md", "lg"));
    const mediaHeight = isXs ? 220 : isSm ? 200 : isMd ? 160 : 140;

    // Bulk fetch thumbnails
    useEffect(() => {
        if (!items || items.length === 0 || playlistDirectory === "init") return;

        const fetchThumbnails = async () => {
            const filesToFetch = items
                .map((item) => {
                    const thumb = item.video_metadatum?.thumbNailFile;
                    if (thumb && thumbUrls[thumb] === undefined) {
                        return { saveDirectory: item.video_metadatum?.saveDirectory ?? playlistDirectory, fileName: thumb };
                    }
                    return null;
                })
                .filter(Boolean);

            if (filesToFetch.length === 0) return;

            // Mark as in-progress
            const newThumbUrls = {};
            filesToFetch.forEach(f => newThumbUrls[f.fileName] = null);
            setThumbUrls(prev => ({ ...prev, ...newThumbUrls }));

            try {
                const response = await fetch(backEnd + "/getfiles", {
                    method: "post",
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`,
                    },
                    mode: "cors",
                    body: JSON.stringify({ files: filesToFetch }),
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.status === "success" && data.files) {
                        const baseUrl = import.meta.env.PROD ? window.location.origin : "";
                        const updates = {};
                        Object.entries(data.files).forEach(([fileName, signedUrlId]) => {
                            if (signedUrlId) {
                                updates[fileName] = baseUrl + backEnd + "/getfile?fileId=" + signedUrlId;
                            } else {
                                updates[fileName] = null;
                            }
                        });
                        setThumbUrls(prev => ({ ...prev, ...updates }));
                    }
                } else if (response.status === 401) {
                    setSnack("Token expired please re-login", "error");
                    setToken(null);
                }
            } catch (error) {
                //console.error("Error fetching thumbnails:", error);
            }
        };

        fetchThumbnails();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items, playlistDirectory, backEnd, token]);

    useEffect(() => {
        if (downloadedItem.url !== null) {
            //console.log(downloadedItem);
            setItems(prevItems => {
                return prevItems.map(item => {
                    if (item.video_metadatum.videoUrl === downloadedItem.url) {
                        return {
                            ...item,
                            video_metadatum: {
                                ...item.video_metadatum,
                                downloadStatus: true,
                                title: downloadedItem.title,
                                fileName: downloadedItem.fileName,
                                isMetaDataSynced: downloadedItem.isMetaDataSynced || null,
                                thumbNailFile: downloadedItem.thumbNailFile || null,
                                subTitleFile: downloadedItem.subTitleFile || null,
                                descriptionFile: downloadedItem.descriptionFile || null,
                                saveDirectory: downloadedItem.saveDirectory ?? item.video_metadatum.saveDirectory,
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
        setThumbUrls({});
    }, [loadedPlayList]);

    useEffect(() => {
        setSelectAll(false);
        items.map((element) => (selectedItems[element.video_metadatum.videoUrl] = false));
        // Remove keys not present in data
        Object.keys(selectedItems).forEach((key) => {
            if (!items.find((element) => element.video_metadatum.videoUrl === key)) {
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
        if (subListIndex === -1) {
            handleChangePage(null, 0); // Reset to the first page if subListIndex is -1
        } else {
            //console.log("subListIndex: ", subListIndex, "itemCount: ", itemCount);
            // Calculate the current page based on the response index
            const currentIndex = subListIndex < itemCount ? subListIndex : itemCount - 1;
            const calculatedPage = Math.floor(currentIndex / rowsPerPage);
            //console.log("currentIndex: ", currentIndex, "calculatedPage: ", calculatedPage);
            handleChangePage(null, calculatedPage);
        }
    }, [subListIndex, handleChangePage, rowsPerPage, itemCount]);

    return (
        <>
            <Box sx={{ height: tableContainerHeight, position: 'relative', display: 'flex', flexDirection: 'column' }}>
                {/* Header area stays on top */}
                <Table stickyHeader size="small" aria-label="a dense table">
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
                                sx={{ width: "85%" }}
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
                </Table>



                {/* Scrollable cards area */}
                <Box sx={{ p: 1, overflow: 'auto', flex: '1 1 auto', paddingBottom: '80px' }} aria-label="sub-list cards">
                    <Grid container spacing={2} alignItems="stretch">
                        {items.map((element, index) => {
                            const meta = element.video_metadatum || {};
                            const thumb = meta.thumbNailFile || "";
                            return (
                                <Grid item xs={12} sm={6} md={4} lg={3} xl={2} key={index}>
                                    <Card
                                        variant="outlined"
                                        sx={{
                                            height: "100%",
                                            display: "flex",
                                            flexDirection: "column",
                                            borderColor: 'divider',
                                            minWidth: 125,
                                            transition: 'all 0.2s',
                                            '&:hover': {
                                                transform: 'translateY(-4px)',
                                                boxShadow: '0 10px 20px rgba(0,0,0,0.1)'
                                            }
                                        }}
                                    >
                                        <CardMedia
                                            component="img"
                                            height={mediaHeight}
                                            sx={{
                                                transition: 'all 0.3s',
                                                '&:hover': { opacity: 0.9 }
                                            }}
                                            image={
                                                thumbUrls[thumb]
                                                    ? thumbUrls[thumb]
                                                    : meta.downloadStatus
                                                        ? (baseUrl + backEnd + "/404.png")
                                                        : (baseUrl + backEnd + "/204.png")
                                            }
                                            alt={meta.title}
                                            loading="lazy"
                                        />
                                        <CardContent sx={{ flex: 1, my: 0, pb: 0 }}>
                                            <Typography variant="subtitle1" component="div" >
                                                <Link
                                                    href={meta.videoUrl}
                                                    color={
                                                        element.isAvailable
                                                            ? "inherit"
                                                            : meta.title === "[Deleted video]"
                                                                ? "error"
                                                                : meta.title === "[Private video]"
                                                                    ? "#f57c00"
                                                                    : "inherit"
                                                    }
                                                    underline="hover"
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    {meta.title}
                                                </Link>
                                            </Typography>
                                        </CardContent>
                                        <CardActions sx={{ justifyContent: "space-between" }}>
                                            <Checkbox
                                                color="primary"
                                                checked={selectedItems[meta.videoUrl] || false}
                                                onChange={handleSelection}
                                                id={meta.videoUrl}
                                            />
                                            <ButtonGroup size="small">
                                                {meta.downloadStatus ? (
                                                    <Tooltip title="Delete the downloaded files">
                                                        <IconButton
                                                            onClick={() => {
                                                                setConfirmPayload({
                                                                    playListUrl: loadedPlayList,
                                                                    videoUrl: meta.videoUrl,
                                                                    title: meta.title,
                                                                    cleanUp: true,
                                                                    deleteVideoMappings: false,
                                                                    deleteVideosInDB: false,
                                                                });
                                                                setConfirmOpen(true);
                                                            }}
                                                            size="large"
                                                        >
                                                            {/* This deletes only the downloaded files, the video mappings and the video are not deleted */}
                                                            <DeleteForeverIcon color="success" />
                                                        </IconButton>
                                                    </Tooltip>
                                                ) : (
                                                    <Tooltip title="Delete the video from playlist">
                                                        <IconButton
                                                            onClick={() => {
                                                                setConfirmPayload({
                                                                    playListUrl: loadedPlayList,
                                                                    videoUrl: meta.videoUrl,
                                                                    title: meta.title,
                                                                    cleanUp: false,
                                                                    deleteVideoMappings: true,
                                                                    deleteVideosInDB: false,
                                                                });
                                                                setConfirmOpen(true);
                                                            }}
                                                            size="large"
                                                        >
                                                            {/* This deletes only the video mappings. The downloaded files and the video itself are kept */}
                                                            <DeleteOutlineIcon color="warning" />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                                <Tooltip title="Delete everything">
                                                    <IconButton
                                                        onClick={() => {
                                                            setConfirmPayload({
                                                                playListUrl: loadedPlayList,
                                                                videoUrl: meta.videoUrl,
                                                                title: meta.title,
                                                                cleanUp: true,
                                                                deleteVideoMappings: true,
                                                                deleteVideosInDB: true,
                                                            });
                                                            setConfirmOpen(true);
                                                        }}
                                                        size="large"
                                                    >
                                                        {/* This deletes everything */}
                                                        <DeleteSweepIcon color="error" />
                                                    </IconButton>
                                                </Tooltip>
                                                {meta.downloadStatus ? (
                                                    <Tooltip title="Download file">
                                                        <IconButton onClick={() => getFileAndDownload(meta.saveDirectory ?? playlistDirectory, meta.fileName)} size="large">
                                                            <FileDownloadIcon color="success" sx={{ pt: 0.3 }} />
                                                        </IconButton>
                                                    </Tooltip>
                                                ) : (
                                                    <IconButton disabled>
                                                        <CancelIcon color="error" />
                                                    </IconButton>
                                                )}
                                            </ButtonGroup>
                                        </CardActions>
                                    </Card>
                                </Grid>
                            );
                        })}
                    </Grid>
                </Box>
                <Box
                    sx={{
                        zIndex: 50,
                        position: "absolute",
                        bottom: "24px",
                        right: "24px",
                    }}
                >
                    <SubListFab
                        selectedItems={selectedItems}
                        clear={clearList}
                        download={downloadFunc}
                    />
                </Box>
            </Box>
            <TablePagination
                rowsPerPageOptions={[1, 8, 16, 32, 64]}
                component="div"
                labelRowsPerPage="Items per page:"
                count={itemCount}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                ActionsComponent={TablePaginationActions}
            />
            {/* Confirmation dialog for sub list delete actions */}
            <Dialog
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                aria-labelledby="confirm-delete-title-sub"
            >
                <DialogTitle id="confirm-delete-title-sub">Confirm delete</DialogTitle>
                <DialogContent>
                    <Typography variant="body2">
                        {confirmPayload ? (
                            <>
                                Are you sure you want to <strong>{confirmPayload.cleanUp && confirmPayload.deleteVideoMappings && confirmPayload.deleteVideosInDB ? 'Delete everything' : confirmPayload.cleanUp && !confirmPayload.deleteVideoMappings ? 'Delete downloaded files' : !confirmPayload.cleanUp && confirmPayload.deleteVideoMappings ? 'Delete video mapping' : 'Delete'}</strong> for video <strong>{confirmPayload.title}</strong>?
                            </>
                        ) : (
                            "Are you sure you want to perform this delete operation?"
                        )}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmOpen(false)} color="primary">Cancel</Button>
                    <Button
                        onClick={() => {
                            if (confirmPayload) {
                                deleteVideo(
                                    confirmPayload.playListUrl,
                                    confirmPayload.videoUrl,
                                    confirmPayload.title,
                                    confirmPayload.cleanUp,
                                    confirmPayload.deleteVideoMappings,
                                    confirmPayload.deleteVideosInDB
                                );
                            }
                            setConfirmOpen(false);
                            setConfirmPayload(null);
                        }}
                        color="error"
                        variant="contained"
                    >
                        Confirm
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}

SubList.propTypes = {
    setPlayListUrl: PropTypes.func.isRequired,
    loadedPlayList: PropTypes.string,
    backEnd: PropTypes.string.isRequired,
    subListIndex: PropTypes.number.isRequired,
    setSubListIndex: PropTypes.func.isRequired,
    downloadedItem: PropTypes.object.isRequired,
    reFetch: PropTypes.string.isRequired,
    setReFetch: PropTypes.func.isRequired,
    tableContainerHeight: PropTypes.string.isRequired,
    rowsPerPage: PropTypes.number.isRequired,
    setRowsPerPage: PropTypes.func.isRequired,
    token: PropTypes.string.isRequired,
    setToken: PropTypes.func.isRequired,
    setSnack: PropTypes.func.isRequired,
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
