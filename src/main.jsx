import React, { lazy, Suspense, useState } from "react";
import ReactDOM from "react-dom/client";
import "./styles/index.scss";

const NavBar = lazy(() => import("./components/NavBar.jsx"));
const DataView = lazy(() => import("./components/DataComp.jsx"));
const InputView = lazy(() => import("./components/InputComp.jsx"));

function App() {
  const [input, toggle] = useState(true);
  const [SubListUrl, setSubListUrl] = useState("");
  const toggleFunc = () => {
    toggle(!input);
    setSubListUrl("");
  };
  return (
    <React.StrictMode>
      <NavBar
        showInput={input}
        toggleFunc={toggleFunc}
        setSubListUrl={setSubListUrl}
      />
      <div className="container-fluid">
        <div className="row">
          <Suspense fallback={<>Loading...</>}>
            {input ? (
              <DataView url={SubListUrl} setUrl={setSubListUrl} />
            ) : (
              <InputView url={SubListUrl} setUrl={setSubListUrl} />
            )}
          </Suspense>
        </div>
      </div>
    </React.StrictMode>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
