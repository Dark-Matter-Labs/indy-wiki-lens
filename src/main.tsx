import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import { App } from './App'
import { GraphProvider } from './lib/graph'
import { OverlayProvider } from './lib/overlay'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <GraphProvider>
        <OverlayProvider>
          <App />
        </OverlayProvider>
      </GraphProvider>
    </BrowserRouter>
  </StrictMode>,
)
