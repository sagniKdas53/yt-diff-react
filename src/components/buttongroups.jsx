import React from "react";

import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
export default function ListClearDownload({ noList, listFunc, clearFunc, downloadFunc }) {
    return (
        <>
            <Col className="m-0 p-0">
                <div className="btn-group" role="group" aria-label="controls">
                    {noList ? <></> : <Button variant="primary" onClick={listFunc}>List</Button>}
                    <Button variant="primary" onClick={clearFunc}>Clear</Button>
                </div>
            </Col>
            <Col className="m-0 p-0">
                <Button variant="primary" className="float-end" onClick={downloadFunc}>Download</Button>
            </Col>
        </>
    );
}