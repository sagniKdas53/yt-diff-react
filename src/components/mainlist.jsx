import React from "react";
import { Container, Row, Col, Table, InputGroup, Button, FormControl } from "react-bootstrap"
import Controls from "./controls";

function MainTable() {
    function onFinishTypingMain() {
        console.log("test2");
    }
    return (
        <Container fluid className="m-0 p-0 container-table">
            <Table responsive>
                <thead>
                    <tr className="bg-dark">
                        <th scope="col" className="table-dark text-center">ID</th>
                        <th scope="col" className="table-dark large-play-title m-0 p-0 text-center align-middle">
                            <input type="text" className="search m-0 p-0" id="query_main_list" placeholder="List Title" onKeyUp={onFinishTypingMain} />
                        </th>
                        <th scope="col" className="table-dark extra text-center">Updated</th>
                        <th scope="col" className="table-dark">Watch</th>
                        <th scope="col" className="table-dark text-center">Expand</th>
                    </tr>
                </thead>
                <tbody id="placeholder"></tbody>
            </Table>
        </Container>
    );
}

function MySortingForm() {
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


export default function MainSection() {
    return (
        <Col xs={12} sm={12} md={12} lg={6} xl={6} className="p-0 m-0 pe-1">
            <MainTable />
            <Container fluid className="m-0 p-0 cont-group">
                <Row className="p-1 mx-2">
                    <Controls /></Row>
                <Row className="p-1 mx-2">
                    <MySortingForm /></Row>
            </Container>
        </Col>
    );
}


/*        <div className="container-cont m-0 p-0">
            <div className="container-fluid m-0 mt-2 p-0 px-2 container-counters">
                <div className="row">
                    <div className="input-group">
                        <input type="number" className="form-control" placeholder="0" min="0" name="start_playlist" id="start_playlist" data-bs-toggle="tooltip" data-bs-placement="top" title="Start" />
                        <span className="input-group-text">-</span>
                        <input type="number" className="form-control" placeholder="10" min="1" name="stop_playlist" id="stop_playlist" data-bs-toggle="tooltip" data-bs-placement="top" title="Stop" />
                        <span className="input-group-text">-</span>
                        <input type="number" className="form-control" placeholder="10" min="1" name="chunk_playlist" id="chunk_playlist" data-bs-toggle="tooltip" data-bs-placement="top" title="Chunk" />
                        <button id="next" type="button" onclick="nextMain()" className="btn btn-primary">
                            Next
                        </button>
                        <button id="back" type="button" onclick="backMain()" className="btn btn-primary">
                            Back
                        </button>
                    </div>
                </div>
            </div>
            <div className="container-fluid m-0 my-2 p-0 px-2">
                <div className="input-group">
                    <select className="form-select" id="sort_by_playlist" aria-label="sorting">
                        <option selected="" value="0">Choose...</option>
                        <option value="1">ID</option>
                        <option value="2">CreatedAt</option>
                        <option value="3">UpdatedAt</option>
                    </select>
                    <select className="form-select" id="order_by_playlist" aria-label="ordering">
                        <option selected="" value="0">Choose...</option>
                        <option value="1">Ascending</option>
                        <option value="2">Descending</option>
                    </select>
                    <button className="btn btn-primary" type="button" onclick="sortLoaded()">Sort</button>
                </div>
            </div>
        </div>*/