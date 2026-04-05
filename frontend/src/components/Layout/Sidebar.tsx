import { NavLink } from 'react-router-dom'
import { useAuthStore } from '@store/useStore'

interface SidebarProps {
  onClose: () => void
}

const MENU = [
  {
    path: '/map',
    icon: '🗺️',
    label: 'Carte',
    roles: [],
    desc: 'Carte interactive'
  },
  {
    path: '/dashboard',
    icon: '📊',
    label: 'Dashboard',
    roles: [],
    desc: 'KPI & statistiques'
  },
  {
    path: '/travaux',
    icon: '🏗️',
    label: 'Travaux',
    roles: [],
    desc: 'Ordres de travail'
  },
  {
    path: '/eligibilite',
    icon: '📡',
    label: 'Éligibilité',
    roles: [],
    desc: 'Vérifier la fibre'
  },
  {
    path: '/terrain',
    icon: '📱',
    label: 'Terrain',
    roles: ['admin','chef_projet','technicien'],
    desc: 'Dessin mobile'
  },
  {
    path: '/catalogue',
    icon: '📦',
    label: 'Catalogue',
    roles: [],
    desc: 'Équipements'
  },
  {
    path: '/admin',
    icon: '⚙️',
    label: 'Admin',
    roles: ['admin'],
    desc: 'Administration'
  },
]

export default function Sidebar({ onClose }: SidebarProps) {
  const { user, logout, hasRole } = useAuthStore()

  const ROLE_COLORS: Record<string, string> = {
    admin:        'bg-red-900 text-red-300',
    chef_projet:  'bg-purple-900 text-purple-300',
    technicien:   'bg-blue-900 text-blue-300',
    commercial:   'bg-green-900 text-green-300',
    analyste:     'bg-yellow-900 text-yellow-300',
    invite:       'bg-gray-800 text-gray-400',
  }

  return (
    <div className="w-64 bg-gray-900 border-r
                    border-gray-700 flex flex-col
                    h-full">

      {/* Logo */}
      <div className="p-5 border-b border-gray-700
                      flex items-center
                      justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600
                          rounded-xl flex items-center
                          justify-center text-xl">
            🌐
          </div>
          <div>
            <h1 className="font-bold text-white
                           text-base leading-tight">
              SIG FTTH
            </h1>
            <p className="text-xs text-gray-500">
              v6.1.0 — PCR v2.5
            </p>
          </div>
        </div>
        {/* Bouton fermer mobile */}
        <button
          onClick={onClose}
          className="md:hidden text-gray-400
                     hover:text-white p-1"
        >
          ✕
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1
                      overflow-y-auto">
        {MENU.map(item => {
          if (
            item.roles.length > 0
            && !hasRole(...item.roles)
          ) return null

          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3
                rounded-xl transition-all text-sm
                font-medium group
                ${isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }
              `}
            >
              <span className="text-xl flex-shrink-0">
                {item.icon}
              </span>
              <div className="min-w-0">
                <div className="font-medium">
                  {item.label}
                </div>
                <div className="text-xs opacity-60
                                truncate">
                  {item.desc}
                </div>
              </div>
            </NavLink>
          )
        })}
      </nav>

      {/* Utilisateur */}
      <div className="p-4 border-t border-gray-700
                      space-y-3">
        {/* Infos user */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br
                          from-blue-500 to-indigo-600
                          rounded-full flex items-center
                          justify-center font-bold
                          text-sm flex-shrink-0">
            {user?.prenom?.[0]}
            {user?.nom?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold
                          text-white truncate">
              {user?.prenom} {user?.nom}
            </p>
            <span className={`
              text-xs px-2 py-0.5 rounded-full
              font-medium
              ${ROLE_COLORS[user?.role || 'invite']}
            `}>
              {user?.role}
            </span>
          </div>
        </div>

        {/* Déconnexion */}
        <button
          onClick={logout}
          className="w-full flex items-center
                     justify-center gap-2
                     bg-gray-800 hover:bg-red-900/40
                     hover:text-red-400 rounded-xl
                     py-2.5 text-sm text-gray-400
                     transition-all"
        >
          🚪 Déconnexion
        </button>
      </div>
    </div>
  )
}
