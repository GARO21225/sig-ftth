import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '@store/useStore'

function useSessionTimer() {
  const TIMEOUT = 10 * 60 * 1000
  const [remaining, setRemaining] = useState(TIMEOUT)
  const lastActivity = useRef(Date.now())

  useEffect(() => {
    const reset = () => { lastActivity.current = Date.now() }
    const events = ['mousedown','keydown','scroll','touchstart','click']
    events.forEach(e => window.addEventListener(e, reset, { passive: true }))
    const tick = setInterval(() => {
      setRemaining(Math.max(0, TIMEOUT - (Date.now() - lastActivity.current)))
    }, 15000)
    return () => {
      events.forEach(e => window.removeEventListener(e, reset))
      clearInterval(tick)
    }
  }, [])

  return Math.ceil(remaining / 60000)
}

interface HeaderProps {
  onMenuClick: () => void
  sidebarOpen: boolean
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { user } = useAuthStore()
  const minsLeft = useSessionTimer()

  return (
    <div className="h-12 flex items-center px-3 border-b border-gray-800 bg-gray-900 flex-shrink-0 gap-2">
      {/* Menu burger */}
      <button
        onClick={onMenuClick}
        className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 active:bg-gray-700 flex-shrink-0 transition-colors"
        style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
        aria-label="Menu"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M2 4h14M2 9h14M2 14h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>

      {/* Logo compact */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-6 h-6 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-xs">
          S
        </div>
        <span className="text-white font-bold text-sm hidden sm:block">SIG FTTH</span>
      </div>

      <div className="flex-1" />

      {/* Alerte session */}
      {minsLeft <= 3 && minsLeft > 0 && (
        <div className="flex items-center gap-1 bg-orange-900/50 border border-orange-700/50 rounded-lg px-2 py-1">
          <span className="text-orange-400 text-xs">⏱ {minsLeft} min</span>
        </div>
      )}

      {/* User info */}
      <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-800 rounded-xl">
        <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          {user?.prenom?.[0]?.toUpperCase() || '?'}
        </div>
        <span className="text-gray-300 text-xs hidden sm:block max-w-24 truncate">
          {user?.prenom || user?.nom || 'Utilisateur'}
        </span>
        <span className="text-gray-500 text-xs hidden md:block capitalize">
          · {user?.role}
        </span>
      </div>
    </div>
  )
}
