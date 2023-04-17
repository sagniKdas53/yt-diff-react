import React, { lazy, Suspense, useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import "./styles/index.scss";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer, toast } from "react-toastify";
import io from "socket.io-client";
const socket = io.connect("http://localhost:8888", {
  path: "/ytdiff/socket.io",
});

const NavBar = lazy(() => import("./components/NavBar.jsx"));
const DataView = lazy(() => import("./components/DataComp.jsx"));
const InputView = lazy(() => import("./components/InputComp.jsx"));

function App() {
  const [input, toggle] = useState(true);
  const [SubListUrl, setSubListUrl] = useState("");
  const [id, setID] = useState("");
  const [disableBtns, toggleDisable] = useState(false);
  // disableBtns should be passed in as a prop to the buttons so that that they can be disabled,
  // when the prop is false the buttons are enabled and when it's true they are disabled
  // after some thinking it can also be used to refresh the sublist when the download or listing is done.
  const toggleFunc = () => {
    toggle(!input);
    setSubListUrl("");
  };

  useEffect(() => {
    socket.on("init", function (data) {
      setID(data.id);
      socket.emit("acknowledge", { data: "Connected", id: data.id });
    });
    socket.on("download-start", function (data) {
      toggleDisable(true);
    });
    socket.on("progress", function (data) {
      toggleDisable(true);
    });
    socket.on("error", function (data) {
      console.log(`${data.message} ❌`);
      toast.error(`${data.message} ❌`, {
        position: "bottom-right",
        autoClose: false,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: 0,
        theme: "light",
      });
    });
    socket.on("download-done", function (data) {
      toast.success(`${data.message} ✅`, {
        position: "bottom-right",
        autoClose: false,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: 0,
        theme: "light",
      });
      toggleDisable(false);
    });
    socket.on("playlist-done", function (data) {
      toast.success(`${data.message} ✅`, {
        position: "bottom-right",
        autoClose: false,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: 0,
        theme: "light",
      });
      toggleDisable(false);
    });
  }, [socket]);

  // Use react-router-dom
  return (
    <React.StrictMode>
      <NavBar
        showInput={input}
        toggleFunc={toggleFunc}
        setSubListUrl={setSubListUrl}
        id={id}
      />
      <div className="container-fluid">
        <div className="row">
          {/*I honsetly wonder if react router would have been better*/}
          <Suspense fallback={<>Loading...</>}>
            {!input ? (
              <DataView url={SubListUrl} setUrl={setSubListUrl} />
            ) : (
              <InputView url={SubListUrl} setUrl={setSubListUrl} />
            )}
          </Suspense>
        </div>
      </div>
      <ToastContainer
        position="bottom-right"
        autoClose={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        theme="light"
      />
    </React.StrictMode>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
