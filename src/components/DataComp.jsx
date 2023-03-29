import React, { lazy, Suspense } from "react";

const PlayList = lazy(() => import('./PlayList.jsx'));
const SubList = lazy(() => import('./SubList.jsx'));

export default function DataView({ url, setUrl }) {
    return (
        <Suspense fallback={<>Loading...</>}>
            <PlayList setParentUrl={setUrl} listUrl={url} />
            <SubList controls={true} listUrl={url} setParentUrl={setUrl} respIndex={0} />
        </Suspense>
    )
}