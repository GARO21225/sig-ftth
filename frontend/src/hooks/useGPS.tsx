import { useState, useEffect, useCallback, useRef } from 'react'
import toast from 'react-hot-toast'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
export interface GPSPosition {
  latitude: number
  longitude: number
  accuracy: number
  altitude: number | null
  heading: number | null
  speed: number | null
  timestamp: number
}

export interface GPSTrackPoint {
  lat: number
  lng: number
  timestamp: number
  accuracy: number
}

export interface UseGPSOptions {
  enableHighAccuracy?: boolean
  timeout?: number
  maximumAge?: number
  trackingInterval?: number
}

export interface UseGPSReturn {
  position: GPSPosition | null
  track: GPSTrackPoint[]
  isTracking: boolean
  isSupported: boolean
  error: string | null
  accuracy: 'high' | 'medium' | 'low' | null
  startTracking: () => void
  stopTracking: () => void
  clearTrack: () => void
  getCurrentPosition: () => Promise<GPSPosition>
}

// ─────────────────────────────────────────────
// Hook useGPS
// ─────────────────────────────────────────────
export function useGPS(options: UseGPSOptions = {}): UseGPSReturn {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 5000,
    trackingInterval = 3000,
  } = options

  const [position, setPosition] = useState<GPSPosition | null>(null)
  const [track, setTrack] = useState<GPSTrackPoint[]>([])
  const [isTracking, setIsTracking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const watchIdRef = useRef<number | null>(null)

  const isSupported = typeof navigator !== 'undefined'
    && 'geolocation' in navigator

  // Évaluer la précision
  const getAccuracyLevel = (
    acc: number
  ): 'high' | 'medium' | 'low' => {
    if (acc <= 10) return 'high'
    if (acc <= 50) return 'medium'
    return 'low'
  }

  const accuracy = position
    ? getAccuracyLevel(position.accuracy)
    : null

  // Callback succès
  const onSuccess = useCallback(
    (pos: GeolocationPosition) => {
      const newPos: GPSPosition = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        altitude: pos.coords.altitude,
        heading: pos.coords.heading,
        speed: pos.coords.speed,
        timestamp: pos.timestamp,
      }
      setPosition(newPos)
      setError(null)

      if (isTracking) {
        setTrack(prev => [
          ...prev,
          {
            lat: newPos.latitude,
            lng: newPos.longitude,
            timestamp: newPos.timestamp,
            accuracy: newPos.accuracy,
          }
        ])
      }
    },
    [isTracking]
  )

  // Callback erreur
  const onError = useCallback(
    (err: GeolocationPositionError) => {
      const messages: Record<number, string> = {
        1: 'Permission GPS refusée',
        2: 'Position GPS indisponible',
        3: 'Délai GPS dépassé',
      }
      const msg = messages[err.code] || 'Erreur GPS inconnue'
      setError(msg)
      toast.error(`GPS : ${msg}`)
    },
    []
  )

  // Démarrer suivi
  const startTracking = useCallback(() => {
    if (!isSupported) {
      toast.error('GPS non supporté par ce navigateur')
      return
    }
    setIsTracking(true)
    setError(null)
    watchIdRef.current = navigator.geolocation.watchPosition(
      onSuccess,
      onError,
      { enableHighAccuracy, timeout, maximumAge }
    )
    toast.success('Suivi GPS démarré')
  }, [isSupported, enableHighAccuracy, timeout, maximumAge,
      onSuccess, onError])

  // Arrêter suivi
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setIsTracking(false)
    toast('Suivi GPS arrêté', { icon: '⏹️' })
  }, [])

  // Vider trace
  const clearTrack = useCallback(() => {
    setTrack([])
  }, [])

  // Position unique
  const getCurrentPosition = useCallback(
    (): Promise<GPSPosition> => {
      return new Promise((resolve, reject) => {
        if (!isSupported) {
          reject(new Error('GPS non supporté'))
          return
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const newPos: GPSPosition = {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              altitude: pos.coords.altitude,
              heading: pos.coords.heading,
              speed: pos.coords.speed,
              timestamp: pos.timestamp,
            }
            setPosition(newPos)
            resolve(newPos)
          },
          (err) => {
            onError(err)
            reject(err)
          },
          { enableHighAccuracy, timeout, maximumAge }
        )
      })
    },
    [isSupported, enableHighAccuracy, timeout, maximumAge, onError]
  )

  // Cleanup
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [])

  return {
    position,
    track,
    isTracking,
    isSupported,
    error,
    accuracy,
    startTracking,
    stopTracking,
    clearTrack,
    getCurrentPosition,
  }
}

export default useGPS
