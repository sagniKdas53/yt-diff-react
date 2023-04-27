import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './components/App'
import './style.scss';
// ReactDOM.createRoot(document.getElementById('root')).render(
//   <React.StrictMode>
//     <App />
//   </React.StrictMode>,
// )
const rootElement = document.getElementById('root');
let root;

if (rootElement._reactRootContainer) {
  // If the root already exists, use it
  root = ReactDOM.unstable_createRoot(rootElement);
} else {
  // Otherwise, create a new root
  root = ReactDOM.createRoot(rootElement);
}

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
