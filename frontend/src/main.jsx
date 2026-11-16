import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConfigProvider } from 'antd'
import App from './App.jsx'
import './app.css'

// PAGE-9 needs a visible retry action, so a failed load must not retry invisibly three times.
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 0 } },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={{ token: { colorPrimary: '#0d9488' } }}>
        <App />
      </ConfigProvider>
    </QueryClientProvider>
  </StrictMode>,
)
