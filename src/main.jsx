import React, { lazy, Suspense, useState } from "react";
import ReactDOM from "react-dom/client";
import "./styles/index.scss";

const NavBar = lazy(() => import('./components/NavBar.jsx'));
const DataComp = lazy(() => import('./components/DataComp.jsx'));
const InputComp = lazy(() => import('./components/InputComp.jsx'));

function App() {
  const [showData, toggleData] = useState(false);
  const [sublistUrl, setSublistUrl] = useState("");
  const toggleView = () => {
    toggleData(!showData);
    setSublistUrl("");
  };
  return (
    <React.StrictMode>
      <NavBar showData={showData} toggleView={toggleView} setUrl={setSublistUrl} />
      <div className="container-fluid">
        <div className="row">
          <Suspense fallback={<>Loading...</>}>
            {showData ?
              <DataComp url={sublistUrl} setUrl={setSublistUrl} /> :
              <InputComp url={sublistUrl} setUrl={setSublistUrl} />}
          </Suspense>
        </div>
      </div>
    </React.StrictMode>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
