import { createBrowserRouter, Navigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { RequireAdmin, RequireAuth } from './guards'
import { LoginPage } from '../pages/LoginPage'
import { InventoryPage } from '../pages/InventoryPage'
import { InventoryDetailPage } from '../pages/InventoryDetailPage'
import { RequestCustomItemPage } from '../pages/RequestCustomItemPage'
import { CartPage } from '../pages/CartPage'
import { OrdersNewPage } from '../pages/OrdersNewPage'
import { OrdersListPage } from '../pages/OrdersListPage'
import { OrderDetailPage } from '../pages/OrderDetailPage'
import { CombineRequestsPage } from '../pages/CombineRequestsPage'
import { MyShipmentPage } from '../pages/MyShipmentPage'
import { MyShipmentsListPage } from '../pages/MyShipmentsListPage'
import { ProfilePage } from '../pages/ProfilePage'
import { AdminInventoryPage } from '../pages/admin/AdminInventoryPage'
import { AdminSettingsPage } from '../pages/admin/AdminSettingsPage'
import { AdminCategoriesPage } from '../pages/admin/AdminCategoriesPage'
import { AdminExchangeRatePage } from '../pages/admin/AdminExchangeRatePage'
import { AdminItemTemplatesPage } from '../pages/admin/AdminItemTemplatesPage'
import { AdminOrdersPage } from '../pages/admin/AdminOrdersPage'
import { AdminOrderDetailPage } from '../pages/admin/AdminOrderDetailPage'
import { AdminShipmentsPage } from '../pages/admin/AdminShipmentsPage'
import { AdminCombineRequestsPage } from '../pages/admin/AdminCombineRequestsPage'
import { AdminShippingRatesPage } from '../pages/admin/AdminShippingRatesPage'
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <Layout />,
        children: [
          { path: '/', element: <Navigate to="/inventory" replace /> },
          { path: '/inventory', element: <InventoryPage /> },
          { path: '/inventory/:id', element: <InventoryDetailPage /> },
          { path: '/inventory/:id/request', element: <RequestCustomItemPage /> },
          { path: '/cart', element: <CartPage /> },
          { path: '/orders/new', element: <OrdersNewPage /> },
          { path: '/orders', element: <OrdersListPage /> },
          { path: '/orders/:id', element: <OrderDetailPage /> },
          { path: '/combine-requests', element: <CombineRequestsPage /> },
          { path: '/shipments', element: <MyShipmentsListPage /> },
          { path: '/shipments/:id', element: <MyShipmentPage /> },
          { path: '/profile', element: <ProfilePage /> },
          {
            element: <RequireAdmin />,
            children: [
              { path: '/admin', element: <Navigate to="/admin/dashboard" replace /> },
              { path: '/admin/inventory', element: <AdminInventoryPage /> },
              { path: '/admin/orders', element: <AdminOrdersPage /> },
              { path: '/admin/orders/:id', element: <AdminOrderDetailPage /> },
              { path: '/admin/shipments', element: <AdminShipmentsPage /> },
              { path: '/admin/shipments/:id', element: <AdminShipmentsPage /> },
              {
                path: '/admin/settings',
                element: <AdminSettingsPage />,
                children: [
                  { index: true, element: <Navigate to="/admin/settings/categories" replace /> },
                  { path: 'categories', element: <AdminCategoriesPage /> },
                  { path: 'shipping-rates', element: <AdminShippingRatesPage /> },
                  { path: 'exchange-rate', element: <AdminExchangeRatePage /> },
                  { path: 'item-templates', element: <AdminItemTemplatesPage /> },
                ],
              },
              { path: '/admin/dashboard', element: <AdminDashboardPage /> },
              { path: '/admin/combine-requests', element: <AdminCombineRequestsPage /> },
            ],
          },
        ],
      },
    ],
  },
])
