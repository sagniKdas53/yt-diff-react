import React, { useEffect, useState } from "react";

import Table from 'react-bootstrap/Table';

import Controls from "./controls";
import ListClearDownload from "./buttongroups";

function SubListTable({ tableData, sendQuery, listUrl, selectedItems, updateSelected }) {
    const queryHandler = (event) => sendQuery(event.target.value.trim());
    const [selectAll, toggleAll] = useState(false);
    // this is just for debugging
    useEffect(() => {
        console.log("selectAll", selectAll);
        console.log("selectedItems", selectedItems, Object.keys(selectedItems).length);
    }, [selectedItems]);
    // when new listUrl is loaded, reset the selectedItems and select all checkbox
    useEffect(() => {
        updateSelected({});
        toggleAll(false);
    }, [listUrl]);
    // when new data is loaded for the same listUrl, uncheck the select all checkbox
    useEffect(() => {
        toggleAll(false);
    }, [tableData])
    // utility function
    const handleSelection = (event) => {
        let id = event.target.id,
            checked = event.target.checked;
        updateSelected(prevItems => ({ ...prevItems, [id]: checked }));
    }
    const bulkAction = () => {
        let tempState = {}
        tableData.rows.map((element) => {
            tempState[element.id] = !selectAll;
        });
        updateSelected(prevSelected => ({ ...prevSelected, ...tempState }));
        toggleAll(!selectAll)
    }
    return (
        <div className="container-table m-0 p-0 container-fluid">
            <Table responsive className="m-0 p-0">
                <thead className="sticky-top">
                    <tr>
                        <th className="table-dark text-center">
                            <input className="form-check-input" type="checkbox" onChange={bulkAction} checked={selectAll} id="selector" aria-label="..." />
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
                                <input type="checkbox" className="form-check-input me-1 video-item" checked={selectedItems[element.id] || false} onChange={handleSelection} id={element.id} />
                            </td>
                            <td className="large-title mx-0 px-0">
                                <a href={element.url} target="_blank" rel="noreferrer">{element.title}</a>
                            </td>
                            <td className="emoji">{element.downloaded ? "✅" : "❌"}</td>
                        </tr>
                    ))}
                </tbody>
            </Table>
        </div>
    );
}

export default function SubLists({ controls, listUrl }) {
    const [start, setStart] = useState(0);
    const [stop, setStop] = useState(10);
    const [chunk, setChunk] = useState(10);
    const [query, getQuery] = useState("");
    const [data, setData] = useState({ count: 0, rows: [] });
    const [selectedItems, updateSelected] = useState({});
    useEffect(() => {
        //console.log(`SubList\n\tUrl: ${listUrl}\n\tQuery: ${query}\n\tStart: ${start}\n\tStop: ${stop}\n\tData: ${JSON.stringify(data)}`)
        // this will prevent unecessary calls
        if (listUrl !== "" && listUrl !== undefined) {
            fetch("http://localhost:8888/ytdiff/getsub", {
                method: "post",
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json"
                }, mode: "cors",
                body: JSON.stringify({
                    url: listUrl,
                    start: start,
                    stop: stop,
                    query: query,
                })
            }).then((response) => response.text())
                .then((data) => JSON.parse(data))
                .then((json_data) => setData(json_data));
        }
    }, [query, listUrl, start, stop, chunk])

    function clear() {
        listUrl = "";
        setStart(0);
        setStop(10);
        setChunk(10);
        getQuery("");
        setData({ count: 0, rows: [] });
    }

    function download() {
        const data = Object.keys(selectedItems).filter(key => selectedItems[key]);
        console.log(JSON.stringify({ id: data }));
        fetch("http://localhost:8888/ytdiff/download", {
            method: "post",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json"
            }, mode: "cors",
            body: JSON.stringify({ id: data })
        });
    }

    return (
        <div className="m-0 p-0 col-xl-6 col-lg-6 col-md-12 col-sm-12 col-12">
            <SubListTable sendQuery={getQuery} tableData={data} listUrl={listUrl} selectedItems={selectedItems} updateSelected={updateSelected} />
            {controls ? <div className="m-0 p-0 cont-group container-fluid">
                <div className="row p-1 mx-2">
                    <Controls start={start} stop={stop} chunk={chunk} setStart={setStart} setStop={setStop} setChunk={setChunk} />
                </div>
                <div className="row p-1 mx-2">
                    <ListClearDownload noList clearFunc={clear} downloadFunc={download} />
                </div>
            </div> : <></>}
        </div>)
}