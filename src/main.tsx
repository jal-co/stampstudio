import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { NuqsAdapter } from 'nuqs/adapters/react'
import './index.css'
import './lib/analytics'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* plain-React adapter: this is a Vite SPA with no router */}
    <NuqsAdapter>
      <App />
    </NuqsAdapter>
  </StrictMode>,
)
