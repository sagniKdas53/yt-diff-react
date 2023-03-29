import React from "react";

export default function ListControl({ start, stop, chunk, setStart, setStop, setChunk }) {
    const next = () => {
        setStart(start + chunk);
        setStop(stop + chunk);
    };

    const back = () => {
        // Setting start value
        if ((start - chunk) <= 0) {
            setStart(0);
        } else {
            setStart(start - chunk);
        }
        // Setting stop value
        if ((stop - chunk) <= chunk) {
            setStop(chunk);
        } else {
            setStop(stop - chunk);
        }
    };

    const startHandler = (event) => {
        setStart(+event.target.value);
        setStop(chunk + +event.target.value);
    };
    const stopHandler = (event) => {
        setStop(+event.target.value);
        setChunk(start + +event.target.value);
    };
    const chunkHandler = (event) => {
        setChunk(+event.target.value);
        setStop(start + +event.target.value);
    };

    /*
    useEffect(() => {
        console.log(`Start: ${start}\nStop: ${stop}\nChunk: ${chunk}`);
    }, [start, stop, chunk]);;*/

    return (
        <div className="col m-0 p-0">
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
        </div>
    );
}
