import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import "./styles/index.scss";

import NavBar from "./components/nav";
import DataView from "./components/data";
import InputView from "./components/input";

function App() {
  const [show, toggleView] = useState(false);
  const [url, setUrl] = useState("");
  return (
    <React.StrictMode>
      <NavBar state={show} updateState={toggleView} setUrl={setUrl} />
      <div className="container-fluid">
        <div className="row">
          {show ? <DataView url={url} setUrl={setUrl} /> : <InputView url={url} setUrl={setUrl} />}
        </div>
      </div>
    </React.StrictMode>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
