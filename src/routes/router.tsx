import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom'
import { NotFoundPage, RouteErrorPage } from './ErrorPages'
import { Layout } from '../components/Layout'
import { Spinner } from '../components/Spinner'
import { RouteTitle } from './RouteTitle'
import { RequireAdmin, RequireAuth } from './guards'

// Pages load on demand so customers never download the admin screens.
function page<M extends Record<string, React.ComponentType>>(load: () => Promise<M>, name: keyof M, title: string) {
  return { handle: { title }, lazy: async () => ({ Component: (await load())[name] }) }
}

export const routes: RouteObject[] = [
  {
    element: <RouteTitle />,
    // Every page is lazy, so the first load has nothing to render until its chunk arrives.
    HydrateFallback: () => <Spinner fullPage />,
    errorElement: <RouteErrorPage />,
    children: [
      { path: '/auth/callback', ...page(() => import('../pages/AuthCallbackPage'), 'AuthCallbackPage', 'Signing in') },
      { path: '/login', ...page(() => import('../pages/LoginPage'), 'LoginPage', 'Sign in') },
      { path: '*', element: <NotFoundPage />, handle: { title: 'Page not found' } },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <Layout />,
            children: [
              { path: '/', element: <Navigate to="/inventory" replace /> },
              { path: '/inventory', ...page(() => import('../pages/InventoryPage'), 'InventoryPage', 'Inventory') },
              { path: '/inventory/:id', ...page(() => import('../pages/InventoryDetailPage'), 'InventoryDetailPage', 'Item') },
              { path: '/inventory/:id/request', ...page(() => import('../pages/RequestCustomItemPage'), 'RequestCustomItemPage', 'Request item') },
              { path: '/cart', ...page(() => import('../pages/CartPage'), 'CartPage', 'Cart') },
              { path: '/basket', ...page(() => import('../pages/BasketPage'), 'BasketPage', 'Basket') },
              { path: '/orders/new', ...page(() => import('../pages/OrdersNewPage'), 'OrdersNewPage', 'New order') },
              { path: '/orders', ...page(() => import('../pages/OrdersListPage'), 'OrdersListPage', 'My orders') },
              { path: '/orders/:id', ...page(() => import('../pages/OrderDetailPage'), 'OrderDetailPage', 'Order') },
              { path: '/combine-requests', ...page(() => import('../pages/CombineRequestsPage'), 'CombineRequestsPage', 'Combine requests') },
              { path: '/shipments', ...page(() => import('../pages/MyShipmentsListPage'), 'MyShipmentsListPage', 'Shipments') },
              { path: '/shipments/:id', ...page(() => import('../pages/MyShipmentPage'), 'MyShipmentPage', 'Shipment') },
              { path: '/profile', ...page(() => import('../pages/ProfilePage'), 'ProfilePage', 'Profile') },
              {
                element: <RequireAdmin />,
                children: [
                  { path: '/admin', element: <Navigate to="/admin/dashboard" replace /> },
                  { path: '/admin/inventory', ...page(() => import('../pages/admin/AdminInventoryPage'), 'AdminInventoryPage', 'Manage inventory') },
                  { path: '/admin/orders', ...page(() => import('../pages/admin/AdminOrdersPage'), 'AdminOrdersPage', 'Orders') },
                  { path: '/admin/orders/:id', ...page(() => import('../pages/admin/AdminOrderDetailPage'), 'AdminOrderDetailPage', 'Order') },
                  { path: '/admin/shipments', ...page(() => import('../pages/admin/AdminShipmentsPage'), 'AdminShipmentsPage', 'Shipments') },
                  { path: '/admin/shipments/:id', ...page(() => import('../pages/admin/AdminShipmentsPage'), 'AdminShipmentsPage', 'Shipments') },
                  {
                    path: '/admin/settings',
                    ...page(() => import('../pages/admin/AdminSettingsPage'), 'AdminSettingsPage', 'Settings'),
                    children: [
                      { index: true, element: <Navigate to="/admin/settings/categories" replace /> },
                      { path: 'categories', ...page(() => import('../pages/admin/AdminCategoriesPage'), 'AdminCategoriesPage', 'Categories') },
                      { path: 'shipping-rates', ...page(() => import('../pages/admin/AdminShippingRatesPage'), 'AdminShippingRatesPage', 'Shipping rates') },
                      { path: 'exchange-rate', ...page(() => import('../pages/admin/AdminExchangeRatePage'), 'AdminExchangeRatePage', 'Exchange rate') },
                      { path: 'item-templates', ...page(() => import('../pages/admin/AdminItemTemplatesPage'), 'AdminItemTemplatesPage', 'Item templates') },
                    ],
                  },
                  { path: '/admin/dashboard', ...page(() => import('../pages/admin/AdminDashboardPage'), 'AdminDashboardPage', 'Dashboard') },
                  { path: '/admin/combine-requests', ...page(() => import('../pages/admin/AdminCombineRequestsPage'), 'AdminCombineRequestsPage', 'Combine requests') },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
]

export const router = createBrowserRouter(routes)
