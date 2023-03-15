import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import "./styles/index.scss";

import { Row, Container } from "react-bootstrap";

import NavbarApp from "./components/navBar";
import MainSection from "./components/mainSection";
import InputCol from "./components/inputcol";
import SubSection from "./components/subSection";

function App() {
  const [showMainList, toggleComp] = useState(false);
  const toggleCompHandler = (state) => {
    toggleComp(state);
  };
  return (
    <>
      <NavbarApp updateState={toggleCompHandler} state={showMainList} />
      <Container fluid>
        <Row>
          {showMainList ? <MainSection /> : <InputCol />}
          <SubSection showControls={showMainList} />
        </Row>
      </Container>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
