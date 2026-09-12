export type Role = 'USER' | 'ADMIN'
export type Condition = 'NEW' | 'USED'
export type Currency = 'JPY' | 'EUR'
export type OrderStatus = 'REQUESTED' | 'IN_PROGRESS' | 'PURCHASED' | 'SENT' | 'DELIVERED' | 'CANCELLED'
export type OrderItemStatus = 'REQUESTED' | 'CONFIRMING' | 'BUYING' | 'BOUGHT' | 'SHIPPED'
export type ShipmentStatus = 'PREPARING' | 'SHIPPED' | 'DELIVERED'

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
}

export interface ShipmentDto {
  id: string
  status: ShipmentStatus
  trackingNumber: string | null
  notes: string | null
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
