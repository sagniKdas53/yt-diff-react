import React from "react";
import ReactDOM from "react-dom/client";

import AppProviders from "./AppProviders.jsx";
import App from "./components/App";
import ErrorBoundary from "./components/ErrorBoundary.jsx";

import "./style.scss";

const rootElement = document.getElementById("root");
let root;

if (rootElement._reactRootContainer) {
  // If the root already exists, use it
  root = ReactDOM.unstable_createRoot(rootElement);
} else {
  // Otherwise, create a new root
  root = ReactDOM.createRoot(rootElement);
}

// Outside the providers on purpose: a throw while a context initialises is
// exactly the case that would otherwise leave a blank <div id="root">.
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <AppProviders>
        <App />
      </AppProviders>
    </ErrorBoundary>
  </React.StrictMode>,
);
