import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import "./styles/index.scss";

import { Row, Container } from "react-bootstrap";

import NavbarApp from "./components/navBar";
import MainSection from "./components/mainSection";
import InputCol from "./components/inputcol";
import SubSection from "./components/subSection";

const url = "http://localhost:8888/ytdiff";

function App() {
  const [showMainList, toggleComp] = useState(false);
  const toggleCompHandler = (state) => {
    toggleComp(state);
  }
  return (
    <React.StrictMode>
      <NavbarApp updateState={toggleCompHandler} state={showMainList} />
      <Container fluid>
        <Row>
          {showMainList ? <MainSection url={url}/> : <InputCol />}
          <SubSection showControls={showMainList} />
        </Row>
      </Container>
    </React.StrictMode>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
