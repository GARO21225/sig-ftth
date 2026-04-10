import { useState, useEffect } from 'react'
import api from '@services/api'
import toast from 'react-hot-toast'

export default function TerrainMobilePage() {
  const [gpsPos,    setGpsPos]    = useState<GeolocationCoordinates | null>(null)
  const [gpsError,  setGpsError]  = useState<string | null>(null)
  const [watching,  setWatching]  = useState(false)
  const [watchId,   setWatchId]   = useState<number | null>(null)
  const [form,      setForm]      = useState({ nom_unique:'', type_noeud:'PBO', commentaire:'' })
  const [saving,    setSaving]    = useState(false)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [offline,   setOffline]   = useState(!navigator.onLine)
  const [queue,     setQueue]     = useState<any[]>([])

  useEffect(() => {
    const onOnline  = () => { setOffline(false); syncQueue() }
    const onOffline = () => setOffline(true)
    window.addEventListener('online',  onOnline)
    window.addEventListener('offline', onOffline)
    // Charger la file offline depuis localStorage
    try { setQueue(JSON.parse(localStorage.getItem('terrain_queue') || '[]')) } catch {}
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      if (watchId !== null) navigator.geolocation.clearWatch(watchId)
    }
  }, [])

  const demarrerGPS = () => {
    if (!navigator.geolocation) return toast.error('GPS non disponible sur cet appareil')
    const id = navigator.geolocation.watchPosition(
      pos => { setGpsPos(pos.coords); setGpsError(null) },
      err => setGpsError(err.message),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    )
    setWatchId(id); setWatching(true)
    toast.success('GPS activé — position en cours...')
  }

  const arreterGPS = () => {
    if (watchId !== null) navigator.geolocation.clearWatch(watchId)
    setWatching(false); setWatchId(null)
    toast('GPS désactivé', { icon: '📍' })
  }

  const sauvegarder = async () => {
    if (!gpsPos) return toast.error('GPS requis — activez la localisation')
    if (!form.nom_unique) return toast.error('Nom unique requis')
    setSaving(true)

    const payload = {
      nom_unique: form.nom_unique,
      type_noeud: form.type_noeud,
      latitude: gpsPos.latitude,
      longitude: gpsPos.longitude,
      commentaire: form.commentaire || undefined,
      etat: 'actif',
    }

    if (offline) {
      // Mode offline — ajouter à la file
      const newQueue = [...queue, { ...payload, _timestamp: Date.now() }]
      setQueue(newQueue)
      localStorage.setItem('terrain_queue', JSON.stringify(newQueue))
      toast('Enregistré hors-ligne — sera synchronisé', { icon: '💾' })
      setLastSaved(form.nom_unique)
      setForm(f => ({ ...f, nom_unique: '' }))
      setSaving(false)
      return
    }

    try {
      await api.post('/noeuds-telecom', payload)
      toast.success(`✅ Nœud créé : ${form.nom_unique}`)
      setLastSaved(form.nom_unique)
      setForm(f => ({ ...f, nom_unique: '' }))
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Erreur enregistrement')
    } finally { setSaving(false) }
  }

  const syncQueue = async () => {
    if (queue.length === 0) return
    let ok = 0
    const remaining = []
    for (const item of queue) {
      try {
        const { _timestamp, ...payload } = item
        await api.post('/noeuds-telecom', payload)
        ok++
      } catch { remaining.push(item) }
    }
    setQueue(remaining)
    localStorage.setItem('terrain_queue', JSON.stringify(remaining))
    if (ok > 0) toast.success(`${ok} nœud(s) synchronisé(s)`)
  }

  const TYPES_TERRAIN = ['NRO','SRO','PBO','PTO','PM','L1T','L2T','L4T','POTEAU']

  return (
    <div className="h-full overflow-auto bg-gray-950 p-4">
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">📱 Mode Terrain</h1>
            <p className="text-gray-400 text-xs">Saisie rapide sur le terrain</p>
          </div>
          <div className={`px-2 py-1 rounded-lg text-xs font-medium ${offline ? 'bg-orange-900 text-orange-300' : 'bg-green-900 text-green-300'}`}>
            {offline ? '📵 Hors-ligne' : '🌐 En ligne'}
          </div>
        </div>

        {/* GPS */}
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-white text-sm">📍 Localisation GPS</h2>
            <button onClick={watching ? arreterGPS : demarrerGPS}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${watching ? 'bg-red-700 text-white' : 'bg-green-700 hover:bg-green-600 text-white'}`}>
              {watching ? '⏹ Arrêter' : '▶ Activer GPS'}
            </button>
          </div>

          {gpsError && <p className="text-red-400 text-xs mb-2">⚠️ {gpsError}</p>}

          {gpsPos ? (
            <div className="grid grid-cols-2 gap-2">
              {[
                ['Latitude',  gpsPos.latitude.toFixed(6)  + '°'],
                ['Longitude', gpsPos.longitude.toFixed(6) + '°'],
                ['Précision', Math.round(gpsPos.accuracy) + ' m'],
                ['Altitude',  gpsPos.altitude ? Math.round(gpsPos.altitude) + ' m' : 'N/A'],
              ].map(([label, val]) => (
                <div key={label} className="bg-gray-800 rounded-xl px-3 py-2">
                  <div className="text-xs text-gray-400">{label}</div>
                  <div className="text-sm font-mono font-bold text-white">{val}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500 text-sm">
              {watching ? '⏳ Acquisition GPS en cours...' : 'GPS non activé'}
            </div>
          )}
        </div>

        {/* Formulaire création rapide */}
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 mb-4">
          <h2 className="font-semibold text-white text-sm mb-3">➕ Créer un nœud</h2>

          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Nom unique *</label>
              <input value={form.nom_unique} onChange={e => setForm(f => ({...f, nom_unique: e.target.value}))}
                placeholder="ex: PBO-COCODY-042"
                className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-3 text-white text-sm outline-none focus:border-blue-500" />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-2">Type *</label>
              <div className="grid grid-cols-3 gap-2">
                {TYPES_TERRAIN.map(t => (
                  <button key={t} onClick={() => setForm(f => ({...f, type_noeud: t}))}
                    className={`py-2 rounded-xl text-xs font-mono font-bold transition-all ${form.type_noeud===t ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Commentaire</label>
              <textarea value={form.commentaire} onChange={e => setForm(f => ({...f, commentaire: e.target.value}))}
                placeholder="Observations terrain..."
                rows={2}
                className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-blue-500 resize-none" />
            </div>

            <button onClick={sauvegarder} disabled={saving || !gpsPos}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold rounded-xl transition-all text-sm">
              {saving ? '⏳ Enregistrement...' : offline ? '💾 Enregistrer hors-ligne' : '✅ Créer le nœud'}
            </button>
          </div>

          {lastSaved && (
            <p className="mt-2 text-xs text-green-400 text-center">✅ Dernier enregistré : {lastSaved}</p>
          )}
        </div>

        {/* File offline */}
        {queue.length > 0 && (
          <div className="bg-orange-900/30 border border-orange-600/50 rounded-2xl p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-orange-300 text-sm">💾 File hors-ligne ({queue.length})</h3>
              {!offline && (
                <button onClick={syncQueue}
                  className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs rounded-xl">
                  🔄 Synchroniser
                </button>
              )}
            </div>
            <div className="space-y-1">
              {queue.slice(-3).map((item, i) => (
                <div key={i} className="text-xs text-orange-300 bg-orange-900/30 rounded-lg px-2 py-1">
                  {item.type_noeud} — {item.nom_unique}
                </div>
              ))}
              {queue.length > 3 && <p className="text-xs text-orange-400">+{queue.length-3} autres...</p>}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 text-xs text-gray-400 space-y-2">
          <p className="font-medium text-gray-300">📋 Guide terrain</p>
          <p>1. Activez le GPS et attendez une précision &lt; 5m</p>
          <p>2. Sélectionnez le type de nœud à créer</p>
          <p>3. Saisissez le nom selon la nomenclature (ex: PBO-COMMUNE-NUM)</p>
          <p>4. Ajoutez vos observations et enregistrez</p>
          <p className="text-orange-400">⚠️ En mode hors-ligne, les données sont sauvegardées localement et synchronisées automatiquement à la reconnexion.</p>
        </div>
      </div>
    </div>
  )
}
