import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// PWA Service Worker — path dynamique selon BASE_URL
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swPath = import.meta.env.BASE_URL + 'sw.js'
    navigator.serviceWorker
      .register(swPath)
      .then(() => console.log('✅ SW enregistré'))
      .catch(() => console.log('⚠️ SW non disponible'))
  })
}

ReactDOM.createRoot(
  document.getElementById('root')!
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
