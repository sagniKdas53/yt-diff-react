import React from 'react'
import ReactDOM from 'react-dom/client'
import "./styles/index.scss";
import Navbar from './components/nav'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Navbar />
  </React.StrictMode>,
)
