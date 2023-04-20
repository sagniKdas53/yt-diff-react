import React, { lazy, useState, Suspense } from "react";

const InputForm = lazy(() => import("./InputForm.jsx"));
const SubList = lazy(() => import("./SubList.jsx"));

export default function InputView({ url, setUrl, disableBtns, setProgress }) {
  const [respIndex, setRespIndex] = useState(0);
  return (
    <Suspense fallback={<>Loading...</>}>
      <InputForm
        setParentUrl={setUrl}
        setRespIndex={setRespIndex}
        disableBtns={disableBtns}
        setProgress={setProgress}
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
