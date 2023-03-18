import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import "./styles/index.scss";

import NavBar from "./components/nav";
import DataView from "./components/data";
import InputView from "./components/input";

function App() {
  const [show, toggleView] = useState(false);
  return (
    <>
      <NavBar state={show} updateState={toggleView} />
      <div className="container-fluid">
        <div className="row">
          {show ? <DataView /> : <InputView />}
        </div>
      </div>
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
