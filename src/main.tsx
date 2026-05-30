import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ActiveProfileProvider } from './contexts/ActiveProfileContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ActiveProfileProvider>
      <App />
    </ActiveProfileProvider>
  </StrictMode>,
)
