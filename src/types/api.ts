export type Role = 'USER' | 'ADMIN'
export type Condition = 'NEW' | 'USED'
export type Currency = 'JPY' | 'EUR'
export type OrderStatus = 'REQUESTED' | 'IN_PROGRESS' | 'PURCHASED' | 'SENT' | 'DELIVERED' | 'CANCELLED'
export type OrderItemStatus = 'REQUESTED' | 'CONFIRMING' | 'BUYING' | 'BOUGHT' | 'SHIPPED'
export type ShipmentStatus = 'PREPARING' | 'SHIPPED' | 'DELIVERED'
export type ShipmentDestination = 'SLOVENIA' | 'AUSTRIA'
export type ShippingMethod = 'EMS' | 'SMALL_PACKET' | 'SURFACE_MAIL'

export interface Page<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface Category {
  id: string
  name: string
  slug: string
}

export interface InventoryItem {
  id: string
  title: string
  description: string | null
  condition: Condition
  priceAmount: number
  currency: Currency
  stockQuantity: number
  status: 'ACTIVE' | 'ARCHIVED'
  images: string[]
  categories: Category[]
}

export interface OrderItemDto {
  id: string
  inventoryItemId: string | null
  title: string
  description: string | null
  imageKey: string | null
  condition: Condition | null
  currency: Currency
  maxPrice: number | null
  actualPrice: number | null
  weight: number | null
  status: OrderItemStatus
  purchasedAt: string | null
  quantity: number
}

export interface OrderDto {
  id: string
  userId: string
  status: OrderStatus
  notes: string | null
  shipmentId: string | null
  createdAt: string
  updatedAt: string
  items: OrderItemDto[]
  // Only set when this order is read as part of a shipment (GET /api/admin/shipments) - absent
  // (not just null) on every other endpoint that returns an order, so kept optional here rather
  // than forcing every other OrderDto fixture/call site to spell out "not applicable".
  orderWeightGrams?: number | null
  shippingCostShareJpy?: number | null
}

export interface ShipmentDto {
  id: string
  status: ShipmentStatus
  destination: ShipmentDestination | null
  shippingMethod: ShippingMethod | null
  trackingNumber: string | null
  notes: string | null
  totalWeightGrams: number
  // Null until both destination and shippingMethod are set, or if the shipment is heavier than
  // that method covers (Small Packet / Surface Mail cap at 2kg).
  shippingCostJpy: number | null
  createdAt: string
  updatedAt: string
  orders: OrderDto[]
}

export interface UserProfileDto {
  id: string
  nickname: string
  email: string | null
  phone: string | null
  firstName: string | null
  lastName: string | null
  addressLine1: string | null
  addressLine2: string | null
  postalCode: string | null
  city: string | null
  country: string | null
}
