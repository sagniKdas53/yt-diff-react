import React, { useEffect, useState } from "react";
import { Container, Row, Col, Table, InputGroup, Button, FormControl } from "react-bootstrap";
import Controls from "./controls";

export default function PlayLists({ setGlobalUrl }) {
    const [query, updateQuery] = useState("");
    const [sort, updateSort] = useState([1, 1]);
    const [limits, updateLimits] = useState([0, 10, 10]);
    const [items, getItems] = useState([]);
    // Query needs to be debounced, but I don't know how
    useEffect(() => {
        fetch("http://localhost:8888/ytdiff/dbi", {
            method: "post",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            mode: "cors",
            body: JSON.stringify({
                start: limits[0],
                stop: limits[1],
                sort: sort[0],
                order: sort[1],
                query: query,
            })
        }).then((response) => response.text())
            .then((data) => JSON.parse(data))
            .then((json_data) => getItems(json_data["rows"]));
    }, [query, limits, sort]);
    return (
        <Col xs={12} sm={12} md={12} lg={6} xl={6} className="p-0 m-0">
            <PlayListTable getQuery={updateQuery} rows={items} setGlobalUrl={setGlobalUrl} />
            <Container fluid className="m-0 p-0 cont-group">
                <Row className="p-1 mx-2">
                    <Controls getLimits={updateLimits} />
                </Row>
                <Row className="p-1 mx-2">
                    <SortTable getSort={updateSort} />
                </Row>
            </Container>
        </Col>
    );
}

function PlayListTable({ getQuery, rows, setGlobalUrl }) {
    const queryHandler = (event) => getQuery(event.target.value.trim());
    return (
        <Container fluid className="m-0 p-0 container-table">
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
                                onKeyUp={queryHandler}
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
                    <PlayListTableBody rows={rows} setGlobalUrl={setGlobalUrl} />
                </tbody>
            </Table>
        </Container>
    );
}

function PlayListTableBody({ rows, setGlobalUrl }) {
    // implement this later
    const watchToggler = (event) => { console.log(event.target.value, event.target.parentElement.parentElement.children[1].children[0].href) };
    return (
        <>
            {
                rows.map((element, index) => (
                    <tr key={index}>
                        <td className="text-center">{element.order_added}</td>
                        <td className="mx-0 px-0">
                            <a href={element.url} className="play-title">{element.title}</a>
                        </td>
                        <td className="text-center">
                            <FormControl className="form-select-sm" id={element.order_added} as="select" defaultValue={element.watch ? "3" : "1"} onChange={watchToggler}>
                                <option value="1">NA</option>
                                <option value="2">Full</option>
                                <option value="3">Quick</option>
                            </FormControl>
                        </td>
                        <td className="text-center">
                            <Button type="button" className="btn btn-secondary btn-sm" onClick={() => setGlobalUrl(element.url)}>Load</Button>
                        </td>

                    </tr>
                ))
            }
        </>
    )
}

function SortTable({ getSort }) {
    const [sort, setSort] = useState("1");
    const [order, setOrder] = useState("1");
    const typeHandler = (event) => {
        setSort(event.target.value);
    };
    const orderHandler = (event) => {
        setOrder(event.target.value);
    };
    return (
        <Container fluid className="m-0 p-0">
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
                <Button
                    variant="primary"
                    type="button"
                    onClick={() => getSort([sort, order])}
                >
                    Sort
                </Button>
            </InputGroup>
        </Container>
    );
}