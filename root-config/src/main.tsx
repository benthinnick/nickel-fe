import React from "react"
import ReactDOMClient from "react-dom/client"
import { Shell } from "./Shell"
import "./register"
import "../../packages/styles/marketplace.css"

const shell = document.getElementById("shell")
if (!shell) throw new Error("Missing #shell")

ReactDOMClient.createRoot(shell).render(
  <React.StrictMode>
    <Shell />
  </React.StrictMode>,
)
