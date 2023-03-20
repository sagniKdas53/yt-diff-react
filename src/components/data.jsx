import React from "react";

import PlayListController from "./playlists";
import SubLists from "./sublists";

export default function DataView({ url, setUrl }) {
    return (
        <>
            <PlayListController setParentUrl={setUrl} listUrl={url} />
            <SubLists controls={true} listUrl={url} setParentUrl={setUrl} />
        </>
    )
}