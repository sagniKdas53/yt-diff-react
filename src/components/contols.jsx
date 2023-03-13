import React, { useEffect, useState } from "react";
import Counters from "./counters";
export default function Controls() {
    const [bulk, setBulk] = useState(false);
    function input() {
        if (bulk) {
            return <textarea className="form-control" placeholder="url list" id="url_list" rows="5" title="Url List" hidden="" />
        }
        return <input type="text" className="form-control" placeholder="url" id="url" data-bs-toggle="tooltip" data-bs-placement="top" title="Url" />
    }

    return (
        <div className="col-sm-12 col-md-12 col-lg-6 col-xl-6 p-0 m-0 controls">
            <div className="container-fluid">
                <h3>Controls:</h3>
                <div className="row">
                    <form className="mb-2">
                        <label className="mb-2">URL:</label>
                        {input()}
                    </form>
                </div>
                <div className="row">
                    <Counters />
                </div>
                <div className="row">
                    <div className="col">
                        <div className="m-0 p-0 d-flex">
                            <label className="form-check-label">Bulk Listing: </label>
                            <div className="form-check form-switch mx-2">
                                <input className="form-check-input" type="checkbox" role="switch" id="bulk-listing" onClick={() => setBulk(!bulk)} />
                            </div>
                        </div>
                    </div>
                    <div className="col">
                        <div className="m-0 p-0 d-flex">
                            <label className="form-check-label">Watch for changes: </label>
                            <div className="form-check form-switch mx-2">
                                <input className="form-check-input" type="checkbox" role="switch" id="watch-list" />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="row mt-2">
                    <div className="col">
                        <div className="btn-group" role="group">
                            <button id="list_btn" type="button" onclick="listVideos()" className="btn btn-primary">List</button>
                            <button id="clear" type="button" onclick="clearSubList(true)" className="btn btn-primary">Clear</button>
                        </div>
                    </div>
                    <div className="col">
                        <div className="btn-group" role="group">
                            <button id="next-sub" type="button" onclick="nextSub()" className="btn btn-primary">Next</button>
                            <button id="back-sub" type="button" onclick="backSub()" className="btn btn-primary">Back</button>
                        </div>
                    </div>
                </div>
                <div className="row mt-2">
                    <div className="col">
                        <div className="btn-group" role="group">
                            <button id="all" type="button" onclick="selectAll()" className="btn btn-primary">All</button>
                            <button id="none" type="button" onclick="selectNone()" className="btn btn-primary">None</button>

                        </div>
                    </div>
                    <div className="col">
                        <div className="btn-group" role="group">
                            <button id="download_btn" type="button" onclick="downloadSelected()" className="btn btn-primary">Download</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
