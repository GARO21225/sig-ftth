import { useState, useEffect } from 'react'

export function useNetworkStatus() {
  const [online,   setOnline]   = useState(navigator.onLine)
  const [lastSeen, setLastSeen] = useState<Date | null>(null)

  useEffect(() => {
    const onOnline  = () => { setOnline(true);  setLastSeen(new Date()) }
    const onOffline = () => { setOnline(false) }
    window.addEventListener('online',  onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online',  onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  return { online, lastSeen }
}
