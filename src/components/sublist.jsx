import React from "react";
import Controls from "./controls";
import LCD from "./buttongroups";
export default function Sublist(props) {
    return (<div className="col-sm-12 col-md-12 col-lg-6 col-xl-6 p-0 m-0">
        <div className="container-table">
            <table className="table table-responsive">
                <thead>
                    <tr>
                        <th scope="col" className="table-dark text-center"><input className="form-check-input" type="checkbox" value="" id="selector" aria-label="..." /></th>
                        <th scope="col" className="table-dark large-title m-0 p-0 text-center align-middle">
                            <input type="text" className="search m-0 p-0" id="query_sublist" placeholder="Title" onkeyup="onFinishTyping()" />
                        </th>
                        <th scope="col" className="table-dark text-center">Saved</th>
                    </tr>
                </thead>
                <tbody id="listing"></tbody>
            </table>
        </div>
        {props.showConrols ? <><Controls/><LCD /></> : <></>}
    </div>);
}