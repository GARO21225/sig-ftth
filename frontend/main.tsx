import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

// Capturer TOUTES les erreurs avant que React monte
window.addEventListener('unhandledrejection', (e) => {
  document.body.innerHTML = `<div style="background:#030712;color:#ef4444;padding:2rem;font-family:monospace;min-height:100vh">
    <h2>Promise rejetée</h2><pre style="color:#fca5a5;white-space:pre-wrap">${e.reason}</pre>
  </div>`
})
window.addEventListener('error', (e) => {
  document.body.innerHTML = `<div style="background:#030712;color:#ef4444;padding:2rem;font-family:monospace;min-height:100vh">
    <h2>Erreur JS: ${e.message}</h2>
    <pre style="color:#fca5a5;white-space:pre-wrap">Fichier: ${e.filename}\nLigne: ${e.lineno}</pre>
  </div>`
})

// Importer App APRES avoir installé les listeners
import('./App').then(({ default: App }) => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode><App /></React.StrictMode>
  )
}).catch((err) => {
  document.body.innerHTML = `<div style="background:#030712;color:#ef4444;padding:2rem;font-family:monospace;min-height:100vh">
    <h2>Echec chargement App</h2>
    <pre style="color:#fca5a5;white-space:pre-wrap">${err?.message || err}</pre>
    <pre style="color:#6b7280;font-size:11px">${err?.stack || ''}</pre>
  </div>`
})
