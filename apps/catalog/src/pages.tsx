import { FormEvent, useEffect, useState } from "react"
import type { ProductResponse } from "@nickel/contracts"
import { ApiError, formatMoney, getProduct, searchProducts, upsertCartItem } from "@nickel/api"
import { AppLink, useLocationKey } from "@nickel/ui"
import { swatchColor } from "./ProductList"

export function SearchPage() {
  const locationKey = useLocationKey()
  const query = new URLSearchParams(locationKey.split("?")[1] ?? "").get("q") ?? ""
  const [results, setResults] = useState<ProductResponse[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) {
      setResults(null)
      setError(null)
      return
    }
    let cancelled = false
    setResults(null)
    setError(null)
    void searchProducts(trimmed)
      .then((page) => {
        if (!cancelled) setResults(page.items)
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Search failed.")
      })
    return () => {
      cancelled = true
    }
  }, [query])

  return (
    <section>
      <h1 className="page-title">Search</h1>
      {!query.trim() ? <p className="lede">Enter a product name.</p> : null}
      {error ? <p className="banner">{error}</p> : null}
      {query.trim() && results === null && !error ? <p className="lede">Searching.</p> : null}
      {results && results.length === 0 ? <p className="lede">No products match that name.</p> : null}
      {results && results.length > 0 ? (
        <ul className="stack">
          {results.map((product) => (
            <li key={product.id}>
              <AppLink href={`/products/${product.id}`}>{product.name}</AppLink>
              <span className="muted"> {formatMoney(product.price, product.currency)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

export function ProductDetail(props: { productId: string }) {
  const [product, setProduct] = useState<ProductResponse | null | undefined>(undefined)
  const [quantity, setQuantity] = useState(1)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setProduct(undefined)
    setQuantity(1)
    setMessage(null)
    setError(null)
    void getProduct(props.productId)
      .then((loaded) => {
        if (!cancelled) setProduct(loaded)
      })
      .catch((caught: unknown) => {
        if (cancelled) return
        if (caught instanceof ApiError && caught.status === 404) {
          setProduct(null)
          return
        }
        setError(caught instanceof Error ? caught.message : "Could not load this product.")
        setProduct(null)
      })
    return () => {
      cancelled = true
    }
  }, [props.productId])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!product) return
    try {
      await upsertCartItem(product.id, quantity)
      setMessage("Added to cart.")
      setError(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update the cart.")
    }
  }

  if (product === undefined) {
    return (
      <section>
        <p className="lede">Loading product.</p>
      </section>
    )
  }

  if (!product) {
    return (
      <section>
        <h1 className="page-title">Product not found</h1>
        {error ? <p className="banner">{error}</p> : null}
        <AppLink href="/products" className="button secondary">
          Back to products
        </AppLink>
      </section>
    )
  }

  return (
    <article className="detail">
      <div className="swatch" style={{ background: swatchColor(product.id) }} />
      <div>
        <h1 className="page-title">{product.name}</h1>
        <p>{product.description}</p>
        <p className="price">{formatMoney(product.price, product.currency)}</p>
        <p className="muted">
          {product.sku} · {product.stock} in stock
        </p>
        <form className="actions" onSubmit={onSubmit}>
          <input
            aria-label="Quantity"
            type="number"
            min={1}
            max={Math.min(100, product.stock)}
            value={quantity}
            disabled={product.stock < 1}
            onChange={(event) => setQuantity(Number(event.target.value))}
          />
          <button className="button" type="submit" disabled={product.stock < 1}>
            Add to cart
          </button>
        </form>
        {message ? <p className="lede">{message}</p> : null}
        {error ? <p className="banner">{error}</p> : null}
      </div>
    </article>
  )
}
