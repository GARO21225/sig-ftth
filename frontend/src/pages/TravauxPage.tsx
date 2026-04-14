import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Polygon, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import api from '@services/api'
import toast from 'react-hot-toast'
import { useAuthStore } from '@store/useStore'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const errMsg = (e: any) => {
  const d = e?.response?.data?.detail
  if (!d) return e?.message || 'Erreur'
  if (typeof d === 'string') return d
  if (Array.isArray(d)) return d.map((x:any) => x.msg || JSON.stringify(x)).join(', ')
  return String(d)
}

const STATUT_CFG: Record<string, { color: string; bg: string; label: string }> = {
  brouillon:  { color:'text-gray-400',   bg:'bg-gray-800',      label:'Brouillon' },
  planifie:   { color:'text-blue-400',   bg:'bg-blue-900/40',   label:'Planifié' },
  en_cours:   { color:'text-yellow-400', bg:'bg-yellow-900/40', label:'En cours' },
  suspendu:   { color:'text-orange-400', bg:'bg-orange-900/40', label:'Suspendu' },
  termine:    { color:'text-green-400',  bg:'bg-green-900/40',  label:'Terminé' },
  annule:     { color:'text-red-400',    bg:'bg-red-900/40',    label:'Annulé' },
}

const PRIO_COLOR: Record<string,string> = {
  basse:'text-gray-400', normale:'text-blue-400', haute:'text-orange-400', urgente:'text-red-400'
}

const NATURE_TRAVAUX = [
  'Génie Civil','Pose câble optique','Raccordement fibre','Maintenance préventive',
  'Maintenance corrective','Mise en service','Extension réseau','Remplacement équipement',
  'Audit réseau','Splice optique','Mesures OTDR','Pose fourreaux','Installation NRO',
  'Installation SRO','Installation PM','Installation PBO','Autre'
]

function MapCentre({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => { map.setView([lat, lng], 14) }, [lat, lng])
  return null
}

function makeOTIcon(statut: string) {
  const colors: Record<string, string> = {
    en_cours:'#F59E0B', planifie:'#3B82F6', termine:'#10B981', urgente:'#EF4444'
  }
  const c = colors[statut] || '#6B7280'
  return L.divIcon({
    html:`<div style="background:${c};width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.4)"></div>`,
    className:'', iconSize:[14,14], iconAnchor:[7,7]
  })
}

export default function TravauxPage() {
  const [ots,       setOts]       = useState<any[]>([])
  const [noeuds,    setNoeuds]    = useState<any[]>([])
  const [zones,     setZones]     = useState<any[]>([])
  const [loading,   setLoading]   = useState(true)
  const [view,      setView]      = useState<'liste'|'kanban'|'carte'>('liste')
  const [selected,  setSelected]  = useState<any>(null)
  const [showForm,  setShowForm]  = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [filtreStatut, setFiltreStatut] = useState('tous')
  const [search,    setSearch]    = useState('')
  const [form, setForm] = useState<any>({
    titre:'', description:'', type_travaux:'installation',
    nature_travaux:'Pose câble optique', priorite:'normale', statut:'planifie',
    prestataire:'', prestataire_contact:'', prestataire_zone:'',
    chef_equipe:'', equipe_membres_str:'',
    cout_estime:'', avancement_pct:0,
    date_debut_prevue:'', date_fin_prevue:'',
  })
  const { hasRole } = useAuthStore()
  const isAdmin = hasRole('admin','chef_projet')

  useEffect(() => { charger() }, [])

  const charger = async () => {
    setLoading(true)
    try {
      const [rOT, rN, rZ] = await Promise.allSettled([
        api.get('/travaux/ot?limit=200'),
        api.get('/noeuds-telecom'),
        api.get('/zones-influence'),
      ])
      if (rOT.status === 'fulfilled') setOts(rOT.value.data || [])
      if (rN.status === 'fulfilled') setNoeuds(rN.value.data || [])
      if (rZ.status === 'fulfilled') setZones(rZ.value.data || [])
    } catch (e: any) { toast.error(errMsg(e)) }
    finally { setLoading(false) }
  }

  const sauvegarder = async () => {
    if (!form.titre) return toast.error('Titre requis')
    setSaving(true)
    try {
      const payload = {
        ...form,
        equipe_membres: form.equipe_membres_str
          ? form.equipe_membres_str.split(',').map((s:string)=>s.trim()).filter(Boolean)
          : [],
        cout_estime: form.cout_estime ? parseFloat(form.cout_estime) : undefined,
        avancement_pct: parseInt(form.avancement_pct)||0,
        date_debut_prevue: form.date_debut_prevue || undefined,
        date_fin_prevue: form.date_fin_prevue || undefined,
      }
      if (selected) { await api.put(`/travaux/ot/${selected.id}`, payload); toast.success('OT mis à jour') }
      else { await api.post('/travaux/ot', payload); toast.success('OT créé') }
      setShowForm(false); setSelected(null); charger()
    } catch(e:any) { toast.error(errMsg(e)) }
    finally { setSaving(false) }
  }

  const changerStatut = async (ot: any, statut: string) => {
    if (!isAdmin) return toast.error('Droits admin requis')
    try { await api.put(`/travaux/ot/${ot.id}`, { statut }); charger() }
    catch(e:any) { toast.error(errMsg(e)) }
  }

  const supprimer = async (id: string) => {
    if (!isAdmin || !confirm('Supprimer cet OT ?')) return
    try { await api.delete(`/travaux/ot/${id}`); toast.success('OT supprimé'); charger() }
    catch(e:any) { toast.error(errMsg(e)) }
  }

  const ouvrirForm = (ot?: any) => {
    if (ot) {
      setSelected(ot)
      setForm({ ...ot, equipe_membres_str: ot.equipe_membres?.join(', ')||'', cout_estime:ot.cout_estime||'' })
    } else {
      setSelected(null)
      setForm({ titre:'', description:'', type_travaux:'installation', nature_travaux:'Pose câble optique',
        priorite:'normale', statut:'planifie', prestataire:'', prestataire_contact:'',
        prestataire_zone:'', chef_equipe:'', equipe_membres_str:'', cout_estime:'', avancement_pct:0,
        date_debut_prevue:'', date_fin_prevue:'' })
    }
    setShowForm(true)
  }

  const filtres = ots.filter(o => {
    const matchS = filtreStatut === 'tous' || o.statut === filtreStatut
    const q = search.toLowerCase()
    const matchQ = !q || o.numero_ot?.toLowerCase().includes(q) || o.titre?.toLowerCase().includes(q) || o.prestataire?.toLowerCase().includes(q)
    return matchS && matchQ
  })

  const stats = {
    total: ots.length,
    en_cours: ots.filter(o=>o.statut==='en_cours').length,
    planifie: ots.filter(o=>o.statut==='planifie').length,
    termine: ots.filter(o=>o.statut==='termine').length,
  }

  // OT avec géolocalisation pour la carte
  const otsGeo = ots.filter(o => o.latitude && o.longitude)
  const mapCenter: [number,number] = otsGeo.length > 0
    ? [otsGeo[0].latitude, otsGeo[0].longitude]
    : [5.3599, -4.0083]

  const ZONE_COLOR: Record<string,string> = {
    standard:'#3B82F6', prioritaire:'#10B981', exclusion:'#EF4444', gc:'#F59E0B'
  }

  return (
    <div className="h-full flex flex-col bg-gray-950">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900 flex-shrink-0">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-white">🔧 Ordres de Travail</h1>
          <div className="flex gap-3 text-xs text-gray-400 mt-0.5">
            <span>{stats.total} total</span>
            <span className="text-yellow-400">{stats.en_cours} en cours</span>
            <span className="text-blue-400">{stats.planifie} planifiés</span>
            <span className="text-green-400">{stats.termine} terminés</span>
          </div>
        </div>
        <div className="flex gap-1.5">
          <div className="flex bg-gray-800 rounded-xl p-0.5">
            {(['liste','kanban','carte'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-2.5 py-1.5 rounded-lg text-xs transition-all ${view===v?'bg-gray-700 text-white':'text-gray-400'}`}>
                {v==='liste'?'☰':v==='kanban'?'⬜':'🗺️'}
              </button>
            ))}
          </div>
          {isAdmin && (
            <button onClick={() => ouvrirForm()}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-xl">
              + OT
            </button>
          )}
        </div>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 px-4 py-2 border-b border-gray-800 flex-shrink-0 flex-wrap bg-gray-900/50">
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Rechercher..."
          className="flex-1 min-w-32 bg-gray-800 border border-gray-700 rounded-xl px-3 py-1.5 text-white text-xs outline-none placeholder-gray-600" />
        {['tous',...Object.keys(STATUT_CFG)].map(s => (
          <button key={s} onClick={() => setFiltreStatut(s)}
            className={`px-2.5 py-1.5 rounded-xl text-xs transition-all ${filtreStatut===s?'bg-blue-600 text-white':'bg-gray-800 text-gray-400 hover:text-white'}`}>
            {s==='tous'?'Tous':STATUT_CFG[s]?.label}
          </button>
        ))}
      </div>

      {/* CONTENU */}
      <div className="flex-1 overflow-hidden">
        {/* VUE CARTE */}
        {view === 'carte' && (
          <div className="h-full relative">
            <MapContainer center={mapCenter} zoom={12} className="h-full w-full">
              <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
              {mapCenter && <MapCentre lat={mapCenter[0]} lng={mapCenter[1]} />}

              {/* Zones d'influence */}
              {zones.map((z: any) => {
                if (!z.geom?.coordinates) return null
                const coords: [number,number][] = z.geom.coordinates[0]?.map(([lng,lat]:number[]) => [lat,lng])
                if (!coords) return null
                const col = ZONE_COLOR[z.type_zone] || '#3B82F6'
                return (
                  <Polygon key={z.id} positions={coords}
                    pathOptions={{ color:col, weight:2, fillOpacity:0.1 }}>
                    <Popup>
                      <div className="text-xs">
                        <b style={{color:col}}>{z.nom}</b><br/>
                        Type: {z.type_zone}<br/>
                        Clients: {z.nb_clients_actifs||0}
                      </div>
                    </Popup>
                  </Polygon>
                )
              })}

              {/* Nœuds télécom */}
              {noeuds.slice(0,200).map((n: any) => n.latitude && n.longitude && (
                <Marker key={n.id} position={[n.latitude, n.longitude]}
                  icon={L.divIcon({
                    html:`<div style="background:#3B82F6;width:8px;height:8px;border-radius:50%;border:1.5px solid white"></div>`,
                    className:'', iconSize:[8,8], iconAnchor:[4,4]
                  })}>
                  <Popup><div style={{fontSize:11}}><b>{n.nom_unique}</b><br/>{n.type_noeud}</div></Popup>
                </Marker>
              ))}

              {/* OT géolocalisés */}
              {otsGeo.map((ot: any) => (
                <Marker key={ot.id} position={[ot.latitude, ot.longitude]}
                  icon={makeOTIcon(ot.statut)}
                  eventHandlers={{ click: () => setSelected(ot) }}>
                  <Popup>
                    <div style={{fontSize:11,minWidth:160}}>
                      <b style={{color:STATUT_CFG[ot.statut]?.color||'#fff'}}>{ot.numero_ot}</b><br/>
                      {ot.titre}<br/>
                      <span style={{color:'#9CA3AF'}}>{ot.statut} · {ot.priorite}</span><br/>
                      {ot.prestataire && <span>🏢 {ot.prestataire}</span>}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>

            {/* Légende */}
            <div className="absolute bottom-4 right-4 z-[1000] bg-gray-900/95 border border-gray-700 rounded-xl p-3 text-xs">
              <p className="font-bold text-white mb-2">Légende</p>
              {[['En cours','#F59E0B'],['Planifié','#3B82F6'],['Terminé','#10B981'],['Nœud','#3B82F6']].map(([l,c])=>(
                <div key={l} className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{background:c}}/>
                  <span className="text-gray-300">{l}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 mt-1">
                <div className="w-8 h-1 rounded" style={{background:'#3B82F6', opacity:0.6}}/>
                <span className="text-gray-300">Zone influence</span>
              </div>
            </div>

            {/* Panel OT sélectionné */}
            {selected && (
              <div className="absolute top-4 right-4 z-[1000] w-64 bg-gray-900/98 border border-gray-700 rounded-2xl p-3 text-xs">
                <div className="flex justify-between mb-2">
                  <span className="font-bold text-white">{selected.numero_ot}</span>
                  <button onClick={()=>setSelected(null)} className="text-gray-500 hover:text-white">✕</button>
                </div>
                <p className="text-sm text-white font-medium mb-1">{selected.titre}</p>
                <div className={`text-xs px-2 py-0.5 rounded-lg w-fit mb-2 ${STATUT_CFG[selected.statut]?.bg} ${STATUT_CFG[selected.statut]?.color}`}>
                  {STATUT_CFG[selected.statut]?.label}
                </div>
                {selected.nature_travaux && <p className="text-gray-400">{selected.nature_travaux}</p>}
                {selected.prestataire && <p className="text-blue-400 mt-1">🏢 {selected.prestataire}</p>}
                {selected.prestataire_zone && <p className="text-gray-400">📍 {selected.prestataire_zone}</p>}
                {selected.chef_equipe_nom && <p className="text-gray-300 mt-1">👑 {selected.chef_equipe_nom}</p>}
                {isAdmin && (
                  <button onClick={() => ouvrirForm(selected)}
                    className="mt-2 w-full py-1.5 bg-blue-600 text-white rounded-xl text-xs font-medium">
                    ✏️ Modifier
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* VUE LISTE */}
        {view === 'liste' && (
          <div className="h-full overflow-auto p-4">
            {loading ? (
              Array(3).fill(0).map((_,i)=><div key={i} className="h-24 bg-gray-800/50 rounded-xl animate-pulse mb-3"/>)
            ) : filtres.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-3">🔧</div>
                <p className="text-gray-400">Aucun OT trouvé</p>
                {isAdmin && <button onClick={()=>ouvrirForm()} className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm rounded-xl">+ Créer un OT</button>}
              </div>
            ) : filtres.map(ot => {
              const cfg = STATUT_CFG[ot.statut] || STATUT_CFG.brouillon
              return (
                <div key={ot.id} className="bg-gray-900 border border-gray-700 hover:border-gray-600 rounded-2xl p-4 mb-3 transition-all">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono text-xs text-gray-400 bg-gray-800 px-2 py-0.5 rounded-lg">{ot.numero_ot}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-lg ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                        <span className={`text-xs ${PRIO_COLOR[ot.priorite]}`}>● {ot.priorite}</span>
                      </div>
                      <h3 className="text-white font-semibold">{ot.titre}</h3>
                      {ot.description && <p className="text-gray-400 text-xs mt-0.5 line-clamp-1">{ot.description}</p>}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {isAdmin && <>
                        <button onClick={()=>ouvrirForm(ot)} className="p-1.5 bg-blue-900/50 text-blue-400 rounded-lg hover:bg-blue-900 text-xs">✏️</button>
                        <button onClick={()=>supprimer(ot.id)} className="p-1.5 bg-red-900/50 text-red-400 rounded-lg hover:bg-red-900 text-xs">🗑️</button>
                      </>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
                    <div className="bg-gray-800 rounded-xl p-2">
                      <p className="text-xs text-gray-500">Nature</p>
                      <p className="text-xs font-medium text-white">{ot.nature_travaux||ot.type_travaux||'—'}</p>
                    </div>
                    <div className="bg-gray-800 rounded-xl p-2">
                      <p className="text-xs text-gray-500">Prestataire</p>
                      <p className="text-xs font-medium text-white truncate">{ot.prestataire||'—'}</p>
                    </div>
                    <div className="bg-gray-800 rounded-xl p-2">
                      <p className="text-xs text-gray-500">Zone</p>
                      <p className="text-xs font-medium text-white truncate">{ot.prestataire_zone||'—'}</p>
                    </div>
                    <div className="bg-gray-800 rounded-xl p-2">
                      <p className="text-xs text-gray-500">Période</p>
                      <p className="text-xs text-white">
                        {ot.date_debut_prevue?new Date(ot.date_debut_prevue).toLocaleDateString('fr-FR'):'?'}
                        {' → '}{ot.date_fin_prevue?new Date(ot.date_fin_prevue).toLocaleDateString('fr-FR'):'?'}
                      </p>
                    </div>
                  </div>
                  {(ot.chef_equipe_nom||(ot.equipe_membres?.length>0)) && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {ot.chef_equipe_nom && <span className="text-xs px-2 py-0.5 bg-blue-900/40 text-blue-300 rounded-lg border border-blue-700/40">👑 {ot.chef_equipe_nom}</span>}
                      {ot.equipe_membres?.map((m:string,i:number)=>(
                        <span key={i} className="text-xs px-2 py-0.5 bg-gray-800 text-gray-300 rounded-lg">{m}</span>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">Avancement</span>
                        <span className="text-white font-bold">{ot.avancement_pct||0}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${(ot.avancement_pct||0)>=100?'bg-green-500':'bg-blue-500'}`}
                          style={{width:`${ot.avancement_pct||0}%`}}/>
                      </div>
                    </div>
                    {isAdmin && (
                      <select value={ot.statut} onChange={e=>changerStatut(ot,e.target.value)}
                        className="bg-gray-800 border border-gray-600 rounded-xl px-2 py-1 text-white text-xs outline-none">
                        {Object.entries(STATUT_CFG).map(([k,v])=>(
                          <option key={k} value={k}>{v.label}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* VUE KANBAN */}
        {view === 'kanban' && (
          <div className="h-full overflow-x-auto p-4">
            <div className="flex gap-3 h-full min-w-max">
              {Object.entries(STATUT_CFG).map(([statut, cfg]) => {
                const items = filtres.filter(o => o.statut === statut)
                return (
                  <div key={statut} className="w-52 flex-shrink-0">
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl mb-2 ${cfg.bg}`}>
                      <span className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</span>
                      <span className="ml-auto text-xs text-gray-500">{items.length}</span>
                    </div>
                    <div className="space-y-2">
                      {items.map(ot => (
                        <div key={ot.id} onClick={()=>ouvrirForm(ot)}
                          className="bg-gray-900 border border-gray-700 hover:border-gray-500 rounded-xl p-2.5 cursor-pointer text-xs">
                          <p className="text-gray-400 font-mono text-xs">{ot.numero_ot}</p>
                          <p className="text-white font-medium truncate mt-0.5">{ot.titre}</p>
                          {ot.nature_travaux && <p className="text-gray-500 mt-1 truncate">{ot.nature_travaux}</p>}
                          {ot.prestataire && <p className="text-blue-400 mt-1 truncate">🏢 {ot.prestataire}</p>}
                          <div className={`mt-1 text-xs ${PRIO_COLOR[ot.priorite]}`}>● {ot.priorite}</div>
                          <div className="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{width:`${ot.avancement_pct||0}%`}}/>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* FORMULAIRE OT */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-900 border-b border-gray-700 px-5 py-4 flex items-center justify-between">
              <h2 className="font-bold text-white">{selected?'✏️ Modifier OT':'+ Nouvel OT'}</h2>
              <button onClick={()=>{setShowForm(false);setSelected(null)}} className="text-gray-400 hover:text-white text-xl">✕</button>
            </div>
            <div className="p-5 space-y-4">
              {/* Section 1 */}
              <div>
                <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">1. Informations générales</h3>
                <div className="space-y-2">
                  <input value={form.titre} onChange={e=>setForm((f:any)=>({...f,titre:e.target.value}))}
                    placeholder="Titre *" className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-blue-500"/>
                  <textarea value={form.description} onChange={e=>setForm((f:any)=>({...f,description:e.target.value}))}
                    rows={2} placeholder="Description"
                    className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm outline-none resize-none"/>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Nature *</label>
                      <select value={form.nature_travaux} onChange={e=>setForm((f:any)=>({...f,nature_travaux:e.target.value}))}
                        className="w-full bg-gray-800 border border-gray-600 rounded-xl px-2 py-2 text-white text-xs outline-none">
                        {NATURE_TRAVAUX.map(n=><option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Priorité</label>
                      <select value={form.priorite} onChange={e=>setForm((f:any)=>({...f,priorite:e.target.value}))}
                        className="w-full bg-gray-800 border border-gray-600 rounded-xl px-2 py-2 text-white text-xs outline-none">
                        {['basse','normale','haute','urgente'].map(p=><option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Statut</label>
                      <select value={form.statut} onChange={e=>setForm((f:any)=>({...f,statut:e.target.value}))}
                        className="w-full bg-gray-800 border border-gray-600 rounded-xl px-2 py-2 text-white text-xs outline-none">
                        {Object.entries(STATUT_CFG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2 - Prestataire */}
              <div>
                <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-2">2. Prestataire</h3>
                <div className="grid grid-cols-3 gap-2">
                  {[['prestataire','Nom prestataire'],['prestataire_contact','Contact'],['prestataire_zone','Zone intervention']].map(([f,l])=>(
                    <div key={f}>
                      <label className="block text-xs text-gray-400 mb-1">{l}</label>
                      <input value={form[f]||''} onChange={e=>setForm((x:any)=>({...x,[f]:e.target.value}))}
                        className="w-full bg-gray-800 border border-gray-600 rounded-xl px-2 py-2 text-white text-xs outline-none"/>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 3 - Équipe */}
              <div>
                <h3 className="text-xs font-bold text-green-400 uppercase tracking-wider mb-2">3. Équipe terrain</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Chef d'équipe</label>
                    <input value={form.chef_equipe||''} onChange={e=>setForm((f:any)=>({...f,chef_equipe:e.target.value}))}
                      placeholder="KOUAME Jean" className="w-full bg-gray-800 border border-gray-600 rounded-xl px-2 py-2 text-white text-xs outline-none"/>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Membres (séparés virgule)</label>
                    <input value={form.equipe_membres_str||''} onChange={e=>setForm((f:any)=>({...f,equipe_membres_str:e.target.value}))}
                      placeholder="BAMBA A., COULIBALY M." className="w-full bg-gray-800 border border-gray-600 rounded-xl px-2 py-2 text-white text-xs outline-none"/>
                  </div>
                </div>
              </div>

              {/* Section 4 - Planning */}
              <div>
                <h3 className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-2">4. Planning</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Avancement %</label>
                    <input type="number" min={0} max={100} value={form.avancement_pct||0}
                      onChange={e=>setForm((f:any)=>({...f,avancement_pct:parseInt(e.target.value)||0}))}
                      className="w-full bg-gray-800 border border-gray-600 rounded-xl px-2 py-2 text-white text-sm outline-none"/>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Coût FCFA</label>
                    <input type="number" value={form.cout_estime||''} onChange={e=>setForm((f:any)=>({...f,cout_estime:e.target.value}))}
                      className="w-full bg-gray-800 border border-gray-600 rounded-xl px-2 py-2 text-white text-sm outline-none"/>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Date début</label>
                    <input type="date" value={form.date_debut_prevue||''} onChange={e=>setForm((f:any)=>({...f,date_debut_prevue:e.target.value}))}
                      className="w-full bg-gray-800 border border-gray-600 rounded-xl px-2 py-2 text-white text-sm outline-none"/>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Date fin</label>
                    <input type="date" value={form.date_fin_prevue||''} onChange={e=>setForm((f:any)=>({...f,date_fin_prevue:e.target.value}))}
                      className="w-full bg-gray-800 border border-gray-600 rounded-xl px-2 py-2 text-white text-sm outline-none"/>
                  </div>
                </div>
              </div>
            </div>
            <div className="sticky bottom-0 bg-gray-900 border-t border-gray-700 px-5 py-4 flex gap-3">
              <button onClick={()=>{setShowForm(false);setSelected(null)}}
                className="flex-1 py-2.5 border border-gray-600 text-gray-300 rounded-xl text-sm">Annuler</button>
              <button onClick={sauvegarder} disabled={saving}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl text-sm font-bold">
                {saving?'⏳...':selected?'Mettre à jour':'Créer l\'OT'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
