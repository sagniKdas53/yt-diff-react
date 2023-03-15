import React, { useState } from "react";
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import ListClearDownload from "./buttongroups"
import Controls from "./controls";

export default function InputForm() {
    const [bulk, setBulk] = useState(false);
    return (<Col xs={12} sm={12} md={12} lg={6} xl={6}>
        <Container fluid>
            <Row className="mb-3">
                <h3>URL:</h3>
                {bulk ? <textarea className="form-control" placeholder="url list" id="url_list" rows="5" title="Url List" hidden="" /> :
                    <input type="text" className="form-control" placeholder="url" id="url" data-bs-toggle="tooltip" data-bs-placement="top" title="Url" />}
            </Row>
            <Row className="mt-3">
                <Controls getLimits={console.debug}/>
            </Row>
            <Row className="mt-3">
                <Col>
                    <div className="m-0 p-0 d-flex">
                        <label className="form-check-label">Bulk Listing: </label>
                        <div className="form-check form-switch mx-2">
                            <input className="form-check-input" type="checkbox" role="switch" id="bulk-listing" onClick={() => setBulk(!bulk)} />
                        </div>
                    </div>
                </Col>
                <Col>
                    <div className="m-0 p-0 d-flex">
                        <label className="form-check-label">Watch for changes: </label>
                        <div className="form-check form-switch mx-2">
                            <input className="form-check-input" type="checkbox" role="switch" id="watch-list" />
                        </div>
                    </div>
                </Col>
            </Row>
            <Row className="mt-3">
                <ListClearDownload />
            </Row>
        </Container>
    </Col>
    );
}
