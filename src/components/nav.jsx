import React from "react";
import { Button, Navbar } from "react-bootstrap";
import navBrand from "/yt-diff_512x512.png";

export default function NavBar({ state, toggleView, setUrl }) {
  return (
    <Navbar bg="dark" variant="dark" className="mt-0 pt-0 mb-0 pb-0 nav-size">
      <div className="container-fluid">
        <Navbar.Brand className="pt-0" href="#">
          <img
            src={navBrand}
            alt=""
            width="30"
            height="30"
            className="d-inline-block"
          />
          <span className="align-middle">-diff</span>
        </Navbar.Brand>
        <div>
          <Button variant="link" className="link-warning m-0 mx-2 p-0 no-underline" onClick={toggleView}>
            {state ? "Back" : "List"}
          </Button>
          <Button variant="link" className="link-warning m-0 p-0 no-underline" onClick={() => setUrl("None")}>
            Unlisted
          </Button>
        </div>
      </div>
    </Navbar >
  );
}
