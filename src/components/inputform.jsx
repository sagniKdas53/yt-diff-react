import React, { useEffect, useState } from "react";

import Controls from "./controls";
import {
    FormControl
} from "react-bootstrap";
export default function InputForm({ setParentUrl }) {
    // all of the states are here
    //const [sort, updateSort] = useState(1);
    //const [order, updateOrder] = useState(1);
    const [start, setStart] = useState(0);
    const [stop, setStop] = useState(10);
    const [chunk, setChunk] = useState(10);
    //const [items, getItems] = useState([]);
    const [bulkListing, toggleBulk] = useState(false);
    const [url, setUrl] = useState("");
    const [urlList, setUrlList] = useState("");
    const [watchMode, setWatch] = useState("1");

    const updateUrls = (event) => {
        if (bulkListing) {
            setUrlList(event.target.value);
        } else {
            setUrl(event.target.value);
        }
    };
    const listThis = () => {
        /*
            urlList need to be be processed in a forEach loop, then the fetch will be done.
        */
        fetch("http://localhost:8888/ytdiff/list", {
            method: "post",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            mode: "cors",
            body: JSON.stringify({
                url: bulkListing ? urlList.trim().split("\n") : url,
                start: start,
                stop: stop,
                chunk: chunk,
                watch: watchMode,
                continuous: bulkListing
            })
        }).then((response) => response.text()).then((data) => JSON.parse(data))
            .then((data) => { console.log("setting parent url"); setParentUrl(bulkListing ? "None" : data.rows[0]["reference"]) });
    };

    useEffect(() => {
        console.log(`MainList:\n\tbulk: ${bulkListing}\n\turl: "${url}"\n\turlList: "${urlList}"\n\tstart: ${start}\n\tstop: ${stop}\n\tchunk: ${chunk}\n\twatch: ${watchMode}`);
        //\n\titems: ${JSON.stringify(items)}
    }, [bulkListing, url, urlList, watchMode, chunk, start, stop])

    return (
        <div className="col-xl-6 col-lg-6 col-md-12 col-sm-12 col-12">
            <div className="container-fluid input-card">
                <div className="row my-2">
                    <h5 className="m-0 p-0 mb-1">Url:</h5>
                    {bulkListing ?
                        <textarea className="form-control" placeholder="url list" id="url_list" rows="5" title="Url List" hidden="" value={urlList} onChange={updateUrls} /> :
                        <input type="text" className="form-control" placeholder="url" id="url" data-bs-toggle="tooltip" data-bs-placement="top" title="Url" value={url} onChange={updateUrls} />}
                </div>
                <div className="row mt-2">
                    <h5 className="m-0 p-0 mb-1">List Control:</h5>
                    <Controls start={start} stop={stop} chunk={chunk} setStart={setStart} setStop={setStop} setChunk={setChunk} />
                </div>
                <div className="row my-2">
                    <div className="col align-items-center m-0 p-0">
                        <div className="m-0 p-0 d-flex flex-row align-items-center">
                            <label className="form-check-label m-0 p-0" for="bulkListing-listing">Bulk Listing: </label>
                            <div className="form-check form-switch">
                                <input className="form-check-input" role="switch" type="checkbox" checked={bulkListing} id="bulkListing-listing" onChange={() => toggleBulk(!bulkListing)} />
                            </div>
                        </div>
                    </div>
                    <div className="col align-items-center m-0 p-0">
                        <div className="m-0 p-0 d-flex flex-row align-items-center">
                            <label className="form-check-label emoji align-items-center">Monitor Playlist: </label>
                            <FormControl
                                className="form-select-sm mx-2 align-items-center"
                                id="watch-change"
                                as="select"
                                defaultValue={watchMode}
                                onChange={(event) => setWatch(event.target.value)}
                            >
                                <option value="1">NA</option>
                                <option value="2">Full</option>
                                <option value="3">Quick</option>
                            </FormControl>
                        </div>
                    </div>
                </div>
                <div className="row mb-2">
                    <div className="col m-0 p-0">
                        <button id="list_btn" type="button" onClick={listThis} className="btn btn-primary">List</button>
                    </div>
                    <div className="col m-0 p-0"></div>
                </div>
            </div>
        </div>
    );
}