import { Add as AddIcon } from "@mui/icons-material";
import { Delete as DeleteIcon } from "@mui/icons-material";
import { DeleteForever as DeleteForeverIcon } from "@mui/icons-material";
import { DeleteOutline as DeleteOutlineIcon } from "@mui/icons-material";
import { Clear as ClearIcon } from "@mui/icons-material";
import { Typography } from "@mui/material";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import Fab from "@mui/material/Fab";
import FormControl from "@mui/material/FormControl";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import InputLabel from "@mui/material/InputLabel";
import ListItemIcon from "@mui/material/ListItemIcon";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import { useTheme } from "@mui/material/styles";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import TextField from "@mui/material/TextField";
import debounce from "lodash.debounce";
import PropTypes from "prop-types";
import {
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useDependencyLogger } from "../hooks/useDependencyLogger.js";
import { NotificationContext } from "../contexts/NotificationContext";
import { ApiError } from "../api/client.js";
import { useApiClient } from "../hooks/useApiClient.js";
import TablePaginationActions from "./Pagination.jsx";
import PlayListItemRow from "./PlayListItemRow.jsx";

// Only warn about the listing backlog once it is deeper than a single ordinary
// submission, so the common case stays quiet.
const QUEUE_DEPTH_NOTICE_THRESHOLD = 5;

const options = [
  // [Label, deleteAllVideosInPlaylist, deletePlaylist, cleanUp, IconType, ColorType]
  ["Delete playlist", false, true, false, "playlist", "warning"],
  ["Unlink videos", true, false, false, "videos", "secondary"],
  ["Delete everything", true, true, true, "everything", "error"],
];

function PlayList({
  setPlayListUrl,
  playListUrl,
  reFetch,
  setReFetch,
  setSubListIndex,
  tableContainerHeight,
  rowsPerPageSubList,
  setRowsPerPageSubList,
  playListIndex,
  setPlayListIndex,
  // Mobile props (optional — only passed on mobile)
  isMobile,
  onMobileLoad,
  mobileAddDialogRef,
}) {
  const { setSnack, addNotification } = useContext(NotificationContext);
  const api = useApiClient();

  const [query, updateQuery] = useState("");
  // "1" == ID [Default], "3" == lastUpdatedByScheduler
  const [sort, updateSort] = useState("1");
  // "1" == ASC [Default], "2" == DESC
  const [order, updateOrder] = useState("1");
  // These are the controls
  const [localQuery, setLocalQuery] = useState("");
  const [start, setStart] = useState(0);
  const [stop, setStop] = useState(10);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  // actual table data
  const [items, setItems] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  // dialog stuff
  const [open, setOpen] = useState(false);
  const [urlList, setUrlList] = useState("");
  const [watch, setWatch] = useState("N/A");
  // Long-button
  const [anchorEl, setAnchorEl] = useState(null);
  const [openMenuIndex, setOpenMenuIndex] = useState(null);
  // Confirmation dialog for delete operations
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmOption, setConfirmOption] = useState(null);
  const [confirmIndex, setConfirmIndex] = useState(null);
  // Update your handlers
  const handleClickAnchor = (event, index) => {
    setAnchorEl(event.currentTarget);
    setOpenMenuIndex(index);
  };

  useDependencyLogger(
    {
      start,
      stop,
      sort,
      query,
      reFetch,
      urlList,
      items,
      totalItems,
      page,
    },
    "PlayList",
  );

  const handleCloseAnchor = () => {
    setAnchorEl(null);
    setOpenMenuIndex(null);
  };
  const ITEM_HEIGHT = 48;
  const updateUrls = (event) => {
    setUrlList(event.target.value);
  };

  const handleClickOpen = () => {
    setOpen(true);
  };

  // Wire the mobileAddDialogRef so SubList can trigger this dialog
  useEffect(() => {
    if (mobileAddDialogRef) {
      mobileAddDialogRef.current = handleClickOpen;
    }
    return () => {
      if (mobileAddDialogRef) {
        mobileAddDialogRef.current = null;
      }
    };
  }, [mobileAddDialogRef]);

  const handleClose = () => {
    setOpen(false);
  };

  const clearUrlList = () => {
    setUrlList("");
    setOpen(false);
    setWatch("N/A");
  };

  // Responsive card media height using MUI breakpoints
  const theme = useTheme();

  const submitUrlList = async () => {
    setOpen(false);
    const valid = Array.from(
      new Set(urlList.trim().split("\n").filter(validate)),
    );
    try {
      // This response is sent for only the first item ie: 0th item
      await postUrlList(valid);
      //console.log("Response: ", response);
    } catch (_error) {
      setSnack("Invalid URL format", "error");
    }
    setUrlList("");
    setWatch("N/A");
  };

  const validate = (element) => {
    try {
      const url = new URL(element);
      if (url.protocol !== "https:" && url.protocol !== "http:") {
        setSnack("Invalid URL", "error");
        return false;
      }
    } catch (_error) {
      setSnack("Invalid URL format", "error");
      return false;
    }
    return true;
  };

  const postUrlList = async (urlList) => {
    try {
      const json_data = await api.post("/list", {
        urlList: urlList,
        // This is to make sure that we can get the requested amount + 1 so that we can paginate properly
        chunkSize: rowsPerPageSubList + 1,
        monitoringType: watch,
        sleep: true,
      });

      // queueDepthBefore counts what was already pending when this submission
      // landed — the user's own items are not included. Worth mentioning only
      // when there is a real backlog (a batch re-index, typically); submitting
      // a handful into an empty queue needs no explanation.
      const queuedAhead = json_data.queueDepthBefore ?? 0;
      if (queuedAhead > QUEUE_DEPTH_NOTICE_THRESHOLD) {
        setSnack(`Added to listing queue — ${queuedAhead} ahead`, "info");
      }
      return json_data;
    } catch (error) {
      if (error.status === 429) {
        setSnack(
          "Too many requests. Please wait before queuing more.",
          "error",
        );
      }
      // A dead session has already been reported once, by apiFetch.
      return {};
    }
  };

  /**
   * Delete a playlist.
   * @param {string} playListUrlToDelete The playlist to delete.
   * @param {string} title The title of the playlist to delete.
   * @param {boolean} deleteAllVideosInPlaylist Whether to delete all videos in the playlist.
   * @param {boolean} deletePlaylist Whether to delete the playlist itself.
   * @param {boolean} cleanUp Whether to clean up the downloaded files.
   * @returns {Promise<void>} A promise that resolves when the deletion is complete.
   */
  const deletePlaylist = async (
    playListUrlToDelete,
    title,
    deleteAllVideosInPlaylist,
    deletePlaylist,
    cleanUp,
  ) => {
    setSnack("Deleting playlist…", "info");
    try {
      const json_data = await api.post("/delplay", {
        playListUrl: playListUrlToDelete,
        deleteAllVideosInPlaylist: deleteAllVideosInPlaylist,
        deletePlaylist: deletePlaylist,
        cleanUp: cleanUp,
      });

      setSnack("Playlist deleted successfully.", "success");
      addNotification(
        `Deleted ${title ? title : playListUrlToDelete}. Details: ${json_data.message}`,
        "info",
      );
      // Do the refetch conditionally
      // Delete-playlist is not getting re-fetched
      setReFetch(`${playListUrlToDelete}-del-${new Date().getTime()}`);
      let startIndex = start;
      if (order === "2") {
        // DESC order
        //console.log("Total items before deletion: ", totalItems, " startIndex: ", startIndex);
        startIndex = Math.min(totalItems - 1, startIndex);
        //console.log("Adjusted startIndex for DESC order: ", startIndex);
      }
      setPlayListIndex(startIndex);
      // Finally if the playlist was loaded unload it
      if (playListUrlToDelete === playListUrl) {
        setPlayListUrl("init");
      }
    } catch (_error) {
      setSnack("Failed to delete playlist.", "error");
      addNotification(
        `Failed to delete playlist: ${title ? title : playListUrlToDelete}`,
        "error",
      );
    }
  };

  useEffect(() => {
    let active = true;

    const fetchPlaylists = async () => {
      try {
        const json_data = await api.post("/getplay", {
          start: start,
          stop: stop,
          sort: sort,
          order: order,
          query: query,
        });

        if (active) {
          setItems(json_data["rows"]);
          setTotalItems(json_data["count"]);
        }
      } catch (error) {
        if (active) {
          // The list itself is the only place there is to say this, so the
          // failure is rendered as the one row the table can show. A refusal
          // carries the server's message; anything else never reached it.
          const title =
            error instanceof ApiError
              ? `Error in fetching playlists: ${error.status} ${error.message}`
              : `Network error: ${error.message}`;
          setItems([
            {
              playlistUrl: "",
              title,
              sortOrder: 0,
              monitoringType: "N/A",
              saveDirectory: "",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ]);
          setTotalItems(1);
        }
      }
    };

    fetchPlaylists();

    return () => {
      active = false;
    };
  }, [api, start, stop, sort, order, query, reFetch]);

  const handleChangePage = useCallback(
    (_event, newPage) => {
      const validPage = Math.max(0, newPage);
      setPage(validPage);
      setStart(validPage * rowsPerPage);
      setStop((validPage + 1) * rowsPerPage);
    },
    [rowsPerPage, setStart, setStop, setPage],
  );

  const handleChangeRowsPerPage = (event) => {
    setStop(start + +event.target.value);
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  const handleLoad = (url, title) => {
    if (isMobile && onMobileLoad) {
      onMobileLoad(url, title);
    } else {
      setPlayListUrl(url);
      setSubListIndex(0);
    }
  };

  const debouncedQuery = useMemo(
    () => debounce((value) => updateQuery(value.trim()), 1000),
    [],
  );

  const handleQueryChange = (event) => {
    setLocalQuery(event.target.value);
    debouncedQuery(event.target.value);
  };

  const clearQuery = () => {
    setLocalQuery("");
    updateQuery("");
    debouncedQuery.cancel();
  };

  // Pre-existing: this effect syncs the page to a playlist index pushed in
  // from App, which means setting state from an effect. Untangling it belongs
  // with the PlayList decomposition, not here.
  useEffect(() => {
    if (playListIndex === -1) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      handleChangePage(null, 0); // Reset to the first page if playListIndex is -1
    } else {
      //console.log("playListIndex: ", playListIndex, "totalItems: ", totalItems);
      // Calculate the current page based on the response index
      const currentIndex =
        playListIndex < totalItems ? playListIndex : totalItems - 1;
      const calculatedPage = Math.floor(currentIndex / rowsPerPage);
      //console.log("currentIndex: ", currentIndex, "calculatedPage: ", calculatedPage);
      handleChangePage(null, calculatedPage);
    }
  }, [playListIndex, handleChangePage, rowsPerPage, totalItems]);

  const changeWatch = async (event, url) => {
    try {
      const json_data = await api.post("/watch", {
        url: url,
        watch: event.target.value,
      });
      if (json_data["status"] !== "success") return;

      const updatedItems = [...items];
      const itemIndex = updatedItems.findIndex(
        (item) => item.playlistUrl === url,
      );
      const updatedItem = {
        ...updatedItems[itemIndex],
        monitoringType: event.target.value,
      };
      updatedItems[itemIndex] = updatedItem;
      setItems(updatedItems);
    } catch (error) {
      // The select keeps showing the old value, which is the truth. A dead
      // session has already been reported once, by apiFetch.
      if (!error.sessionExpired) {
        setSnack(`Failed to change monitoring type: ${error.message}`, "error");
      }
    }
  };

  const lastUpdateCalc = (lastStamp) => {
    const now = new Date();
    const lastDate = new Date(lastStamp);

    const timeDiff = now.getTime() - lastDate.getTime();
    const seconds = Math.floor(timeDiff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (years > 0) {
      return years + (years === 1 ? " year ago" : " years ago");
    } else if (months > 0) {
      return months + (months === 1 ? " month ago" : " months ago");
    } else if (weeks > 0) {
      return weeks + (weeks === 1 ? " week ago" : " weeks ago");
    } else if (days > 0) {
      return days + (days === 1 ? " day ago" : " days ago");
    } else if (hours > 0) {
      return hours + (hours === 1 ? " hour ago" : " hours ago");
    } else {
      return minutes + (minutes === 1 ? " minute ago" : " minutes ago");
    }
  };

  const createSortHandler = (id) => {
    const stringId = String(id);
    if (stringId === sort) {
      if (order === "1") updateOrder("2");
      else if (order === "2") updateOrder("1");
    } else {
      if (sort === "1") updateSort("3");
      else if (sort === "3") updateSort("1");
    }
  };

  return (
    <Box
      sx={{
        width: "100%",
        overflow: "hidden",
        position: "relative",
        m: 0,
        p: 0,
      }}
    >
      <TableContainer sx={{ height: tableContainerHeight, overflowX: "auto" }}>
        <Table stickyHeader size="small" aria-label="a dense table">
          <TableHead>
            <TableRow>
              <TableCell
                key="play-head-order"
                align="justify"
                /*padding: top | right and bottom | left */
                style={{ paddingInlineEnd: "0px" }}
              >
                <TableSortLabel
                  active={"1" === sort}
                  direction={order === "1" ? "asc" : "desc"}
                  onClick={() => createSortHandler("1")}
                >
                  ID
                </TableSortLabel>
              </TableCell>
              <TableCell
                key="play-head-title"
                align="left"
                sx={{ width: { xs: "50%", sm: "60%", md: "75%" } }}
                style={{
                  paddingInline: "0px",
                }}
              >
                <TextField
                  id="playlist-search-input"
                  label="Title"
                  variant="outlined"
                  size="small"
                  value={localQuery}
                  onChange={handleQueryChange}
                  sx={{ width: "100%", minWidth: "150px" }}
                  InputProps={{
                    endAdornment: localQuery ? (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={clearQuery}
                          edge="end"
                        >
                          <ClearIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ) : null,
                  }}
                />
              </TableCell>
              <TableCell
                key="play-head-watch"
                align="center"
                style={{ paddingInlineEnd: "0px" }}
              >
                <TableSortLabel
                  active={"3" === sort}
                  direction={order === "1" ? "asc" : "desc"}
                  onClick={() => createSortHandler("3")}
                >
                  Watch
                </TableSortLabel>
              </TableCell>
              <TableCell
                key="play-head-expand"
                align="center"
                style={{ paddingInline: "8px", paddingTop: "4px" }}
              >
                Load
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((element, index) => {
              const isMenuOpen = openMenuIndex === index;
              return (
                <PlayListItemRow
                  key={index}
                  element={element}
                  index={index}
                  isMenuOpen={isMenuOpen}
                  playListUrl={playListUrl}
                  handleClickAnchor={handleClickAnchor}
                  changeWatch={changeWatch}
                  handleLoad={handleLoad}
                  lastUpdateCalc={lastUpdateCalc}
                />
              );
            })}
          </TableBody>
        </Table>
        {/* Spacer so last rows can scroll above the FAB zone */}
        <Box sx={{ height: "80px" }} />
      </TableContainer>
      <Box
        sx={{
          zIndex: 50,
          position: "absolute",
          bottom: "76px",
          right: "24px",
        }}
      >
        <Fab color="primary" aria-label="action" onClick={handleClickOpen}>
          <AddIcon />
        </Fab>
      </Box>
      <TablePagination
        rowsPerPageOptions={[10, 25, 50]}
        component="div"
        labelRowsPerPage={isMobile ? "IC:" : "Item count:"}
        count={totalItems}
        rowsPerPage={rowsPerPage}
        page={!totalItems || totalItems <= 0 ? 0 : page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        ActionsComponent={TablePaginationActions}
      />
      {/* Dialog for adding urls */}
      <Dialog
        open={open}
        onClose={handleClose}
        fullWidth
        sx={{
          zIndex: 100,
          // this passes the width to the parent container and paper
          "& .MuiDialog-container": {
            "& .MuiPaper-root": {
              width: "100%",
              minWidth: "300px",
            },
          },
        }}
      >
        <DialogTitle sx={{ paddingBlockEnd: 0 }}>Add</DialogTitle>
        <DialogContent sx={{ m: 0, paddingBlockEnd: 0 }}>
          <TextField
            id="standard-multiline-static"
            label="Url List"
            fullWidth
            multiline
            rows={
              urlList.split("\n").length < 12
                ? urlList.split("\n").length < 6
                  ? 6
                  : urlList.split("\n").length
                : 12
            }
            value={urlList}
            variant="standard"
            onChange={updateUrls}
          />
        </DialogContent>
        <DialogActions>
          <Box sx={{ m: 0, p: 0, flexDirection: { xs: "column", sm: "row" } }}>
            <FormControl
              variant="standard"
              sx={{
                m: 0,
                minWidth: 80,
                minHeight: 45,
                paddingInlineStart: "24px",
                paddingInlineEnd: { xs: "12px" },
              }}
              size="small"
            >
              <InputLabel
                id="dialog-watch-label"
                sx={{
                  paddingInlineStart: "24px",
                  paddingInlineEnd: { xs: "12px" },
                }}
              >
                Watch mode:
              </InputLabel>
              <Select
                labelId="dialog-watch-label"
                id="dialog-watch-select"
                value={watch}
                label="Watch"
                onChange={(event) => setWatch(event.target.value)}
              >
                <MenuItem value={"N/A"}>N/A</MenuItem>
                <MenuItem value={"Start"}>Start</MenuItem>
                <MenuItem value={"End"}>End</MenuItem>
                <MenuItem value={"Refresh"}>Refresh</MenuItem>
              </Select>
            </FormControl>
            <FormControl
              variant="standard"
              sx={{
                m: 0,
                minWidth: 80,
                minHeight: 45,
                paddingInlineStart: "24px",
                paddingInlineEnd: { xs: "12px" },
              }}
              size="small"
            >
              <InputLabel
                id="dialog-watch-label-rows-per-page"
                sx={{
                  paddingInlineStart: "24px",
                  paddingInlineEnd: { xs: "12px" },
                }}
              >
                Rows per page:
              </InputLabel>
              <Select
                labelId="dialog-watch-label-rows-per-page"
                id="dialog-watch-select-rows-per-page"
                value={rowsPerPageSubList}
                label="Rows per page"
                onChange={(event) => setRowsPerPageSubList(event.target.value)}
              >
                <MenuItem value={1}>1</MenuItem>
                <MenuItem value={8}>8</MenuItem>
                <MenuItem value={16}>16</MenuItem>
                <MenuItem value={32}>32</MenuItem>
                <MenuItem value={64}>64</MenuItem>
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          <Button
            variant="contained"
            onClick={clearUrlList}
            sx={{ float: "right" }}
          >
            <Typography variant="button">Clear</Typography>
          </Button>
          <Box sx={{ m: 0, paddingInlineEnd: { xs: "12px", sm: "24px" } }}>
            <Button
              variant="contained"
              onClick={submitUrlList}
              sx={{ float: "right" }}
            >
              <Typography variant="button">Submit</Typography>
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
      {/* Single Menu component outside the loop - this fixes the lag and wrong deletion */}

      <Menu
        id="long-menu"
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseAnchor}
        slotProps={{
          paper: {
            style: {
              maxHeight: ITEM_HEIGHT * 4.5,
              width: "23ch",
              backgroundColor: theme.palette.background.menu,
            },
          },
          list: {
            "aria-labelledby": "long-button",
          },
        }}
      >
        {openMenuIndex !== null &&
          options.map((option) => (
            <Box key={openMenuIndex + "-" + option[0]}>
              {option[4] === "everything" && <Divider variant="middle" />}
              <MenuItem
                onClick={() => {
                  // close menu and open confirmation dialog with selected option
                  handleCloseAnchor();
                  setConfirmIndex(openMenuIndex);
                  setConfirmOption(option);
                  setConfirmOpen(true);
                }}
              >
                <ListItemIcon
                  sx={{ color: option[5] + ".main", minWidth: "32px" }}
                >
                  {option[4] === "playlist" && <DeleteIcon fontSize="small" />}
                  {option[4] === "videos" && (
                    <DeleteOutlineIcon fontSize="small" />
                  )}
                  {option[4] === "everything" && (
                    <DeleteForeverIcon fontSize="small" />
                  )}
                </ListItemIcon>
                <Typography textAlign="left" color={option[5]} variant="button">
                  {option[0]}
                </Typography>
              </MenuItem>
            </Box>
          ))}
      </Menu>
      {/* Confirmation dialog for delete operations */}
      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        aria-labelledby="confirm-delete-title"
      >
        <DialogTitle id="confirm-delete-title">Confirm delete</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {confirmIndex !== null && items[confirmIndex] ? (
              <>
                Are you sure you want to{" "}
                <strong>{confirmOption && confirmOption[0]}</strong> for
                playlist <strong>{items[confirmIndex].title}</strong>?
              </>
            ) : (
              "Are you sure you want to perform this delete operation?"
            )}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} color="primary">
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (
                confirmIndex !== null &&
                items[confirmIndex] &&
                confirmOption
              ) {
                // call the delete API with the saved parameters
                deletePlaylist(
                  items[confirmIndex].playlistUrl,
                  items[confirmIndex].title,
                  confirmOption[1],
                  confirmOption[2],
                  confirmOption[3],
                );
              }
              setConfirmOpen(false);
            }}
            color="error"
            variant="contained"
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

PlayList.propTypes = {
  setPlayListUrl: PropTypes.func.isRequired,
  playListUrl: PropTypes.string,
  reFetch: PropTypes.string.isRequired,
  setReFetch: PropTypes.func.isRequired,
  setSubListIndex: PropTypes.func.isRequired,
  tableContainerHeight: PropTypes.string.isRequired,
  rowsPerPageSubList: PropTypes.number.isRequired,
  setRowsPerPageSubList: PropTypes.func.isRequired,
  playListIndex: PropTypes.number.isRequired,
  setPlayListIndex: PropTypes.func.isRequired,
  // Mobile props
  isMobile: PropTypes.bool,
  onMobileLoad: PropTypes.func,
  mobileAddDialogRef: PropTypes.object,
};

export default memo(PlayList);
