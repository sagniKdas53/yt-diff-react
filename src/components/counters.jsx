import React from "react";
export default function Counters() {
    return (<div className="input-group my-2">
        <input type="number" className="form-control" placeholder="0" min="0"
            id="start_sublist" data-bs-toggle="tooltip" data-bs-placement="top" title="Start" />
        <span className="input-group-text">-</span>
        <input type="number" className="form-control" placeholder="10" min="1"
            id="stop_sublist" data-bs-toggle="tooltip" data-bs-placement="top" title="Stop" />
        <span className="input-group-text">Chunk</span>
        <input type="number" className="form-control" placeholder="10" min="1"
            id="chunk_sublist" data-bs-toggle="tooltip" data-bs-placement="top" title="Chunk" />
    </div>);
}
