import React from "react";
export default function Controls() {
    return (
        <>
            <div class="input-group my-3 p-0">
                <input type="number" class="form-control" placeholder="0" min="0" name="start_sublist"
                    id="start_sublist" data-bs-toggle="tooltip" data-bs-placement="top" title="Start" />
                <span class="input-group-text">-</span>
                <input type="number" class="form-control" placeholder="10" min="1" name="stop_sublist"
                    id="stop_sublist" data-bs-toggle="tooltip" data-bs-placement="top" title="Stop" />
                <span class="input-group-text">-</span>
                <input type="number" class="form-control" placeholder="10" min="1" name="chunk_sublist"
                    id="chunk_sublist" data-bs-toggle="tooltip" data-bs-placement="top" title="Chunk" />
                <button id="next-sub" type="button" onclick="nextSub()" class="btn btn-primary">
                    Next
                </button>
                <button id="back-sub" type="button" onclick="backSub()" class="btn btn-primary">
                    Back
                </button>
            </div>
        </>
    );
}