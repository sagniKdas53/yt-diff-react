import React from "react";
export default function Mainlist() {
    return (<div className="col-sm-12 col-md-12 col-lg-6 col-xl-6 p-0 m-0">
        <div className="container-fluid m-0 p-0 container-table">
            <table className="table table-responsive">
                <thead>
                    <tr className="bg-dark">
                        <th scope="col" className="table-dark text-center">ID</th>
                        <th scope="col" className="table-dark large-play-title m-0 p-0 text-center align-middle">
                            <input type="text" className="search m-0 p-0" id="query_main_list" placeholder="List Title" onkeyup="onFinishTypingMain()" />
                        </th>
                        <th scope="col" className="table-dark extra text-center">Updated</th>
                        <th scope="col" className="table-dark">Watch</th>
                        <th scope="col" className="table-dark text-center">Expand</th>
                    </tr>
                </thead>
                <tbody id="placeholder"></tbody>
            </table>
        </div>
        <div className="container-fluid m-0 p-0 container-counters">
            <div className="row">
                <div className="input-group mt-3">
                    <input type="number" className="form-control" placeholder="0" min="0" name="start_playlist" id="start_playlist" data-bs-toggle="tooltip" data-bs-placement="top" title="Start" />
                    <span className="input-group-text">-</span>
                    <input type="number" className="form-control" placeholder="10" min="1" name="stop_playlist" id="stop_playlist" data-bs-toggle="tooltip" data-bs-placement="top" title="Stop" />
                    <span className="input-group-text">-</span>
                    <input type="number" className="form-control" placeholder="10" min="1" name="chunk_playlist" id="chunk_playlist" data-bs-toggle="tooltip" data-bs-placement="top" title="Chunk" />
                    <button id="next" type="button" onclick="nextMain()" className="btn btn-primary">
                        Next
                    </button>
                    <button id="back" type="button" onclick="backMain()" className="btn btn-primary">
                        Back
                    </button>
                </div>
            </div>
        </div>
        <div className="container-fluid mb-3 m-0 p-0">
            <div className="input-group mt-3">
                <select className="form-select" id="sort_by_playlist" aria-label="sorting">
                    <option selected="" value="0">Choose...</option>
                    <option value="1">ID</option>
                    <option value="2">CreatedAt</option>
                    <option value="3">UpdatedAt</option>
                </select>
                <select className="form-select" id="order_by_playlist" aria-label="ordering">
                    <option selected="" value="0">Choose...</option>
                    <option value="1">Ascending</option>
                    <option value="2">Descending</option>
                </select>
                <button className="btn btn-primary" type="button" onclick="sortLoaded()">Sort</button>
            </div>
        </div>
    </div>)
}