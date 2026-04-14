import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const isMobile = () => window.innerWidth < 768

  // Desktop: sidebar ouverte par défaut
  useEffect(() => {
    if (!isMobile()) setSidebarOpen(true)
  }, [])

  // Fermer sidebar sur mobile lors du changement de page
  useEffect(() => {
    if (isMobile()) setSidebarOpen(false)
  }, [location.pathname])

  // Sync resize
  useEffect(() => {
    const onResize = () => {
      if (!isMobile()) setSidebarOpen(true)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden"
      style={{ height: '100dvh' }}>

      {/* Sidebar desktop - fixe */}
      <div className={`
        flex-shrink-0 transition-all duration-300 ease-in-out
        hidden md:block
        ${sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'}
      `}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
          style={{ touchAction: 'none' }}
        />
      )}

      {/* Sidebar mobile - slide depuis la gauche */}
      <div className={`
        fixed top-0 left-0 h-full z-50 w-72
        transform transition-transform duration-300 ease-in-out
        md:hidden
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          onMenuClick={() => setSidebarOpen(v => !v)}
          sidebarOpen={sidebarOpen}
        />
        <main className="flex-1 overflow-hidden relative">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
