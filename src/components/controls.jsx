import React from "react";
import Col from 'react-bootstrap/Col';
export default function Controls() {
    return (
        <Col className="m-0 p-0">
            <div className="input-group m-0 p-0">
                <input type="number" className="form-control" placeholder="0" min="0" name="start_sublist"
                    id="start_sublist" data-bs-toggle="tooltip" data-bs-placement="top" title="Start" />
                <span className="input-group-text">-</span>
                <input type="number" className="form-control" placeholder="10" min="1" name="stop_sublist"
                    id="stop_sublist" data-bs-toggle="tooltip" data-bs-placement="top" title="Stop" />
                <span className="input-group-text">-</span>
                <input type="number" className="form-control" placeholder="10" min="1" name="chunk_sublist"
                    id="chunk_sublist" data-bs-toggle="tooltip" data-bs-placement="top" title="Chunk" />
                <button id="next-sub" type="button" onclick="nextSub()" className="btn btn-primary">
                    Next
                </button>
                <button id="back-sub" type="button" onclick="backSub()" className="btn btn-primary">
                    Back
                </button>
            </div>
        </Col>
    );
}