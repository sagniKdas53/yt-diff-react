import React, { useEffect, useState } from "react";
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import ListClearDownload from "./buttongroups"
import Controls from "./controls";

export default function InputForm({ setGlobalUrl }) {
    const [bulk, setBulk] = useState(false);
    const [url, setUrl] = useState("");
    const [urlList, setUrlList] = useState("");
    const [limits, updateLimits] = useState([0, 10, 10]);
    const [watch, setWatch] = useState(false);
    const [items, getItems] = useState([]);
    const limitsGetter = (state) => {
        updateLimits(state);
    };
    const updateUrls = (event) => {
        if (bulk) {
            setUrlList(event.target.value);
        } else {
            setUrl(event.target.value);
        }
    };
    const listThis = () => {
        fetch("http://localhost:8888/ytdiff/list", {
            method: "post",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            mode: "cors",
            body: JSON.stringify({
                url: bulk ? urlList : url,
                start: limits[0],
                stop: limits[1],
                chunk: limits[2],
                watch: watch,
                continuous: bulk
            })
        }).then((response) => response.text())
            .then((data) => JSON.parse(data))
            .then((json_data) => getItems(json_data));
    };
    const clearThis = () => {
        setBulk(false);
        setUrl("");
        setUrlList("");
        updateLimits([0, 10]);
        setWatch(false);
    };
    const downloadThese = () => {

    }
    useEffect(() => {
        console.log(`MainList:\n\tbulk: ${bulk}\n\turl: ${url}\n\turlList: ${urlList}\n\tlimits: ${limits}\n\twatch: ${watch}\n\titems: ${items}`);
    }, [bulk, url, urlList, limits, watch, items])
    return (
        <Col xs={12} sm={12} md={12} lg={6} xl={6}>
            <Container fluid>
                <Row className="mb-3">
                    <h3>URL:</h3>
                    {bulk ?
                        <textarea className="form-control" placeholder="url list" id="url_list" rows="5" title="Url List" hidden="" value={urlList} onChange={updateUrls} /> :
                        <input type="text" className="form-control" placeholder="url" id="url" data-bs-toggle="tooltip" data-bs-placement="top" title="Url" value={url} onChange={updateUrls} />}
                </Row>
                <Row className="mt-3">
                    <Controls getLimits={limitsGetter} setLimits={limits} />
                </Row>
                <Row className="mt-3">
                    <Col>
                        <div className="m-0 p-0 d-flex">
                            <label className="form-check-label">Bulk Listing: </label>
                            <div className="form-check form-switch mx-2">
                                <input className="form-check-input" type="checkbox" checked={bulk} role="switch" id="bulk-listing" onChange={() => setBulk(!bulk)} />
                            </div>
                        </div>
                    </Col>
                    <Col>
                        <div className="m-0 p-0 d-flex">
                            <label className="form-check-label">Watch for changes: </label>
                            <div className="form-check form-switch mx-2">
                                <input className="form-check-input" type="checkbox" checked={watch} role="switch" id="watch-list" onChange={() => setWatch(!watch)} />
                            </div>
                        </div>
                    </Col>
                </Row>
                <Row className="my-2">
                    <ListClearDownload listFunc={listThis} clearFunc={clearThis} downloadFunc={downloadThese} />
                </Row>
            </Container>
        </Col>
    );
}