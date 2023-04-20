import React, { lazy, Suspense, useEffect, useState, useCallback } from "react";
import ReactDOM from "react-dom/client";
import "./styles/index.scss";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer, toast } from "react-toastify";
import io from "socket.io-client";
const socket = io.connect("https://lenovo-ideapad-320-15ikb.tail9ece4.ts.net", {
  path: "/ytdiff/socket.io",
});
import Box from "@mui/material/Box";
import LinearProgress from "@mui/material/LinearProgress";

const NavBar = lazy(() => import("./components/NavBar.jsx"));
const DataView = lazy(() => import("./components/DataComp.jsx"));
const InputView = lazy(() => import("./components/InputComp.jsx"));

function App() {
  const [input, toggle] = useState(true);
  const [SubListUrl, setSubListUrl] = useState("");
  const [id, setID] = useState("");
  const [disableBtns, toggleDisable] = useState(false);
  const [progress, setProgress] = useState(0);
  // disableBtns should be passed in as a prop to the buttons so that that they can be disabled,
  // when the prop is false the buttons are enabled and when it's true they are disabled
  // after some thinking it can also be used to refresh the sublist when the download or listing is done.
  const toggleFunc = () => {
    toggle(!input);
    setSubListUrl("");
  };

  const toggleDisableCallBack = useCallback((next) => {
    // Your existing toggleDisable logic goes here
    toggleDisable(next);
  }, []);

  useEffect(() => {
    // this one sets up sockets
    socket.on("init", function (data) {
      setID(data.id);
      toggleDisableCallBack(false);
      socket.emit("acknowledge", { data: "Connected", id: data.id });
    });
    // triggered when a download starts, as progress my not start right away
    socket.on("download-start", function () {
      setProgress(101);
      if (disableBtns === false) {
        toggleDisableCallBack(true);
      }
    });
    // gives incremental progress updates at 10% intervals also
    // used to keep the state updated of background activity
    socket.on("listing-or-downloading", function (data) {
      console.log(data.percentage);
      if (data.percentage === 100) {
        setProgress(101);
      } else {
        setProgress(data.percentage);
      }
      if (disableBtns === false) {
        toggleDisableCallBack(true);
      }
    });
    // shows errors
    socket.on("error", function (data) {
      //toggleDisableCallBack(false);
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
    // shows when a download is done
    socket.on("download-done", function (data) {
      // add a sleep of 10 seconds here before the rest of it executed
      setTimeout(() => {
        toggleDisableCallBack(false);
        setProgress(0);
        toast.success(`${data.message} ✅`, {
          position: "bottom-right",
          toastId: data.id,
          autoClose: false,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: 0,
          theme: "light",
        });
      }, 10000);
    });
    // shows when listing is done
    socket.on("playlist-done", function (data) {
      toggleDisableCallBack(false);
      setProgress(0);
      console.log(data);
      toast.success(`${data.message} ✅`, {
        position: "bottom-right",
        toastId: data.id,
        autoClose: false,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: 0,
        theme: "light",
      });
    });
  }, [socket, toggleDisableCallBack]);

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
              <DataView
                url={SubListUrl}
                setUrl={setSubListUrl}
                disableBtns={disableBtns}
              />
            ) : (
              <InputView
                url={SubListUrl}
                setUrl={setSubListUrl}
                disableBtns={disableBtns}
                setProgress={setProgress}
              />
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
      <Box sx={{ width: "100%" }}>
        <LinearProgress
          variant={progress === 101 ? "indeterminate" : "determinate"}
          value={progress}
        />
      </Box>
    </React.StrictMode>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
