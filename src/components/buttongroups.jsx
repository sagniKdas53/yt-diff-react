import React from "react";
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
export default function LCD() {
    return (
        <Row>
            <Col className="m-0 p-0">
                <div className="btn-group" role="group" aria-label="controls">
                    <Button variant="primary">List</Button>
                    <Button variant="primary">Clear</Button>
                </div>
            </Col>
            <Col className="m-0 p-0">
                <Button variant="primary" className="float-end">Download</Button>
            </Col>
        </Row>
    );
}