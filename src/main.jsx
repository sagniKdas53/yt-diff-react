import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import "./styles/index.scss";

import { Row, Container } from "react-bootstrap";

import Nav from "./components/navBar";
import PlayLists from "./components/playlists";
import InputForm from "./components/inputform";
import SubLists from "./components/sublists";

function App() {
  const [showPlaylist, toggleView] = useState(false);
  const [subUrl, setSubUrl] = useState("");
  const toggleViewHandler = (state) => {
    toggleView(state);
  };
  return (
    <>
      <Nav state={showPlaylist} updateState={toggleViewHandler} />
      <Container fluid>
        <Row>
          {showPlaylist ? <PlayLists setSubUrl={setSubUrl} /> : <InputForm setSubUrl={setSubUrl} />}
          <SubLists showControls={showPlaylist} setSubUrl={setSubUrl} subUrl={subUrl} />
        </Row>
      </Container>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
