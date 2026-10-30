/** Basket replaces the local cart / direct order creation. Off until omiyage-api's basket confirm
 *  endpoint is live, otherwise members could no longer place orders. */
export const BASKET_ENABLED = import.meta.env.VITE_BASKET_ENABLED === 'true'

/** Mirrors the backend basket TTL (omiyage-api, default 7 days) - keep in sync with it. */
export const BASKET_RETENTION_DAYS = 7
