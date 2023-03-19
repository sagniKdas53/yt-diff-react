import React from "react";

import InputForm from "./inputform";
import SubLists from "./sublists";

export default function InputView({ url, setUrl }) {
    return (
        <>
            <InputForm setParentUrl={setUrl} />
            <SubLists controls={true} listUrl={url} />
        </>
    )
}