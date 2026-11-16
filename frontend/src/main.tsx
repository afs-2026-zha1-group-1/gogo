import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { IdentityProvider } from './features/split/identity'
import { router } from './router'
import './index.css'
import './app.css'

// Errors surface immediately (no retry backoff) so permission/rejection states stay observable
// (REQ-019 PAGE-9 needs a visible retry); screens expose an explicit retry. Polling is per split query.
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
})

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Missing required #root element')
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <IdentityProvider>
        <RouterProvider router={router} />
      </IdentityProvider>
    </QueryClientProvider>
  </StrictMode>,
)
