import React, { lazy, useState } from "react";

const ListControl = lazy(() => import('./ListControl.jsx'));
import {
    FormControl
} from "react-bootstrap";

export default function InputForm({ setParentUrl, setRespStart }) {
    // all of the states are here
    //const [sort, updateSort] = useState(1);
    //const [order, updateOrder] = useState(1);
    const [start, setStart] = useState(0);
    const [stop, setStop] = useState(10);
    const [chunk, setChunk] = useState(10);
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
    const listThis = async () => {
        if (bulkListing) {
            const valid = new Set(urlList.trim().split("\n").filter(validate));
            try {
                for (const element of valid) {
                    const response = await postUrl(element).then((response) => response.text()).then((data) => JSON.parse(data));
                    // console.log(response.rows[0]["reference"]);
                    // since listing may take a while having this here as an intermediate state can't hurt too much.
                    setParentUrl(response.rows[0]["reference"]);
                    setRespStart(+response.start);
                }
            } catch (error) {
                console.error(error);
            }
        } else {
            try {
                if (validate(url)) {
                    const response = await postUrl(url).then((response) => response.text()).then((data) => JSON.parse(data));
                    // I plan on getting the limits form the backend db thus being able to update the subList sate form here
                    // fetching data as needed, this will also prevent the overhead of serealizing the resposne in intial listing.
                    setParentUrl(response.rows[0]["reference"]);
                    setRespStart(+response.start);
                }
            } catch (error) {
                console.error(error);
            }
        }
    };

    const validate = (element) => {
        try {
            const url = new URL(element);
            if (url.protocol !== "https:" && url.protocol !== "http:") {
                console.error("Invalid url: " + url);
                return false;
            }
        } catch (error) {
            console.error("Problem parsing url: " + url);
            return false;
        }
        return true;
    }

    const postUrl = (urlItem) => {
        return fetch("http://lenovo-ideapad-320-15ikb.tail9ece4.ts.net:8888/ytdiff/list", {
            method: "post",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            mode: "cors",
            body: JSON.stringify({
                url: urlItem,
                start: start,
                stop: stop,
                chunk: chunk,
                watch: watchMode,
                continuous: bulkListing
            })
        });
    }

    /*useEffect(() => {
        console.log(`MainList:\n\tbulk: ${bulkListing}\n\turl: "${url}"\n\turlList: "${urlList}"
        start: ${start}\n\tstop: ${stop}\n\tchunk: ${chunk}\n\twatch: ${watchMode}`);
        //\n\titems: ${JSON.stringify(items)}
    }, [bulkListing, url, urlList, watchMode, chunk, start, stop])*/

    return (
        <div className="col-xl-6 col-lg-6 col-md-12 col-sm-12 col-12">
            <div className="container-fluid input-card">
                <div className="row my-2">
                    <h5 className="m-0 p-0 mb-1">Url:</h5>
                    {bulkListing ?
                        <textarea className="form-control" placeholder="url list" id="url_list" rows="5" title="Url List" hidden="" value={urlList} onChange={updateUrls} /> :
                        <input type="text" className="form-control" placeholder="url" id="url" data-bs-toggle="tooltip" data-bs-placement="top" title="Url" value={url} onChange={updateUrls} />}
                </div>
                <div className="row my-2">
                    <div className="col align-items-center m-0 p-0">
                        <div className="m-0 p-0 d-flex flex-row align-items-center">
                            <label className="form-check-label emoji align-items-center">Watch Playlist? </label>
                            <FormControl
                                className="form-select-sm mx-2 align-items-center"
                                id="watch-change"
                                as="select"
                                defaultValue={watchMode}
                                onChange={(event) => setWatch(event.target.value)}
                            >
                                <option value="1">NO</option>
                                <option value="2">Full</option>
                                <option value="3">Quick</option>
                            </FormControl>
                        </div>
                    </div>
                    <div className="col align-items-center m-0 p-0">
                        <div className="m-0 p-0 d-flex flex-row align-items-center">
                            <label className="form-check-label emoji align-items-center">Toggle To: </label>
                            <button id="bulk_tgl_btn" type="button" onClick={() => toggleBulk(!bulkListing)}
                                className="btn btn-primary mx-2 btn-sm">{bulkListing ? "Single" : "Bulk"}</button>
                        </div>
                    </div>
                </div>
                <div className="row mb-2">
                    <h5 className="m-0 p-0 mb-1">Controls:</h5>
                    <ListControl start={start} stop={stop} chunk={chunk} setStart={setStart} setStop={setStop} setChunk={setChunk} />
                </div>
                <div className="row mb-2">
                    <div className="col m-0 p-0">
                        <div className="btn-group" role="group">
                            <button id="list_btn" type="button" onClick={listThis} className="btn btn-primary">List</button>
                            <button id="clear_btn" type="button" onClick={() => { console.log("TODO") }} className="btn btn-primary">Clear</button>
                        </div>
                    </div>
                    <div className="col m-0 p-0"></div>
                </div>
            </div>
        </div>
    );
}