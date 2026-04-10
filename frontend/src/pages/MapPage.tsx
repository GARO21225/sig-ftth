import { useState, useEffect, useCallback } from 'react'
import { PanneauCreerLien, PanneauZones, PanneauItineraires } from './MapPage_liens_zones'
import {
  MapContainer, TileLayer, Marker, Polyline,
  Popup, useMap, useMapEvents,
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import api from '@services/api'
import { useMapStore, useAuthStore } from '@store/useStore'
import toast from 'react-hot-toast'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const makeIcon = (color: string, emoji: string, size = 32) =>
  L.divIcon({
    html: `<div style="background:${color};width:${size}px;height:${size}px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);font-size:${Math.round(size*0.44)}px;line-height:1;">${emoji}</span></div>`,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size/2, size],
    popupAnchor: [0, -size],
  })

const makeDraftIcon = () =>
  L.divIcon({
    html: `<div style="background:#F59E0B;width:24px;height:24px;border-radius:50%;border:3px solid white;box-shadow:0 0 0 3px #F59E0B55;animation:pulse 1s infinite;"></div>`,
    className: '', iconSize: [24,24], iconAnchor: [12,12],
  })

const ICONS: Record<string, L.DivIcon> = {
  NRO: makeIcon('#1D4ED8','🔵'), SRO: makeIcon('#6366F1','🟣'),
  PBO: makeIcon('#8B5CF6','🔷'), PTO: makeIcon('#A78BFA','◾'),
  PM:  makeIcon('#60A5FA','🔹'), GC:  makeIcon('#F59E0B','🟡'),
  LOG: makeIcon('#10B981','🏠'),
}

const TILE_STYLES = {
  dark:      { url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', label: '🌑 Sombre' },
  satellite: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', label: '🛰️ Satellite' },
  streets:   { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', label: '🗺️ Rues' },
}

type EditMode = null | 'noeud_telecom' | 'noeud_gc' | 'lien_telecom' | 'lien_gc'

export default function MapPage() {
  const [noeuds,    setNoeuds]    = useState<any[]>([])
  const [noeudsGC,  setNoeudsGC]  = useState<any[]>([])
  const [liens,     setLiens]     = useState<any[]>([])
  const [liensGC,   setLiensGC]   = useState<any[]>([])
  const [logements, setLogements] = useState<any[]>([])
  const [loading,   setLoading]   = useState(true)
  const [errors,    setErrors]    = useState<string[]>([])
  const [selected,  setSelected]  = useState<any>(null)
  const [showLayerPanel, setShowLayerPanel] = useState(false)
  const [searchQuery,    setSearchQuery]    = useState('')
  const [searchResults,  setSearchResults]  = useState<any[]>([])

  // Mode édition
  const [editMode,      setEditMode]      = useState<EditMode>(null)
  // Panneaux liens / zones / itinéraires
  const [showLienForm,     setShowLienForm]     = useState<'lien_telecom'|'lien_gc'|null>(null)
  const [zonesData,        setZonesData]        = useState<any[]>([])
  const [showHeatmap,      setShowHeatmap]      = useState(false)
  const [heatmapData,      setHeatmapData]      = useState<any[]>([])
  const [showSaturation,   setShowSaturation]   = useState(false)
  const [saturationData,   setSaturationData]   = useState<any[]>([])
  const [showZones,        setShowZones]        = useState(false)
  const [showItineraires,  setShowItineraires]  = useState(false)
  const [draftPoint,    setDraftPoint]    = useState<[number,number]|null>(null)
  const [draftForm,     setDraftForm]     = useState<any>({})
  const [savingDraft,   setSavingDraft]   = useState(false)
  const [showEditPanel, setShowEditPanel] = useState(false)

  const { layers, toggleLayer, mapStyle, setMapStyle } = useMapStore()
  const { canEdit: canEditFn } = useAuthStore()
  const canEdit = canEditFn()

  useEffect(() => { chargerDonnees() }, [])

  const chargerDonnees = async () => {
    setLoading(true); setErrors([])
    const requests = [
      { key: 'noeuds-telecom', fn: () => api.get('/noeuds-telecom') },
      { key: 'noeuds-gc',      fn: () => api.get('/noeuds-gc') },
      { key: 'liens-telecom',  fn: () => api.get('/liens-telecom') },
      { key: 'liens-gc',       fn: () => api.get('/liens-gc') },
      { key: 'logements',      fn: () => api.get('/logements') },
      { key: 'zones',          fn: () => api.get('/zones-influence') },
    ]
    const results = await Promise.allSettled(requests.map(r => r.fn()))
    const newErrors: string[] = []
    results.forEach((result, i) => {
      const key = requests[i].key
      if (result.status === 'fulfilled') {
        const data = result.value.data
        if (key === 'noeuds-telecom') setNoeuds(data)
        if (key === 'noeuds-gc')      setNoeudsGC(data)
        if (key === 'liens-telecom')  setLiens(data)
        if (key === 'liens-gc')       setLiensGC(data)
        if (key === 'logements')      setLogements(data)
        if (key === 'zones')          setZonesData(data)
      } else { newErrors.push(key) }
    })
    setErrors(newErrors); setLoading(false)
  }

  const activerEditMode = (mode: EditMode) => {
    setEditMode(mode); setDraftPoint(null); setDraftForm({})
    setShowEditPanel(true); setSelected(null)
    if (mode) toast(`Mode création — cliquez sur la carte`, { icon: '✏️', duration: 3000 })
  }

  const chargerHeatmap = async () => {
    try {
      const res = await api.get('/analytics/heatmap-el')
      setHeatmapData(res.data.data || [])
      setShowHeatmap(true)
    } catch { setShowHeatmap(false) }
  }

  const chargerSaturation = async () => {
    try {
      const res = await api.get('/analytics/saturation-noeuds')
      setSaturationData(res.data.noeuds || [])
      setShowSaturation(true)
    } catch {}
  }

  const annulerEdition = () => {
    setEditMode(null); setDraftPoint(null); setDraftForm({})
    setShowEditPanel(false)
  }

  const sauvegarderNoeud = async () => {
    if (!draftPoint) return toast.error('Cliquez sur la carte pour placer le nœud')
    if (!draftForm.nom_unique) return toast.error('Nom unique requis')
    if (!draftForm.type_noeud) return toast.error('Type de nœud requis')
    setSavingDraft(true)
    try {
      const endpoint = editMode === 'noeud_telecom' ? '/noeuds-telecom' : '/noeuds-gc'
      await api.post(endpoint, {
        ...draftForm,
        latitude: draftPoint[0],
        longitude: draftPoint[1],
        etat: draftForm.etat || 'actif',
      })
      toast.success(`Nœud créé : ${draftForm.nom_unique}`)
      annulerEdition()
      chargerDonnees()
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Erreur création')
    } finally { setSavingDraft(false) }
  }

  const supprimerElement = async (item: any) => {
    if (!confirm(`Supprimer "${item.nom_unique}" ?`)) return
    try {
      const map: Record<string, string> = {
        noeud_telecom: 'noeuds-telecom', noeud_gc: 'noeuds-gc',
        lien_telecom: 'liens-telecom',   lien_gc: 'liens-gc',
        logement: 'logements',
      }
      await api.delete(`/${map[item._type]}/${item.id}`)
      toast.success('Élément supprimé')
      setSelected(null)
      chargerDonnees()
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Erreur suppression')
    }
  }

  const rechercher = (q: string) => {
    setSearchQuery(q)
    if (!q.trim()) { setSearchResults([]); return }
    const ql = q.toLowerCase()
    setSearchResults([
      ...noeuds.filter(n => n.nom_unique?.toLowerCase().includes(ql)).map(n => ({ ...n, _type: 'noeud_telecom' })),
      ...noeudsGC.filter(n => n.nom_unique?.toLowerCase().includes(ql)).map(n => ({ ...n, _type: 'noeud_gc' })),
      ...logements.filter(l => l.nom_unique?.toLowerCase().includes(ql) || l.adresse?.toLowerCase().includes(ql)).map(l => ({ ...l, _type: 'logement' })),
    ].slice(0, 8))
  }

  const tileUrl = TILE_STYLES[mapStyle as keyof typeof TILE_STYLES]?.url || TILE_STYLES.dark.url

  return (
    <div className="relative h-full w-full">
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>

      <MapContainer center={[5.3599, -4.0083]} zoom={13} className="h-full w-full" zoomControl={false}>
        <TileLayer url={tileUrl} attribution="© CartoDB / OSM" maxZoom={20} />
        <ZoomControl />
        {editMode && <MapClickHandler onMapClick={setDraftPoint} />}

        {layers.noeud_telecom && noeuds.map(n => (
          <Marker key={n.id} position={[n.latitude, n.longitude]} icon={ICONS[n.type_noeud] || ICONS.PBO}
            eventHandlers={{ click: () => setSelected({ ...n, _type: 'noeud_telecom' }) }}>
            <Popup><PopupNoeud item={n} type="noeud_telecom" onDelete={canEdit ? supprimerElement : undefined} /></Popup>
          </Marker>
        ))}

        {layers.noeud_gc && noeudsGC.map(n => (
          <Marker key={n.id} position={[n.latitude, n.longitude]} icon={ICONS.GC}
            eventHandlers={{ click: () => setSelected({ ...n, _type: 'noeud_gc' }) }}>
            <Popup><PopupNoeud item={n} type="noeud_gc" onDelete={canEdit ? supprimerElement : undefined} /></Popup>
          </Marker>
        ))}

        {layers.logement && logements.map(l => (
          <Marker key={l.id} position={[l.latitude, l.longitude]} icon={ICONS.LOG}
            eventHandlers={{ click: () => setSelected({ ...l, _type: 'logement' }) }}>
            <Popup><PopupLogement logement={l} onDelete={canEdit ? supprimerElement : undefined} /></Popup>
          </Marker>
        ))}

        {layers.lien_telecom && liens.map(l => l.geom?.coordinates
          ? <LienTelecomLayer key={l.id} lien={l}
              onClick={() => setSelected({ ...l, _type: 'lien_telecom' })} />
          : null)}

        {/* Zones d'influence — polygones GeoJSON */}
        {zonesData.map((zone: any) => {
          if (!zone.geom?.coordinates) return null
          const coords = zone.geom.coordinates[0]?.map(([lng,lat]: number[]) => [lat,lng] as [number,number])
          if (!coords) return null
          return (
            <Polyline key={zone.id} positions={coords}
              pathOptions={{ color: '#1D9E75', weight: 2, opacity: 0.8, fillColor: '#1D9E75', fillOpacity: 0.08, fill: true }}>
              <Popup>
                <div style={{minWidth:160}}>
                  <div style={{fontWeight:'bold',fontSize:13}}>🗺️ {zone.nom}</div>
                  <div style={{fontSize:11,color:'#666',marginTop:4}}>
                    <div>Type : {zone.type_zone}</div>
                    <div>Clients : {zone.nb_clients_actifs || 0}</div>
                    {zone.superficie_km2 && <div>Surface : {Number(zone.superficie_km2).toFixed(2)} km²</div>}
                  </div>
                </div>
              </Popup>
            </Polyline>
          )
        })}

        {/* Saturation — nœuds critiques en rouge */}
        {showSaturation && saturationData.map((n: any) => (
          <Marker key={'sat-'+n.id} position={[n.latitude, n.longitude]}
            icon={makeIcon(n.saturation_pct >= 90 ? '#DC2626' : '#F59E0B', '⚠️', 28)}>
            <Popup>
              <div style={{minWidth:160}}>
                <div style={{fontWeight:'bold',fontSize:12}}>⚠️ {n.nom_unique}</div>
                <div style={{fontSize:12,marginTop:4}}>
                  Saturation : <b style={{color: n.saturation_pct>=90?'#DC2626':'#F59E0B'}}>{n.saturation_pct}%</b>
                </div>
                <div style={{fontSize:11,color:'#666'}}>{n.nb_fibres_utilisees}/{n.capacite_fibres_max} fibres</div>
              </div>
            </Popup>
          </Marker>
        ))}

        {layers.lien_gc && liensGC.map(l => l.geom?.coordinates
          ? <LienGCLayer key={l.id} lien={l}
              onClick={() => setSelected({ ...l, _type: 'lien_gc' })} />
          : null)}

        {draftPoint && (
          <Marker position={draftPoint} icon={makeDraftIcon()}>
            <Popup><div className="text-sm text-center p-1">📍 {draftPoint[0].toFixed(5)}, {draftPoint[1].toFixed(5)}</div></Popup>
          </Marker>
        )}

        {selected && <CenterOnFeature feature={selected} />}
      </MapContainer>

      {/* Barre outils haut */}
      <div className="absolute top-4 left-4 right-4 z-[1000] flex items-center gap-2">
        <div className="flex-1 relative">
          <div className="flex items-center bg-gray-900/95 backdrop-blur-sm rounded-2xl border border-gray-700 shadow-2xl overflow-hidden">
            <span className="pl-4 text-gray-400">🔍</span>
            <input type="text" value={searchQuery} onChange={e => rechercher(e.target.value)}
              placeholder="Rechercher nœud, logement, adresse..."
              className="flex-1 bg-transparent px-3 py-3 text-white text-sm outline-none placeholder-gray-500" />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); setSearchResults([]) }}
                className="pr-4 text-gray-400 hover:text-white">✕</button>
            )}
          </div>
          {searchResults.length > 0 && (
            <div className="absolute top-14 left-0 right-0 bg-gray-900/98 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden z-50">
              {searchResults.map((r, i) => (
                <button key={i} onClick={() => { setSelected(r); setSearchQuery(r.nom_unique||''); setSearchResults([]) }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800 transition-colors text-left border-b border-gray-800 last:border-0">
                  <span className="text-xl">
                    {r._type==='noeud_telecom'&&'📡'}{r._type==='noeud_gc'&&'🏗️'}{r._type==='logement'&&'🏠'}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-white">{r.nom_unique}</p>
                    <p className="text-xs text-gray-400">{r._type==='logement' ? r.commune||r.adresse : r.type_noeud}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <button onClick={() => setShowLayerPanel(!showLayerPanel)}
          className={`p-3 rounded-2xl border shadow-2xl backdrop-blur-sm transition-all ${showLayerPanel ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-900/95 border-gray-700 text-gray-300'}`}>
          🗂️
        </button>
        <button onClick={chargerDonnees}
          className="p-3 bg-gray-900/95 backdrop-blur-sm rounded-2xl border border-gray-700 text-gray-300 shadow-2xl hover:bg-gray-800 transition-all">
          🔄
        </button>
      </div>

      {/* Panneau couches */}
      {showLayerPanel && (
        <div className="absolute top-20 right-4 z-[1000] w-64 bg-gray-900/98 backdrop-blur-sm border border-gray-700 rounded-2xl shadow-2xl">
          <div className="p-4 border-b border-gray-700"><h3 className="font-bold text-white text-sm">🗂️ Couches</h3></div>
          <div className="p-3 space-y-1">
            {[
              { key: 'noeud_telecom', label: 'Nœuds Télécom', icon: '📡', count: noeuds.length,    err: errors.includes('noeuds-telecom') },
              { key: 'noeud_gc',      label: 'Nœuds GC',      icon: '🏗️', count: noeudsGC.length,  err: errors.includes('noeuds-gc') },
              { key: 'lien_telecom',  label: 'Câbles Optiques',icon: '〰️', count: liens.length,     err: errors.includes('liens-telecom') },
              { key: 'lien_gc',       label: 'Fourreaux GC',   icon: '⚡', count: liensGC.length,   err: errors.includes('liens-gc') },
              { key: 'logement',      label: 'Logements',      icon: '🏠', count: logements.length, err: errors.includes('logements') },
            ].map(layer => (
              <button key={layer.key} onClick={() => toggleLayer(layer.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm ${layers[layer.key] ? 'bg-blue-900/50 text-blue-300' : 'text-gray-500 hover:bg-gray-800'}`}>
                <span className="text-lg">{layer.icon}</span>
                <span className="flex-1 text-left font-medium">{layer.label}</span>
                {layer.err ? <span className="text-xs text-red-400">⚠️</span> : <span className="text-xs opacity-60">{layer.count}</span>}
                <span className={`w-4 h-4 rounded border-2 flex-shrink-0 ${layers[layer.key] ? 'bg-blue-500 border-blue-500' : 'border-gray-600'}`} />
              </button>
            ))}
          </div>
          <div className="p-3 border-t border-gray-700">
            <p className="text-xs text-gray-500 mb-2 px-1">Style de carte</p>
            <div className="grid grid-cols-3 gap-1">
              {Object.entries(TILE_STYLES).map(([key, val]) => (
                <button key={key} onClick={() => setMapStyle(key as any)}
                  className={`py-2 rounded-lg text-xs font-medium transition-all ${mapStyle===key ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                  {val.label}
                </button>
              ))}
            </div>
            {/* Analytiques */}
            <div className="p-3 border-t border-gray-700">
              <p className="text-xs text-gray-500 mb-2 px-1">📈 Analytiques</p>
              <div className="flex flex-col gap-1">
                <button onClick={() => showHeatmap ? setShowHeatmap(false) : chargerHeatmap()}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${showHeatmap ? 'bg-red-900/50 text-red-300' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                  🌡️ {showHeatmap ? 'Masquer' : 'Afficher'} heatmap EL
                </button>
                <button onClick={() => showSaturation ? setShowSaturation(false) : chargerSaturation()}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${showSaturation ? 'bg-orange-900/50 text-orange-300' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                  ⚠️ {showSaturation ? 'Masquer' : 'Afficher'} saturation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Barre d'édition (admin/chef/technicien) */}
      {canEdit && (
        <div className="absolute top-20 left-4 z-[1000] flex flex-col gap-2">
          {editMode ? (
            <div className="bg-amber-900/95 backdrop-blur-sm border border-amber-600 rounded-2xl shadow-2xl p-3">
              <p className="text-xs text-amber-300 font-medium mb-2">
                ✏️ Mode création — {editMode.replace('_',' ')}
              </p>
              <p className="text-xs text-amber-400 mb-3">
                {draftPoint ? `📍 ${draftPoint[0].toFixed(4)}, ${draftPoint[1].toFixed(4)}` : 'Cliquez sur la carte'}
              </p>
              <button onClick={annulerEdition}
                className="w-full py-1.5 bg-red-700/70 hover:bg-red-600 text-white text-xs rounded-xl transition-all">
                ✕ Annuler
              </button>
            </div>
          ) : (
            <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-2xl shadow-2xl p-2 flex flex-col gap-1">
              <p className="text-xs text-gray-500 px-2 py-1">✏️ Créer</p>
              {[
                { mode: 'noeud_telecom' as EditMode, label: 'Nœud télécom', icon: '📡' },
                { mode: 'noeud_gc'      as EditMode, label: 'Nœud GC',      icon: '🏗️' },
              ].map(b => (
                <button key={b.mode} onClick={() => activerEditMode(b.mode)}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-blue-900/50 text-gray-300 hover:text-blue-300 text-xs rounded-xl transition-all">
                  <span>{b.icon}</span><span>{b.label}</span>
                </button>
              ))}
            </div>
            {/* Boutons liens + outils supplémentaires */}
            {!editMode && (
              <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-2xl shadow-2xl p-2 flex flex-col gap-1 mt-1">
                <p className="text-xs text-gray-500 px-2 py-1">🔗 Liens</p>
                <button onClick={() => setShowLienForm('lien_telecom')}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-blue-900/50 text-gray-300 hover:text-blue-300 text-xs rounded-xl transition-all">
                  <span>〰️</span><span>Lien télécom</span>
                </button>
                <button onClick={() => setShowLienForm('lien_gc')}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-amber-900/50 text-gray-300 hover:text-amber-300 text-xs rounded-xl transition-all">
                  <span>⚡</span><span>Lien GC</span>
                </button>
                <p className="text-xs text-gray-500 px-2 py-1 mt-1">🛠️ Outils</p>
                <button onClick={() => setShowZones(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-teal-900/50 text-gray-300 hover:text-teal-300 text-xs rounded-xl transition-all">
                  <span>🗺️</span><span>Zones</span>
                </button>
                <button onClick={() => setShowItineraires(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-purple-900/50 text-gray-300 hover:text-purple-300 text-xs rounded-xl transition-all">
                  <span>🧭</span><span>Itinéraires</span>
                </button>
              </div>
            )}
        </div>
      )}

      {/* Panneau formulaire de création */}
      {showEditPanel && editMode && (
        <div className="absolute bottom-24 left-4 z-[1000] w-72 bg-gray-900/98 backdrop-blur-sm border border-amber-600/50 rounded-2xl shadow-2xl">
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <h3 className="font-bold text-white text-sm">
              {editMode==='noeud_telecom'?'📡 Nouveau nœud télécom':'🏗️ Nouveau nœud GC'}
            </h3>
            <button onClick={annulerEdition} className="text-gray-500 hover:text-white text-lg">✕</button>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Nom unique *</label>
              <input value={draftForm.nom_unique||''} onChange={e => setDraftForm({...draftForm, nom_unique: e.target.value})}
                className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-blue-500"
                placeholder="ex: NRO-COCODY-01" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Type *</label>
              <select value={draftForm.type_noeud||''} onChange={e => setDraftForm({...draftForm, type_noeud: e.target.value})}
                className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-blue-500">
                <option value="">-- Choisir --</option>
                {editMode==='noeud_telecom'
                  ? ['NRO','SRO','PBO','PTO','PM'].map(t => <option key={t} value={t}>{t}</option>)
                  : ['chambre_l1t','chambre_l2t','chambre_l4t','appui_aerien','regard'].map(t => <option key={t} value={t}>{t}</option>)
                }
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Capacité fibres</label>
              <input type="number" value={draftForm.capacite_fibres_max||''} onChange={e => setDraftForm({...draftForm, capacite_fibres_max: parseInt(e.target.value)})}
                className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-blue-500"
                placeholder="ex: 96" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Commentaire</label>
              <textarea value={draftForm.commentaire||''} onChange={e => setDraftForm({...draftForm, commentaire: e.target.value})}
                className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-blue-500 resize-none"
                rows={2} placeholder="Optionnel" />
            </div>
            {draftPoint && (
              <div className="bg-gray-800 rounded-xl px-3 py-2 text-xs text-gray-400">
                📍 {draftPoint[0].toFixed(5)}, {draftPoint[1].toFixed(5)}
              </div>
            )}
            <button onClick={sauvegarderNoeud} disabled={savingDraft||!draftPoint}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-all">
              {savingDraft ? '⏳ Enregistrement...' : '✅ Créer le nœud'}
            </button>
          </div>
        </div>
      )}

      {/* Stats bas */}
      <div className="absolute bottom-6 left-4 z-[1000] flex gap-2 flex-wrap">
        {[
          { label: 'Nœuds T',   value: noeuds.length },
          { label: 'Nœuds GC',  value: noeudsGC.length },
          { label: 'Logements', value: logements.length },
        ].map((s, i) => (
          <div key={i} className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-xl px-3 py-2 text-center shadow-lg">
            <div className="text-lg font-bold text-white">{s.value}</div>
            <div className="text-xs text-gray-400">{s.label}</div>
          </div>
        ))}
        {errors.length > 0 && (
          <div className="bg-yellow-900/70 border border-yellow-600 rounded-xl px-3 py-2 text-center shadow-lg">
            <div className="text-xs text-yellow-300">⚠️ {errors.length} couche(s) KO</div>
          </div>
        )}
        {editMode && (
          <div className="bg-amber-900/90 border border-amber-600 rounded-xl px-3 py-2 text-center shadow-lg">
            <div className="text-xs text-amber-300 font-medium">✏️ Mode édition actif</div>
          </div>
        )}
      </div>

      {/* Panneaux flottants */}
      {showLienForm && (
        <PanneauCreerLien
          mode={showLienForm}
          noeuds={noeuds}
          noeudsGC={noeudsGC}
          onClose={() => setShowLienForm(null)}
          onSaved={() => { setShowLienForm(null); chargerDonnees() }}
        />
      )}
      {showZones && <PanneauZones onClose={() => setShowZones(false)} />}
      {showItineraires && <PanneauItineraires onClose={() => setShowItineraires(false)} />}

      {loading && (
        <div className="absolute inset-0 z-[2000] bg-gray-950/80 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-gray-900 rounded-2xl p-8 border border-gray-700 text-center">
            <div className="text-4xl animate-spin mb-4">⚙️</div>
            <p className="text-gray-400 text-sm">Chargement de la carte...</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Composants auxiliaires ──────────────────────────────────

function MapClickHandler({ onMapClick }: { onMapClick: (pos: [number,number]) => void }) {
  useMapEvents({
    click(e) { onMapClick([e.latlng.lat, e.latlng.lng]) }
  })
  return null
}

function ZoomControl() {
  const map = useMap()
  return (
    <div className="absolute bottom-6 right-4 z-[1000] flex flex-col gap-1">
      <button onClick={() => map.zoomIn()}  className="w-10 h-10 bg-gray-900/95 border border-gray-700 rounded-xl text-white text-xl hover:bg-gray-800 shadow-lg flex items-center justify-center">+</button>
      <button onClick={() => map.zoomOut()} className="w-10 h-10 bg-gray-900/95 border border-gray-700 rounded-xl text-white text-xl hover:bg-gray-800 shadow-lg flex items-center justify-center">−</button>
    </div>
  )
}

function CenterOnFeature({ feature }: { feature: any }) {
  const map = useMap()
  useEffect(() => {
    if (feature?.latitude && feature?.longitude) {
      map.flyTo([feature.latitude, feature.longitude], 16, { duration: 1 })
    }
  }, [feature])
  return null
}

function PopupNoeud({ item, type, onDelete }: { item: any; type: string; onDelete?: (item: any) => void }) {
  const emoji = type === 'noeud_telecom' ? '📡' : '🏗️'
  return (
    <div className="min-w-[200px]">
      <div className="font-bold text-sm mb-2">{emoji} {item.nom_unique}</div>
      <div className="space-y-1 text-xs text-gray-600">
        <div><b>Type :</b> {item.type_noeud}</div>
        <div><b>État :</b> <span className={item.etat==='actif'?'text-green-600':'text-orange-500'}>{item.etat}</span></div>
        {item.capacite_fibres_max && <div><b>Capacité :</b> {item.capacite_fibres_max} fibres</div>}
        {item.marque && <div><b>Marque :</b> {item.marque}</div>}
        {item.commentaire && <div className="mt-1 italic">{item.commentaire}</div>}
      </div>
      {onDelete && (
        <button onClick={() => onDelete({ ...item, _type: type })}
          className="mt-3 w-full py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs rounded-lg border border-red-200 transition-all">
          🗑️ Supprimer
        </button>
      )}
    </div>
  )
}

function PopupLogement({ logement, onDelete }: { logement: any; onDelete?: (item: any) => void }) {
  return (
    <div className="min-w-[200px]">
      <div className="font-bold text-sm mb-2">🏠 {logement.nom_unique}</div>
      <div className="space-y-1 text-xs text-gray-600">
        {logement.adresse && <div><b>Adresse :</b> {logement.adresse}</div>}
        {logement.commune && <div><b>Commune :</b> {logement.commune}</div>}
        <div><b>EL réels :</b> {logement.nb_el_reel||0}</div>
        <div><b>EL raccordables :</b> {logement.nb_el_raccordables||0}</div>
        <div><b>EL raccordés :</b> {logement.nb_el_raccordes||0}</div>
      </div>
      {onDelete && (
        <button onClick={() => onDelete({ ...logement, _type: 'logement' })}
          className="mt-3 w-full py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs rounded-lg border border-red-200 transition-all">
          🗑️ Supprimer
        </button>
      )}
    </div>
  )
}

function LienTelecomLayer({ lien, onClick }: { lien: any; onClick: () => void }) {
  const couleurs: Record<string, string> = { monomode: '#3B82F6', multimodes: '#8B5CF6', default: '#60A5FA' }
  const couleur = couleurs[lien.type_cable] || couleurs.default
  const coords: [number,number][] = lien.geom.coordinates.map(([lng,lat]: number[]) => [lat,lng])
  return <Polyline positions={coords} pathOptions={{ color: couleur, weight: 3, opacity: 0.85 }} eventHandlers={{ click: onClick }} />
}

function LienGCLayer({ lien, onClick }: { lien: any; onClick: () => void }) {
  const coords: [number,number][] = lien.geom.coordinates.map(([lng,lat]: number[]) => [lat,lng])
  return <Polyline positions={coords} pathOptions={{ color: '#F59E0B', weight: 3, opacity: 0.7, dashArray: '8,4' }} eventHandlers={{ click: onClick }} />
}
