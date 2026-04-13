import { useState, useEffect } from 'react'
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
    className: '', iconSize: [size, size], iconAnchor: [size/2, size], popupAnchor: [0, -size],
  })

const makeDraftIcon = () =>
  L.divIcon({
    html: `<div style="background:#F59E0B;width:24px;height:24px;border-radius:50%;border:3px solid white;box-shadow:0 0 0 3px #F59E0B55;"></div>`,
    className: '', iconSize: [24,24], iconAnchor: [12,12],
  })

const ICONS: Record<string, L.DivIcon> = {
  NRO: makeIcon('#1D4ED8','🔵'), SRO: makeIcon('#6366F1','🟣'),
  PBO: makeIcon('#8B5CF6','🔷'), PTO: makeIcon('#A78BFA','◾'),
  PM:  makeIcon('#60A5FA','🔹'), GC:  makeIcon('#F59E0B','🟡'),
  LOG: makeIcon('#10B981','🏠'),
}

const TILE_STYLES = {
  dark:      { url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', label: 'Sombre' },
  satellite: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', label: 'Satellite' },
  streets:   { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', label: 'Rues' },
}

type EditMode = null | 'noeud_telecom' | 'noeud_gc'

export default function MapPage() {
  const [noeuds,    setNoeuds]    = useState<any[]>([])
  const [noeudsGC,  setNoeudsGC]  = useState<any[]>([])
  const [liens,     setLiens]     = useState<any[]>([])
  const [liensGC,   setLiensGC]   = useState<any[]>([])
  const [logements, setLogements] = useState<any[]>([])
  const [zonesData, setZonesData] = useState<any[]>([])
  const [loading,   setLoading]   = useState(true)
  const [errors,    setErrors]    = useState<string[]>([])
  const [selected,  setSelected]  = useState<any>(null)
  const [showLayerPanel, setShowLayerPanel] = useState(false)
  const [searchQuery,    setSearchQuery]    = useState('')
  const [searchResults,  setSearchResults]  = useState<any[]>([])
  const [editMode,       setEditMode]       = useState<EditMode>(null)
  const [draftPoint,     setDraftPoint]     = useState<[number,number]|null>(null)
  const [draftForm,      setDraftForm]      = useState<any>({})
  const [savingDraft,    setSavingDraft]    = useState(false)
  const [showEditPanel,  setShowEditPanel]  = useState(false)
  const [showLienForm,   setShowLienForm]   = useState<'lien_telecom'|'lien_gc'|null>(null)
  const [showZones,      setShowZones]      = useState(false)
  const [showItineraires,setShowItineraires]= useState(false)
  const [showSaturation, setShowSaturation] = useState(false)
  const [saturationData, setSaturationData] = useState<any[]>([])

  const { layers, toggleLayer, mapStyle, setMapStyle } = useMapStore()
  const { canEdit: canEditFn } = useAuthStore()
  const canEdit = canEditFn()

  useEffect(() => { chargerDonnees() }, [])

  const chargerDonnees = async () => {
    setLoading(true); setErrors([])
    const requests = [
      { key: 'noeuds-telecom', fn: () => api.get('/noeuds-telecom') },
      { key: 'noeuds-gc',      fn: () => api.get('/noeuds-gc') },
      { key: 'liens-telecom',  fn: () => api.get('/liens-telecom/geojson') },
      { key: 'liens-gc',       fn: () => api.get('/liens-gc/geojson') },
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
        if (key === 'liens-telecom') {
          const features = data?.features || (Array.isArray(data) ? data : [])
          setLiens(features.map((f: any) => ({
            ...f.properties,
            id: f.properties?.id,
            geom: f.geometry
          })))
        }
        if (key === 'liens-gc') {
          const features = data?.features || (Array.isArray(data) ? data : [])
          setLiensGC(features.map((f: any) => ({
            ...f.properties,
            id: f.properties?.id,
            geom: f.geometry
          })))
        }
        if (key === 'logements')      setLogements(data)
        if (key === 'zones')          setZonesData(data)
      } else { newErrors.push(key) }
    })
    setErrors(newErrors); setLoading(false)
  }

  const chargerSaturation = async () => {
    try {
      const res = await api.get('/analytics/saturation-noeuds?seuil=0')
      setSaturationData(res.data.noeuds || [])
      setShowSaturation(true)
    } catch { toast.error('Erreur chargement saturation') }
  }

  const activerEditMode = (mode: EditMode) => {
    setEditMode(mode); setDraftPoint(null); setDraftForm({})
    setShowEditPanel(true); setSelected(null)
    if (mode) toast('Cliquez sur la carte pour placer le noeud', { icon: 'map', duration: 3000 })
  }

  const annulerEdition = () => {
    setEditMode(null); setDraftPoint(null); setDraftForm({})
    setShowEditPanel(false)
  }

  const sauvegarderNoeud = async () => {
    if (!draftPoint) return toast.error('Cliquez sur la carte pour placer le noeud')
    if (!draftForm.nom_unique) return toast.error('Nom unique requis')
    if (!draftForm.type_noeud) return toast.error('Type de noeud requis')
    setSavingDraft(true)
    try {
      const endpoint = editMode === 'noeud_telecom' ? '/noeuds-telecom' : '/noeuds-gc'
      await api.post(endpoint, { ...draftForm, latitude: draftPoint[0], longitude: draftPoint[1], etat: draftForm.etat || 'actif' })
      toast.success('Noeud cree : ' + draftForm.nom_unique)
      annulerEdition(); chargerDonnees()
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Erreur creation')
    } finally { setSavingDraft(false) }
  }

  const supprimerElement = async (item: any) => {
    if (!confirm('Supprimer "' + item.nom_unique + '" ?')) return
    try {
      const map: Record<string, string> = {
        noeud_telecom: 'noeuds-telecom', noeud_gc: 'noeuds-gc',
        lien_telecom: 'liens-telecom', lien_gc: 'liens-gc', logement: 'logements',
      }
      await api.delete('/' + map[item._type] + '/' + item.id)
      toast.success('Element supprime'); setSelected(null); chargerDonnees()
    } catch (e: any) { toast.error(e.response?.data?.detail || 'Erreur suppression') }
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

      <MapContainer center={[5.3599, -4.0083]} zoom={13} className="h-full w-full" zoomControl={false}>
        <TileLayer url={tileUrl} attribution="CartoDB / OSM" maxZoom={20} />
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
          ? <LienLayer key={l.id} lien={l} color="#378ADD" onClick={() => setSelected({ ...l, _type: 'lien_telecom' })} />
          : null)}

        {layers.lien_gc && liensGC.map(l => l.geom?.coordinates
          ? <LienLayer key={l.id} lien={l} color="#F59E0B" dash="8,4" onClick={() => setSelected({ ...l, _type: 'lien_gc' })} />
          : null)}

        {zonesData.map((zone: any) => {
          if (!zone.geom?.coordinates) return null
          const coords = zone.geom.coordinates[0]?.map(([lng, lat]: number[]) => [lat, lng] as [number, number])
          if (!coords) return null
          return (
            <Polyline key={zone.id} positions={coords}
              pathOptions={{ color: '#1D9E75', weight: 2, opacity: 0.8, fillColor: '#1D9E75', fillOpacity: 0.08, fill: true }}>
              <Popup>
                <div style={{ minWidth: 160 }}>
                  <div style={{ fontWeight: 'bold', fontSize: 13 }}>Zone : {zone.nom}</div>
                  <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
                    <div>Type : {zone.type_zone}</div>
                    <div>Clients : {zone.nb_clients_actifs || 0}</div>
                  </div>
                </div>
              </Popup>
            </Polyline>
          )
        })}

        {showSaturation && saturationData.map((n: any) => (
          <Marker key={'sat-'+n.id} position={[n.latitude, n.longitude]}
            icon={makeIcon(n.saturation_pct >= 90 ? '#DC2626' : '#F59E0B', '!', 28)}>
            <Popup>
              <div style={{ minWidth: 160 }}>
                <div style={{ fontWeight: 'bold', fontSize: 12 }}>{n.nom_unique}</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  Saturation : <b style={{ color: n.saturation_pct >= 90 ? '#DC2626' : '#F59E0B' }}>{n.saturation_pct}%</b>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {draftPoint && (
          <Marker position={draftPoint} icon={makeDraftIcon()}>
            <Popup><div className="text-sm text-center p-1">
              {draftPoint[0].toFixed(5)}, {draftPoint[1].toFixed(5)}
            </div></Popup>
          </Marker>
        )}

        {selected && <CenterOnFeature feature={selected} />}
      </MapContainer>

      {/* Barre de recherche */}
      <div className="absolute top-4 left-4 right-4 z-[1000] flex items-center gap-2">
        <div className="flex-1 relative">
          <div className="flex items-center bg-gray-900/95 backdrop-blur-sm rounded-2xl border border-gray-700 shadow-2xl overflow-hidden">
            <span className="pl-4 text-gray-400">🔍</span>
            <input type="text" value={searchQuery} onChange={e => rechercher(e.target.value)}
              placeholder="Rechercher noeud, logement, adresse..."
              className="flex-1 bg-transparent px-3 py-3 text-white text-sm outline-none placeholder-gray-500" />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); setSearchResults([]) }} className="pr-4 text-gray-400 hover:text-white">x</button>
            )}
          </div>
          {searchResults.length > 0 && (
            <div className="absolute top-14 left-0 right-0 bg-gray-900/98 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden z-50">
              {searchResults.map((r, i) => (
                <button key={i} onClick={() => { setSelected(r); setSearchQuery(r.nom_unique || ''); setSearchResults([]) }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800 transition-colors text-left border-b border-gray-800 last:border-0">
                  <span className="text-xl">
                    {r._type === 'noeud_telecom' && '📡'}
                    {r._type === 'noeud_gc' && '🏗️'}
                    {r._type === 'logement' && '🏠'}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-white">{r.nom_unique}</p>
                    <p className="text-xs text-gray-400">{r._type === 'logement' ? r.commune || r.adresse : r.type_noeud}</p>
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
        <button onClick={chargerDonnees} className="p-3 bg-gray-900/95 backdrop-blur-sm rounded-2xl border border-gray-700 text-gray-300 shadow-2xl hover:bg-gray-800 transition-all">
          🔄
        </button>
      </div>

      {/* Panneau couches */}
      {showLayerPanel && (
        <div className="absolute top-20 right-4 z-[1000] w-64 bg-gray-900/98 backdrop-blur-sm border border-gray-700 rounded-2xl shadow-2xl">
          <div className="p-4 border-b border-gray-700"><h3 className="font-bold text-white text-sm">Couches</h3></div>
          <div className="p-3 space-y-1">
            {[
              { key: 'noeud_telecom', label: 'Noeuds Telecom',  icon: '📡', count: noeuds.length,    err: errors.includes('noeuds-telecom') },
              { key: 'noeud_gc',      label: 'Noeuds GC',       icon: '🏗️', count: noeudsGC.length,  err: errors.includes('noeuds-gc') },
              { key: 'lien_telecom',  label: 'Cables Optiques', icon: '〰️', count: liens.length,     err: errors.includes('liens-telecom') },
              { key: 'lien_gc',       label: 'Fourreaux GC',    icon: '⚡', count: liensGC.length,   err: errors.includes('liens-gc') },
              { key: 'logement',      label: 'Logements',       icon: '🏠', count: logements.length, err: errors.includes('logements') },
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
            <p className="text-xs text-gray-500 mb-2 px-1">Style</p>
            <div className="grid grid-cols-3 gap-1">
              {Object.entries(TILE_STYLES).map(([key, val]) => (
                <button key={key} onClick={() => setMapStyle(key as any)}
                  className={`py-2 rounded-lg text-xs font-medium transition-all ${mapStyle === key ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                  {val.label}
                </button>
              ))}
            </div>
            <div className="mt-2 space-y-1">
              <button onClick={() => showSaturation ? setShowSaturation(false) : chargerSaturation()}
                className={`w-full px-3 py-2 rounded-lg text-xs font-medium transition-all ${showSaturation ? 'bg-orange-900/50 text-orange-300' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                ⚠️ {showSaturation ? 'Masquer' : 'Saturation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barre edition — mode actif */}
      {canEdit && editMode && (
        <div className="absolute top-20 left-4 z-[1000]">
          <div className="bg-amber-900/95 backdrop-blur-sm border border-amber-600 rounded-2xl shadow-2xl p-3">
            <p className="text-xs text-amber-300 font-medium mb-2">
              Mode creation — {editMode.replace('_', ' ')}
            </p>
            <p className="text-xs text-amber-400 mb-3">
              {draftPoint ? draftPoint[0].toFixed(4) + ', ' + draftPoint[1].toFixed(4) : 'Cliquez sur la carte'}
            </p>
            <button onClick={annulerEdition}
              className="w-full py-1.5 bg-red-700/70 hover:bg-red-600 text-white text-xs rounded-xl transition-all">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Barre edition — boutons création */}
      {canEdit && !editMode && (
        <div className="absolute top-20 left-4 z-[1000] flex flex-col gap-2">
          <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-2xl shadow-2xl p-2 flex flex-col gap-1">
            <p className="text-xs text-gray-500 px-2 py-1">Creer</p>
            <button onClick={() => activerEditMode('noeud_telecom')}
              className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-blue-900/50 text-gray-300 text-xs rounded-xl transition-all">
              📡 Noeud telecom
            </button>
            <button onClick={() => activerEditMode('noeud_gc')}
              className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-blue-900/50 text-gray-300 text-xs rounded-xl transition-all">
              🏗 Noeud GC
            </button>
          </div>
          <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-2xl shadow-2xl p-2 flex flex-col gap-1">
            <p className="text-xs text-gray-500 px-2 py-1">Liens</p>
            <button onClick={() => setShowLienForm('lien_telecom')}
              className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-blue-900/50 text-gray-300 text-xs rounded-xl transition-all">
              Lien telecom
            </button>
            <button onClick={() => setShowLienForm('lien_gc')}
              className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-amber-900/50 text-gray-300 text-xs rounded-xl transition-all">
              Lien GC
            </button>
            <button onClick={() => setShowZones(true)}
              className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-teal-900/50 text-gray-300 text-xs rounded-xl transition-all">
              Zones
            </button>
            <button onClick={() => setShowItineraires(true)}
              className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-purple-900/50 text-gray-300 text-xs rounded-xl transition-all">
              Itineraires
            </button>
          </div>
        </div>
      )}

      {/* Formulaire creation noeud */}
      {showEditPanel && editMode && (
        <div className="absolute bottom-24 left-4 z-[1000] w-72 bg-gray-900/98 backdrop-blur-sm border border-amber-600/50 rounded-2xl shadow-2xl">
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <h3 className="font-bold text-white text-sm">
              {editMode === 'noeud_telecom' ? 'Nouveau noeud telecom' : 'Nouveau noeud GC'}
            </h3>
            <button onClick={annulerEdition} className="text-gray-500 hover:text-white text-lg">x</button>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Nom unique *</label>
              <input value={draftForm.nom_unique || ''} onChange={e => setDraftForm({ ...draftForm, nom_unique: e.target.value })}
                className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-blue-500"
                placeholder="ex: NRO-COCODY-01" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Type *</label>
              <select value={draftForm.type_noeud || ''} onChange={e => setDraftForm({ ...draftForm, type_noeud: e.target.value })}
                className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-blue-500">
                <option value="">-- Choisir --</option>
                {editMode === 'noeud_telecom'
                  ? ['NRO','SRO','PBO','PTO','PM'].map(t => <option key={t} value={t}>{t}</option>)
                  : ['chambre_l1t','chambre_l2t','chambre_l4t','appui_aerien'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Capacite fibres</label>
              <input type="number" value={draftForm.capacite_fibres_max || ''}
                onChange={e => setDraftForm({ ...draftForm, capacite_fibres_max: parseInt(e.target.value) })}
                className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-blue-500"
                placeholder="ex: 96" />
            </div>
            {draftPoint && (
              <div className="bg-gray-800 rounded-xl px-3 py-2 text-xs text-gray-400">
                📍 {draftPoint[0].toFixed(5)}, {draftPoint[1].toFixed(5)}
              </div>
            )}
            <button onClick={sauvegarderNoeud} disabled={savingDraft || !draftPoint}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-all">
              {savingDraft ? 'Enregistrement...' : 'Creer le noeud'}
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="absolute bottom-6 left-4 z-[1000] flex gap-2 flex-wrap">
        {[
          { label: 'Noeuds T',  value: noeuds.length },
          { label: 'Noeuds GC', value: noeudsGC.length },
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
            <div className="text-xs text-amber-300 font-medium">Mode edition actif</div>
          </div>
        )}
      </div>

      {/* Panneaux flottants */}
      {showLienForm && (
        <PanneauCreerLien mode={showLienForm} noeuds={noeuds} noeudsGC={noeudsGC}
          onClose={() => setShowLienForm(null)}
          onSaved={() => { setShowLienForm(null); chargerDonnees() }} />
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

function MapClickHandler({ onMapClick }: { onMapClick: (pos: [number,number]) => void }) {
  useMapEvents({ click(e) { onMapClick([e.latlng.lat, e.latlng.lng]) } })
  return null
}

function ZoomControl() {
  const map = useMap()
  return (
    <div className="absolute bottom-6 right-4 z-[1000] flex flex-col gap-1">
      <button onClick={() => map.zoomIn()}  className="w-10 h-10 bg-gray-900/95 border border-gray-700 rounded-xl text-white text-xl hover:bg-gray-800 shadow-lg flex items-center justify-center">+</button>
      <button onClick={() => map.zoomOut()} className="w-10 h-10 bg-gray-900/95 border border-gray-700 rounded-xl text-white text-xl hover:bg-gray-800 shadow-lg flex items-center justify-center">-</button>
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
  return (
    <div style={{ minWidth: 200 }}>
      <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 8 }}>{item.nom_unique}</div>
      <div style={{ fontSize: 12, color: '#666' }}>
        <div>Type : {item.type_noeud}</div>
        <div>Etat : {item.etat}</div>
        {item.capacite_fibres_max && <div>Capacite : {item.capacite_fibres_max} fibres</div>}
      </div>
      {onDelete && (
        <button onClick={() => onDelete({ ...item, _type: type })}
          style={{ marginTop: 8, width: '100%', padding: '4px 8px', background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
          Supprimer
        </button>
      )}
    </div>
  )
}

function PopupLogement({ logement, onDelete }: { logement: any; onDelete?: (item: any) => void }) {
  return (
    <div style={{ minWidth: 200 }}>
      <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 8 }}>🏠 {logement.nom_unique}</div>
      <div style={{ fontSize: 12, color: '#666' }}>
        {logement.adresse && <div>Adresse : {logement.adresse}</div>}
        <div>EL reels : {logement.nb_el_reel || 0}</div>
        <div>EL raccordables : {logement.nb_el_raccordables || 0}</div>
        <div>EL raccordes : {logement.nb_el_raccordes || 0}</div>
      </div>
      {onDelete && (
        <button onClick={() => onDelete({ ...logement, _type: 'logement' })}
          style={{ marginTop: 8, width: '100%', padding: '4px 8px', background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
          Supprimer
        </button>
      )}
    </div>
  )
}

function LienLayer({ lien, color, dash, onClick }: { lien: any; color: string; dash?: string; onClick: () => void }) {
  const coords: [number,number][] = lien.geom.coordinates.map(([lng, lat]: number[]) => [lat, lng])
  return <Polyline positions={coords} pathOptions={{ color, weight: 3, opacity: 0.85, dashArray: dash }} eventHandlers={{ click: onClick }} />
}
