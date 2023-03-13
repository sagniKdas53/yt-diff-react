import React from "react";
export default function SublistControls() {
    return (
        <>
            <div class="container-fluid m-0 p-0 container-counters">
                <div class="row">
                    <div class="input-group mt-3">
                        <input type="number" class="form-control" placeholder="0" min="0" name="start_sublist"
                            id="start_sublist" data-bs-toggle="tooltip" data-bs-placement="top" title="Start" />
                        <span class="input-group-text">-</span>
                        <input type="number" class="form-control" placeholder="10" min="1" name="stop_sublist"
                            id="stop_sublist" data-bs-toggle="tooltip" data-bs-placement="top" title="Stop" />
                        <span class="input-group-text">-</span>
                        <input type="number" class="form-control" placeholder="10" min="1" name="chunk_sublist"
                            id="chunk_sublist" data-bs-toggle="tooltip" data-bs-placement="top" title="Chunk" />
                        <button id="next-sub" type="button" onclick="nextSub()" class="btn btn-primary">
                            Next
                        </button>
                        <button id="back-sub" type="button" onclick="backSub()" class="btn btn-primary">
                            Back
                        </button>
                    </div>
                </div>
            </div>

            <div className="container-fluid mt-3 p-0">
                <div className="row">
                    <div className="col mb-3">
                        <div className="btn-group" role="group" aria-label="controls">
                            <button id="clear" type="button" onclick="clearSubList(true)" className="btn btn-primary">
                                Clear
                            </button>
                        </div>
                    </div>
                    <div className="col mb-3">
                        <div className="btn-group float-end" role="group" aria-label="controls">
                            <button id="download_btn" type="button" onclick="downloadSelected()" className="btn btn-primary me-3">
                                Download
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>);
}

/*

*/