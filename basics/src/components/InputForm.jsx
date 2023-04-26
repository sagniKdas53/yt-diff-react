import React, { lazy, useState } from "react";

const ListControl = lazy(() => import("./ListControl.jsx"));
import { FormControl } from "react-bootstrap";
import { toast } from "react-toastify";

export default function InputForm({
  setParentUrl,
  setRespIndex,
  disableBtns,
  setProgress,
}) {
  // all of the states are here
  const [start, setStart] = useState(0);
  const [stop, setStop] = useState(10);
  const [chunk, setChunk] = useState(10);
  const [urlList, setUrlList] = useState("");
  const [watchMode, setWatch] = useState("1");

  const updateUrls = (event) => {
    //console.log(urlList.split("\n").length + 1);
    setUrlList(event.target.value);
  };
  const clearInput = () => {
    setStart(0);
    setStop(10);
    setChunk(10);
    setUrlList("");
    setWatch("1");
  };
  const listThis = async () => {
    setProgress(101);
    const valid = new Set(urlList.trim().split("\n").filter(validate));
    try {
      for (const element of valid) {
        const response = await postUrl(element)
          .then((response) => response.text())
          .then((data) => JSON.parse(data));
        // since listing may take a while having this here as an intermediate state can't hurt too much.
        setParentUrl(response.resp_url);
        setRespIndex(+response.start);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const validate = (element) => {
    try {
      const url = new URL(element);
      if (url.protocol !== "https:" && url.protocol !== "http:") {
        setProgress(0);
        toast.error("Invalid url: " + element, {
          position: "bottom-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: 0,
          theme: "light",
        });
        //console.error("Invalid url: " + url);
        return false;
      }
    } catch (error) {
      setProgress(0);
      toast.error("Problem parsing url: " + element, {
        position: "bottom-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: 0,
        theme: "light",
      });
      //console.error("Problem parsing url: " + element);
      return false;
    }
    return true;
  };

  const postUrl = (urlItem) => {
    return fetch(
      "https://lenovo-ideapad-320-15ikb.tail9ece4.ts.net/ytdiff/list",
      {
        method: "post",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        mode: "cors",
        body: JSON.stringify({
          url: urlItem,
          start: start,
          stop: stop,
          chunk: chunk,
          watch: watchMode,
          continuous: true,
        }),
      }
    );
  };

  return (
    <div className="col-xl-6 col-lg-6 col-md-12 col-sm-12 col-12">
      <div className="container-fluid input-card">
        <div className="row my-2">
          <h5 className="m-0 p-0 mb-1">Urls</h5>
          <textarea
            className="form-control unified-input"
            rows={
              urlList.split("\n").length < 12 ? urlList.split("\n").length : 12
            }
            placeholder="url list"
            id="url_list"
            title="Url List"
            value={urlList}
            onChange={updateUrls}
          />
        </div>
        <div className="row my-2">
          <div className="col align-items-center m-0 p-0">
            <div className="m-0 p-0 d-flex flex-row align-items-center">
              <label className="form-check-label emoji align-items-center">
                Watch?{" "}
              </label>
              <FormControl
                className="form-select-sm mx-2 align-items-center"
                id="watch-change"
                as="select"
                defaultValue={watchMode}
                onChange={(event) => setWatch(event.target.value)}
              >
                <option value="1">NO</option>
                <option value="2">Full</option>
                <option value="3">Quick</option>
              </FormControl>
            </div>
          </div>
        </div>
        <div className="row mb-2">
          <h5 className="m-0 p-0 mb-1">Controls</h5>
          <ListControl
            start={start}
            stop={stop}
            chunk={chunk}
            setStart={setStart}
            setStop={setStop}
            setChunk={setChunk}
          />
        </div>
        <div className="row mb-2">
          <div className="col m-0 p-0">
            <div className="btn-group" role="group">
              <button
                id="list_btn"
                type="button"
                onClick={listThis}
                disabled={disableBtns}
                className="btn btn-primary"
              >
                List
              </button>
              <button
                id="clear_btn"
                type="button"
                onClick={clearInput}
                className="btn btn-primary"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="col m-0 p-0"></div>
        </div>
      </div>
    </div>
  );
}
