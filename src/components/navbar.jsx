import React from "react";
import navBrand from "/light.png";
export default function Navbar({ updateState, state }) {
  return (
    <nav className="mt-0 pt-0 mb-0 pb-0 navbar navbar-dark bg-dark nav-size">
      <div className="container-fluid">
        <a className="navbar-brand pt-0" href="#">
          <img
            src={navBrand}
            alt=""
            width="30"
            height="30"
            className="d-inline-block"
          />
          <span className="align-middle">-diff</span>
        </a>
        <div>
          <button type="button" className="btn btn-link link-warning m-0 mx-2 p-0 no-underline" onClick={() => updateState(!state)}>
            {state ? "Back" : "List"}
          </button>
          <button type="button" className="btn btn-link link-warning m-0 p-0 no-underline">
            Unlisted
          </button>
        </div>
      </div>
    </nav>
  );
}
