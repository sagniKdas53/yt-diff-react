import { useEffect, useMemo, useState } from "react";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Link from "@mui/material/Link";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import PropTypes from "prop-types";
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

import debouce from "lodash.debounce";

const columns = [
  {
    id: "id",
    label: "ID",
    minWidth: 10,
    align: "center",
    sortable: true,
    idx: 1,
  },
  {
    id: "title",
    label: "Title",
    minWidth: 10,
    align: "left",
    searchable: true,
  },
  {
    id: "watch",
    label: "Updated",
    minWidth: 10,
    align: "center",
    sortable: true,
    idx: 3,
  },
  {
    id: "expand",
    label: "Load",
    minWidth: 10,
    align: "center",
  },
];

function SortHeader({ lable, id, sortable, sort, order, setSort, setOrder }) {
  const createSortHandler = (id) => {
    if (id === sort) {
      if (order === 1) setOrder(2);
      else if (order === 2) setOrder(1);
    } else {
      if (sort === 1) setSort(3);
      else if (sort === 3) setSort(1);
    }
  };

  if (sortable) {
    return (
      <TableSortLabel
        active={id === sort}
        direction={order === 1 ? "asc" : "desc"}
        onClick={() => createSortHandler(id)}
      >
        {lable}
      </TableSortLabel>
    );
  } else {
    return <>{lable}</>;
  }
}

SortHeader.propTypes = {
  lable: PropTypes.string.isRequired,
  id: PropTypes.number.isRequired,
  sort: PropTypes.number.isRequired,
  order: PropTypes.number.isRequired,
  setSort: PropTypes.func.isRequired,
  setOrder: PropTypes.func.isRequired,
  sortable: PropTypes.func.isRequired,
};

export default function PlayList({ setUrl, url, backend = "" }) {
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
  // memoize the fetch result using useMemo
  const memoizedFetch = useMemo(async () => {
    const response = await fetch(backend + "/ytdiff/dbi", {
      method: "post",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      mode: "cors",
      body: JSON.stringify({
        start: start,
        stop: stop,
        sort: sort,
        order: order,
        query: query,
      }),
    });
    const data = await response.text();
    const json_data = JSON.parse(data);
    return json_data;
  }, [backend, start, stop, sort, order, query]);

  // use the memoized fetch result to set the items state
  useEffect(() => {
    memoizedFetch.then((data) => {
      setItems(data["rows"]);
      setTotalItems(+data["count"]);
    });
  }, [memoizedFetch]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
    setStart(newPage * rowsPerPage);
    setStop((newPage + 1) * rowsPerPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setStop(start + +event.target.value);
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  const handleLoad = (url) => {
    setUrl(url);
  };

  const debouncedQuery = useMemo(
    () => debouce((event) => updateQuery(event.target.value.trim()), 1000),
    []
  );

  const changeWatch = (event, url) => {
    fetch(backend + "/ytdiff/watchlist", {
      method: "post",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      mode: "cors",
      body: JSON.stringify({
        url: url,
        watch: event.target.value,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d["Outcome"] === "Success") {
          const updatedItems = [...items];
          const itemIndex = updatedItems.findIndex((item) => item.url === url);
          const updatedItem = {
            ...updatedItems[itemIndex],
            watch: event.target.value,
          };
          updatedItems[itemIndex] = updatedItem;
          setItems(updatedItems);
        }
      });
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

  return (
    <>
      <Paper sx={{ width: "100%", overflow: "hidden" }}>
        <TableContainer sx={{ height: "81vh" }}>
          <Table stickyHeader size="small" aria-label="a dense table">
            <TableHead>
              <TableRow>
                {columns.map((column) => (
                  <TableCell
                    key={column.id}
                    align={column.align}
                    style={{ minWidth: column.minWidth }}
                  >
                    {column.searchable ? (
                      <TextField
                        id="title-input"
                        label="Title"
                        variant="outlined"
                        size="small"
                        sx={{ width: "100%" }}
                        onKeyUp={debouncedQuery}
                      />
                    ) : (
                      <SortHeader
                        sortable={column.sortable}
                        lable={column.label}
                        id={column.idx}
                        sort={sort}
                        setSort={updateSort}
                        order={order}
                        setOrder={updateOrder}
                      />
                    )}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((element, index) => {
                return (
                  <TableRow hover role="checkbox" tabIndex={-1} key={index}>
                    <TableCell
                      key={element.order_added + "-order"}
                      align="justify"
                    >
                      {+element.order_added + 1}
                    </TableCell>
                    <TableCell
                      key={element.order_added + "-title"}
                      align="left"
                      sx={{ width: "75%" }}
                    >
                      <Link
                        href={element.url}
                        color="inherit"
                        underline="hover"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {element.title}
                      </Link>
                    </TableCell>
                    <TableCell
                      key={element.order_added + "-watch"}
                      align="right"
                    >
                      <FormControl
                        variant="outlined"
                        sx={{ m: 0, minWidth: 80 }}
                        size="small"
                      >
                        <InputLabel id={element.order_added + "-label"}>
                          {lastUpdateCalc(element.updatedAt)}
                        </InputLabel>
                        <Select
                          labelId={element.order_added + "-label"}
                          id={element.order_added + "-select"}
                          value={element.watch}
                          label="Watch"
                          onChange={(e) => changeWatch(e, element.url)}
                        >
                          <MenuItem value={"1"}>NA</MenuItem>
                          <MenuItem value={"2"}>Full</MenuItem>
                          <MenuItem value={"3"}>Quick</MenuItem>
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell
                      key={element.order_added + "-button"}
                      align="center"
                    >
                      <Button
                        size="small"
                        variant="contained"
                        color={url === element.url ? "warning" : "secondary"}
                        onClick={() => handleLoad(element.url)}
                      >
                        Load
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={totalItems}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
    </>
  );
}

PlayList.propTypes = {
  setUrl: PropTypes.func.isRequired,
  url: PropTypes.string.isRequired,
  backend: PropTypes.string,
};
