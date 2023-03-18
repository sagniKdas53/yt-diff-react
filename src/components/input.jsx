import React, { useState } from "react";

import InputForm from "./inputform";
import SubLists from "./sublists";

export default function InputView() {
    const [url, setUrl] = useState("");
    return (
        <>
            <InputForm setListUrl={setUrl} />
            <SubLists showControls={false} listUrl={url} />
        </>
    )
}