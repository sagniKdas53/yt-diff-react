import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import "./styles/index.scss";

import Row from 'react-bootstrap/Row';
import Container from "react-bootstrap/Container";

import Navbar from "./components/navbar";
import InputCol from "./components/inputcol";
import MainSection from "./components/mainlist";
import SubSection from "./components/sublist";

function App() {
  const [showMainList, toggleComp] = useState(false);
  const toggleCompHandler = (state) => {
    toggleComp(state);
  }
  return (
    <React.StrictMode>
      <Navbar updateState={toggleCompHandler} state={showMainList} />
      <Container fluid>
        <Row>
          {showMainList ? <MainSection /> : <InputCol />}
          <SubSection showControls={showMainList} />
        </Row>
      </Container>
    </React.StrictMode>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
