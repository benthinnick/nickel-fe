import type {
  CartResponse,
  CustomerResponse,
  DeliveryResponse,
  OrderItemResponse,
  OrderResponse,
  PaymentResponse,
  ProductAutocompleteResponse,
  ProductListResponse,
  ProductResponse,
} from "@shekel/contracts"

const STORE_KEY = "__shekel_marketplace__"
const MAX_CART_ITEM_QUANTITY = 100
const SELLER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"

export const CART_CHANGED_EVENT = "shekel:cart-changed"
export const AUTH_CHANGED_EVENT = "shekel:auth-changed"

interface MarketplaceStore {
  products: ProductResponse[]
  cart: CartResponse
  orders: OrderResponse[]
  payments: PaymentResponse[]
  deliveries: DeliveryResponse[]
  customer: CustomerResponse | null
}

function money(amount: number): string {
  return amount.toFixed(2)
}

function product(
  id: string,
  sku: string,
  name: string,
  description: string,
  price: number,
  stock: number,
): ProductResponse {
  return {
    id,
    seller_id: SELLER_ID,
    sku,
    name,
    description,
    price: money(price),
    currency: "ILS",
    status: "active",
    stock,
    image_url: null,
  }
}

function seedProducts(): ProductResponse[] {
  return [
    product(
      "11111111-1111-4111-8111-111111111111",
      "OIL-TIN",
      "Galilee olive oil",
      "Cold-pressed oil in a one-litre tin.",
      48,
      24,
    ),
    product(
      "22222222-2222-4222-8222-222222222222",
      "CUP-CLAY",
      "Clay coffee cup",
      "Hand-thrown cup, glazed in sage.",
      36,
      40,
    ),
    product(
      "33333333-3333-4333-8333-333333333333",
      "LINEN-TWL",
      "Linen bath towel",
      "Stonewashed linen, unbleached.",
      92,
      15,
    ),
    product(
      "44444444-4444-4444-8444-444444444444",
      "TEA-BLACK",
      "Carmel black tea",
      "Loose leaf, 100 grams.",
      28,
      60,
    ),
    product(
      "55555555-5555-4555-8555-555555555555",
      "BOOK-LINEN",
      "Linen notebook",
      "Plain pages with a stitched spine.",
      22,
      80,
    ),
    product(
      "66666666-6666-4666-8666-666666666666",
      "HONEY-JAR",
      "Wildflower honey",
      "350 gram jar from the Sharon plain.",
      34,
      18,
    ),
  ]
}

function createStore(): MarketplaceStore {
  return {
    products: seedProducts(),
    cart: { items: [] },
    orders: [],
    payments: [],
    deliveries: [],
    customer: null,
  }
}

function getStore(): MarketplaceStore {
  const host = window as Window & { [STORE_KEY]?: MarketplaceStore }
  if (!host[STORE_KEY]) {
    host[STORE_KEY] = createStore()
  }
  return host[STORE_KEY]
}

function emitCart(): void {
  window.dispatchEvent(
    new CustomEvent(CART_CHANGED_EVENT, { detail: { count: cartCount() } }),
  )
}

function emitAuth(): void {
  window.dispatchEvent(new CustomEvent(AUTH_CHANGED_EVENT))
}

function activeProducts(): ProductResponse[] {
  return getStore().products.filter((item) => item.status === "active")
}

function listResponse(items: ProductResponse[]): ProductListResponse {
  return { items, total: items.length, limit: items.length, offset: 0 }
}

export function formatMoney(amount: string, currency: string): string {
  return new Intl.NumberFormat("en-IL", {
    style: "currency",
    currency,
  }).format(Number(amount))
}

export function listProducts(): ProductListResponse {
  return listResponse(activeProducts())
}

export function getProduct(id: string): ProductResponse | null {
  return activeProducts().find((item) => item.id === id) ?? null
}

export function searchProducts(query: string): ProductListResponse {
  const needle = query.trim().toLowerCase()
  if (!needle) return listResponse([])
  return listResponse(
    activeProducts().filter((item) => item.name.toLowerCase().includes(needle)),
  )
}

export function suggestNames(query: string): ProductAutocompleteResponse {
  const needle = query.trim().toLowerCase()
  if (!needle) return { queries: [] }
  const queries: string[] = []
  for (const item of activeProducts()) {
    if (!item.name.toLowerCase().includes(needle)) continue
    if (queries.includes(item.name)) continue
    queries.push(item.name)
    if (queries.length === 5) break
  }
  return { queries }
}

export function getCart(): CartResponse {
  return getStore().cart
}

export function cartCount(): number {
  return getStore().cart.items.reduce((sum, item) => sum + item.quantity, 0)
}

export function upsertCartItem(productId: string, quantity: number): CartResponse {
  const store = getStore()
  const product = store.products.find((item) => item.id === productId && item.status === "active")
  if (!product) throw new Error("That product is not available.")
  if (product.stock < 1) throw new Error("That product is out of stock.")
  const nextQuantity = Math.min(Math.max(Math.floor(quantity), 1), MAX_CART_ITEM_QUANTITY, product.stock)
  const items = store.cart.items.filter((item) => item.product_id !== productId)
  items.push({ product_id: productId, quantity: nextQuantity })
  store.cart = { items }
  emitCart()
  return store.cart
}

export function removeCartItem(productId: string): CartResponse {
  const store = getStore()
  store.cart = {
    items: store.cart.items.filter((item) => item.product_id !== productId),
  }
  emitCart()
  return store.cart
}

export function checkout(): OrderResponse {
  const store = getStore()
  if (store.cart.items.length === 0) throw new Error("Your cart is empty.")

  const items: OrderItemResponse[] = []
  let total = 0
  let currency = "ILS"

  for (const line of store.cart.items) {
    const product = store.products.find((item) => item.id === line.product_id && item.status === "active")
    if (!product) throw new Error("A cart item is no longer available.")
    if (line.quantity > product.stock) {
      throw new Error(`Not enough stock for ${product.name}.`)
    }
    currency = product.currency
    const lineTotal = Number(product.price) * line.quantity
    total += lineTotal
    items.push({
      product_id: product.id,
      sku: product.sku,
      name: product.name,
      unit_price: product.price,
      quantity: line.quantity,
      line_total: money(lineTotal),
    })
  }

  for (const line of items) {
    const product = store.products.find((item) => item.id === line.product_id)
    if (product) product.stock -= line.quantity
  }

  const now = new Date().toISOString()
  const order: OrderResponse = {
    id: crypto.randomUUID(),
    session_id: "local-session",
    customer_id: store.customer?.id ?? null,
    status: "pending_payment",
    currency,
    total: money(total),
    items,
    created_at: now,
    updated_at: now,
  }
  store.orders.unshift(order)
  store.cart = { items: [] }
  emitCart()
  return order
}

export function getOrder(orderId: string): OrderResponse | null {
  return getStore().orders.find((order) => order.id === orderId) ?? null
}

export function getPayment(orderId: string): PaymentResponse | null {
  return getStore().payments.find((payment) => payment.order_id === orderId) ?? null
}

export function getDelivery(orderId: string): DeliveryResponse | null {
  return getStore().deliveries.find((delivery) => delivery.order_id === orderId) ?? null
}

export function payOrder(orderId: string): OrderResponse | null {
  const store = getStore()
  const order = store.orders.find((item) => item.id === orderId)
  if (!order || order.status !== "pending_payment") return null
  const now = new Date().toISOString()
  order.status = "paid"
  order.updated_at = now
  store.payments = store.payments.filter((payment) => payment.order_id !== orderId)
  store.payments.push({
    id: crypto.randomUUID(),
    order_id: orderId,
    status: "succeeded",
    provider: "stub",
    provider_reference: null,
    amount: order.total,
    currency: order.currency,
    failure_reason: null,
    created_at: now,
    updated_at: now,
  })
  return order
}

export function deliverOrder(orderId: string): OrderResponse | null {
  const store = getStore()
  const order = store.orders.find((item) => item.id === orderId)
  if (!order || order.status !== "paid") return null
  const now = new Date().toISOString()
  order.status = "delivered"
  order.updated_at = now
  store.deliveries = store.deliveries.filter((delivery) => delivery.order_id !== orderId)
  store.deliveries.push({
    id: crypto.randomUUID(),
    order_id: orderId,
    status: "delivered",
    provider: "stub",
    provider_reference: null,
    created_at: now,
    updated_at: now,
  })
  return order
}

export function getCustomer(): CustomerResponse | null {
  return getStore().customer
}

export function signIn(email: string): CustomerResponse {
  const trimmed = email.trim()
  if (!trimmed) throw new Error("Email is required.")
  const store = getStore()
  const customer: CustomerResponse = {
    id: store.customer?.id ?? crypto.randomUUID(),
    email: trimmed,
    created_at: store.customer?.created_at ?? new Date().toISOString(),
  }
  store.customer = customer
  emitAuth()
  return customer
}

export function signOut(): void {
  getStore().customer = null
  emitAuth()
}
