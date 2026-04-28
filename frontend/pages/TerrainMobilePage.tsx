import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import api from '@services/api'
import toast from 'react-hot-toast'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const GPS_ICON = L.divIcon({
  html: '<div style="background:#22c55e;width:20px;height:20px;border-radius:50%;border:3px solid white;box-shadow:0 0 0 3px #22c55e66"></div>',
  className: '', iconSize:[20,20], iconAnchor:[10,10]
})
const DRAFT_ICON = L.divIcon({
  html: '<div style="background:#f59e0b;width:24px;height:24px;border-radius:50%;border:3px solid white;box-shadow:0 0 0 3px #f59e0b66;animation:pulse 1.5s infinite"></div>',
  className: '', iconSize:[24,24], iconAnchor:[12,12]
})

function MapClickHandler({ onMapClick }: { onMapClick: (p:[number,number]) => void }) {
  useMapEvents({ click(e) { onMapClick([e.latlng.lat, e.latlng.lng]) } })
  return null
}

export default function TerrainMobilePage() {
  const [gpsPos,     setGpsPos]     = useState<[number,number] | null>(null)
  const [gpsAcc,     setGpsAcc]     = useState<number>(999)
  const [watching,   setWatching]   = useState(false)
  const [watchId,    setWatchId]    = useState<number | null>(null)
  const [draftPos,   setDraftPos]   = useState<[number,number] | null>(null)
  const [useGPSPos,  setUseGPSPos]  = useState(true)
  const [form,       setForm]       = useState({ nom_unique:'', type_noeud:'PBO', commentaire:'' })
  const [saving,     setSaving]     = useState(false)
  const [offline,    setOffline]    = useState(!navigator.onLine)
  const [queue,      setQueue]      = useState<any[]>(() => {
    try { return JSON.parse(localStorage.getItem('terrain_queue') || '[]') } catch { return [] }
  })
  const [voixActive, setVoixActive] = useState(false)
  const [activeTab,  setActiveTab]  = useState<'carte'|'form'>('carte')
  const CENTER: [number,number] = gpsPos || [5.3599, -4.0083]

  useEffect(() => {
    const up = () => setOffline(false)
    const down = () => setOffline(true)
    window.addEventListener('online', up); window.addEventListener('offline', down)
    return () => { window.removeEventListener('online',up); window.removeEventListener('offline',down) }
  }, [])

  const demarrerGPS = () => {
    if (!navigator.geolocation) return toast.error('GPS non disponible')
    const id = navigator.geolocation.watchPosition(
      pos => { setGpsPos([pos.coords.latitude, pos.coords.longitude]); setGpsAcc(pos.coords.accuracy) },
      err => toast.error('GPS: ' + err.message),
      { enableHighAccuracy: true, maximumAge: 5000 }
    )
    setWatchId(id); setWatching(true)
    toast.success('GPS activé')
  }

  const arreterGPS = () => {
    if (watchId !== null) navigator.geolocation.clearWatch(watchId)
    setWatching(false); setWatchId(null)
  }

  const posFinale: [number,number] | null = useGPSPos ? gpsPos : draftPos

  const sauvegarder = async () => {
    if (!posFinale) return toast.error('Aucune position — activez GPS ou cliquez sur la carte')
    if (!form.nom_unique) return toast.error('Nom unique requis')
    const payload = {
      nom_unique: form.nom_unique,
      type_noeud: form.type_noeud,
      latitude: posFinale[0],
      longitude: posFinale[1],
      commentaire: form.commentaire || undefined,
      etat: 'actif',
    }
    if (offline) {
      const q = [...queue, { ...payload, _ts: Date.now() }]
      setQueue(q); localStorage.setItem('terrain_queue', JSON.stringify(q))
      toast('Enregistré hors-ligne', { icon: '💾' })
      setForm(f => ({ ...f, nom_unique: '' }))
      return
    }
    setSaving(true)
    try {
      await api.post('/noeuds-telecom', payload)
      toast.success(`✅ ${form.nom_unique} créé`)
      setForm(f => ({ ...f, nom_unique: '' }))
      setDraftPos(null)
    } catch (e: any) { toast.error(e.response?.data?.detail || 'Erreur')
    } finally { setSaving(false) }
  }

  const syncQueue = async () => {
    let ok = 0; const remaining = []
    for (const item of queue) {
      try { const { _ts, ...p } = item; await api.post('/noeuds-telecom', p); ok++ }
      catch { remaining.push(item) }
    }
    setQueue(remaining); localStorage.setItem('terrain_queue', JSON.stringify(remaining))
    if (ok > 0) toast.success(`${ok} nœud(s) synchronisé(s)`)
  }

  const activerVoix = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return toast.error('Voix non supportée sur ce navigateur')
    const r = new SR(); r.lang = 'fr-FR'; r.onstart = () => setVoixActive(true)
    r.onend = () => setVoixActive(false)
    r.onresult = (e: any) => {
      const t = e.results[0][0].transcript.toLowerCase()
      const m = t.match(/cr[eé]er?\s+(nro|sro|pbo|pto|pm|l1t|l2t|l4t|poteau)\s+(.+)/i)
      if (m) {
        setForm(f => ({ ...f, type_noeud: m[1].toUpperCase(), nom_unique: m[2].trim().toUpperCase() }))
        if (navigator.vibrate) navigator.vibrate(200)
        toast.success(`Commande: ${m[1].toUpperCase()} ${m[2]}`)
      } else { toast(t, { icon: '🎤' }) }
    }
    r.start()
  }

  const TYPES = ['NRO','SRO','PBO','PTO','PM','L1T','L2T','L4T','POTEAU']

  return (
    <div className="h-full flex flex-col bg-gray-950">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-gray-900 flex-shrink-0">
        <div>
          <h1 className="text-sm font-bold text-white">📱 Mode Terrain</h1>
          <p className="text-xs text-gray-400">
            {watching ? `GPS ${gpsAcc < 10 ? '🟢' : gpsAcc < 30 ? '🟡' : '🔴'} ±${Math.round(gpsAcc)}m` : 'GPS inactif'}
            {offline && <span className="ml-2 text-orange-400">📵 Hors-ligne</span>}
            {queue.length > 0 && <span className="ml-2 text-yellow-400">💾 {queue.length} en attente</span>}
          </p>
        </div>
        <div className="flex gap-1">
          <button onClick={activerVoix}
            className={`px-2 py-1.5 rounded-lg text-xs ${voixActive ? 'bg-red-700 text-white' : 'bg-purple-800 text-white'}`}>
            {voixActive ? '🔴' : '🎤'}
          </button>
          <button onClick={watching ? arreterGPS : demarrerGPS}
            className={`px-2 py-1.5 rounded-lg text-xs ${watching ? 'bg-red-700 text-white' : 'bg-green-700 text-white'}`}>
            {watching ? '⏹' : '▶ GPS'}
          </button>
          {queue.length > 0 && !offline && (
            <button onClick={syncQueue} className="px-2 py-1.5 bg-orange-600 text-white rounded-lg text-xs">🔄</button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800 bg-gray-900 flex-shrink-0">
        {(['carte','form'] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`flex-1 py-2 text-xs font-medium transition-all ${activeTab===t ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}>
            {t === 'carte' ? '🗺️ Carte' : '✏️ Saisie'}
          </button>
        ))}
      </div>

      {/* Carte */}
      {activeTab === 'carte' && (
        <div className="flex-1 relative">
          <MapContainer center={CENTER} zoom={15} className="h-full w-full" zoomControl={false}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
            <MapClickHandler onMapClick={pos => { setDraftPos(pos); setUseGPSPos(false); setActiveTab('form') }} />
            {gpsPos && <Marker position={gpsPos} icon={GPS_ICON} />}
            {draftPos && !useGPSPos && <Marker position={draftPos} icon={DRAFT_ICON} />}
          </MapContainer>
          <div className="absolute bottom-4 left-4 right-4 z-[1000]">
            <div className="bg-gray-900/95 border border-gray-700 rounded-xl p-2 text-xs text-gray-400 text-center">
              {draftPos && !useGPSPos
                ? `📍 Sélectionné: ${draftPos[0].toFixed(5)}, ${draftPos[1].toFixed(5)}`
                : 'Cliquez sur la carte pour placer un point manuellement'}
            </div>
          </div>
        </div>
      )}

      {/* Formulaire */}
      {activeTab === 'form' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Position */}
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-white">📍 Position</p>
              <div className="flex gap-1">
                <button onClick={() => setUseGPSPos(true)}
                  className={`px-2 py-1 rounded-lg text-xs ${useGPSPos ? 'bg-green-700 text-white' : 'bg-gray-800 text-gray-400'}`}>
                  GPS
                </button>
                <button onClick={() => { setUseGPSPos(false); setActiveTab('carte') }}
                  className={`px-2 py-1 rounded-lg text-xs ${!useGPSPos && draftPos ? 'bg-blue-700 text-white' : 'bg-gray-800 text-gray-400'}`}>
                  Carte
                </button>
              </div>
            </div>
            {posFinale ? (
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-800 rounded-lg px-2 py-1.5 text-center">
                  <div className="text-xs text-gray-400">Latitude</div>
                  <div className="text-sm font-mono text-white">{posFinale[0].toFixed(6)}</div>
                </div>
                <div className="bg-gray-800 rounded-lg px-2 py-1.5 text-center">
                  <div className="text-xs text-gray-400">Longitude</div>
                  <div className="text-sm font-mono text-white">{posFinale[1].toFixed(6)}</div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500 text-center py-2">
                {useGPSPos ? 'Activez le GPS ci-dessus' : 'Cliquez sur la carte pour placer'}
              </p>
            )}
          </div>

          {/* Nom */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Nom unique *</label>
            <input value={form.nom_unique} onChange={e => setForm(f => ({...f, nom_unique: e.target.value}))}
              placeholder="ex: PBO-COCODY-042"
              className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-3 text-white text-sm outline-none focus:border-blue-500" />
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs text-gray-400 mb-2">Type *</label>
            <div className="grid grid-cols-3 gap-2">
              {TYPES.map(t => (
                <button key={t} onClick={() => setForm(f => ({...f, type_noeud: t}))}
                  className={`py-2 rounded-xl text-xs font-mono font-bold transition-all ${form.type_noeud===t ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Commentaire */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Observations terrain</label>
            <textarea value={form.commentaire} onChange={e => setForm(f => ({...f, commentaire: e.target.value}))}
              rows={2} placeholder="Notes..." className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-blue-500 resize-none" />
          </div>

          <button onClick={sauvegarder} disabled={saving || !posFinale}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold rounded-xl transition-all text-sm">
            {saving ? '⏳ Enregistrement...' : offline ? '💾 Sauvegarder hors-ligne' : '✅ Créer le nœud'}
          </button>
        </div>
      )}
    </div>
  )
}
