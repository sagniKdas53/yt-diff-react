import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import "./styles/index.scss";

import { Row, Container } from "react-bootstrap";

import Nav from "./components/nav";
import PlayLists from "./components/playlists";
import InputForm from "./components/inputform";
import SubLists from "./components/sublists";

function App() {
  const [show, toggleView] = useState(false);
  const [globalUrl, setGlobalUrl] = useState("");
  useEffect(() => {
    console.log("global_url", globalUrl);
  }, [globalUrl]);
  return (
    <>
      <Nav state={show} updateState={toggleView} />
      <Container fluid>
        <Row>
          {show ?
            <PlayLists setGlobalUrl={setGlobalUrl} /> :
            <InputForm setGlobalUrl={setGlobalUrl} />}
          <SubLists showControls={show} SubUrl={globalUrl} />
        </Row>
      </Container>
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
