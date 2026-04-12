import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// PWA Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swPath = import.meta.env.BASE_URL + 'sw.js'
    navigator.serviceWorker.register(swPath)
      .then(() => console.log('SW OK'))
      .catch(() => {})
  })
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: any) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          fontFamily: 'monospace', padding: '2rem',
          background: '#030712', color: '#ef4444',
          minHeight: '100vh'
        }}>
          <h2 style={{ color: '#f87171', marginBottom: '1rem' }}>
            SIG FTTH — Erreur de chargement
          </h2>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '13px', color: '#fca5a5' }}>
            {this.state.error?.message}
          </pre>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '11px', color: '#6b7280', marginTop: '1rem' }}>
            {this.state.error?.stack}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '1rem', padding: '0.5rem 1rem',
              background: '#1d4ed8', color: 'white',
              border: 'none', borderRadius: '8px', cursor: 'pointer'
            }}
          >
            Recharger
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
