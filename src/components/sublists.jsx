import React, { useEffect, useState, useMemo, useRef } from "react";

import Table from 'react-bootstrap/Table';
import debounce from "lodash.debounce";

import Controls from "./controls";

function SubListTable({ tableData, sendQuery, listUrl, selectedItems, updateSelected }) {
    const [selectAll, setSelectAll] = useState(false);
    // absolutely unnecessary
    const query = useRef("");
    const handleSelection = (event) => {
        const { id, checked } = event.target;
        updateSelected(prevItems => ({ ...prevItems, [id]: checked }));
    };

    const bulkAction = () => {
        const tempState = {};
        tableData.rows.forEach((element) => {
            tempState[element.id] = !selectAll;
        });
        updateSelected(prevSelected => ({ ...prevSelected, ...tempState }));
        setSelectAll(!selectAll);
    };

    useEffect(() => {
        updateSelected({});
        setSelectAll(false);
    }, [listUrl]);

    useEffect(() => {
        setSelectAll(false);
    }, [tableData]);

    const debouncedQuery = useMemo(() => debounce((event) => sendQuery(event.target.value.trim()), 1000), []);

    return (
        <div className="container-table m-0 p-0 container-fluid">
            <Table responsive className="m-0 p-0">
                <thead className="sticky-top">
                    <tr>
                        <th className="table-dark text-center">
                            <input
                                className="form-check-input"
                                type="checkbox"
                                onChange={bulkAction}
                                checked={selectAll}
                                id="selector"
                                aria-label="..."
                            />
                        </th>
                        <th className="table-dark large-title m-0 p-0 text-center align-middle">
                            <input
                                type="text"
                                className="search m-0 p-0"
                                id="query_sublist"
                                placeholder="Title"
                                ref={query}
                                onKeyUp={debouncedQuery}
                            />
                        </th>
                        <th className="table-dark text-center">Saved</th>
                    </tr>
                </thead>
                <tbody id="listing">
                    {tableData.rows.map((element, index) => (
                        <tr
                            key={index}
                            className={
                                element.downloaded
                                    ? 'table-info'
                                    : !element.available
                                        ? element.title === '[Deleted video]'
                                            ? 'table-danger'
                                            : element.title === '[Private video]'
                                                ? 'table-warning'
                                                : 'table-secondary'
                                        : ''
                            }
                        >
                            <td className="text-center">
                                <input
                                    type="checkbox"
                                    className="form-check-input me-1 video-item"
                                    checked={selectedItems[element.id] || false}
                                    onChange={handleSelection}
                                    id={element.id}
                                />
                            </td>
                            <td className="large-title mx-0 px-0">
                                <a href={element.url} target="_blank" rel="noreferrer">
                                    {element.title}
                                </a>
                            </td>
                            <td className="emoji">{element.downloaded ? '✅' : '❌'}</td>
                        </tr>
                    ))}
                </tbody>
            </Table>
        </div>
    );
}

export default function SubLists({ controls, listUrl, setParentUrl }) {
    const [start, setStart] = useState(0);
    const [stop, setStop] = useState(10);
    const [chunk, setChunk] = useState(10);
    const [query, getQuery] = useState("");
    const [data, setData] = useState({ count: 0, rows: [] });
    const [selectedItems, updateSelected] = useState({});

    const fetchOptions = useMemo(() => ({
        method: "post",
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
        },
        mode: "cors"
    }), []);

    const fetchData = useMemo(() => async (url, start, stop, query) => {
        const response = await fetch("http://localhost:8888/ytdiff/getsub", {
            ...fetchOptions,
            body: JSON.stringify({
                url,
                start,
                stop,
                query
            })
        });
        const data = await response.text();
        return JSON.parse(data);
    }, [fetchOptions]);


    useEffect(() => {
        if (listUrl !== "" && listUrl !== undefined) {
            fetchData(listUrl, start, stop, query)
                .then(json_data => setData(json_data));
        }
    }, [fetchData, listUrl, start, stop, query]);

    function clear() {
        setParentUrl("");
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
                    <div className="col m-0 p-0">
                        <div className="btn-group" role="group" aria-label="controls"><button type="button"
                            className="btn btn-primary" onClick={clear}>Clear</button></div>
                    </div>
                    <div className="col m-0 p-0">
                        <button type="button" className="float-end btn btn-primary" onClick={download}>Download</button>
                    </div>
                </div>
            </div> : <></>}
        </div>)
}