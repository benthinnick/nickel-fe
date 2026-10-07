import { useLocationKey } from "@nickel/ui"
import { LoginCallback, LoginPage, OrderPage } from "./pages"

export function App() {
  const locationKey = useLocationKey()
  const pathname = locationKey.split("?")[0] ?? "/"
  if (pathname.startsWith("/orders/")) {
    return <OrderPage orderId={decodeURIComponent(pathname.slice("/orders/".length))} />
  }
  if (pathname === "/login/callback") return <LoginCallback />
  return <LoginPage />
}
