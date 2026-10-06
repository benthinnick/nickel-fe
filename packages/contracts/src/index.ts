export type ProductStatus = "active" | "inactive"

export type OrderStatus = "pending_payment" | "paid" | "payment_failed" | "delivered"

export type PaymentStatus = "pending" | "succeeded" | "failed"

export type DeliveryStatus = "delivered"

export interface ProductResponse {
  id: string
  seller_id: string
  sku: string
  name: string
  description: string
  price: string
  currency: string
  status: ProductStatus
  stock: number
  image_url: string | null
}

export interface ProductListResponse {
  items: ProductResponse[]
  total: number
  limit: number
  offset: number
}

export interface ProductAutocompleteResponse {
  queries: string[]
}

export interface CartItemResponse {
  product_id: string
  quantity: number
}

export interface CartResponse {
  items: CartItemResponse[]
}

export interface OrderItemResponse {
  product_id: string
  sku: string
  name: string
  unit_price: string
  quantity: number
  line_total: string
}

export interface OrderResponse {
  id: string
  session_id: string
  customer_id: string | null
  status: OrderStatus
  currency: string
  total: string
  items: OrderItemResponse[]
  created_at: string
  updated_at: string
}

export interface CustomerResponse {
  id: string
  email: string
  created_at: string
}

export interface PaymentResponse {
  id: string
  order_id: string
  status: PaymentStatus
  provider: string
  provider_reference: string | null
  amount: string
  currency: string
  failure_reason: string | null
  created_at: string
  updated_at: string
}

export interface DeliveryResponse {
  id: string
  order_id: string
  status: DeliveryStatus
  provider: string
  provider_reference: string | null
  created_at: string
  updated_at: string
}
