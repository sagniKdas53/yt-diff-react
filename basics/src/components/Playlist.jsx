import { useEffect, useState, useMemo } from "react";
import debouce from "lodash.debounce";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import Link from "@mui/material/Link";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import Button from "@mui/material/Button";
import PropTypes from "prop-types";
import TextField from '@mui/material/TextField';
const columns = [
  {
    id: "id",
    label: "ID",
    minWidth: 10,
    align: "center",
  },
  {
    id: "title",
    label: "Title",
    minWidth: 10,
    align: "left",
    prop: true
  },
  {
    id: "watch",
    label: "Watch",
    minWidth: 10,
    align: "center",
  },
  {
    id: "expand",
    label: "Expand",
    minWidth: 10,
    align: "center",
  },
];

export default function PlayList({ setUrl, url }) {
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
    const response = await fetch("http://192.168.0.106:8888/ytdiff/dbi", {
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
  }, [query, start, stop, sort, order]);

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
    fetch(
      "https://lenovo-ideapad-320-15ikb.tail9ece4.ts.net/ytdiff/watchlist",
      {
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
      }
    )
      .then((r) => r.json())
      .then((d) => {
        if (d["Outcome"] === "Success") {
          const updatedItems = [...items];
          const itemIndex = updatedItems.findIndex(item => item.url === url);
          const updatedItem = {
            ...updatedItems[itemIndex],
            watch: event.target.value
          };
          updatedItems[itemIndex] = updatedItem;
          setItems(updatedItems);
        }
      });
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
                    {column.prop ? <TextField id="title-input" label="Title" variant="standard" size="small" 
                      onKeyUp={debouncedQuery} /> : column.label}
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
                      align="center"
                    >
                      {+element.order_added + 1}
                    </TableCell>
                    <TableCell
                      key={element.order_added + "-title"}
                      align="left"
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
                      align="center"
                    >
                      <FormControl sx={{ m: 1, minWidth: 80 }} size="small">
                        <InputLabel id={element.order_added + "-label"}>
                          {Math.floor(
                            (new Date().getTime() -
                              new Date(element.updatedAt).getTime()) /
                            (1000 * 3600 * 24)
                          ) + " days ago"}
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
          rowsPerPageOptions={[10, 25, 100]}
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
};
