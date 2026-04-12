import { useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useNotifStore } from '@store/useStore'

interface HeaderProps {
  onMenuClick: () => void
  sidebarOpen: boolean
}

const TITRES: Record<string, string> = {
  '/map':         '🗺️ Carte Interactive',
  '/dashboard':   '📊 Dashboard',
  '/travaux':     '🏗️ Suivi des Travaux',
  '/eligibilite': '📡 Éligibilité FTTH',
  '/terrain':     '📱 Mode Terrain',
  '/catalogue':   '📦 Catalogue Équipements',
  '/admin':       '⚙️ Administration',
}

export default function Header({
  onMenuClick,
  sidebarOpen
}: HeaderProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [showNotifs, setShowNotifs] = useState(false)
  const {
    notifications,
    unreadCount,
    markAllRead
  } = useNotifStore()

  const titre = TITRES[location.pathname] || '🌐 SIG FTTH'

  return (
    <header className="h-14 bg-gray-900 border-b
                       border-gray-700 flex items-center
                       justify-between px-4
                       flex-shrink-0 z-30">

      {/* Gauche */}
      <div className="flex items-center gap-3">
        {/* Bouton menu */}
        <button
          onClick={onMenuClick}
          className="p-2 text-gray-400
                     hover:text-white
                     hover:bg-gray-800 rounded-lg
                     transition-colors"
        >
          {sidebarOpen ? '◀' : '☰'}
        </button>

        {/* Titre page */}
        <h2 className="font-semibold text-white
                       text-base hidden sm:block">
          {titre}
        </h2>
      </div>

      {/* Droite */}
      <div className="flex items-center gap-2">

        {/* Statut connexion */}
        <div className="hidden sm:flex items-center
                        gap-1.5 bg-green-900/50
                        text-green-400 text-xs
                        px-3 py-1.5 rounded-full">
          <span className="w-1.5 h-1.5 bg-green-400
                           rounded-full
                           animate-pulse" />
          En ligne
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifs(!showNotifs)
              if (!showNotifs) markAllRead()
            }}
            className="relative p-2 text-gray-400
                       hover:text-white
                       hover:bg-gray-800 rounded-lg
                       transition-colors"
          >
            🔔
            {unreadCount > 0 && (
              <span className="absolute -top-0.5
                               -right-0.5
                               bg-red-500 text-white
                               text-xs rounded-full
                               w-4 h-4 flex items-center
                               justify-center font-bold
                               text-[10px]">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Panneau notifications */}
          {showNotifs && (
            <div className="absolute right-0 top-12
                            w-80 bg-gray-900 border
                            border-gray-700 rounded-2xl
                            shadow-2xl z-50
                            animate-slide-down">
              <div className="p-4 border-b
                              border-gray-700 flex
                              items-center
                              justify-between">
                <h3 className="font-semibold text-white">
                  Notifications
                </h3>
                <button
                  onClick={() => setShowNotifs(false)}
                  className="text-gray-400
                             hover:text-white text-sm"
                >
                  ✕
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center
                                  text-gray-500 text-sm">
                    Aucune notification
                  </div>
                ) : (
                  notifications.slice(0, 10).map(n => (
                    <div key={n.id}
                      className="p-4 border-b
                                 border-gray-800
                                 hover:bg-gray-800
                                 transition-colors">
                      <div className="flex items-start
                                      gap-3">
                        <span className="text-lg">
                          {n.type === 'success' && '✅'}
                          {n.type === 'error'   && '❌'}
                          {n.type === 'warning' && '⚠️'}
                          {n.type === 'info'    && 'ℹ️'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm
                                        text-gray-300
                                        leading-snug">
                            {n.message}
                          </p>
                          <p className="text-xs
                                        text-gray-500
                                        mt-1">
                            {new Date(n.timestamp)
                              .toLocaleTimeString('fr-FR')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
