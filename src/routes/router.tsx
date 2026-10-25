import { createBrowserRouter, Navigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { RequireAdmin, RequireAuth } from './guards'

// Pages load on demand so customers never download the admin screens.
function page<M extends Record<string, React.ComponentType>>(load: () => Promise<M>, name: keyof M) {
  return { lazy: async () => ({ Component: (await load())[name] }) }
}

export const router = createBrowserRouter([
  { path: '/login', ...page(() => import('../pages/LoginPage'), 'LoginPage') },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <Layout />,
        children: [
          { path: '/', element: <Navigate to="/inventory" replace /> },
          { path: '/inventory', ...page(() => import('../pages/InventoryPage'), 'InventoryPage') },
          { path: '/inventory/:id', ...page(() => import('../pages/InventoryDetailPage'), 'InventoryDetailPage') },
          { path: '/inventory/:id/request', ...page(() => import('../pages/RequestCustomItemPage'), 'RequestCustomItemPage') },
          { path: '/cart', ...page(() => import('../pages/CartPage'), 'CartPage') },
          { path: '/orders/new', ...page(() => import('../pages/OrdersNewPage'), 'OrdersNewPage') },
          { path: '/orders', ...page(() => import('../pages/OrdersListPage'), 'OrdersListPage') },
          { path: '/orders/:id', ...page(() => import('../pages/OrderDetailPage'), 'OrderDetailPage') },
          { path: '/combine-requests', ...page(() => import('../pages/CombineRequestsPage'), 'CombineRequestsPage') },
          { path: '/shipments', ...page(() => import('../pages/MyShipmentsListPage'), 'MyShipmentsListPage') },
          { path: '/shipments/:id', ...page(() => import('../pages/MyShipmentPage'), 'MyShipmentPage') },
          { path: '/profile', ...page(() => import('../pages/ProfilePage'), 'ProfilePage') },
          {
            element: <RequireAdmin />,
            children: [
              { path: '/admin', element: <Navigate to="/admin/dashboard" replace /> },
              { path: '/admin/inventory', ...page(() => import('../pages/admin/AdminInventoryPage'), 'AdminInventoryPage') },
              { path: '/admin/orders', ...page(() => import('../pages/admin/AdminOrdersPage'), 'AdminOrdersPage') },
              { path: '/admin/orders/:id', ...page(() => import('../pages/admin/AdminOrderDetailPage'), 'AdminOrderDetailPage') },
              { path: '/admin/shipments', ...page(() => import('../pages/admin/AdminShipmentsPage'), 'AdminShipmentsPage') },
              { path: '/admin/shipments/:id', ...page(() => import('../pages/admin/AdminShipmentsPage'), 'AdminShipmentsPage') },
              {
                path: '/admin/settings',
                ...page(() => import('../pages/admin/AdminSettingsPage'), 'AdminSettingsPage'),
                children: [
                  { index: true, element: <Navigate to="/admin/settings/categories" replace /> },
                  { path: 'categories', ...page(() => import('../pages/admin/AdminCategoriesPage'), 'AdminCategoriesPage') },
                  { path: 'shipping-rates', ...page(() => import('../pages/admin/AdminShippingRatesPage'), 'AdminShippingRatesPage') },
                  { path: 'exchange-rate', ...page(() => import('../pages/admin/AdminExchangeRatePage'), 'AdminExchangeRatePage') },
                  { path: 'item-templates', ...page(() => import('../pages/admin/AdminItemTemplatesPage'), 'AdminItemTemplatesPage') },
                ],
              },
              { path: '/admin/dashboard', ...page(() => import('../pages/admin/AdminDashboardPage'), 'AdminDashboardPage') },
              { path: '/admin/combine-requests', ...page(() => import('../pages/admin/AdminCombineRequestsPage'), 'AdminCombineRequestsPage') },
            ],
          },
        ],
      },
    ],
  },
])
