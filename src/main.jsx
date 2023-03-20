import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import "./styles/index.scss";

import NavBar from "./components/nav";
import DataView from "./components/data";
import InputView from "./components/input";

function App() {
  const [showDataView, toggleView] = useState(false);
  const [sublistUrl, setUrl] = useState("");
  const toggleViewHandler = () => {
    toggleView(!showDataView);
    setUrl("");
  };
  return (
    <React.StrictMode>
      <NavBar state={showDataView} toggleView={toggleViewHandler} setUrl={setUrl} />
      <div className="container-fluid">
        <div className="row">
          {showDataView ? <DataView url={sublistUrl} setUrl={setUrl} /> : <InputView url={sublistUrl} setUrl={setUrl} />}
        </div>
      </div>
    </React.StrictMode>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
