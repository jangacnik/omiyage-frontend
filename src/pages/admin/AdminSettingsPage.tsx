import { NavLink, Outlet } from 'react-router-dom'

const TABS = [
  { to: '/admin/settings/categories', label: 'Categories' },
  { to: '/admin/settings/shipping-rates', label: 'Shipping rates' },
  { to: '/admin/settings/exchange-rate', label: 'Exchange rate' },
  { to: '/admin/settings/item-templates', label: 'Item templates' },
]

/** Admin settings shell - sub-navigation between categories, shipping rates, and (later) any
 *  other admin configuration that doesn't warrant its own top-level nav item. */
export function AdminSettingsPage() {
  return (
    <div>
      <h1 className="page-title mb-4">Admin: Settings</h1>

      <nav className="mb-6 flex gap-1 border-b border-mist">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `px-3 py-2 text-sm font-medium ${isActive ? 'border-b-2 border-forest text-forest' : 'text-muted hover:text-ink'}`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  )
}
