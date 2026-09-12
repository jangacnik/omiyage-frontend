import type { ReactElement } from 'react'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { ConfirmProvider } from '../components/ConfirmDialog'
import { CurrencyPreferenceProvider } from '../lib/currency'

export function renderWithProviders(ui: ReactElement, initialEntries: string[] = ['/']) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <CurrencyPreferenceProvider>
        <ConfirmProvider>
          <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
        </ConfirmProvider>
      </CurrencyPreferenceProvider>
    </QueryClientProvider>,
  )
}
