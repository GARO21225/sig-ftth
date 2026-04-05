import {
  BrowserRouter,
  Routes,
  Route,
  Navigate
} from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from '@store/useStore'
import { useWebSocket } from '@hooks/useWebSocket'

// Basename dynamique : /sig-ftth sur GitHub Pages, / ailleurs
const basename = import.meta.env.BASE_URL || '/'

// Lazy loading pages
const LoginPage           = lazy(() => import('@pages/LoginPage'))
const MotDePasseOubliePage= lazy(() => import('@pages/MotDePasseOubliePage'))
const ResetPasswordPage   = lazy(() => import('@pages/ResetPasswordPage'))
const Layout              = lazy(() => import('@components/Layout/Layout'))
const MapPage             = lazy(() => import('@pages/MapPage'))
const DashboardPage       = lazy(() => import('@pages/DashboardPage'))
const TravauxPage         = lazy(() => import('@pages/TravauxPage'))
const EligibilitePage     = lazy(() => import('@pages/EligibilitePage'))
const TerrainMobilePage   = lazy(() => import('@pages/TerrainMobilePage'))
const CataloguePage       = lazy(() => import('@pages/CataloguePage'))
const AdminPage           = lazy(() => import('@pages/AdminPage'))

function Loader() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="text-5xl animate-spin">⚙️</div>
        <p className="text-gray-400 text-sm">Chargement SIG FTTH...</p>
      </div>
    </div>
  )
}

function PrivateRoute({
  children,
  roles = []
}: {
  children: React.ReactNode
  roles?: string[]
}) {
  const { isAuthenticated, hasRole } = useAuthStore()
  if (!isAuthenticated()) return <Navigate to="/login" replace />
  if (roles.length > 0 && !hasRole(...roles)) return <Navigate to="/map" replace />
  return <>{children}</>
}

function AppContent() {
  useWebSocket('global')
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/mot-de-passe-oublie" element={<MotDePasseOubliePage />} />
      <Route path="/reset-password"      element={<ResetPasswordPage />} />
      <Route
        path="/"
        element={
          <PrivateRoute><Layout /></PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/map" replace />} />
        <Route path="map"       element={<MapPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="travaux"   element={<TravauxPage />} />
        <Route path="eligibilite" element={<EligibilitePage />} />
        <Route path="terrain"
          element={
            <PrivateRoute roles={['admin','chef_projet','technicien']}>
              <TerrainMobilePage />
            </PrivateRoute>
          }
        />
        <Route path="catalogue" element={<CataloguePage />} />
        <Route path="admin"
          element={
            <PrivateRoute roles={['admin']}><AdminPage /></PrivateRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/map" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter basename={basename}>
      <Suspense fallback={<Loader />}>
        <AppContent />
      </Suspense>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1e293b',
            color: '#e2e8f0',
            border: '1px solid #334155',
            borderRadius: '12px',
          },
          success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
    </BrowserRouter>
  )
}
