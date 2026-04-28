import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Polygon, CircleMarker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import api from '@services/api'
import toast from 'react-hot-toast'

const errMsg = (e: any): string => {
  const d = e?.response?.data?.detail
  if (!d) return e?.message || 'Erreur'
  if (typeof d === 'string') return d
  if (Array.isArray(d)) return d.map((x:any) => x.msg || x.message || JSON.stringify(x)).join(', ')
  if (typeof d === 'object') return d.msg || d.message || JSON.stringify(d)
  return String(d)
}

interface ZoneData {
  id: string; nom: string; code?: string
  type_zone: string; statut: string
  capacite_max?: number; nb_clients_actifs?: number
  superficie_km2?: number; nb_logements?: number
}

// ================================================================
// PANNEAU CRÉER LIEN — avec sélection nœuds par recherche/carte
// ================================================================
export function PanneauCreerLien({
  mode, noeuds, noeudsGC, onClose, onSaved
}: {
  mode: 'lien_telecom' | 'lien_gc'
  noeuds: any[]; noeudsGC: any[]
  onClose: () => void; onSaved?: () => void
}) {
  const liste = mode === 'lien_telecom' ? noeuds : noeudsGC
  const isTelecom = mode === 'lien_telecom'
  
  const [saving,  setSaving]  = useState(false)
  const [search1, setSearch1] = useState('')
  const [search2, setSearch2] = useState('')
  const [n1,      setN1]      = useState<any>(null)
  const [n2,      setN2]      = useState<any>(null)
  const [form, setForm] = useState({
    nom_unique: '',
    type_lien: isTelecom ? 'branchement' : 'fourreau',
    type_cable: 'monomode',
    nb_fibres: 4,
    nb_fourreaux: 4,
    etat: 'actif',
    longueur_m: '',
    commentaire: '',
  })

  const filtres1 = liste.filter(n => 
    n.id !== n2?.id &&
    (!search1 || n.nom_unique?.toLowerCase().includes(search1.toLowerCase()) || n.type_noeud?.toLowerCase().includes(search1.toLowerCase()))
  ).slice(0, 8)
  
  const filtres2 = liste.filter(n => 
    n.id !== n1?.id &&
    (!search2 || n.nom_unique?.toLowerCase().includes(search2.toLowerCase()) || n.type_noeud?.toLowerCase().includes(search2.toLowerCase()))
  ).slice(0, 8)

  // Auto-generate nom
  useEffect(() => {
    if (n1 && n2) {
      const prefix = isTelecom ? 'LT' : 'LGC'
      setForm(f => ({ ...f, nom_unique: `${prefix}-${n1.nom_unique}-${n2.nom_unique}` }))
    }
  }, [n1, n2])

  const sauvegarder = async () => {
    if (!n1 || !n2) return toast.error('Sélectionnez les 2 nœuds')
    if (!form.nom_unique) return toast.error('Nom unique requis')
    setSaving(true)
    try {
      const payload: any = {
        nom_unique: form.nom_unique,
        type_lien: form.type_lien,
        etat: form.etat,
        id_noeud_depart: n1.id,
        id_noeud_arrivee: n2.id,
        longueur_m: form.longueur_m ? parseFloat(form.longueur_m) : undefined,
        commentaire: form.commentaire || undefined,
      }
      if (isTelecom) {
        payload.type_cable = form.type_cable
        payload.nb_fibres = parseInt(String(form.nb_fibres)) || 4
      } else {
        payload.nb_fourreaux = parseInt(String(form.nb_fourreaux)) || 4
      }
      await api.post(isTelecom ? '/liens-telecom' : '/liens-gc', payload)
      toast.success(`${form.nom_unique} créé ✅`)
      onSaved?.()
      onClose()
    } catch (e: any) { toast.error(errMsg(e)) }
    finally { setSaving(false) }
  }

  const NoeudSelector = ({ 
    label, selected, onSelect, search, onSearch, options, color
  }: {
    label: string; selected: any; onSelect: (n:any)=>void
    search: string; onSearch: (s:string)=>void; options: any[]; color: string
  }) => (
    <div className="bg-gray-800 rounded-xl p-3">
      <span className="text-xs font-medium mb-2 block" style={{color}}>{label}</span>
      {selected ? (
        <div className="flex items-center gap-2 rounded-xl px-2 py-1.5"
          style={{background: color+'22', border:`1px solid ${color}66`}}>
          <span className="text-xs font-mono px-1.5 py-0.5 rounded text-white" style={{background:color+'99'}}>
            {selected.type_noeud}
          </span>
          <span className="text-xs text-white flex-1 truncate font-medium">{selected.nom_unique}</span>
          <button onClick={() => onSelect(null)} className="text-gray-500 hover:text-white text-sm">✕</button>
        </div>
      ) : (
        <div>
          <input value={search} onChange={e => onSearch(e.target.value)}
            placeholder={`Rechercher ${isTelecom ? 'NRO, SRO, PBO...' : 'chambre, poteau...'}`}
            className="w-full bg-gray-700 border border-gray-600 rounded-xl px-2 py-1.5 text-white text-xs outline-none focus:border-blue-500 mb-1"/>
          {options.length > 0 ? (
            <div className="bg-gray-700 rounded-xl overflow-hidden max-h-36 overflow-y-auto">
              {options.map(n => (
                <button key={n.id} onClick={() => { onSelect(n); onSearch('') }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-gray-600 text-left border-b border-gray-600 last:border-0">
                  <span className="text-xs font-mono bg-gray-600 px-1 rounded text-gray-200">{n.type_noeud}</span>
                  <span className="text-xs text-white truncate flex-1">{n.nom_unique}</span>
                  {n.commune && <span className="text-xs text-gray-500 flex-shrink-0">{n.commune}</span>}
                </button>
              ))}
            </div>
          ) : search.length > 0 ? (
            <p className="text-xs text-gray-500 text-center py-2">Aucun résultat</p>
          ) : (
            <p className="text-xs text-gray-500 text-center py-2">Tapez pour rechercher ({liste.length} équipements)</p>
          )}
        </div>
      )}
    </div>
  )

  return (
    <div className="fixed inset-0 z-[1500] bg-black/70 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-t-2xl md:rounded-2xl w-full md:max-w-md max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="font-bold text-white text-sm">
              {isTelecom ? '〰️ Créer un lien télécom' : '⚡ Créer un lien GC'}
            </h2>
            <p className="text-xs text-gray-400">{liste.length} équipements disponibles</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Sélection nœuds */}
          <NoeudSelector label="🟢 Nœud de départ" selected={n1} onSelect={setN1}
            search={search1} onSearch={setSearch1} options={filtres1} color="#22C55E"/>
          
          <div className="flex justify-center">
            <button onClick={() => { const tmp=n1; setN1(n2); setN2(tmp) }}
              className="text-gray-500 hover:text-white text-xl">⇅</button>
          </div>

          <NoeudSelector label="🔴 Nœud d'arrivée" selected={n2} onSelect={setN2}
            search={search2} onSearch={setSearch2} options={filtres2} color="#EF4444"/>

          {/* Nom */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Nom unique *</label>
            <input value={form.nom_unique} onChange={e => setForm(f=>({...f,nom_unique:e.target.value}))}
              placeholder={isTelecom ? "ex: LT-NRO01-PBO042" : "ex: LGC-CH01-CH02"}
              className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-blue-500"/>
          </div>

          {/* Type + capacité */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Type lien</label>
              <select value={form.type_lien} onChange={e => setForm(f=>({...f,type_lien:e.target.value}))}
                className="w-full bg-gray-800 border border-gray-600 rounded-xl px-2 py-2 text-white text-xs outline-none">
                {isTelecom
                  ? ['transport','distribution','branchement','jarretiere'].map(t=><option key={t} value={t}>{t}</option>)
                  : ['fourreau','aerien','micro_tranchee','chemin_cables'].map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                {isTelecom ? 'Nb fibres' : 'Nb fourreaux'}
              </label>
              <input type="number" min={1}
                value={isTelecom ? form.nb_fibres : form.nb_fourreaux}
                onChange={e => setForm(f => isTelecom
                  ? {...f, nb_fibres: parseInt(e.target.value)||4}
                  : {...f, nb_fourreaux: parseInt(e.target.value)||4}
                )}
                className="w-full bg-gray-800 border border-gray-600 rounded-xl px-2 py-2 text-white text-sm outline-none text-center"/>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Longueur (m)</label>
              <input type="number" value={form.longueur_m}
                onChange={e => setForm(f=>({...f,longueur_m:e.target.value}))}
                placeholder="auto"
                className="w-full bg-gray-800 border border-gray-600 rounded-xl px-2 py-2 text-white text-sm outline-none"/>
            </div>
          </div>

          {/* Aperçu connexion */}
          {n1 && n2 && (
            <div className="bg-gray-800 rounded-xl p-2.5 flex items-center gap-2 text-xs">
              <span className="text-green-400 font-medium truncate flex-1">{n1.nom_unique}</span>
              <span className="text-gray-400 flex-shrink-0">
                ——{isTelecom ? '〰️' : '⚡'}——→
              </span>
              <span className="text-red-400 font-medium truncate flex-1 text-right">{n2.nom_unique}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-700 p-4 flex gap-2 flex-shrink-0">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-gray-600 text-gray-300 rounded-xl text-sm">
            Annuler
          </button>
          <button onClick={sauvegarder} disabled={saving || !n1 || !n2 || !form.nom_unique}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl text-sm font-bold">
            {saving ? '⏳...' : `Créer le ${isTelecom ? 'câble' : 'fourreau'}`}
          </button>
        </div>
      </div>
    </div>
  )
}



// ================================================================
// PANNEAU ZONES D'INFLUENCE — Création + Édition géométrique
// ================================================================
export function PanneauZones({ onClose }: { onClose: () => void }) {
  const [zones,       setZones]       = useState<any[]>([])
  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState(false)
  const [panel,       setPanel]       = useState<'list'|'form'>('list')
  const [selected,    setSelected]    = useState<any>(null)
  const [drawPoints,  setDrawPoints]  = useState<[number,number][]>([])
  const [drawMode,    setDrawMode]    = useState(false)
  const [form, setForm] = useState({
    nom:'', code:'', type_zone:'standard', capacite_max:'', commentaire:''
  })

  useEffect(() => { charger() }, [])

  const charger = async () => {
    setLoading(true)
    try { const r = await api.get('/zones-influence'); setZones(r.data || []) }
    catch { setZones([]) }
    setLoading(false)
  }

  const ouvrirForm = (z?: any) => {
    if (z) {
      setSelected(z)
      setForm({ nom:z.nom||'', code:z.code||'', type_zone:z.type_zone||'standard',
        capacite_max:z.capacite_max||'', commentaire:z.commentaire||'' })
      // Extraire les points de la géométrie existante
      if (z.geom?.coordinates?.[0]) {
        const pts: [number,number][] = z.geom.coordinates[0].slice(0,-1).map(([lng,lat]:number[]) => [lat,lng] as [number,number])
        setDrawPoints(pts)
      } else { setDrawPoints([]) }
    } else {
      setSelected(null); setDrawPoints([])
      setForm({ nom:'', code:'', type_zone:'standard', capacite_max:'', commentaire:'' })
    }
    setPanel('form')
  }

  const sauvegarder = async () => {
    if (!form.nom) return toast.error('Nom requis')
    setSaving(true)
    try {
      const payload: any = {
        nom: form.nom, code: form.code || undefined,
        type_zone: form.type_zone,
        capacite_max: form.capacite_max ? parseInt(form.capacite_max) : undefined,
        commentaire: form.commentaire || undefined,
      }
      if (drawPoints.length >= 3) {
        payload.geojson_geom = JSON.stringify({
          type: 'Polygon',
          coordinates: [[
            ...drawPoints.map(([lat,lng]: [number,number]) => [lng,lat]),
            [drawPoints[0][1], drawPoints[0][0]]
          ]]
        })
      }
      if (selected) {
        await api.put(`/zones-influence/${selected.id}`, payload)
        toast.success('Zone mise à jour')
      } else {
        await api.post('/zones-influence', payload)
        toast.success(`Zone "${form.nom}" créée`)
      }
      setPanel('list'); setSelected(null); setDrawPoints([])
      charger()
    } catch (e:any) { toast.error(errMsg(e)) }
    finally { setSaving(false) }
  }

  const supprimer = async (id: string) => {
    if (!confirm('Supprimer cette zone ?')) return
    try { await api.delete(`/zones-influence/${id}`); toast.success('Zone supprimée'); charger() }
    catch (e:any) { toast.error(errMsg(e)) }
  }

  const TYPE_COLORS: Record<string,string> = {
    standard:'#3B82F6', prioritaire:'#10B981', exclusion:'#EF4444', gc:'#F59E0B'
  }

  return (
    <div className="fixed inset-0 z-[1500] bg-black/70 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-t-2xl md:rounded-2xl w-full md:max-w-lg max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="font-bold text-white text-sm">🗺️ Zones d'influence</h2>
            <p className="text-xs text-gray-400">{zones.length} zone(s)</p>
          </div>
          <div className="flex gap-2">
            {panel === 'list' && (
              <button onClick={() => ouvrirForm()}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-xl">
                + Nouvelle zone
              </button>
            )}
            <button onClick={onClose} className="text-gray-500 hover:text-white text-xl">✕</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* LISTE DES ZONES */}
          {panel === 'list' && (
            <div className="p-4 space-y-2">
              {loading ? (
                Array(3).fill(0).map((_,i) => <div key={i} className="h-16 bg-gray-800/50 rounded-xl animate-pulse"/>)
              ) : zones.length === 0 ? (
                <div className="text-center py-10">
                  <div className="text-4xl mb-2">🗺️</div>
                  <p className="text-gray-400 text-sm">Aucune zone créée</p>
                  <button onClick={() => ouvrirForm()}
                    className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm rounded-xl">
                    + Créer une zone
                  </button>
                </div>
              ) : zones.map((z: any) => {
                const col = TYPE_COLORS[z.type_zone] || '#3B82F6'
                return (
                  <div key={z.id} className="bg-gray-800 rounded-xl p-3 flex items-start gap-3">
                    <div className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                      style={{ background: col }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white text-sm font-medium truncate">{z.nom}</p>
                        {z.code && <span className="text-xs text-gray-500 font-mono">{z.code}</span>}
                      </div>
                      <div className="flex gap-3 mt-0.5 text-xs text-gray-400">
                        <span style={{color:col}}>{z.type_zone}</span>
                        {z.nb_logements != null && <span>🏠 {z.nb_logements} logements</span>}
                        {z.superficie_km2 != null && <span>📐 {Number(z.superficie_km2).toFixed(2)} km²</span>}
                        {!z.geom && <span className="text-orange-400">⚠️ Pas de géométrie</span>}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => ouvrirForm(z)}
                        className="p-1.5 bg-blue-900/50 text-blue-400 rounded-lg hover:bg-blue-900 text-xs">✏️</button>
                      <button onClick={() => supprimer(z.id)}
                        className="p-1.5 bg-red-900/50 text-red-400 rounded-lg hover:bg-red-900 text-xs">🗑️</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* FORMULAIRE ZONE */}
          {panel === 'form' && (
            <div className="p-4 space-y-4">
              {/* Infos de base */}
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Nom *</label>
                    <input value={form.nom} onChange={e => setForm(f=>({...f,nom:e.target.value}))}
                      placeholder="ex: Zone Cocody Nord"
                      className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-blue-500"/>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Code</label>
                    <input value={form.code} onChange={e => setForm(f=>({...f,code:e.target.value}))}
                      placeholder="ex: ZI-COC-N"
                      className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-blue-500"/>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Type</label>
                    <select value={form.type_zone} onChange={e => setForm(f=>({...f,type_zone:e.target.value}))}
                      className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-white text-xs outline-none">
                      {[['standard','Standard'],['prioritaire','Prioritaire'],['exclusion','Exclusion'],['gc','Génie Civil']].map(([v,l])=>(
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Capacité max EL</label>
                    <input type="number" value={form.capacite_max} onChange={e => setForm(f=>({...f,capacite_max:e.target.value}))}
                      placeholder="ex: 300"
                      className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm outline-none"/>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Commentaire</label>
                  <input value={form.commentaire} onChange={e => setForm(f=>({...f,commentaire:e.target.value}))}
                    className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm outline-none"/>
                </div>
              </div>

              {/* Dessin du périmètre */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-gray-300">📍 Périmètre géographique</label>
                  <div className="flex gap-1">
                    {drawPoints.length > 0 && (
                      <button onClick={() => setDrawPoints([])}
                        className="text-xs px-2 py-1 bg-red-900/50 text-red-400 rounded-lg hover:bg-red-900">
                        🗑️ Effacer
                      </button>
                    )}
                    {drawPoints.length > 0 && (
                      <button onClick={() => setDrawPoints(p => p.slice(0,-1))}
                        className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded-lg">↩</button>
                    )}
                  </div>
                </div>
                <div className="rounded-xl overflow-hidden border border-gray-600" style={{height:'220px'}}>
                  <MapContainer center={[5.3599,-4.0083]} zoom={12}
                    style={{height:'100%',width:'100%'}} zoomControl={false}>
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"/>
                    <ZoneDrawHandler onPoint={(pt:[number,number]) => setDrawPoints(ps => [...ps, pt])} />
                    {drawPoints.length >= 3 && (
                      <Polygon positions={drawPoints}
                        pathOptions={{color: TYPE_COLORS[form.type_zone]||'#3B82F6', fillOpacity:0.2, weight:2}}/>
                    )}
                    {drawPoints.map((pt, i) => (
                      <CircleMarker key={i} center={pt} radius={4}
                        pathOptions={{color: i===0?'#22C55E':'#3B82F6', fillOpacity:1, weight:2}}/>
                    ))}
                  </MapContainer>
                </div>
                <p className="text-xs mt-1 text-gray-500">
                  {drawPoints.length < 3
                    ? `Cliquez sur la carte pour définir le périmètre (${drawPoints.length} pts, min 3)`
                    : `✅ ${drawPoints.length} points — polygone prêt`}
                </p>
              </div>

              {/* Boutons */}
              <div className="flex gap-2">
                <button onClick={() => { setPanel('list'); setSelected(null); setDrawPoints([]) }}
                  className="flex-1 py-2.5 border border-gray-600 text-gray-300 rounded-xl text-sm">
                  Annuler
                </button>
                <button onClick={sauvegarder} disabled={saving || !form.nom}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl text-sm font-bold">
                  {saving ? '⏳...' : selected ? 'Mettre à jour' : 'Créer la zone'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


// ================================================================
// PANNEAU ITINÉRAIRES — Style Google Maps avec OSRM
// ================================================================
export function PanneauItineraires({ onClose, onRoute }: { 
  onClose: () => void
  onRoute?: (geojson: any) => void 
}) {
  const [itis,     setItis]     = useState<any[]>([])
  const [loading,  setLoading]  = useState(true)
  const [creating, setCreating] = useState(false)
  const [result,   setResult]   = useState<any>(null)
  const [noeuds,   setNoeuds]   = useState<any[]>([])
  const [mode,     setMode]     = useState<'gps'|'noeuds'>('gps')
  const [transport,setTransport]= useState<'driving'|'walking'>('driving')
  const [form, setForm] = useState({
    lat_depart:'', lng_depart:'', lat_arrivee:'', lng_arrivee:'',
    noeud_dep_id:'', noeud_arr_id:'',
    search_dep:'', search_arr:'',
    type_itineraire:'technicien_client', nom:''
  })

  useEffect(() => {
    charger()
    api.get('/noeuds-telecom').then(r => setNoeuds(r.data || [])).catch(() => {})
  }, [])

  const charger = async () => {
    setLoading(true)
    try { const r = await api.get('/itineraires'); setItis(r.data || []) } catch {}
    setLoading(false)
  }

  const maPosition = () => {
    if (!navigator.geolocation) return toast.error('GPS non disponible')
    navigator.geolocation.getCurrentPosition(
      pos => {
        setForm(f => ({...f,
          lat_depart: pos.coords.latitude.toFixed(6),
          lng_depart: pos.coords.longitude.toFixed(6)
        }))
        toast.success('📍 Position GPS captée')
      },
      err => toast.error('GPS: ' + err.message)
    )
  }

  const calculer = async () => {
    let payload: any = { type_itineraire: form.type_itineraire, nom: form.nom || undefined, mode: transport }

    if (mode === 'gps') {
      if (!form.lat_depart || !form.lng_depart || !form.lat_arrivee || !form.lng_arrivee)
        return toast.error('Saisissez les coordonnées de départ et d\'arrivée')
      payload = { ...payload,
        lat_depart: parseFloat(form.lat_depart),
        lng_depart: parseFloat(form.lng_depart),
        lat_arrivee: parseFloat(form.lat_arrivee),
        lng_arrivee: parseFloat(form.lng_arrivee)
      }
    } else {
      if (!form.noeud_dep_id || !form.noeud_arr_id)
        return toast.error('Sélectionnez les 2 équipements')
      payload = { ...payload,
        id_noeud_depart: form.noeud_dep_id,
        id_noeud_arrivee: form.noeud_arr_id,
        lat_depart: 0, lng_depart: 0, lat_arrivee: 0, lng_arrivee: 0
      }
    }

    setCreating(true)
    try {
      const r = await api.post('/itineraires/calculer', payload)
      setResult(r.data)
      // Afficher le tracé sur la carte
      if (onRoute && r.data.geojson) onRoute(r.data.geojson)
      charger()
      toast.success(`Route calculée — ${r.data.distance_route_m}m${r.data.duree_min ? ` · ${r.data.duree_min} min` : ''}`)
    } catch (e: any) {
      const msg = errMsg(e)
      if (msg.includes('network') || msg.includes('Network') || msg.includes('ERR_')) {
        toast.error('Erreur réseau — vérifiez votre connexion')
      } else {
        toast.error(msg || 'Erreur calcul itinéraire')
      }
    } finally { setCreating(false) }
  }

  const nDep = noeuds.find(n => n.id === form.noeud_dep_id)
  const nArr = noeuds.find(n => n.id === form.noeud_arr_id)

  const filtresDep = noeuds.filter(n =>
    n.id !== form.noeud_arr_id && (!form.search_dep || n.nom_unique?.toLowerCase().includes(form.search_dep.toLowerCase()))
  ).slice(0,6)
  const filtresArr = noeuds.filter(n =>
    n.id !== form.noeud_dep_id && (!form.search_arr || n.nom_unique?.toLowerCase().includes(form.search_arr.toLowerCase()))
  ).slice(0,6)

  const TYPE_ITINERAIRE = [
    { val:'technicien_client', label:'Technicien → Client' },
    { val:'technicien_pbo',    label:'Technicien → PBO' },
    { val:'technicien_pm',     label:'Technicien → PM' },
    { val:'pbo_el',            label:'PBO → Logement (EL)' },
    { val:'pm_pbo',            label:'PM → PBO' },
    { val:'sro_pm',            label:'SRO → PM' },
    { val:'nro_sro',           label:'NRO → SRO' },
    { val:'maintenance',       label:'Intervention maintenance' },
    { val:'urgence',           label:'🚨 Urgence réseau' },
  ]

  const formatDist = (m: number) => m >= 1000 ? `${(m/1000).toFixed(1)} km` : `${m} m`
  const formatDuree = (s: number) => {
    const m = Math.ceil(s/60)
    return m >= 60 ? `${Math.floor(m/60)}h${String(m%60).padStart(2,'0')}` : `${m} min`
  }

  return (
    <div className="fixed inset-0 z-[1500] bg-black/70 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-t-2xl md:rounded-2xl w-full md:max-w-lg max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">🧭</span>
            <div>
              <h2 className="font-bold text-white text-sm">Itinéraire réseau</h2>
              <p className="text-xs text-gray-400">Calcul route en temps réel</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Mode saisie */}
          <div className="p-4 space-y-3">
            
            {/* Toggle mode */}
            <div className="flex bg-gray-800 rounded-xl p-0.5">
              <button onClick={() => setMode('gps')}
                className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${mode==='gps' ? 'bg-gray-700 text-white' : 'text-gray-400'}`}>
                📍 GPS / Coordonnées
              </button>
              <button onClick={() => setMode('noeuds')}
                className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${mode==='noeuds' ? 'bg-gray-700 text-white' : 'text-gray-400'}`}>
                📡 Équipements réseau
              </button>
            </div>

            {/* Transport */}
            <div className="flex gap-2">
              {([['driving','🚗 Route'],['walking','🚶 À pied']] as const).map(([v,l]) => (
                <button key={v} onClick={() => setTransport(v)}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-medium transition-all ${transport===v ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                  {l}
                </button>
              ))}
            </div>

            {/* Type itinéraire */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Type d'intervention</label>
              <select value={form.type_itineraire} onChange={e => setForm(f => ({...f, type_itineraire:e.target.value}))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-xs outline-none">
                {TYPE_ITINERAIRE.map(t => <option key={t.val} value={t.val}>{t.label}</option>)}
              </select>
            </div>

            {/* Mode GPS */}
            {mode === 'gps' && (
              <div className="space-y-2">
                {/* Départ */}
                <div className="bg-gray-800 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-green-400">🟢 Départ</span>
                    <button onClick={maPosition} className="text-xs px-2 py-1 bg-green-800/50 text-green-400 rounded-lg hover:bg-green-700/50">
                      📍 Ma position
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input value={form.lat_depart} onChange={e => setForm(f=>({...f,lat_depart:e.target.value}))}
                      placeholder="Latitude (5.3599)"
                      className="bg-gray-700 border border-gray-600 rounded-xl px-2 py-1.5 text-white text-xs outline-none" />
                    <input value={form.lng_depart} onChange={e => setForm(f=>({...f,lng_depart:e.target.value}))}
                      placeholder="Longitude (-4.0083)"
                      className="bg-gray-700 border border-gray-600 rounded-xl px-2 py-1.5 text-white text-xs outline-none" />
                  </div>
                </div>
                
                {/* Échange départ/arrivée */}
                <div className="flex justify-center">
                  <button onClick={() => setForm(f => ({
                    ...f,
                    lat_depart:f.lat_arrivee, lng_depart:f.lng_arrivee,
                    lat_arrivee:f.lat_depart, lng_arrivee:f.lng_depart
                  }))} className="text-gray-500 hover:text-white text-lg">⇅</button>
                </div>

                {/* Arrivée */}
                <div className="bg-gray-800 rounded-xl p-3">
                  <span className="text-xs font-medium text-red-400 block mb-2">🔴 Arrivée / Équipement</span>
                  <div className="grid grid-cols-2 gap-2">
                    <input value={form.lat_arrivee} onChange={e => setForm(f=>({...f,lat_arrivee:e.target.value}))}
                      placeholder="Latitude"
                      className="bg-gray-700 border border-gray-600 rounded-xl px-2 py-1.5 text-white text-xs outline-none" />
                    <input value={form.lng_arrivee} onChange={e => setForm(f=>({...f,lng_arrivee:e.target.value}))}
                      placeholder="Longitude"
                      className="bg-gray-700 border border-gray-600 rounded-xl px-2 py-1.5 text-white text-xs outline-none" />
                  </div>
                </div>
              </div>
            )}

            {/* Mode nœuds */}
            {mode === 'noeuds' && (
              <div className="space-y-2">
                {/* Sélecteur nœud départ */}
                <div className="bg-gray-800 rounded-xl p-3">
                  <span className="text-xs font-medium text-green-400 block mb-2">🟢 Équipement de départ</span>
                  {nDep ? (
                    <div className="flex items-center gap-2 bg-green-900/20 border border-green-700/50 rounded-xl px-2 py-1.5">
                      <span className="text-xs font-mono bg-green-700 text-white px-1.5 rounded">{nDep.type_noeud}</span>
                      <span className="text-xs text-white flex-1 truncate">{nDep.nom_unique}</span>
                      <button onClick={() => setForm(f=>({...f,noeud_dep_id:''}))} className="text-gray-500 hover:text-white">✕</button>
                    </div>
                  ) : (
                    <div>
                      <input value={form.search_dep} onChange={e => setForm(f=>({...f,search_dep:e.target.value}))}
                        placeholder="Rechercher équipement réseau..."
                        className="w-full bg-gray-700 border border-gray-600 rounded-xl px-2 py-1.5 text-white text-xs outline-none mb-1" />
                      <div className="max-h-28 overflow-y-auto bg-gray-700 rounded-xl">
                        {filtresDep.map(n => (
                          <button key={n.id} onClick={() => setForm(f=>({...f,noeud_dep_id:n.id,search_dep:''}))}
                            className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-gray-600 text-left border-b border-gray-600 last:border-0">
                            <span className="text-xs font-mono bg-gray-600 px-1 rounded">{n.type_noeud}</span>
                            <span className="text-xs text-white truncate">{n.nom_unique}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-center">
                  <button onClick={() => setForm(f => ({
                    ...f,
                    noeud_dep_id:f.noeud_arr_id, noeud_arr_id:f.noeud_dep_id
                  }))} className="text-gray-500 hover:text-white text-lg">⇅</button>
                </div>

                <div className="bg-gray-800 rounded-xl p-3">
                  <span className="text-xs font-medium text-red-400 block mb-2">🔴 Équipement d'arrivée</span>
                  {nArr ? (
                    <div className="flex items-center gap-2 bg-red-900/20 border border-red-700/50 rounded-xl px-2 py-1.5">
                      <span className="text-xs font-mono bg-red-700 text-white px-1.5 rounded">{nArr.type_noeud}</span>
                      <span className="text-xs text-white flex-1 truncate">{nArr.nom_unique}</span>
                      <button onClick={() => setForm(f=>({...f,noeud_arr_id:''}))} className="text-gray-500 hover:text-white">✕</button>
                    </div>
                  ) : (
                    <div>
                      <input value={form.search_arr} onChange={e => setForm(f=>({...f,search_arr:e.target.value}))}
                        placeholder="PBO, PM, SRO, NRO..."
                        className="w-full bg-gray-700 border border-gray-600 rounded-xl px-2 py-1.5 text-white text-xs outline-none mb-1" />
                      <div className="max-h-28 overflow-y-auto bg-gray-700 rounded-xl">
                        {filtresArr.map(n => (
                          <button key={n.id} onClick={() => setForm(f=>({...f,noeud_arr_id:n.id,search_arr:''}))}
                            className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-gray-600 text-left border-b border-gray-600 last:border-0">
                            <span className="text-xs font-mono bg-gray-600 px-1 rounded">{n.type_noeud}</span>
                            <span className="text-xs text-white truncate">{n.nom_unique}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <button onClick={calculer} disabled={creating}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm">
              {creating ? '⏳ Calcul en cours...' : '🗺️ Calculer l\'itinéraire'}
            </button>

            {/* Résultat */}
            {result && (
              <div className="bg-blue-900/20 border border-blue-700/50 rounded-2xl overflow-hidden">
                {/* Résumé */}
                <div className="p-3 bg-blue-900/30 flex items-center gap-3">
                  <div className="text-center px-3 border-r border-blue-700/50">
                    <p className="text-lg font-bold text-white">{formatDist(result.distance_route_m)}</p>
                    <p className="text-xs text-blue-300">Distance</p>
                  </div>
                  {result.duree_min && (
                    <div className="text-center px-3 border-r border-blue-700/50">
                      <p className="text-lg font-bold text-white">{result.duree_min} min</p>
                      <p className="text-xs text-blue-300">Durée</p>
                    </div>
                  )}
                  <div className="flex-1 text-center">
                    <p className="text-xs text-blue-300">Nœuds réseau</p>
                    <p className="text-xs text-white font-medium">
                      {result.noeud_depart?.nom} → {result.noeud_arrivee?.nom}
                    </p>
                  </div>
                </div>

                {/* Instructions étape par étape */}
                {result.instructions && result.instructions.length > 0 && (
                  <div className="p-3 space-y-1">
                    <p className="text-xs font-semibold text-gray-400 mb-2">Instructions</p>
                    {result.instructions.map((step: any, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <span className="w-5 h-5 bg-blue-800 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 mt-0.5">
                          {i+1}
                        </span>
                        <div>
                          <span className="text-gray-200">
                            {step.name ? `${step.instruction} sur ${step.name}` : step.instruction || 'Continuer'}
                          </span>
                          <span className="text-gray-500 ml-2">{formatDist(step.distance_m)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!result.instructions?.length && (
                  <div className="px-3 pb-3">
                    <p className="text-xs text-yellow-400">ℹ️ Route tracée en ligne droite (OSRM indisponible)</p>
                    <p className="text-xs text-gray-400 mt-0.5">Distance directe: {formatDist(result.distance_directe_m)}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Historique */}
          <div className="px-4 pb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Historique ({itis.length})
            </p>
            {loading ? <div className="h-12 bg-gray-800/50 rounded-xl animate-pulse" />
            : itis.length === 0 ? <p className="text-xs text-gray-600 text-center py-3">Aucun itinéraire calculé</p>
            : itis.map((iti: any) => (
              <div key={iti.id} className="flex items-center gap-2 bg-gray-800 rounded-xl p-2.5 mb-1.5">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium truncate">{iti.nom || iti.id?.slice(0,8)}</p>
                  <p className="text-gray-400 text-xs">
                    {iti.type_itineraire?.replace(/_/g,' ')}
                    {iti.distance_m ? ` — ${formatDist(iti.distance_m)}` : ''}
                  </p>
                  {(iti.noeud_depart_nom || iti.noeud_arrivee_nom) && (
                    <p className="text-xs text-gray-500 truncate">
                      {iti.noeud_depart_nom} → {iti.noeud_arrivee_nom}
                    </p>
                  )}
                </div>
                <button onClick={async () => { await api.delete(`/itineraires/${iti.id}`); charger() }}
                  className="text-gray-600 hover:text-red-400 text-sm">🗑️</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}


export type { ZoneData }
