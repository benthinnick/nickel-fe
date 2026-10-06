import { useEffect, useState, type ReactNode, type MouseEvent } from "react"
import { navigateToUrl } from "single-spa"

export function isCatalogPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/products" ||
    pathname.startsWith("/products/") ||
    pathname === "/search"
  )
}

export function isCartPath(pathname: string): boolean {
  return pathname === "/cart" || pathname === "/checkout"
}

export function isAccountPath(pathname: string): boolean {
  return pathname === "/login" || pathname === "/login/callback" || pathname.startsWith("/orders/")
}

export function useLocationKey(): string {
  const [key, setKey] = useState(() => window.location.pathname + window.location.search)

  useEffect(() => {
    const sync = () => setKey(window.location.pathname + window.location.search)
    window.addEventListener("popstate", sync)
    window.addEventListener("single-spa:routing-event", sync)
    return () => {
      window.removeEventListener("popstate", sync)
      window.removeEventListener("single-spa:routing-event", sync)
    }
  }, [])

  return key
}

export function AppLink(props: { href: string; className?: string; children: ReactNode }) {
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    navigateToUrl(event)
  }
  return (
    <a href={props.href} className={props.className} onClick={onClick}>
      {props.children}
    </a>
  )
}

export function mountPoint(): HTMLElement {
  const host = document.getElementById("mf-root")
  if (!host) throw new Error("Missing #mf-root")
  host.replaceChildren()
  const frame = document.createElement("div")
  frame.className = "mf-frame"
  host.appendChild(frame)
  return frame
}
