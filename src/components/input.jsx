import React, { useState } from "react";

import InputForm from "./inputform";
import SubLists from "./sublists";

export default function InputView() {
    const [listUrl, setListUrl] = useState("");
    return (
        <>
            <InputForm setGlobalUrl={setListUrl} />
            <SubLists showControls={false} url={listUrl} />
        </>
    )
}