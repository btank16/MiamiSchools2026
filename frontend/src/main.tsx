import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { ChatWidget } from './components/chat/ChatWidget'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    {/* Mounted beside the app so the conversation survives moving between results and school pages. */}
    <ChatWidget />
  </StrictMode>,
)
