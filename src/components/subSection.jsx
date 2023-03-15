import React from "react";

import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Table from 'react-bootstrap/Table';

import Controls from "./controls";
import ListClearDownload from "./buttongroups";
function ControlGroup() {
    return (<Container fluid className="m-0 p-0 cont-group">
        <Row className="p-1 mx-2">
            <Controls />
        </Row>
        <Row className="p-1 mx-2">
            <ListClearDownload />
        </Row>
    </Container>)
}
function SubTable() {
    function onFinishTyping() {
        console.log('Test');
    }

    return (
        <Container fluid className="container-table m-0 p-0">
            <Table responsive>
                <thead>
                    <tr>
                        <th className="table-dark text-center">
                            <input className="form-check-input" type="checkbox" value="" id="selector" aria-label="..." />
                        </th>
                        <th className="table-dark large-title m-0 p-0 text-center align-middle">
                            <input type="text" className="search m-0 p-0" id="query_sublist" placeholder="Title" onKeyUp={onFinishTyping} />
                        </th>
                        <th className="table-dark text-center">Saved</th>
                    </tr>
                </thead>
                <tbody id="listing"></tbody>
            </Table>
        </Container>
    );
}

export default function SubSection(props) {
    return (<Col xs={12} sm={12} md={12} lg={6} xl={6} className="m-0 p-0">
        <SubTable />
        {props.showControls ? <ControlGroup /> : <></>}
    </Col>)
}