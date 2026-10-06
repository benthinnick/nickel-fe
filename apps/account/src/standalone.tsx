import ReactDOMClient from "react-dom/client"
import { App } from "./App"
import "../../../packages/styles/marketplace.css"

const host = document.getElementById("mf-root")
if (!host) throw new Error("Missing #mf-root")
ReactDOMClient.createRoot(host).render(<App />)
