import React from "react";

import Button from 'react-bootstrap/Button';
export default function ListClearDownload({ clearFunc, downloadFunc }) {
    return (
        <>
            <div className="col m-0 p-0">
                <div className="btn-group" role="group" aria-label="controls">
                    <Button variant="primary" onClick={clearFunc}>Clear</Button>
                </div>
            </div>
            <div className="col m-0 p-0">
                <Button variant="primary" className="float-end" onClick={downloadFunc}>Download</Button>
            </div>
        </>
    );
}