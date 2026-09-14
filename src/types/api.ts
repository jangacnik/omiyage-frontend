export type Role = 'USER' | 'ADMIN'
export type Condition = 'NEW' | 'USED'
export type Currency = 'JPY' | 'EUR'
export type OrderStatus =
  | 'REQUESTED'
  | 'IN_PROGRESS'
  | 'PURCHASED'
  | 'PREPARING_SHIPPING'
  | 'SENT'
  | 'DELIVERED'
  | 'CANCELLED'
export type OrderItemStatus = 'REQUESTED' | 'CONFIRMING' | 'BUYING' | 'BOUGHT' | 'SHIPPED'
export type ShipmentStatus = 'PREPARING' | 'SHIPPED' | 'DELIVERED'
export type ShipmentDestination = 'SLOVENIA' | 'AUSTRIA'
export type ShippingMethod = 'EMS' | 'SMALL_PACKET' | 'SURFACE_MAIL'
export type CombineRequestStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED'
export type AdminOrderSortBy = 'UPDATED_AT' | 'CREATED_AT' | 'ITEM_COUNT'
export type SortDirection = 'ASC' | 'DESC'

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
  link: string | null
  condition: Condition
  priceAmount: number
  currency: Currency
  stockQuantity: number
  status: 'ACTIVE' | 'ARCHIVED'
  images: string[]
  categories: Category[]
  isPreorder: boolean
  expectedReleaseDate: string | null
  // Admin-only cost basis - absent on any response a normal user can read. Always JPY;
  // priceAmount above is always EUR.
  boughtPrice: number | null
  // priceAmount[EUR] - toEur(boughtPrice[JPY]), pre-converted server-side. Admin-only, same
  // convention as boughtPrice.
  profitEur: number | null
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
  // Currency the item was actually bought in - can differ from `currency` above. Null on a row
  // written before per-price currencies existed; treat as `currency` in that case.
  actualPriceCurrency: Currency | null
  weight: number | null
  status: OrderItemStatus
  paid: boolean
  paidAt: string | null
  link: string | null
  purchasedAt: string | null
  quantity: number
  isPreorder: boolean
  expectedReleaseDate: string | null
  // Admin-only - absent on any response a normal user can read.
  soldPrice: number | null
  soldPriceCurrency: Currency | null
  profit: number | null
}

export interface OrderDto {
  id: string
  userId: string
  status: OrderStatus
  open: boolean
  notes: string | null
  nickname: string | null
  shipmentId: string | null
  // Only populated on the admin orders list - the requester's account nickname, not this order's
  // own optional nickname (see `nickname` above).
  userNickname?: string | null
  createdAt: string
  updatedAt: string
  items: OrderItemDto[]
  // Only set when this order is read as part of a shipment (GET /api/admin/shipments) - absent
  // (not just null) on every other endpoint that returns an order, so kept optional here rather
  // than forcing every other OrderDto fixture/call site to spell out "not applicable".
  orderWeightGrams?: number | null
  shippingCostShareJpy?: number | null
  // EUR display amount already includes the admin-configured conversion rate plus a hidden
  // shipping markup applied server-side - never derive this on the frontend.
  shippingCostShareEur?: number | null
  // Admin-only - absent on any response a normal user can read.
  profit?: number | null
}

export interface ShipmentDto {
  id: string
  status: ShipmentStatus
  title: string | null
  destination: ShipmentDestination | null
  shippingMethod: ShippingMethod | null
  trackingNumber: string | null
  notes: string | null
  ownerUserId: string | null
  totalWeightGrams: number
  // Both null until destination and shippingMethod are set and an admin-configured rate covers
  // the total weight - see the shipping-rates admin page.
  shippingCostJpy: number | null
  // Already includes the admin-configured conversion rate plus a hidden shipping markup - always
  // show exactly this number, never derive it from shippingCostJpy on the frontend.
  shippingCostEur: number | null
  estimatedDays: number | null
  shippedAt: string | null
  arrivedAt: string | null
  createdAt: string
  updatedAt: string
  orders: OrderDto[]
  // Admin-only - every shipment endpoint is admin-only, so this is always populated.
  profit: number
}

export interface OrderSummaryDto {
  id: string
  nickname: string | null
  itemCount: number
}

export interface ShipmentSummaryDto {
  id: string
  title: string | null
  itemCount: number
  totalWeightGrams: number
}

export interface BrowsableShipmentDto {
  id: string
  title: string | null
  itemCount: number
  totalWeightGrams: number
  ownerNickname: string | null
}

export interface CombineRequestDto {
  id: string
  requesterOrder: OrderSummaryDto
  targetShipment: ShipmentSummaryDto
  status: CombineRequestStatus
  createdAt: string
  respondedAt: string | null
  resultingShipmentId: string | null
}

export interface ShipmentMemberDto {
  userId: string
  orders: OrderDto[]
  itemTotals: PendingAmountDto[]
  shippingShareJpy: number | null
  shippingShareEur: number | null
}

export interface MemberShipmentDto {
  id: string
  title: string | null
  status: ShipmentStatus
  destination: ShipmentDestination | null
  shippingMethod: ShippingMethod | null
  trackingNumber: string | null
  ownerUserId: string | null
  totalWeightGrams: number
  shippingCostJpy: number | null
  shippingCostEur: number | null
  estimatedDays: number | null
  shippedAt: string | null
  arrivedAt: string | null
  members: ShipmentMemberDto[]
  grandTotalItemTotals: PendingAmountDto[]
}

export interface SplitOrderResponseDto {
  original: OrderDto
  created: OrderDto
}

export interface ShippingRateDto {
  id: string
  destination: ShipmentDestination
  shippingMethod: ShippingMethod
  maxWeightGrams: number
  costJpy: number
  // Already includes the admin-configured conversion rate plus a hidden shipping markup - the
  // same figure a real shipment using this tier would show. Never derive this from costJpy.
  costEur: number
  estimatedDays: number
}

export interface ExchangeRateDto {
  jpyPerEur: number
}

export interface PendingAmountDto {
  currency: Currency
  amount: number
}

export interface UserDashboardEntryDto {
  user: UserProfileDto
  orders: OrderDto[]
  pendingAmounts: PendingAmountDto[]
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
  avatarKey: string | null
}
