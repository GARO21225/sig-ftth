import { useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '@store/useStore'
import { useNotifStore } from '@store/useStore'

const WS_URL = import.meta.env.VITE_WS_URL
  || 'ws://localhost:8000'

export function useWebSocket(room = 'global') {
  const ws = useRef<WebSocket | null>(null)
  const { accessToken } = useAuthStore()
  const { addNotif } = useNotifStore()
  const reconnectTimer = useRef<any>(null)
  const mounted = useRef(true)

  const connect = useCallback(() => {
    if (!accessToken || !mounted.current) return

    try {
      ws.current = new WebSocket(
        `${WS_URL}/ws/${room}?token=${accessToken}`
      )

      ws.current.onopen = () => {
        console.log(`✅ WS connecté — ${room}`)
      }

      ws.current.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          handleMessage(msg)
        } catch {
          // ignore
        }
      }

      ws.current.onclose = () => {
        if (!mounted.current) return
        console.log('🔄 WS reconnexion...')
        reconnectTimer.current = setTimeout(
          connect, 3000
        )
      }

      ws.current.onerror = () => {
        ws.current?.close()
      }
    } catch {
      // WebSocket non disponible
    }
  }, [accessToken, room])

  const handleMessage = (msg: any) => {
    switch (msg.type) {
      case 'ALERTE':
        addNotif({
          type: 'warning',
          message: msg.data?.message || 'Nouvelle alerte'
        })
        break
      case 'OT_MODIFIE':
        addNotif({
          type: 'info',
          message: `OT modifié : ${msg.data?.numero_ot}`
        })
        break
      case 'NOEUD_CREE':
        addNotif({
          type: 'success',
          message: `Nœud créé : ${msg.data?.nom_unique}`
        })
        break
    }
  }

  useEffect(() => {
    mounted.current = true
    connect()
    return () => {
      mounted.current = false
      clearTimeout(reconnectTimer.current)
      ws.current?.close()
    }
  }, [connect])

  return ws
}
