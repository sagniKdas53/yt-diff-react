import React from "react";
import { Button, Navbar } from "react-bootstrap";
import navBrand from "/nav-brand-512x512.png";

export default function NavBar({ showInput, toggleFunc, setSubListUrl }) {
  const showUnlisted = () => setSubListUrl("None");
  return (
    <Navbar bg="dark" variant="dark" className="mt-0 pt-0 mb-0 pb-0 nav-size">
      <div className="container-fluid">
        <Navbar.Brand className="pt-0" href="#">
          <img
            src={navBrand}
            alt=""
            width="30"
            height="auto"
            className="d-inline-block nav-icon"
          />
          <span className="align-middle mb-1">-diff</span>
        </Navbar.Brand>
        <div>
          <Button
            variant="link"
            className="link-warning m-0 mx-2 p-0 nav-link-btn"
            onClick={toggleFunc}
          >
            {!showInput ? "Add Data" : "Show Data"}
          </Button>
          <Button
            variant="link"
            className="link-warning m-0 p-0 nav-link-btn"
            onClick={showUnlisted}
          >
            Unlisted
          </Button>
        </div>
      </div>
    </Navbar>
  );
}
