import React, { useEffect, useState } from "react";

import Table from 'react-bootstrap/Table';

import Controls from "./controls";
import ListClearDownload from "./buttongroups";

function SubListTable({ tableData, sendQuery }) {
    const queryHandler = (event) => sendQuery(event.target.value.trim());
    return (
        <div className="container-table m-0 p-0 container-fluid">
            <Table responsive>
                <thead>
                    <tr>
                        <th className="table-dark text-center">
                            <input className="form-check-input" type="checkbox" value="" id="selector" aria-label="..." />
                        </th>
                        <th className="table-dark large-title m-0 p-0 text-center align-middle">
                            <input type="text" className="search m-0 p-0" id="query_sublist" placeholder="Title" onKeyUp={queryHandler} />
                        </th>
                        <th className="table-dark text-center">Saved</th>
                    </tr>
                </thead>
                <tbody id="listing">
                    {tableData.rows.map((element, index) => (
                        <tr key={index} className={element.downloaded ? "table-info" : !element.available ? (element.title === "[Deleted video]" ? "table-danger" : element.title === "[Private video]" ? "table-warning" : "table-secondary") : ""}>
                            <td className="text-center">
                                <input type="checkbox" className="form-check-input me-1 video-item" value="" id={element.id} />
                            </td>
                            <td className="large-title">
                                <a href={element.url}>{element.title}</a>
                            </td>
                            <td className="emoji">{element.downloaded ? "✅" : "❌"}</td>
                        </tr>
                    ))}
                </tbody>
            </Table>
        </div>
    );
}

export default function SubLists({ controls, url }) {
    const [start, setStart] = useState(0);
    const [stop, setStop] = useState(10);
    const [chunk, setChunk] = useState(10);
    const [query, getQuery] = useState("");
    const [data, setData] = useState({ count: 0, rows: [] });
    useEffect(() => {
        console.log("Sub Query", query, "\nSub Query Url", url, "\nData", data);
        fetch("http://localhost:8888/ytdiff/getsub", {
            method: "post",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json"
            }, mode: "cors",
            body: JSON.stringify({
                url: url,
                start: start,
                stop: stop,
                query: query
            })
        }).then((response) => response.text())
            .then((data) => JSON.parse(data))
            .then((json_data) => setData(json_data));
    }, [query, url, start, stop, chunk])


    return (
        <div className="m-0 p-0 col-xl-6 col-lg-6 col-md-12 col-sm-12 col-12">
            <SubListTable sendQuery={getQuery} tableData={data} />
            {controls ? <div className="m-0 p-0 cont-group container-fluid">
                <div className="row p-1 mx-2">
                    <Controls start={start} stop={stop} chunk={chunk} setStart={setStart} setStop={setStop} setChunk={setChunk} />
                </div>
                <div className="row p-1 mx-2">
                    <ListClearDownload noList />
                </div>
            </div> : <></>}
        </div>)
}