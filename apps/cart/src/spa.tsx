import React from "react"
import ReactDOMClient from "react-dom/client"
import singleSpaReact from "single-spa-react"
import { mountPoint } from "@nickel/ui"
import { App } from "./App"
import "../../../packages/styles/marketplace.css"

const lifecycles = singleSpaReact({
  React,
  ReactDOMClient,
  rootComponent: App,
  domElementGetter: mountPoint,
  errorBoundary(error) {
    return <p className="banner">{error.message}</p>
  },
})

export const bootstrap = lifecycles.bootstrap
export const mount = lifecycles.mount
export const unmount = lifecycles.unmount
