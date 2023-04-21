import React, { useEffect, useState, useMemo, useRef, lazy } from "react";

import Table from "react-bootstrap/Table";
import debounce from "lodash.debounce";
import Fab from "@mui/material/Fab";
import DownloadIcon from "@mui/icons-material/Download";
import ClearIcon from "@mui/icons-material/Clear";
const ListControl = lazy(() => import("./ListControl.jsx"));

export default function SubList({
  listUrl,
  setParentUrl,
  disableBtns,
  respIndex,
}) {
  const [start, setStart] = useState(respIndex);
  const [chunk, setChunk] = useState(10);
  const [stop, setStop] = useState(respIndex + chunk);
  const [query, getQuery] = useState("");
  const [data, setData] = useState({ count: 0, rows: [] });
  const [selectedItems, updateSelected] = useState({});
  const [sortDownloaded, setSort] = useState(false);
  // test
  const fetchOptions = useMemo(
    () => ({
      method: "post",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      mode: "cors",
    }),
    []
  );

  const fetchData = useMemo(
    () => async (url, start, stop, query, sortDownloaded) => {
      const response = await fetch("http://localhost:8888/ytdiff/getsub", {
        ...fetchOptions,
        body: JSON.stringify({
          url,
          start,
          stop,
          query,
          sortDownloaded,
        }),
      });
      const data = await response.text();
      return JSON.parse(data);
    },
    [fetchOptions]
  );

  useEffect(() => {
    if (listUrl !== "" && listUrl !== undefined) {
      fetchData(listUrl, start, stop, query, sortDownloaded).then((json_data) =>
        setData(json_data)
      );
    }
  }, [
    fetchData,
    listUrl,
    start,
    stop,
    query,
    respIndex,
    sortDownloaded,
    disableBtns,
  ]);

  useEffect(() => {
    // this needs to be tested, as I guessed this has some problems and doesn't work for playlist properly
    // console.log("respIndex: " + respIndex);
    let start = respIndex - (respIndex % chunk);
    setStart(start);
    setStop(start + chunk);
  }, [respIndex]);

  function clear() {
    setParentUrl("");
    setStart(0);
    setStop(10);
    setChunk(10);
    getQuery("");
    setData({ count: 0, rows: [] });
  }

  function download() {
    const data = Object.keys(selectedItems).filter((key) => selectedItems[key]);
    //console.log(JSON.stringify({ id: data }));
    fetch("http://localhost:8888/ytdiff/download", {
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
    <div className="m-0 p-0 col-xl-6 col-lg-6 col-md-12 col-sm-12 col-12">
      <SubListTable
        sendQuery={getQuery}
        data={data}
        listUrl={listUrl}
        selectedItems={selectedItems}
        updateSelected={updateSelected}
        sortDownloaded={sortDownloaded}
        setSort={setSort}
        clear={clear}
        download={download}
        disableBtns={disableBtns}
      />
      <div className="m-0 p-0 cont-group container-fluid">
        <div className="row p-1 mx-2">
          <ListControl
            start={start}
            stop={stop}
            chunk={chunk}
            setStart={setStart}
            setStop={setStop}
            setChunk={setChunk}
          />
        </div>
      </div>
    </div>
  );
}

function TableHead({
  bulkAction,
  selectAll,
  query,
  debouncedQuery,
  handleSort,
  sortDownloaded,
}) {
  return (
    <>
      <thead>
        <tr>
          <th className="table-dark text-center">
            <input
              className="form-check-input"
              type="checkbox"
              onChange={bulkAction}
              checked={selectAll}
              id="selector"
              aria-label="..."
            />
          </th>
          <th className="table-dark align-middle large-title m-0 mx-1 p-0">
            <input
              type="text"
              className="m-0 mt-1 ms-1 p-0"
              id="query_sublist"
              placeholder="Title"
              ref={query}
              onKeyUp={debouncedQuery}
            />
          </th>
          <th
            className="table-dark align-middle text-center"
            onClick={handleSort}
          >
            Saved
            <span className="sort-arrow">{sortDownloaded ? "▲" : "•"}</span>
          </th>
        </tr>
      </thead>
    </>
  );
}

function SubListTable({
  data,
  sendQuery,
  listUrl,
  selectedItems,
  updateSelected,
  sortDownloaded,
  setSort,
  clear,
  download,
  disableBtns,
}) {
  const [selectAll, setSelectAll] = useState(false);
  // absolutely unnecessary
  const query = useRef("");
  const handleSelection = (event) => {
    const { id, checked } = event.target;
    updateSelected((prevItems) => ({ ...prevItems, [id]: checked }));
  };

  const bulkAction = () => {
    const tempState = {};
    data.rows.forEach((element) => {
      tempState[element.id] = !selectAll;
    });
    updateSelected((prevSelected) => ({ ...prevSelected, ...tempState }));
    setSelectAll(!selectAll);
  };

  const handleSort = () => {
    setSort(!sortDownloaded);
  };

  useEffect(() => {
    updateSelected({});
    setSelectAll(false);
    setSort(null);
  }, [listUrl]);

  useEffect(() => {
    setSelectAll(false);
    data.rows.map((element) => (selectedItems[element.id] = false));
    // Remove keys not present in data
    Object.keys(selectedItems).forEach((key) => {
      if (!data.rows.find((element) => element.id === key)) {
        delete selectedItems[key];
      }
    });
    //setSort(null);
  }, [data]);

  useEffect(() => {
    //console.log(selectedItems);
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
    () => debounce((event) => sendQuery(event.target.value.trim()), 1000),
    []
  );

  return (
    <>
      <div className="m-0 p-0 sub-list-cont">
        {/* {container-head is position relative} */}
        <div className="container-fluid m-0 p-0 container-head">
          <Table responsive className="m-0 p-0 table-head">
            <TableHead
              bulkAction={bulkAction}
              selectAll={selectAll}
              query={query}
              debouncedQuery={debouncedQuery}
              handleSort={handleSort}
              sortDownloaded={sortDownloaded}
            />
          </Table>
        </div>
        <div className="container-fluid m-0 p-0 container-table actual-list">
          <Table responsive className="m-0 p-0">
            <TableHead
              bulkAction={bulkAction}
              selectAll={selectAll}
              query={query}
              debouncedQuery={debouncedQuery}
              handleSort={handleSort}
              sortDownloaded={sortDownloaded}
            />
            <tbody id="listing">
              {data.rows.map((element, index) => (
                <tr
                  key={index}
                  className={
                    element.downloaded
                      ? "table-info"
                      : !element.available
                      ? element.title === "[Deleted video]"
                        ? "table-danger"
                        : element.title === "[Private video]"
                        ? "table-warning"
                        : "table-secondary"
                      : ""
                  }
                >
                  <td className=" text-center">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={selectedItems[element.id] || false}
                      onChange={handleSelection}
                      id={element.id}
                    />
                  </td>
                  <td
                    className="large-title large-title-body"
                    data-bs-toggle="tooltip"
                    data-bs-placement="top"
                    title={element.title}
                  >
                    <a href={element.url} target="_blank" rel="noreferrer">
                      {element.title}
                    </a>
                  </td>
                  <td className="emoji mx-0 px-0">
                    {element.downloaded ? "✅" : "❌"}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
        <div className="container-fluid m-0 p-0 container-table fab-holder">
          <div className="action-button">
            <CustomFab
              selectedItems={selectedItems}
              clear={clear}
              download={download}
              disableBtns={disableBtns}
            />
          </div>
        </div>
      </div>
    </>
  );
}

function CustomFab({ selectedItems, clear, download, disableBtns }) {
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
