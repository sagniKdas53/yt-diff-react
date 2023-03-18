import React, { useState } from "react";

import PlayLists from "./playlists";
import SubLists from "./sublists";

export default function DataView() {
    const [url, setUrl] = useState("");
    return (
        <>
            <PlayLists setParentUrl={setUrl} />
            <SubLists controls={true} listUrl={url} />
        </>
    )
}