import React, { useState } from "react";

import InputForm from "./inputform";
import SubLists from "./sublists";

export default function InputView() {
    const [url, setUrl] = useState("");
    return (
        <>
            <InputForm setParentUrl={setUrl} />
            <SubLists controls={true} listUrl={url} />
        </>
    )
}