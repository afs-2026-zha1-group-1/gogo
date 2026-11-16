import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { IdentityProvider } from './features/split/identity'
import { router } from './router'
import './index.css'
import './app.css'

// Errors surface immediately (no retry backoff) so the permission/rejection states are observable
// during the local walkthrough; screens expose an explicit retry. Polling is set per split query.
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <IdentityProvider>
        <RouterProvider router={router} />
      </IdentityProvider>
    </QueryClientProvider>
  </StrictMode>,
)
