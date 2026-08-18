import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './base.css'
import './styles.css'
import './monaco-setup'
import { App } from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
