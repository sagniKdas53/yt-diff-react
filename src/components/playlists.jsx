import React, { useEffect, useState } from "react";
import {
    Container,
    Row,
    Col,
    Table,
    InputGroup,
    Button,
    FormControl,
} from "react-bootstrap";
import Controls from "./controls";

const debounce = function (fn, d) {
    var timer;
    return function () {
        clearTimeout(timer);
        timer = setTimeout(() => {
            fn.apply();
        }, d);
    };
};

function PlayListTable({ onFinishTyping }) {
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
                            className="table-dark large-play-title m-0 p-0 text-center align-middle"
                        >
                            <input
                                type="text"
                                className="search m-0 p-0"
                                id="query_main_list"
                                placeholder="List Title"
                                onKeyUp={onFinishTyping}
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
                <tbody id="placeholder"></tbody>
            </Table>
        </Container>
    );
}

function SortTable() {

    return (
        <Container fluid className="m-0 p-0">
            <InputGroup>
                <FormControl as="select" id="sort_by_playlist" aria-label="sorting" defaultValue={"1"}>
                    <option value="1">ID</option>
                    <option value="2">CreatedAt</option>
                    <option value="3">UpdatedAt</option>
                </FormControl>
                <FormControl as="select" id="order_by_playlist" aria-label="ordering" defaultValue={"1"}>
                    <option value="1">Ascending</option>
                    <option value="2">Descending</option>
                </FormControl>
                <Button variant="primary" type="button" onClick={() => { console.log("Nothing"); }}>
                    Sort
                </Button>
            </InputGroup>
        </Container>
    );
}

export default function PlayLists() {
    const [query, updateQuery] = useState("");
    const [sort, updatesort] = useState([1, 1]);
    const [limits, updateLimits] = useState([0, 10]);
    const [items, getItems] = useState([]);
    const onFinishTyping = (event) => debounce(updateQuery(event.target.value), 800);
    const limitsGetter = (state) => {
        console.log(state);
        updateLimits(state);
    };
    useEffect(() => {
        console.log(JSON.stringify({
            start: limits[0],
            stop: limits[1],
            sort: sort[0],
            order: sort[1],
            query: query,
        }));
    }, [query, limits, sort]);
    return (
        <Col xs={12} sm={12} md={12} lg={6} xl={6} className="p-0 m-0">
            <PlayListTable onFinishTyping={onFinishTyping} />
            <Container fluid className="m-0 p-0 cont-group">
                <Row className="p-1 mx-2">
                    <Controls getLimits={limitsGetter} />
                </Row>
                <Row className="p-1 mx-2">
                    <SortTable getSort={updatesort} />
                </Row>
            </Container>
        </Col>
    );
}










/*useEffect(() => {
    fetch("http://localhost:8888/ytdiff/dbi", {
        method: "post",
        mode: "cors",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            start: limits[0],
            stop: limits[1],
            sort: sort[0],
            order: sort[1],
            query: query,
        }),
    })
        .then((response) => response.text())
        .then(console.log);
}, [query,limits,sort]);*/