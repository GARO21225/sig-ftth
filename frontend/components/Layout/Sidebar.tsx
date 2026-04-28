import { NavLink } from 'react-router-dom'
import { useAuthStore } from '@store/useStore'

const MENU = [
  { path:'/map',        icon:'🗺️', label:'Carte',         roles:[] },
  { path:'/dashboard',  icon:'📊', label:'Dashboard',     roles:[] },
  { path:'/travaux',    icon:'🔧', label:'Travaux',        roles:[] },
  { path:'/el',         icon:'🏠', label:'Table EL',       roles:[] },
  { path:'/catalogue',  icon:'📦', label:'Catalogue',      roles:[] },
  { path:'/synoptique', icon:'📡', label:'Synoptique',     roles:[] },
  { path:'/export',     icon:'📤', label:'Export',         roles:[] },
  { path:'/eligibilite',icon:'✅', label:'Éligibilité',    roles:[] },
  { path:'/terrain',    icon:'📱', label:'Mode Terrain',   roles:[] },
  { path:'/analytics',  icon:'📈', label:'Analytics',      roles:['admin','chef_projet'] },
  { path:'/import-dwg', icon:'📥', label:'Import DWG',     roles:['admin','chef_projet','technicien'] },
  { path:'/admin',      icon:'⚙️', label:'Administration', roles:['admin'] },
]

export default function Sidebar({ onClose }: { onClose: () => void }) {
  const { user, logout } = useAuthStore()

  const visible = MENU.filter(m =>
    m.roles.length === 0 || m.roles.includes(user?.role || '')
  )

  return (
    <div className="h-full bg-gray-900 border-r border-gray-800 flex flex-col select-none overflow-hidden">
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-orange-500 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            SIG
          </div>
          <div className="min-w-0">
            <p className="text-white font-bold text-sm leading-tight truncate">SIG FTTH</p>
            <p className="text-gray-500 text-xs truncate">Orange CI v6.1</p>
          </div>
        </div>
        <button onClick={onClose}
          className="md:hidden text-gray-500 hover:text-white w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-800 flex-shrink-0"
          aria-label="Fermer menu">
          ✕
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {visible.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onClose}
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-3 rounded-xl mb-0.5
              text-sm font-medium transition-all duration-150
              active:scale-95 touch-manipulation
              ${isActive
                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                : 'text-gray-400 hover:text-white hover:bg-gray-800 active:bg-gray-700'
              }
            `}
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <span className="text-lg flex-shrink-0 w-6 text-center">{item.icon}</span>
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-gray-800 p-3 flex-shrink-0">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl bg-gray-800/50">
          <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {user?.prenom?.[0]?.toUpperCase() || user?.nom?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">
              {user?.prenom} {user?.nom}
            </p>
            <p className="text-gray-500 text-xs truncate capitalize">{user?.role}</p>
          </div>
          <button
            onClick={() => { logout(); onClose() }}
            className="text-gray-500 hover:text-red-400 p-1 rounded-lg hover:bg-gray-700 flex-shrink-0"
            title="Déconnexion"
            aria-label="Déconnexion"
          >
            ⏻
          </button>
        </div>
      </div>
    </div>
  )
}
