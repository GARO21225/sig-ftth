import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─────────────────────────────────────────────
// AUTH STORE
// ─────────────────────────────────────────────
interface User {
  id: string
  nom: string
  prenom: string
  email: string
  role: string
  langue: string
}

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  login: (data: any) => void
  logout: () => void
  isAuthenticated: () => boolean
  hasRole: (...roles: string[]) => boolean
  canEdit: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,

      login: (data) => {
        localStorage.setItem(
          'access_token', data.access_token
        )
        localStorage.setItem(
          'refresh_token', data.refresh_token
        )
        set({
          user: data.user,
          accessToken: data.access_token,
          refreshToken: data.refresh_token
        })
      },

      logout: () => {
        localStorage.clear()
        set({
          user: null,
          accessToken: null,
          refreshToken: null
        })
        window.location.href = (import.meta.env.BASE_URL || '/').replace(/\/$/, '') + '/login'
      },

      isAuthenticated: () => !!get().accessToken,

      hasRole: (...roles) =>
        roles.includes(get().user?.role || ''),

      canEdit: () =>
        ['admin','chef_projet','technicien']
          .includes(get().user?.role || '')
    }),
    { name: 'auth-storage' }
  )
)

// ─────────────────────────────────────────────
// MAP STORE
// ─────────────────────────────────────────────
interface MapState {
  layers: Record<string, boolean>
  selectedFeature: any | null
  drawMode: string | null
  mapStyle: 'dark' | 'satellite' | 'streets'
  showPanel: boolean
  toggleLayer: (layer: string) => void
  setSelectedFeature: (f: any) => void
  setDrawMode: (mode: string | null) => void
  setMapStyle: (style: 'dark'|'satellite'|'streets') => void
  togglePanel: () => void
}

export const useMapStore = create<MapState>()(
  persist(
    (set) => ({
      layers: {
        noeud_telecom: true,
        noeud_gc: true,
        lien_telecom: true,
        lien_gc: true,
        logement: true,
        zone: false,
      },
      selectedFeature: null,
      drawMode: null,
      mapStyle: 'dark',
      showPanel: true,

      toggleLayer: (layer) =>
        set(state => ({
          layers: {
            ...state.layers,
            [layer]: !state.layers[layer]
          }
        })),

      setSelectedFeature: (f) =>
        set({ selectedFeature: f }),

      setDrawMode: (mode) =>
        set({ drawMode: mode }),

      setMapStyle: (style) =>
        set({ mapStyle: style }),

      togglePanel: () =>
        set(state => ({ showPanel: !state.showPanel }))
    }),
    { name: 'map-storage' }
  )
)

// ─────────────────────────────────────────────
// NOTIFICATION STORE
// ─────────────────────────────────────────────
interface Notif {
  id: number
  type: 'info' | 'success' | 'warning' | 'error'
  message: string
  timestamp: string
  lu: boolean
}

interface NotifState {
  notifications: Notif[]
  unreadCount: number
  addNotif: (n: Omit<Notif, 'id'|'timestamp'|'lu'>) => void
  markAllRead: () => void
  clear: () => void
}

export const useNotifStore = create<NotifState>()(
  (set) => ({
    notifications: [],
    unreadCount: 0,

    addNotif: (n) =>
      set(state => ({
        notifications: [
          {
            ...n,
            id: Date.now(),
            timestamp: new Date().toISOString(),
            lu: false
          },
          ...state.notifications
        ].slice(0, 50),
        unreadCount: state.unreadCount + 1
      })),

    markAllRead: () =>
      set(state => ({
        notifications: state.notifications.map(
          n => ({ ...n, lu: true })
        ),
        unreadCount: 0
      })),

    clear: () =>
      set({ notifications: [], unreadCount: 0 })
  })
)

// ─────────────────────────────────────────────
// UI STORE
// ─────────────────────────────────────────────
interface UIState {
  sidebarOpen: boolean
  activeModal: string | null
  isLoading: boolean
  toggleSidebar: () => void
  openModal: (name: string) => void
  closeModal: () => void
  setLoading: (v: boolean) => void
}

export const useUIStore = create<UIState>()(
  (set) => ({
    sidebarOpen: true,
    activeModal: null,
    isLoading: false,

    toggleSidebar: () =>
      set(state => ({
        sidebarOpen: !state.sidebarOpen
      })),

    openModal: (name) =>
      set({ activeModal: name }),

    closeModal: () =>
      set({ activeModal: null }),

    setLoading: (v) =>
      set({ isLoading: v })
  })
)
