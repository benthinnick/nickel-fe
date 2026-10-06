import { addErrorHandler, registerApplication, start } from "single-spa"
import { isAccountPath, isCartPath, isCatalogPath } from "@shekel/ui"

const startKey = "__shekel_root_started__"
const hostWindow = window as Window & { [startKey]?: boolean }

if (!hostWindow[startKey]) {
  hostWindow[startKey] = true
  registerMicrofrontends()
}

function registerMicrofrontends(): void {
  const catalogUrl = "http://localhost:9001/src/spa.tsx"
  const cartUrl = "http://localhost:9002/src/spa.tsx"
  const accountUrl = "http://localhost:9003/src/spa.tsx"

  registerApplication({
    name: "@shekel/catalog",
    app: () => import(/* @vite-ignore */ catalogUrl),
    activeWhen: (location) => isCatalogPath(location.pathname),
  })

  registerApplication({
    name: "@shekel/cart",
    app: () => import(/* @vite-ignore */ cartUrl),
    activeWhen: (location) => isCartPath(location.pathname),
  })

  registerApplication({
    name: "@shekel/account",
    app: () => import(/* @vite-ignore */ accountUrl),
    activeWhen: (location) => isAccountPath(location.pathname),
  })

  addErrorHandler((error) => {
    const host = document.getElementById("mf-root")
    if (!host) return
    host.replaceChildren()
    const note = document.createElement("p")
    note.className = "banner"
    note.textContent = error instanceof Error ? error.message : "This page failed to load."
    host.appendChild(note)
  })

  start()
}
