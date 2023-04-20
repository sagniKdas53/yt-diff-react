import React, { lazy, useState, Suspense } from "react";

const InputForm = lazy(() => import("./InputForm.jsx"));
const SubList = lazy(() => import("./SubList.jsx"));

export default function InputView({ url, setUrl, disableBtns }) {
  const [respIndex, setRespStart] = useState(0);
  return (
    <Suspense fallback={<>Loading...</>}>
      <InputForm
        setParentUrl={setUrl}
        setRespStart={setRespStart}
        disableBtns={disableBtns}
      />
      <SubList
        listUrl={url}
        setParentUrl={setUrl}
        respIndex={respIndex}
        disableBtns={disableBtns}
      />
    </Suspense>
  );
}
