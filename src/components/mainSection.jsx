import React, { useEffect, useRef, useState } from "react";
import { Container, Row, Col, Table, InputGroup, Button, FormControl } from "react-bootstrap"
import axios from "axios";
import Controls from "./controls";

const debounce = function (fn, d) {
    var timer;
    return function () {
        clearTimeout(timer);
        timer = setTimeout(() => {
            fn.apply();
        }, d);
    }
}

function MainTable(props) {
    const [query, updateQuery] = useState("");
    const [items, getItems] = useState([]);

    const onFinishTypingMain = (event) => debounce(updateQueryHandler(event), 500);
    const updateQueryHandler = (event) => updateQuery(event.target.value);


    useEffect(() => {
        axios.get('https://jsonplaceholder.typicode.com/todos/1').then((response) => {
            getItems(response.data);
            console.log("response.data", response.data);
        });
    }, []);
    useEffect(() => {
        axios.get('https://jsonplaceholder.typicode.com/todos/1').then((response) => {
            getItems(response.data);
            console.log("response.data", response.data, "query", query);
        });
    }, [query]);
    
    return (
        <Container fluid className="m-0 p-0 container-table">
            <Table responsive>
                <thead>
                    <tr className="bg-dark">
                        <th scope="col" className="table-dark text-center">ID</th>
                        <th scope="col" className="table-dark large-play-title m-0 p-0 text-center align-middle">
                            <input type="text" value={query} className="search m-0 p-0" id="query_main_list" placeholder="List Title" onChange={onFinishTypingMain} />
                        </th>
                        <th scope="col" className="table-dark text-center">Watch</th>
                        <th scope="col" className="table-dark text-center">Expand</th>
                    </tr>
                </thead>
                <tbody id="placeholder"></tbody>
            </Table>
        </Container>
    );
}

function Sorting() {
    function sortLoaded() {
        // Your logic here
    }

    return (
        <Container fluid className="m-0 p-0">
            <InputGroup>
                <FormControl as="select" id="sort_by_playlist" aria-label="sorting">
                    <option selected value="0">Choose...</option>
                    <option value="1">ID</option>
                    <option value="2">CreatedAt</option>
                    <option value="3">UpdatedAt</option>
                </FormControl>
                <FormControl as="select" id="order_by_playlist" aria-label="ordering">
                    <option selected value="0">Choose...</option>
                    <option value="1">Ascending</option>
                    <option value="2">Descending</option>
                </FormControl>
                <Button variant="primary" type="button" onClick={sortLoaded}>Sort</Button>
            </InputGroup>
        </Container>
    );
}


export default function MainSection(props) {
    return (
        <Col xs={12} sm={12} md={12} lg={6} xl={6} className="p-0 m-0">
            <MainTable url={props.url} />
            <Container fluid className="m-0 p-0 cont-group">
                <Row className="p-1 mx-2">
                    <Controls /></Row>
                <Row className="p-1 mx-2">
                    <Sorting /></Row>
            </Container>
        </Col>
    );
}