import React, { useEffect, useState } from "react";

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Table from 'react-bootstrap/Table';

import Controls from "./controls";
import ListClearDownload from "./buttongroups";

function SubTable({ data, getQuery }) {
    const queryHandler = (event) => getQuery(event.target.value.trim());
    return (
        <Container fluid className="container-table m-0 p-0">
            <Table responsive>
                <thead>
                    <tr>
                        <th className="table-dark text-center">
                            <input className="form-check-input" type="checkbox" value="" id="selector" aria-label="..." />
                        </th>
                        <th className="table-dark large-title m-0 p-0 text-center align-middle">
                            <input type="text" className="search m-0 p-0" id="query_sublist" placeholder="Title" onKeyUp={queryHandler} />
                        </th>
                        <th className="table-dark text-center">Saved</th>
                    </tr>
                </thead>
                <tbody id="listing">
                    {data.rows.map((element, index) => (
                        <tr key={index} className={element.downloaded ? "table-info" : !element.available ? (element.title === "[Deleted video]" ? "table-danger" : element.title === "[Private video]" ? "table-warning" : "table-secondary") : ""}>
                            <td className="text-center">
                                <input type="checkbox" className="form-check-input me-1 video-item" value="" id={element.id} />
                            </td>
                            <td className="large-title">
                                <a href={element.url}>{element.title}</a>
                            </td>
                            <td className="emoji">{element.downloaded ? "✅" : "❌"}</td>
                        </tr>
                    ))}
                </tbody>
            </Table>
        </Container>
    );
}

export default function SubLists({ showControls, SubUrl }) {
    const [limits, updateLimits] = useState([0, 10, 10]);
    const [query, getQuery] = useState("");
    const [data, setData] = useState({ count: 0, rows: [] });
    useEffect(() => {
        console.log("Sub Query", query, "\nSub Query Url", SubUrl, "\nlimits", limits, "\nData", data);
        fetch("http://localhost:8888/ytdiff/getsub", {
            method: "post",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json"
            }, mode: "cors",
            body: JSON.stringify({
                url: SubUrl,
                start: limits[0],
                stop: limits[1],
                query: query
            })
        }).then((response) => response.text())
            .then((data) => JSON.parse(data))
            .then((json_data) => setData(json_data));
    }, [query, SubUrl, limits])
    return (<Col xs={12} sm={12} md={12} lg={6} xl={6} className="m-0 p-0">
        <SubTable SubUrl={SubUrl} limits={limits} getQuery={getQuery} data={data} />
        {showControls ? (<Container fluid className="m-0 p-0 cont-group">
            <Row className="p-1 mx-2">
                <Controls getLimits={updateLimits} />
            </Row>
            <Row className="p-1 mx-2">
                <ListClearDownload noList />
            </Row>
        </Container>) : <></>}
    </Col>)
}