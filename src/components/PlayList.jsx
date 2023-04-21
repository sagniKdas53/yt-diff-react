import React, { useEffect, useState, useMemo } from "react";
import { Table, InputGroup, Button, FormControl } from "react-bootstrap";
import debouce from "lodash.debounce";
import Controls from "./ListControl";

export default function PlayList({ setParentUrl, listUrl }) {
  // query is an empty string initially
  const [query, updateQuery] = useState("");
  // 1 == ID, 2 == createdAt, 3 == updatedAt
  /*
        Dropping support for existing stuff is not ideal, but sometimes necessary
    */
  const [sort, updateSort] = useState(1);
  // 1 == ASC, 2 == DESC
  const [order, updateOrder] = useState(1);
  const [start, setStart] = useState(0);
  const [stop, setStop] = useState(10);
  const [chunk, setChunk] = useState(10);
  const [items, getItems] = useState([]);

  // memoize the fetch result using useMemo
  const memoizedFetch = useMemo(async () => {
    const response = await fetch("http://localhost:8888/ytdiff/dbi", {
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
    return json_data["rows"];
  }, [query, start, stop, sort, chunk, order]);

  // use the memoized fetch result to set the items state
  useEffect(() => {
    memoizedFetch.then((data) => getItems(data));
  }, [memoizedFetch]);

  return (
    <div className="m-0 p-0 col-xl-6 col-lg-6 col-md-12 col-sm-12 col-12">
      <PlayListTable
        getQuery={updateQuery}
        tableData={items}
        updateTableData={getItems}
        setParentUrl={setParentUrl}
        listUrl={listUrl}
        sort={sort}
        order={order}
        getSort={updateSort}
        getOrder={updateOrder}
      />
      <div className="m-0 p-0 cont-group container-fluid">
        <div className="p-1 mx-2 row">
          <Controls
            start={start}
            stop={stop}
            chunk={chunk}
            setStart={setStart}
            setStop={setStop}
            setChunk={setChunk}
          />
        </div>
        {/* {<div className="p-1 mx-2 row">
          <SortTable
            sort={sort}
            order={order}
            getSort={updateSort}
            getOrder={updateOrder}
          />
        </div>} */}
      </div>
    </div>
  );
}

function PlayListTable({
  getQuery,
  tableData,
  setParentUrl,
  updateTableData,
  listUrl,
  sort,
  order,
  getSort,
  getOrder,
}) {
  const queryHandler = (event) => getQuery(event.target.value.trim());
  // true === ASC, false === DESC, null === not
  const [sortState, updatedSort] = useState({
    ID: null,
    UAT: null,
    CAT: null,
  });
  useEffect(() => {
    if (sort === 1 && order === 1) {
      updatedSort({
        ID: true,
        UAT: null,
        CAT: null,
      });
    } else if (sort === 1 && order === 2) {
      updatedSort({
        ID: false,
        UAT: null,
        CAT: null,
      });
    } else if (sort === 2 && order === 1) {
      updatedSort({
        ID: null,
        UAT: null,
        CAT: true,
      });
    } else if (sort === 2 && order === 2) {
      updatedSort({
        ID: null,
        UAT: null,
        CAT: false,
      });
    } else if (sort === 3 && order === 1) {
      updatedSort({
        ID: null,
        UAT: true,
        CAT: null,
      });
    } else if (sort === 3 && order === 2) {
      updatedSort({
        ID: null,
        UAT: false,
        CAT: null,
      });
    }
  }, [sort, order]);
  const updateIDSort = () => {
    updatedSort({
      ID: !sortState.ID,
      UAT: null,
    });
  };
  const updateUATSort = () => {
    updatedSort({
      ID: null,
      UAT: !sortState.UAT,
    });
  };
  useEffect(() => {
    if (sortState.ID === false) {
      getSort(1);
      getOrder(2);
    } else if (sortState.ID === true) {
      getSort(1);
      getOrder(1);
    } else if (sortState.UAT === false) {
      getSort(3);
      getOrder(2);
    } else if (sortState.UAT === true) {
      getSort(3);
      getOrder(1);
    }
  }, [sortState]);
  // I give up lodash works good enough
  const debouncedQuery = useMemo(() => {
    return debouce(queryHandler, 1000);
  }, []);
  return (
    <>
      <div className="container-fluid m-0 p-0 container-head">
        <Table responsive className="m-0 p-0 table-head">
          <thead>
            <tr>
              <th className="table-dark text-center" onClick={updateIDSort}>
                ID
                <span className="sort-arrow">
                  {sortState.ID === null ? "•" : sortState.ID ? "▲" : "▼"}
                </span>
              </th>
              <th className="table-dark large-title m-0 p-0 align-middle">
                <input
                  type="text"
                  className="search m-0 mt-1 p-0"
                  id="query_main_list"
                  placeholder="List Title"
                  onKeyUp={debouncedQuery}
                />
              </th>
              <th className="table-dark text-center" onClick={updateUATSort}>
                Watch
                <span className="sort-arrow">
                  {sortState.UAT === null ? "•" : sortState.UAT ? "▲" : "▼"}
                </span>
              </th>
              <th className="table-dark text-center">Expand</th>
            </tr>
          </thead>
        </Table>
      </div>
      <div className="container-fluid m-0 p-0 container-table">
        <Table responsive className="m-0 p-0">
          <thead>
            <tr>
              <th className="table-dark text-center">ID</th>
              <th className="table-dark large-title m-0 p-0 align-middle">
                <input
                  type="text"
                  className="search m-0 mt-1 p-0"
                  id="query_main_list"
                  placeholder="List Title"
                  onKeyUp={debouncedQuery}
                />
              </th>
              <th className="table-dark text-center">Watch</th>
              <th className="table-dark text-center">Expand</th>
            </tr>
          </thead>
          <tbody id="placeholder">
            <BodyGenerator
              tableData={tableData}
              updateTableData={updateTableData}
              setParentUrl={setParentUrl}
              listUrl={listUrl}
            />
          </tbody>
        </Table>
      </div>
    </>
  );
}

function BodyGenerator({ tableData, setParentUrl, updateTableData, listUrl }) {
  // implement this later
  const watchToggler = async (event) => {
    // console.log(
    //   `Toggling\n\turl:${event.target.parentElement.parentElement.children[1].children[0].href}\n\tTO:${event.target.value}`
    // );
    //console.log(tableData);
    updateTableData(
      tableData.map((item) => {
        if (
          item.url ===
          event.target.parentElement.parentElement.children[1].children[0].href
        ) {
          item.watch = event.target.value;
        }
        return item;
      })
    );
    fetch("http://localhost:8888/ytdiff/watchlist", {
      method: "post",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      mode: "cors",
      body: JSON.stringify({
        url: event.target.parentElement.parentElement.children[1].children[0].href.valueOf(),
        watch: event.target.value,
      }),
    });
  };
  const subListLoader = (event) =>
    setParentUrl(
      event.target.parentElement.parentElement.children[1].children[0].href
    );
  return (
    <>
      {tableData.map((element, index) => (
        <tr key={index}>
          <td className="text-center">{element.order_added}</td>
          <td className="mx-0 px-0">
            <a
              href={element.url}
              className="play-title"
              target="_blank"
              rel="noreferrer"
            >
              {element.title}
            </a>
          </td>
          <td className="text-center">
            <FormControl
              className="form-select-sm"
              id={element.order_added}
              as="select"
              value={element.watch}
              onChange={watchToggler}
              data-bs-toggle="tooltip"
              data-bs-placement="top"
              title={
                "indexed " +
                Math.floor(
                  (new Date().getTime() -
                    new Date(element.updatedAt).getTime()) /
                    (1000 * 3600 * 24)
                ) +
                " days ago"
              }
            >
              <option value="1">NA</option>
              <option value="2">Full</option>
              <option value="3">Quick</option>
            </FormControl>
            {/* "indexed " + Math.floor((new Date().getTime() - new Date(element.updatedAt).getTime()) / (1000 * 3600 * 24)) + " days ago" */}
          </td>
          <td className="text-center">
            <Button
              type="button"
              className={
                listUrl === element.url
                  ? "btn btn-dark btn-sm"
                  : "btn btn-secondary btn-sm"
              }
              onClick={subListLoader}
            >
              {listUrl === element.url ? "Done" : "Load"}
            </Button>
          </td>
        </tr>
      ))}
    </>
  );
}

function SortTable({ sort, order, getSort, getOrder }) {
  const typeHandler = (event) => {
    getSort(event.target.value);
  };
  const orderHandler = (event) => {
    getOrder(event.target.value);
  };
  return (
    <div className="m-0 p-0 container-fluid">
      <InputGroup>
        <span className="input-group-text">Sort by</span>
        <FormControl as="select" value={"" + sort} onChange={typeHandler}>
          <option value="1">ID</option>
          <option value="2">CreatedAt</option>
          <option value="3">UpdatedAt</option>
        </FormControl>
        <span className="input-group-text">Order</span>
        <FormControl as="select" value={"" + order} onChange={orderHandler}>
          <option value="1">Ascending</option>
          <option value="2">Descending</option>
        </FormControl>
      </InputGroup>
    </div>
  );
}
