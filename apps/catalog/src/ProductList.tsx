import { useEffect, useState } from "react"
import type { ProductResponse } from "@nickel/contracts"
import { formatMoney, listProducts } from "@nickel/api"
import { AppLink } from "@nickel/ui"

const swatches = ["#1f6b4a", "#9a4632", "#c4a574", "#3d4f3a", "#6e6256", "#d7c4a3"]

export function swatchColor(id: string): string {
  const index = Number.parseInt(id.slice(0, 1), 16) % swatches.length
  return swatches[index] ?? swatches[0]
}

export function ProductList() {
  const [products, setProducts] = useState<ProductResponse[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void listProducts()
      .then((page) => {
        if (!cancelled) setProducts(page.items)
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Could not load products.")
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section>
      <h1 className="page-title">Marketplace</h1>
      <p className="lede">Goods from local sellers.</p>
      {error ? <p className="banner">{error}</p> : null}
      {products === null && !error ? <p className="lede">Loading products.</p> : null}
      {products ? (
        <div className="grid">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : null}
    </section>
  )
}

function ProductCard(props: { product: ProductResponse }) {
  const { product } = props
  return (
    <AppLink href={`/products/${product.id}`} className="card">
      <div className="swatch" style={{ background: swatchColor(product.id) }} />
      <div className="card-body">
        <h2>{product.name}</h2>
        <p className="price">{formatMoney(product.price, product.currency)}</p>
        <p className="muted">{product.stock} in stock</p>
      </div>
    </AppLink>
  )
}
