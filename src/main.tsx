import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import { initializeKnowledgeBase } from './knowledge'

// Initialize knowledge base before mounting app
void initializeKnowledgeBase().then(() => {
  createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
})
