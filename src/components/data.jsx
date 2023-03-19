import React from "react";

import PlayListController from "./playlists";
import SubLists from "./sublists";

export default function DataView({ url, setUrl }) {
    return (
        <>
            <PlayListController setParentUrl={setUrl} />
            <SubLists controls={true} listUrl={url} />
        </>
    )
}