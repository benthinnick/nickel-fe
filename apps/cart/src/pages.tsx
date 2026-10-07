import { useEffect, useState } from "react"
import { navigateToUrl } from "single-spa"
import type { CartItemResponse, ProductResponse } from "@nickel/contracts"
import { checkout, formatMoney, getCart, getProduct, removeCartItem, upsertCartItem } from "@nickel/api"
import { AppLink } from "@nickel/ui"

interface CartLine {
  item: CartItemResponse
  product: ProductResponse | null
}

async function loadLines(): Promise<CartLine[]> {
  const cart = await getCart()
  return Promise.all(
    cart.items.map(async (item) => {
      try {
        return { item, product: await getProduct(item.product_id) }
      } catch {
        return { item, product: null }
      }
    }),
  )
}

function lineTotal(lines: CartLine[]): { amount: string; currency: string } {
  const currency = lines.find((line) => line.product)?.product?.currency ?? "ILS"
  const total = lines.reduce((sum, line) => {
    if (!line.product) return sum
    return sum + Number(line.product.price) * line.item.quantity
  }, 0)
  return { amount: total.toFixed(2), currency }
}

export function CartPage() {
  const [lines, setLines] = useState<CartLine[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void loadLines()
      .then((loaded) => {
        if (!cancelled) setLines(loaded)
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Could not load the cart.")
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function refresh() {
    setLines(await loadLines())
  }

  if (lines === null && !error) {
    return (
      <section>
        <h1 className="page-title">Cart</h1>
        <p className="lede">Loading cart.</p>
      </section>
    )
  }

  const loaded = lines ?? []
  const total = lineTotal(loaded)

  return (
    <section>
      <h1 className="page-title">Cart</h1>
      {loaded.length === 0 ? (
        <>
          <p className="lede">Your cart is empty.</p>
          <AppLink href="/products" className="button">
            Browse products
          </AppLink>
        </>
      ) : (
        <>
          <table className="lines">
            <thead>
              <tr>
                <th>Product</th>
                <th>Quantity</th>
                <th>Price</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loaded.map((line) => (
                <tr key={line.item.product_id}>
                  <td>{line.product?.name ?? line.item.product_id}</td>
                  <td>
                    <input
                      aria-label={`Quantity for ${line.product?.name ?? "item"}`}
                      type="number"
                      min={1}
                      max={Math.min(100, line.product?.stock ?? 100)}
                      value={line.item.quantity}
                      onChange={(event) => {
                        void upsertCartItem(line.item.product_id, Number(event.target.value))
                          .then(() => refresh())
                          .then(() => setError(null))
                          .catch((caught: unknown) => {
                            setError(caught instanceof Error ? caught.message : "Could not update the cart.")
                          })
                      }}
                    />
                  </td>
                  <td>
                    {line.product
                      ? formatMoney(
                          (Number(line.product.price) * line.item.quantity).toFixed(2),
                          line.product.currency,
                        )
                      : "—"}
                  </td>
                  <td>
                    <button
                      className="button secondary"
                      type="button"
                      onClick={() => {
                        void removeCartItem(line.item.product_id)
                          .then(() => refresh())
                          .catch((caught: unknown) => {
                            setError(caught instanceof Error ? caught.message : "Could not update the cart.")
                          })
                      }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="total-row">
            <strong>{formatMoney(total.amount, total.currency)}</strong>
            <AppLink href="/checkout" className="button">
              Checkout
            </AppLink>
          </div>
        </>
      )}
      {error ? <p className="banner">{error}</p> : null}
    </section>
  )
}

export function CheckoutPage() {
  const [lines, setLines] = useState<CartLine[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [placing, setPlacing] = useState(false)

  useEffect(() => {
    let cancelled = false
    void loadLines()
      .then((loaded) => {
        if (!cancelled) setLines(loaded)
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Could not load the cart.")
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (lines === null && !error) {
    return (
      <section>
        <h1 className="page-title">Checkout</h1>
        <p className="lede">Loading checkout.</p>
      </section>
    )
  }

  const loaded = lines ?? []
  const total = lineTotal(loaded)

  return (
    <section>
      <h1 className="page-title">Checkout</h1>
      {loaded.length === 0 ? (
        <>
          <p className="lede">Your cart is empty.</p>
          <AppLink href="/products" className="button">
            Browse products
          </AppLink>
        </>
      ) : (
        <div className="panel stack">
          <ul>
            {loaded.map((line) => (
              <li key={line.item.product_id}>
                {line.product?.name ?? line.item.product_id} × {line.item.quantity}
              </li>
            ))}
          </ul>
          <p className="price">{formatMoney(total.amount, total.currency)}</p>
          <button
            className="button"
            type="button"
            disabled={placing}
            onClick={() => {
              setPlacing(true)
              void checkout()
                .then((order) => navigateToUrl(`/orders/${order.id}`))
                .catch((caught: unknown) => {
                  setError(caught instanceof Error ? caught.message : "Checkout failed.")
                  setPlacing(false)
                })
            }}
          >
            Place order
          </button>
          {error ? <p className="banner">{error}</p> : null}
        </div>
      )}
    </section>
  )
}
