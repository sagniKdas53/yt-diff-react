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

function PlayListTable({ getQuery, rows }) {
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
                    <PlayListBody rows={rows} />
                </tbody>
            </Table>
        </Container>
    );
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

function PlayListBody({ rows }) {
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
                            <FormControl className="form-select-sm" id={element.order_added} as="select" defaultValue={element.watch? "3" : "1"} onChange={(e) => watchToggler(e.target)}>
                                <option value="1">NA</option>
                                <option value="2">Full</option>
                                <option value="3">Quick</option>
                            </FormControl>
                        </td>
                        <td className="text-center">
                            <Button type="button" className="btn btn-secondary btn-sm" onClick={() => getSubList(element.url)}>Load</Button>
                        </td>

                    </tr>
                ))
            }
        </>
    )
}
/*
<input
type="checkbox"
className="form-check-input me-1 update-markers"
id={element.order_added}
checked={element.watch}
onChange={(e) => watchToggler(e.target)}
/>
*/

export default function PlayLists() {
    const [query, updateQuery] = useState("");
    const [sort, updateSort] = useState([1, 1]);
    const [limits, updateLimits] = useState([0, 10]);
    const [items, getItems] = useState([]);
    const queryHandler = (state) => {
        //console.log(state);
        updateQuery(state);
    };
    const limitsGetter = (state) => {
        //console.log(state);
        updateLimits(state);
    };
    const sortGetter = (state) => {
        //console.log(state);
        updateSort(state);
    };
    // Query needs to be debounced, but I don't know how
    useEffect(() => {
        fetch("http://192.168.0.25:8888/ytdiff/dbi", {
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
            <PlayListTable getQuery={queryHandler} rows={items} />
            <Container fluid className="m-0 p-0 cont-group">
                <Row className="p-1 mx-2">
                    <Controls getLimits={limitsGetter} />
                </Row>
                <Row className="p-1 mx-2">
                    <SortTable getSort={sortGetter} />
                </Row>
            </Container>
        </Col>
    );
}
