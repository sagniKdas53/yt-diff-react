import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import "./styles/index.scss";
import Navbar from "./components/navbar";
import InputCol from "./components/inputcol";
import Sublist from "./components/sublist";
import Mainlist from "./components/mainlist";

function App() {
  const [showMainList, toggleComp] = useState(false);
  const toggleCompHandler = (state) => {
    toggleComp(state);
  }
  return (
    <React.StrictMode>
      <Navbar updateState={toggleCompHandler} state={showMainList} />
      <div className="container-fluid">
        <div className="row">
          {showMainList ? <Mainlist /> : <InputCol />}
          <Sublist showControls={showMainList}/>
        </div>
      </div>
    </React.StrictMode>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
