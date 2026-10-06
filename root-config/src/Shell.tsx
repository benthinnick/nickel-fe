import { useEffect, useState } from "react"
import { AUTH_CHANGED_EVENT, CART_CHANGED_EVENT, getAccessToken, getCart, getMe, startLogin } from "@shekel/api"
import { AppLink, isAccountPath, isCartPath, isCatalogPath, useLocationKey } from "@shekel/ui"
import { SearchForm } from "./SearchForm"

function linkClass(active: boolean): string {
  return active ? "nav-link is-active" : "nav-link"
}

function itemCount(items: { quantity: number }[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0)
}

export function Shell() {
  const locationKey = useLocationKey()
  const pathname = locationKey.split("?")[0] ?? "/"
  const query = pathname === "/search" ? (new URLSearchParams(locationKey.split("?")[1] ?? "").get("q") ?? "") : ""
  const [count, setCount] = useState(0)
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const refreshCart = () => {
      void getCart()
        .then((cart) => {
          if (!cancelled) setCount(itemCount(cart.items))
        })
        .catch(() => {
          if (!cancelled) setCount(0)
        })
    }
    const refreshAuth = () => {
      if (!getAccessToken()) {
        if (!cancelled) setEmail(null)
        return
      }
      void getMe()
        .then((customer) => {
          if (!cancelled) setEmail(customer.email)
        })
        .catch(() => {
          if (!cancelled) setEmail(null)
        })
    }
    refreshCart()
    refreshAuth()
    window.addEventListener(CART_CHANGED_EVENT, refreshCart)
    window.addEventListener(AUTH_CHANGED_EVENT, refreshAuth)
    return () => {
      cancelled = true
      window.removeEventListener(CART_CHANGED_EVENT, refreshCart)
      window.removeEventListener(AUTH_CHANGED_EVENT, refreshAuth)
    }
  }, [])

  const known = isCatalogPath(pathname) || isCartPath(pathname) || isAccountPath(pathname)

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <AppLink href="/products" className="wordmark">
          Shekel
        </AppLink>
        <SearchForm key={locationKey} initialQuery={query} />
        <nav className="nav" aria-label="Marketplace">
          <AppLink href="/products" className={linkClass(isCatalogPath(pathname))}>
            Products
          </AppLink>
          <AppLink href="/cart" className={linkClass(isCartPath(pathname))}>
            Cart <span className="count">{count}</span>
          </AppLink>
          {email ? (
            <AppLink href="/login" className={linkClass(isAccountPath(pathname))}>
              {email}
            </AppLink>
          ) : (
            <button type="button" className={linkClass(isAccountPath(pathname))} onClick={() => void startLogin()}>
              Sign in
            </button>
          )}
        </nav>
      </div>
      <p className="preview-note">Cart and orders use this browser session.</p>
      {!known ? <p className="banner">That page is not part of the marketplace.</p> : null}
    </header>
  )
}
