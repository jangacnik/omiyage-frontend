import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { router } from './routes/router'
import { ConfirmProvider } from './components/ConfirmDialog'
import { CurrencyPreferenceProvider } from './lib/currency'

const queryClient = new QueryClient()

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CurrencyPreferenceProvider>
        <ConfirmProvider>
          <RouterProvider router={router} />
        </ConfirmProvider>
      </CurrencyPreferenceProvider>
    </QueryClientProvider>
  )
}
