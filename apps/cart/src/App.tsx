import { useLocationKey } from "@shekel/ui"
import { CartPage, CheckoutPage } from "./pages"

export function App() {
  const locationKey = useLocationKey()
  const pathname = locationKey.split("?")[0] ?? "/"
  if (pathname === "/checkout") return <CheckoutPage />
  return <CartPage />
}
