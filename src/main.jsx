import React, { lazy, Suspense, useEffect, useState, useCallback } from "react";
import ReactDOM from "react-dom/client";
import "./styles/index.scss";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer, toast } from "react-toastify";
import io from "socket.io-client";
import Box from "@mui/material/Box";
import LinearProgress from "@mui/material/LinearProgress";
import { BrowserRouter, Route, Routes } from "react-router-dom";
const socket = io.connect("http://localhost:8888", {
  path: "/ytdiff/socket.io",
});

const NavBar = lazy(() => import("./components/NavBar.jsx"));
const SubList = lazy(() => import("./components/SubList.jsx"));
const InputForm = lazy(() => import("./components/InputForm.jsx"));
const PlayList = lazy(() => import("./components/PlayList.jsx"));
function App() {
  const [id, setID] = useState("");
  const [SubListUrl, setSubListUrl] = useState("");
  const [disableBtns, toggleDisable] = useState(false);
  const [progress, setProgress] = useState(0);
  const [disregardSocket, toggelDisregard] = useState(false);
  const [respIndex, setRespIndex] = useState(0);
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

  const toggelDisregardCallBack = useCallback((next) => {
    // Your existing toggleDisable logic goes here
    toggelDisregard(next);
  }, []);

  useEffect(() => {
    // this one sets up sockets
    socket.on("init", function (data) {
      setID(data.id);
      setProgress(0);
      toggelDisregardCallBack(false);
      toggleDisableCallBack(false);
      socket.emit("acknowledge", { data: "Connected", id: data.id });
    });
    // triggered when a download starts, as progress my not start right away
    socket.on("download-start", function () {
      // put the progress bar in an indeterminate state
      setProgress(101);
      // if socket is et to be disregarded then set it back to listen to it
      toggelDisregardCallBack(false);
      // if buttons are not disabled then disable them
      toggleDisableCallBack(true);
    });
    // gives incremental progress updates at 10% intervals also
    // used to keep the state updated of background activity
    socket.on("listing-or-downloading", function (data) {
      //console.log(data.percentage);
      if (data.percentage >= 99) {
        setProgress(101);
        toggelDisregardCallBack(true);
      } else if (!disregardSocket) {
        // if the disregardSocket is false then update percentage
        setProgress(data.percentage);
      }

      if (!disableBtns) {
        toggleDisableCallBack(true);
      }
    });
    // shows errors
    socket.on("error", function (data) {
      toast.error(`${data.message} ❌`, {
        position: "bottom-right",
        autoClose: 5000,
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
      // enable the buttons and reset progress
      toggleDisableCallBack(false);
      setProgress(0);
      toast.success(`${data.message} ✅`, {
        position: "bottom-right",
        toastId: data.id,
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: 0,
        theme: "light",
      });
    });
    socket.on("download-failed", function (data) {
      // enable the buttons and reset progress
      toggleDisableCallBack(false);
      setProgress(0);
      toggleDisableCallBack(false);
      setProgress(0);
      toast.error(`${data.message} ❌`, {
        position: "bottom-right",
        toastId: data.id,
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: 0,
        theme: "light",
      });
    });
    // shows when listing is done
    socket.on("playlist-done", function (data) {
      // enable the buttons and reset progress
      toggleDisableCallBack(false);
      setProgress(0);

      toast.success(`${data.message} ✅`, {
        position: "bottom-right",
        toastId: data.id,
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: 0,
        theme: "light",
      });
    });
  }, [socket, toggleDisableCallBack, toggelDisregardCallBack]);

  return (
    <React.StrictMode>
      <NavBar setSubListUrl={setSubListUrl} id={id} />
      <div className="container-fluid">
        <div className="row">
          <Suspense fallback={<>Loading...</>}>
            <BrowserRouter>
              <Routes>
                <Route
                  path="ytdiff/"
                  element={
                    <InputForm
                      setParentUrl={setSubListUrl}
                      setRespIndex={setRespIndex}
                      disableBtns={disableBtns}
                      setProgress={setProgress}
                    />
                  }
                />
                <Route
                  path="ytdiff/data"
                  element={
                    <PlayList
                      setParentUrl={setSubListUrl}
                      listUrl={SubListUrl}
                      disableBtns={disableBtns}
                    />
                  }
                />
                <Route
                  path="*"
                  element={
                    <div className="m-0 p-0 col-xl-6 col-lg-6 col-md-12 col-sm-12 col-12"></div>
                  }
                />
              </Routes>
            </BrowserRouter>
            <SubList
              listUrl={SubListUrl}
              setParentUrl={setSubListUrl}
              respIndex={respIndex}
              disableBtns={disableBtns}
            />
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
