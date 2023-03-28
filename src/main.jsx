import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import "./styles/index.scss";

const NavBar = lazy(() => import('./components/nav.jsx'));
const DataView = lazy(() => import('./components/data.jsx'));
const InputView = lazy(() => import('./components/input.jsx'));

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
