import type {
  CartResponse,
  CustomerResponse,
  DeliveryResponse,
  OrderResponse,
  PaymentResponse,
  ProductAutocompleteResponse,
  ProductListResponse,
  ProductResponse,
} from "@nickel/contracts"

const MONEY_KEYS = new Set(["price", "unit_price", "line_total", "total", "amount"])
const ISSUER = "http://localhost:8080/realms/nickel"
const CLIENT_ID = "nickel-web"
const REDIRECT_URI = "http://localhost:9000/login/callback"
const ACCESS_KEY = "nickel_access_token"
const REFRESH_KEY = "nickel_refresh_token"
const VERIFIER_KEY = "nickel_pkce_verifier"
const STATE_KEY = "nickel_oauth_state"

export const CART_CHANGED_EVENT = "nickel:cart-changed"
export const AUTH_CHANGED_EVENT = "nickel:auth-changed"

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export function formatMoney(amount: string, currency: string): string {
  return new Intl.NumberFormat("en-IL", {
    style: "currency",
    currency,
  }).format(Number(amount))
}

function emitCart(): void {
  window.dispatchEvent(new CustomEvent(CART_CHANGED_EVENT))
}

function emitAuth(): void {
  window.dispatchEvent(new CustomEvent(AUTH_CHANGED_EVENT))
}

function base64Url(bytes: Uint8Array): string {
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "")
}

function randomString(size: number): string {
  const bytes = new Uint8Array(size)
  crypto.getRandomValues(bytes)
  return base64Url(bytes)
}

async function codeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))
  return base64Url(new Uint8Array(digest))
}

export function getAccessToken(): string | null {
  return sessionStorage.getItem(ACCESS_KEY)
}

function saveTokens(tokens: { access_token: string; refresh_token?: string }): void {
  sessionStorage.setItem(ACCESS_KEY, tokens.access_token)
  if (tokens.refresh_token) sessionStorage.setItem(REFRESH_KEY, tokens.refresh_token)
}

function clearSession(): void {
  sessionStorage.removeItem(ACCESS_KEY)
  sessionStorage.removeItem(REFRESH_KEY)
  sessionStorage.removeItem(VERIFIER_KEY)
  sessionStorage.removeItem(STATE_KEY)
}

async function requestToken(body: URLSearchParams): Promise<{ access_token: string; refresh_token?: string }> {
  const response = await fetch(`${ISSUER}/protocol/openid-connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  })
  if (!response.ok) throw new Error("Sign-in could not be completed.")
  return response.json() as Promise<{ access_token: string; refresh_token?: string }>
}

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = sessionStorage.getItem(REFRESH_KEY)
  if (!refreshToken) return false
  try {
    const tokens = await requestToken(
      new URLSearchParams({
        grant_type: "refresh_token",
        client_id: CLIENT_ID,
        refresh_token: refreshToken,
      }),
    )
    saveTokens(tokens)
    return true
  } catch {
    return false
  }
}

export async function startLogin(): Promise<void> {
  const verifier = randomString(32)
  const state = randomString(16)
  sessionStorage.setItem(VERIFIER_KEY, verifier)
  sessionStorage.setItem(STATE_KEY, state)
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: "openid",
    code_challenge: await codeChallenge(verifier),
    code_challenge_method: "S256",
    state,
  })
  window.location.assign(`${ISSUER}/protocol/openid-connect/auth?${params}`)
}

export async function completeLogin(search: string): Promise<void> {
  const params = new URLSearchParams(search)
  const code = params.get("code")
  const state = params.get("state")
  const expected = sessionStorage.getItem(STATE_KEY)
  const verifier = sessionStorage.getItem(VERIFIER_KEY)
  sessionStorage.removeItem(STATE_KEY)
  sessionStorage.removeItem(VERIFIER_KEY)
  if (!code || !verifier || !state || state !== expected) {
    throw new Error("Sign-in could not be completed.")
  }
  const tokens = await requestToken(
    new URLSearchParams({
      grant_type: "authorization_code",
      client_id: CLIENT_ID,
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: verifier,
    }),
  )
  saveTokens(tokens)
  emitAuth()
  emitCart()
}

export function signOut(): void {
  clearSession()
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    post_logout_redirect_uri: "http://localhost:9000/products",
  })
  window.location.assign(`${ISSUER}/protocol/openid-connect/logout?${params}`)
}

function moneyString(value: string | number): string {
  return Number(value).toFixed(2)
}

function normalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalize)
  if (value === null || typeof value !== "object") return value
  const next: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value)) {
    if ((typeof item === "number" || typeof item === "string") && MONEY_KEYS.has(key)) {
      next[key] = moneyString(item)
    } else {
      next[key] = normalize(item)
    }
  }
  return next
}

async function api<T>(path: string, init?: RequestInit, retried = false): Promise<T> {
  const headers = new Headers(init?.headers)
  headers.set("Accept", "application/json")
  if (init?.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }
  const token = getAccessToken()
  if (token && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`)
  const response = await fetch(`/api/v1${path}`, {
    ...init,
    credentials: "include",
    headers,
  })
  if (response.status === 401 && !retried && token) {
    const refreshed = await refreshAccessToken()
    if (refreshed) return api<T>(path, init, true)
    clearSession()
    emitAuth()
  }
  if (!response.ok) {
    let message = response.statusText || "Request failed."
    try {
      const body = (await response.json()) as { message?: unknown }
      if (typeof body.message === "string" && body.message) message = body.message
    } catch {
      // The body was not JSON.
    }
    throw new ApiError(message, response.status)
  }
  if (response.status === 204) return undefined as T
  return normalize(await response.json()) as T
}

export function getMe(): Promise<CustomerResponse> {
  return api<CustomerResponse>("/customers/me")
}

export function listProducts(): Promise<ProductListResponse> {
  return api<ProductListResponse>("/products")
}

export function getProduct(productId: string): Promise<ProductResponse> {
  return api<ProductResponse>(`/products/${productId}`)
}

export function searchProducts(query: string): Promise<ProductListResponse> {
  const params = new URLSearchParams({ q: query })
  return api<ProductListResponse>(`/products/search?${params}`)
}

export function suggestNames(query: string): Promise<ProductAutocompleteResponse> {
  const params = new URLSearchParams({ q: query })
  return api<ProductAutocompleteResponse>(`/products/search/autocomplete?${params}`)
}

export function getCart(): Promise<CartResponse> {
  return api<CartResponse>("/cart")
}

export async function upsertCartItem(productId: string, quantity: number): Promise<CartResponse> {
  const cart = await api<CartResponse>("/cart/items", {
    method: "PUT",
    body: JSON.stringify({ product_id: productId, quantity }),
  })
  emitCart()
  return cart
}

export async function removeCartItem(productId: string): Promise<CartResponse> {
  const cart = await api<CartResponse>(`/cart/items/${productId}`, { method: "DELETE" })
  emitCart()
  return cart
}

export async function checkout(): Promise<OrderResponse> {
  const order = await api<OrderResponse>("/cart/checkout", { method: "POST" })
  emitCart()
  return order
}

export function getOrder(orderId: string): Promise<OrderResponse> {
  return api<OrderResponse>(`/orders/${orderId}`)
}

export function payOrder(orderId: string): Promise<PaymentResponse> {
  return api<PaymentResponse>(`/orders/${orderId}/payments`, { method: "POST" })
}

export async function getDelivery(orderId: string): Promise<DeliveryResponse | null> {
  try {
    return await api<DeliveryResponse>(`/orders/${orderId}/delivery`)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}
