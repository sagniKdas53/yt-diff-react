import React, { useState } from "react";

import PlayLists from "./playlists";
import SubLists from "./sublists";

export default function DataView() {
    const [listUrl, setListUrl] = useState("");
    return (
        <>
            <PlayLists setGlobalUrl={setListUrl} />
            <SubLists controls={true} url={listUrl} />
        </>
    )
}