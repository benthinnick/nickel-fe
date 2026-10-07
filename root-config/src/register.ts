import { addErrorHandler, registerApplication, start } from "single-spa"
import { isAccountPath, isCartPath, isCatalogPath } from "@shekel/ui"

const startKey = "__shekel_root_started__"
const hostWindow = window as Window & { [startKey]?: boolean }

if (!hostWindow[startKey]) {
  hostWindow[startKey] = true
  registerMicrofrontends()
}

function registerMicrofrontends(): void {
  const catalogUrl = import.meta.env.VITE_CATALOG_URL || "http://localhost:9001/src/spa.tsx"
  const cartUrl = import.meta.env.VITE_CART_URL || "http://localhost:9002/src/spa.tsx"
  const accountUrl = import.meta.env.VITE_ACCOUNT_URL || "http://localhost:9003/src/spa.tsx"

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
