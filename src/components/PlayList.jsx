import AddIcon from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Fab from "@mui/material/Fab";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Link from "@mui/material/Link";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import TextField from "@mui/material/TextField";
import PropTypes from "prop-types";
import { useCallback, useEffect, useMemo, useState } from "react";
import TablePaginationActions from "./Pagination.jsx";

import debounce from "lodash.debounce";

export default function PlayList({
  setUrl,
  playListUrl,
  backEnd,
  setIndeterminate,
  setSnack,
  reFetch,
  tableContainerHeight,
  rowsPerPageSubList,
  token,
  setToken,
  playListIndex
}) {
  const [query, updateQuery] = useState("");
  // 1 == ID [Default], 3 == updatedAt
  const [sort, updateSort] = useState(1);
  // 1 == ASC [Default], 2 == DESC
  const [order, updateOrder] = useState(1);
  // These are the controls
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
  const updateUrls = (event) => {
    setUrlList(event.target.value);
  };

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const clearUrlList = () => {
    setUrlList("");
    setOpen(false);
    setWatch("N/A");
  };

  const submitUrlList = async () => {
    setIndeterminate(true);
    setOpen(false);
    const valid = Array.from(new Set(urlList.trim().split("\n").filter(validate)));
    try {
      // This response is sent for only the first item ie: 0th item
      await postUrlList(valid);
      //console.log("Response: ", response);
    } catch (error) {
      //console.error(error);
      setSnack("Problem parsing url: " + error.message.split(":")[1], "error");
    }
    setUrlList("");
    setWatch("N/A");
  };

  const validate = (element) => {
    try {
      const url = new URL(element);
      if (url.protocol !== "https:" && url.protocol !== "http:") {
        setIndeterminate(false);
        setSnack("Invalid url: " + element, "error");
        return false;
      }
    } catch (error) {
      setIndeterminate(false);
      setSnack("Problem parsing url: " + error.message.split(":")[1], "error");
      return false;
    }
    return true;
  };

  const postUrlList = async (urlList) => {
    //console.log("Posting urlList: " + urlList);
    const response = await fetch(backEnd +
      "/list",
      {
        method: "post",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        mode: "cors",
        body: JSON.stringify({
          urlList: urlList,
          chunkSize: rowsPerPageSubList,
          monitoringType: watch,
          sleep: true
        }),
      }
    );
    if (response.ok) {
      const data = await response.text();
      const json_data = JSON.parse(data);
      //console.log("postUrl response: ", json_data);
      return json_data;
    } else {
      if (response.status === 401) {
        setSnack("Token expired please re-login", "error");
        setToken(null);
        setIndeterminate(false);
      }
      return {};
    }
  };

  // memoize the fetch result using useMemo
  const memoizedFetch = useMemo(async () => {
    //console.log("Fetching Playlists");
    const response = await fetch(backEnd + "/getplay", {
      method: "post",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      mode: "cors",
      body: JSON.stringify({
        start: start,
        stop: stop,
        sort: sort,
        order: order,
        query: query
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
          "playlistUrl": "",
          "title": `Error in fetching playlists: ${response.status} ${response.statusText}`,
          "sortOrder": 0,
          "monitoringType": "N/A",
          "saveDirectory": "",
          "createdAt": new Date().toISOString(),
          "updatedAt": new Date().toISOString()
        }]
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backEnd, start, stop, sort, order, query, reFetch]);

  // use the memoized fetch result to set the items state
  useEffect(() => {
    memoizedFetch.then((data) => {
      setItems(data["rows"]);
      setTotalItems(data["count"]);
    });
  }, [memoizedFetch]);

  const handleChangePage = useCallback(
    (event, newPage) => {
      const validPage = Math.max(0, newPage);
      setPage(validPage);
      setStart(validPage * rowsPerPage);
      setStop((validPage + 1) * rowsPerPage);
    },
    [rowsPerPage, setStart, setStop, setPage]
  );

  const handleChangeRowsPerPage = (event) => {
    setStop(start + +event.target.value);
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  const handleLoad = (url) => {
    setUrl(url);
  };

  const debouncedQuery = useMemo(
    () => debounce((event) => updateQuery(event.target.value.trim()), 1000),
    []
  );

  useEffect(() => {
    if (playListIndex === -1) {
      handleChangePage(null, 0); // Reset to the first page if playListIndex is -1
    } else {
      //console.log("playListIndex: ", playListIndex, "totalItems: ", totalItems);
      // Calculate the current page based on the response index
      const currentIndex = playListIndex < totalItems ? playListIndex : totalItems - 1;
      const calculatedPage = Math.floor(currentIndex / rowsPerPage);
      //console.log("currentIndex: ", currentIndex, "calculatedPage: ", calculatedPage);
      handleChangePage(null, calculatedPage);
    }
  }, [playListIndex, handleChangePage, rowsPerPage, totalItems]);

  const changeWatch = async (event, url) => {
    // add some error handling here for gods sake
    const response = await fetch(backEnd + "/watch", {
      method: "post",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      mode: "cors",
      body: JSON.stringify({
        url: url,
        watch: event.target.value
      }),
    });
    if (response.ok) {
      const data = await response.text();
      const json_data = JSON.parse(data);
      if (json_data["status"] === "success") {
        const updatedItems = [...items];
        const itemIndex = updatedItems.findIndex((item) => item.playlistUrl === url);
        const updatedItem = {
          ...updatedItems[itemIndex],
          monitoringType: event.target.value,
        };
        updatedItems[itemIndex] = updatedItem;
        setItems(updatedItems);
      }
    } else {
      if (response.status === 401) {
        setSnack("Token expired please re-login", "error");
        setToken(null);
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
    if (id === sort) {
      if (order === 1) updateOrder(2);
      else if (order === 2) updateOrder(1);
    } else {
      if (sort === 1) updateSort(3);
      else if (sort === 3) updateSort(1);
    }
  };

  return (
    <Box sx={{ width: "100%", overflow: "hidden", position: "relative", m: 0, p: 0 }}>
      <TableContainer sx={{ height: tableContainerHeight }}>
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
                  active={1 === sort}
                  direction={order === 1 ? "asc" : "desc"}
                  onClick={() => createSortHandler(1)}
                >
                  ID
                </TableSortLabel>
              </TableCell>
              <TableCell
                key="play-head-title"
                align="left"
                sx={{ width: "75%" }}
                style={{ paddingInline: "0px", overflow: "hidden", textOverflow: "ellipsis" }}
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
                key="play-head-watch"
                align="center"
                style={{ paddingInlineEnd: "0px" }}
              >
                <TableSortLabel
                  active={3 === sort}
                  direction={order === 1 ? "asc" : "desc"}
                  onClick={() => createSortHandler(3)}
                >
                  Updated
                </TableSortLabel>
              </TableCell>
              <TableCell
                key="play-head-expand"
                align="center"
                style={{ paddingInline: "8px" }}
              >
                Load
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((element, index) => {
              return (
                <TableRow hover role="checkbox" tabIndex={-1} key={index}>
                  <TableCell
                    key={element.sortOrder + "-order"}
                    align="justify"
                    style={{ paddingInlineEnd: "0px" }}
                  >
                    {+element.sortOrder + 1}
                  </TableCell>
                  <TableCell
                    key={element.sortOrder + "-title"}
                    align="left"
                    sx={{ width: "75%" }}
                    style={{ paddingInline: "0px", overflow: "hidden", textOverflow: "ellipsis" }}
                  >
                    <Link
                      href={element.playlistUrl}
                      color="inherit"
                      underline="hover"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {element.title}
                    </Link>
                  </TableCell>
                  <TableCell
                    key={element.sortOrder + "-watch"}
                    align="right"
                    style={{ paddingInlineEnd: "0px", paddingTop: "0px" }}
                  >
                    <FormControl
                      variant="standard"
                      sx={{ m: 0, minWidth: 80, minHeight: 45 }}
                      size="small"
                    >
                      <InputLabel id={element.sortOrder + "-label"}>
                        {lastUpdateCalc(element.updatedAt)}
                      </InputLabel>
                      <Select
                        labelId={element.sortOrder + "-label"}
                        id={element.sortOrder + "-select"}
                        value={element.monitoringType}
                        label="Watch"
                        onChange={(e) => changeWatch(e, element.playlistUrl)}
                      >
                        <MenuItem value={"N/A"}>N/A</MenuItem>
                        <MenuItem value={"Full"}>Full</MenuItem>
                        <MenuItem value={"Fast"}>Fast</MenuItem>
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell
                    key={element.sortOrder + "-button"}
                    align="center"
                    style={{ paddingInline: "8px" }}
                  >
                    <Button
                      size="small"
                      variant="contained"
                      color={playListUrl === element.playlistUrl ? "success" : "secondary"}
                      onClick={() => handleLoad(element.playlistUrl)}
                    >
                      {playListUrl === element.playlistUrl ? "DONE" : "LIST"}
                    </Button>
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
          <Fab
            color="primary"
            aria-label="action"
            onClick={handleClickOpen}
          >
            <AddIcon />
          </Fab>
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
        ActionsComponent={TablePaginationActions}
      />
      <Dialog open={open} onClose={handleClose} fullWidth sx={{
        zIndex: 100,
        // this passes the width to the parent container and paper
        "& .MuiDialog-container": {
          "& .MuiPaper-root": {
            width: "100%",
            minWidth: "300px",
          },
        },
      }}>
        <DialogTitle sx={{ paddingBlockEnd: 0 }}>Add</DialogTitle>
        <DialogContent sx={{ m: 0, paddingBlockEnd: 0 }}>
          <TextField
            id="standard-multiline-static"
            label="Url List"
            fullWidth
            multiline
            rows={
              urlList.split("\n").length < 12 ? (urlList.split("\n").length < 6 ? 6 : urlList.split("\n").length) : 12
            }
            value={urlList}
            variant="standard"
            onChange={updateUrls}
          />
        </DialogContent>
        <DialogActions>
          <FormControl
            variant="standard"
            sx={{ m: 0, minWidth: 80, minHeight: 45, paddingInlineStart: "24px", paddingInlineEnd: { xs: "12px", sm: "24px" } }}
            size="small"
          >
            <InputLabel id="dialog-watch-label" sx={{ paddingInlineStart: "24px", paddingInlineEnd: { xs: "12px", sm: "24px" } }}>
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
              <MenuItem value={"Full"}>Full</MenuItem>
              <MenuItem value={"Fast"}>Fast</MenuItem>
            </Select>
          </FormControl>
          <Box sx={{ flexGrow: 1 }}></Box>
          <Button variant="contained" onClick={clearUrlList} sx={{ float: "right" }}>Clear</Button>
          <Box sx={{ m: 0, paddingInlineEnd: { xs: "12px", sm: "24px" } }}>
            <Button variant="contained" onClick={submitUrlList} sx={{ float: "right" }}>Submit</Button>
          </Box>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

PlayList.propTypes = {
  setUrl: PropTypes.func.isRequired,
  playListUrl: PropTypes.string,
  backEnd: PropTypes.string.isRequired,
  setIndeterminate: PropTypes.func.isRequired,
  setSnack: PropTypes.func.isRequired,
  reFetch: PropTypes.string.isRequired,
  tableContainerHeight: PropTypes.string.isRequired,
  rowsPerPageSubList: PropTypes.number.isRequired,
  token: PropTypes.string.isRequired,
  setToken: PropTypes.func.isRequired,
  playListIndex: PropTypes.number.isRequired,
};
