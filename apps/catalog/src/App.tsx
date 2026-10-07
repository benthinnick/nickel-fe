import { useLocationKey } from "@nickel/ui"
import { ProductDetail, SearchPage } from "./pages"
import { ProductList } from "./ProductList"

export function App() {
  const locationKey = useLocationKey()
  const pathname = locationKey.split("?")[0] ?? "/"

  if (pathname === "/search") return <SearchPage />
  if (pathname.startsWith("/products/") && pathname.length > "/products/".length) {
    return <ProductDetail productId={decodeURIComponent(pathname.slice("/products/".length))} />
  }
  return <ProductList />
}
