import React, { useEffect, useState } from "react";
import { Col, InputGroup, FormControl, Button } from "react-bootstrap";

export default function Controls({ getLimits }) {
    const [start, setStart] = useState(0);
    const [stop, setStop] = useState(10);
    const [chunk, setChunk] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const next = () => {
        setStart(start + chunk);
        setStop(stop + chunk);
        setCurrentPage(currentPage + 1);
    };

    const startHandler = (event) => {
        setStart(+event.target.value);
        setStop(chunk + +event.target.value);
        setCurrentPage((chunk + +event.target.value) / chunk);
    };
    const stopHandler = (event) => {
        setStop(+event.target.value);
        setChunk(start + +event.target.value);
        setCurrentPage(+event.target.value / chunk);
    };
    const chunkHandler = (event) => {
        setChunk(+event.target.value);
        setStop(start + +event.target.value);
        setCurrentPage(stop / +event.target.value);
    };

    const back = () => {
        if (Math.floor(currentPage) - 1 >= 1) {
            if ((start - chunk) >= 0) {
                setStart(start - chunk);
            } else {
                setStart(0);
            }
            if ((stop - chunk) >= 1) {
                setStop(stop - chunk);
            } else {
                setStart(chunk);
            }
            setStop(stop - chunk);
            setCurrentPage(currentPage - 1);
        } else {
            setStart(0);
            setStop(chunk);
            setCurrentPage(1);
        }
    };

    useEffect(() => {
        // Perform any side effects here that depend on the currentPage state variable
        //console.log(`Current page: ${currentPage}`);
        getLimits([start, stop]);
    }, [currentPage]);

    return (
        <Col className="m-0 p-0">
            <div className="input-group m-0 p-0">
                <input
                    type="number"
                    className="form-control"
                    placeholder="0"
                    min="0"
                    name="start_sublist"
                    onChange={startHandler}
                    id="start_sublist"
                    data-bs-toggle="tooltip"
                    data-bs-placement="top"
                    title="Start"
                    value={start}
                />
                <span className="input-group-text">-</span>
                <input
                    type="number"
                    className="form-control"
                    placeholder="10"
                    min="1"
                    name="stop_sublist"
                    onChange={stopHandler}
                    id="stop_sublist"
                    data-bs-toggle="tooltip"
                    data-bs-placement="top"
                    title="Stop"
                    value={stop}
                />
                <span className="input-group-text">-</span>
                <input
                    type="number"
                    className="form-control"
                    placeholder="10"
                    min="1"
                    name="chunk_sublist"
                    onChange={chunkHandler}
                    id="chunk_sublist"
                    data-bs-toggle="tooltip"
                    data-bs-placement="top"
                    title="Chunk"
                    value={chunk}
                />
                <button
                    id="next-sub"
                    type="button"
                    onClick={next}
                    className="btn btn-primary"
                >
                    Next
                </button>
                <button
                    id="back-sub"
                    type="button"
                    onClick={back}
                    className="btn btn-primary"
                >
                    Back
                </button>
            </div>
        </Col>
    );
}
