import React, { useEffect, useState } from "react";
import {
    Table,
    InputGroup,
    Button,
    FormControl,
} from "react-bootstrap";
import Controls from "./controls";

export default function PlayLists({ setParentUrl }) {
    // all of the states are here
    const [query, updateQuery] = useState("");
    const [sort, updateSort] = useState(1);
    const [order, updateOrder] = useState(1);
    const [start, setStart] = useState(0);
    const [stop, setStop] = useState(10);
    const [chunk, setChunk] = useState(10);
    const [items, getItems] = useState([]);
    // Query needs to be debounced, but I don't know how
    useEffect(() => {
        fetch("http://localhost:8888/ytdiff/dbi", {
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
        })
            .then((response) => response.text())
            .then((data) => JSON.parse(data))
            .then((json_data) => getItems(json_data["rows"]));
    }, [query, start, stop, sort, order, chunk]);
    return (
        <div className="m-0 p-0 col-xl-6 col-lg-6 col-md-12 col-sm-12 col-12">
            <PlayListTable
                query={query}
                getQuery={updateQuery}
                tableData={items}
                setParentUrl={setParentUrl}
            />
            <div className="m-0 p-0 cont-group container-fluid">
                <div className="p-1 mx-2 row">
                    <Controls start={start} stop={stop} chunk={chunk} setStart={setStart} setStop={setStop} setChunk={setChunk} />
                </div>
                <div className="p-1 mx-2 row">
                    <SortTable sort={sort} order={order} getSort={updateSort} getOrder={updateOrder} />
                </div>
            </div>
        </div>
    );
}

function PlayListTable({ query, getQuery, tableData, setParentUrl }) {
    const getQueryHandler = (event) => {
        getQuery(event.target.value.trim());
    };
    return (
        <div className="m-0 p-0 container-table container-fluid">
            <Table responsive>
                <thead>
                    <tr className="bg-dark">
                        <th scope="col" className="table-dark text-center">
                            ID
                        </th>
                        <th
                            scope="col"
                            className="table-dark play-title m-0 p-0 text-center align-middle"
                        >
                            <input
                                type="text"
                                className="search m-0 p-0"
                                id="query_main_list"
                                placeholder="List Title"
                                value={query}
                                onChange={getQueryHandler}
                            />
                        </th>
                        <th scope="col" className="table-dark text-center">
                            Watch
                        </th>
                        <th scope="col" className="table-dark text-center">
                            Expand
                        </th>
                    </tr>
                </thead>
                <tbody id="placeholder">
                    <PlayListTableBody tableData={tableData} setParentUrl={setParentUrl} />
                </tbody>
            </Table>
        </div>
    );
}

function PlayListTableBody({ tableData, setParentUrl }) {
    // implement this later
    const watchToggler = (event) => {
        console.log(`Toggling\n\turl:${event.target.parentElement.parentElement.children[1].children[0].href}\n\tTO:${event.target.value}`);
    };
    return (
        <>
            {tableData.map((element, index) => (
                <tr key={index}>
                    <td className="text-center">{element.order_added}</td>
                    <td className="mx-0 px-0">
                        <a href={element.url} className="play-title">
                            {element.title}
                        </a>
                    </td>
                    <td className="text-center">
                        <FormControl
                            className="form-select-sm"
                            id={element.order_added}
                            as="select"
                            defaultValue={element.watch}
                            onChange={watchToggler}
                        >
                            <option value="1">NA</option>
                            <option value="2">Full</option>
                            <option value="3">Quick</option>
                        </FormControl>
                    </td>
                    <td className="text-center">
                        <Button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setParentUrl(element.url)}
                        >
                            Load
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
                <FormControl as="select" defaultValue={sort} onChange={typeHandler}>
                    <option value="1">ID</option>
                    <option value="2">CreatedAt</option>
                    <option value="3">UpdatedAt</option>
                </FormControl>
                <FormControl as="select" defaultValue={order} onChange={orderHandler}>
                    <option value="1">Ascending</option>
                    <option value="2">Descending</option>
                </FormControl>
            </InputGroup>
        </div>
    );
    /*<Button variant="primary" type="button" onClick={() => {getSort(sort),getOrder(order)}}>Sort</Button>*/
}
