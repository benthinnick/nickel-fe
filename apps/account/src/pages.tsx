import { useEffect, useState } from "react"
import { navigateToUrl } from "single-spa"
import type { DeliveryResponse, OrderResponse, OrderStatus, PaymentResponse } from "@nickel/contracts"
import { ApiError, completeLogin, formatMoney, getDelivery, getMe, getOrder, payOrder, signOut, startLogin } from "@nickel/api"

const statusLabel: Record<OrderStatus, string> = {
  pending_payment: "Pending payment",
  paid: "Paid",
  payment_failed: "Payment failed",
  delivered: "Delivered",
}

export function LoginPage() {
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void getMe()
      .then((customer) => {
        if (!cancelled) setEmail(customer.email)
      })
      .catch(() => {
        if (!cancelled) setEmail(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="panel stack">
      <h1 className="page-title">Sign in</h1>
      {email ? <p>Signed in as {email}.</p> : <p className="lede">Use your Nickel account.</p>}
      <div className="actions">
        {email ? (
          <button className="button secondary" type="button" onClick={() => signOut()}>
            Sign out
          </button>
        ) : (
          <button className="button" type="button" onClick={() => void startLogin()}>
            Sign in
          </button>
        )}
      </div>
    </section>
  )
}

export function LoginCallback() {
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void completeLogin(window.location.search)
      .then(() => navigateToUrl("/products"))
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Sign-in could not be completed.")
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section>
      <h1 className="page-title">Sign in</h1>
      {error ? <p className="banner">{error}</p> : <p className="lede">Signing in.</p>}
    </section>
  )
}

export function OrderPage(props: { orderId: string }) {
  const [order, setOrder] = useState<OrderResponse | null | undefined>(undefined)
  const [payment, setPayment] = useState<PaymentResponse | null>(null)
  const [delivery, setDelivery] = useState<DeliveryResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [paying, setPaying] = useState(false)

  useEffect(() => {
    let cancelled = false
    setOrder(undefined)
    setPayment(null)
    setDelivery(null)
    setError(null)
    void getOrder(props.orderId)
      .then(async (loaded) => {
        const shipment = await getDelivery(loaded.id)
        if (cancelled) return
        setOrder(loaded)
        setDelivery(shipment)
      })
      .catch((caught: unknown) => {
        if (cancelled) return
        if (caught instanceof ApiError && caught.status === 404) {
          setOrder(null)
          return
        }
        setError(caught instanceof Error ? caught.message : "Could not load this order.")
        setOrder(null)
      })
    return () => {
      cancelled = true
    }
  }, [props.orderId])

  async function reload(orderId: string) {
    const loaded = await getOrder(orderId)
    const shipment = await getDelivery(orderId)
    setOrder(loaded)
    setDelivery(shipment)
  }

  if (order === undefined) {
    return (
      <section>
        <p className="lede">Loading order.</p>
      </section>
    )
  }

  if (!order) {
    return (
      <section>
        <h1 className="page-title">Order not found</h1>
        {error ? <p className="banner">{error}</p> : null}
      </section>
    )
  }

  return (
    <section className="stack">
      <h1 className="page-title">Order</h1>
      <p>
        <span className="status">{statusLabel[order.status]}</span>
      </p>
      <ul>
        {order.items.map((item) => (
          <li key={item.product_id}>
            {item.name} × {item.quantity} · {formatMoney(item.line_total, order.currency)}
          </li>
        ))}
      </ul>
      <p className="price">{formatMoney(order.total, order.currency)}</p>
      {payment ? (
        <p className="muted">
          Payment {payment.status} via {payment.provider}.
        </p>
      ) : null}
      {delivery ? (
        <p className="muted">
          Delivery {delivery.status} via {delivery.provider}.
        </p>
      ) : null}
      {order.status === "paid" && !delivery ? <p className="lede">Delivery has not started.</p> : null}
      <div className="actions">
        {order.status === "pending_payment" ? (
          <button
            className="button"
            type="button"
            disabled={paying}
            onClick={() => {
              setPaying(true)
              void payOrder(order.id)
                .then(async (paid) => {
                  setPayment(paid)
                  await reload(order.id)
                })
                .catch((caught: unknown) => {
                  setError(caught instanceof Error ? caught.message : "Payment failed.")
                })
                .finally(() => setPaying(false))
            }}
          >
            Pay
          </button>
        ) : null}
      </div>
      {error ? <p className="banner">{error}</p> : null}
    </section>
  )
}
