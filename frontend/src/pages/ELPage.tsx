import { useState, useEffect, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
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
  if (Array.isArray(d)) return d.map((x: any) => x.msg || JSON.stringify(x)).join(', ')
  return String(d)
}

const STATUT_COLOR: Record<string, string> = {
  raccorde: 'text-green-400 bg-green-900/30',
  raccordable: 'text-blue-400 bg-blue-900/30',
  non_raccordable: 'text-red-400 bg-red-900/30',
  en_attente: 'text-yellow-400 bg-yellow-900/30',
}

const TYPE_LOGEMENT = ['VILLA_SIMPLE','VILLA_DUPLEX','VILLA_TRIPLEX','COURS_COMMUNE','MAISON_BASSE','IMM_RESIDENTIEL','RESIDENCE','BUNGALOW']

function MapClickHandler({ onMapClick }: { onMapClick: (p:[number,number]) => void }) {
  useMapEvents({ click(e) { onMapClick([e.latlng.lat, e.latlng.lng]) } })
  return null
}

const DRAFT_ICON = L.divIcon({
  html:'<div style="background:#f59e0b;width:20px;height:20px;border-radius:50%;border:3px solid white;box-shadow:0 0 0 3px #f59e0b66"></div>',
  className:'', iconSize:[20,20], iconAnchor:[10,10]
})
const LIST_ICON = L.divIcon({
  html:'<div style="background:#3b82f6;width:12px;height:12px;border-radius:50%;border:2px solid white"></div>',
  className:'', iconSize:[12,12], iconAnchor:[6,6]
})

export default function ELPage() {
  const [logements, setLogements] = useState<any[]>([])
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [panel,     setPanel]     = useState<'list'|'form'|'import'>('list')
  const [search,    setSearch]    = useState('')
  const [filtreStatut, setFiltreStatut] = useState('tous')
  const [selected,  setSelected]  = useState<any>(null)
  const [draftPos,  setDraftPos]  = useState<[number,number]|null>(null)
  const [mapMode,   setMapMode]   = useState(false)
  const [page,      setPage]      = useState(1)
  const [csvText,   setCsvText]   = useState('')
  const PER = 40
  const { hasRole } = useAuthStore()
  const isAdmin = hasRole('admin','chef_projet','technicien')

  const EMPTY_FORM = {
    nom_unique:'', adresse:'', commune:'', quartier:'', type_logement:'VILLA_SIMPLE',
    statut_ftth:'raccordable', nb_el_reel:1, nb_el_raccordables:1, nb_el_raccordes:0,
    latitude:'', longitude:''
  }
  const [form, setForm] = useState<any>(EMPTY_FORM)

  useEffect(() => { charger() }, [])

  const charger = async () => {
    setLoading(true)
    try { const r = await api.get('/logements?limit=2000'); setLogements(r.data || []) }
    catch { toast.error('Erreur chargement') }
    finally { setLoading(false) }
  }

  const sauvegarder = async () => {
    if (!form.nom_unique) return toast.error('Nom unique requis')
    const payload = {
      ...form,
      nb_el_reel: parseInt(form.nb_el_reel)||1,
      nb_el_raccordables: parseInt(form.nb_el_raccordables)||1,
      nb_el_raccordes: parseInt(form.nb_el_raccordes)||0,
      latitude: draftPos ? draftPos[0] : parseFloat(form.latitude)||undefined,
      longitude: draftPos ? draftPos[1] : parseFloat(form.longitude)||undefined,
    }
    setSaving(true)
    try {
      if (selected) { await api.put(`/logements/${selected.id}`, payload); toast.success('Logement mis à jour') }
      else { await api.post('/logements', payload); toast.success(`${form.nom_unique} créé`) }
      setPanel('list'); setSelected(null); setForm(EMPTY_FORM); setDraftPos(null); charger()
    } catch (e: any) { toast.error(errMsg(e)) }
    finally { setSaving(false) }
  }

  const supprimer = async (id: string) => {
    if (!confirm('Supprimer ce logement ?')) return
    try { await api.delete(`/logements/${id}`); toast.success('Supprimé'); charger() }
    catch (e: any) { toast.error(errMsg(e)) }
  }

  const ouvrirEdit = (l: any) => {
    setSelected(l); setDraftPos(l.latitude && l.longitude ? [l.latitude, l.longitude] : null)
    setForm({ ...l, latitude: l.latitude||'', longitude: l.longitude||'' })
    setPanel('form')
  }

  const ouvrirNouveau = () => {
    setSelected(null); setForm(EMPTY_FORM); setDraftPos(null); setPanel('form')
  }

  const importerCSV = async () => {
    const lines = csvText.trim().split('\n').filter(l => l.trim())
    if (lines.length < 2) return toast.error('CSV invalide (entête + données)')
    const headers = lines[0].split(',').map(h => h.trim())
    let ok = 0
    for (const line of lines.slice(1)) {
      const vals = line.split(',').map(v => v.trim())
      const obj: any = {}
      headers.forEach((h, i) => { obj[h] = vals[i] || '' })
      try {
        await api.post('/logements', {
          nom_unique: obj.nom_unique || obj.NOM || '',
          adresse: obj.adresse || obj.ADRESSE || '',
          commune: obj.commune || obj.COMMUNE || '',
          nb_el_reel: parseInt(obj.nb_el_reel||obj.EL||'1')||1,
          nb_el_raccordables: parseInt(obj.nb_el_raccordables||'1')||1,
          statut_ftth: obj.statut_ftth||'raccordable',
          latitude: parseFloat(obj.latitude||obj.LAT||'0')||undefined,
          longitude: parseFloat(obj.longitude||obj.LNG||obj.LON||'0')||undefined,
        })
        ok++
      } catch {}
    }
    toast.success(`${ok} logements importés`); setCsvText(''); setPanel('list'); charger()
  }

  const filtres = logements.filter(l => {
    const matchStatut = filtreStatut === 'tous' || l.statut_ftth === filtreStatut
    const q = search.toLowerCase()
    const matchSearch = !q || l.nom_unique?.toLowerCase().includes(q) || l.adresse?.toLowerCase().includes(q) || l.commune?.toLowerCase().includes(q)
    return matchStatut && matchSearch
  })

  const paginated = filtres.slice((page-1)*PER, page*PER)
  const totalPages = Math.ceil(filtres.length/PER)
  const totalEL = logements.reduce((s,l)=>s+(l.nb_el_reel||0),0)
  const totalRacc = logements.reduce((s,l)=>s+(l.nb_el_raccordables||0),0)
  const totalDone = logements.reduce((s,l)=>s+(l.nb_el_raccordes||0),0)
  const tauxPen = totalRacc > 0 ? Math.round(totalDone/totalRacc*100) : 0

  const logWithGPS = logements.filter(l => l.latitude && l.longitude)

  return (
    <div className="h-full flex bg-gray-950">
      {/* SIDEBAR GAUCHE */}
      <div className="w-80 flex-shrink-0 border-r border-gray-800 flex flex-col bg-gray-900">
        {/* Header sidebar */}
        <div className="px-4 py-3 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <h1 className="font-bold text-white text-sm">🏠 Table EL</h1>
            {isAdmin && (
              <div className="flex gap-1">
                <button onClick={ouvrirNouveau}
                  className={`px-2 py-1 rounded-lg text-xs transition-all ${panel==='form' && !selected ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
                  + Créer
                </button>
                <button onClick={() => setPanel('import')}
                  className={`px-2 py-1 rounded-lg text-xs transition-all ${panel==='import' ? 'bg-green-700 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
                  📥 CSV
                </button>
              </div>
            )}
          </div>

          {/* KPI mini */}
          <div className="grid grid-cols-2 gap-1.5 mt-3">
            <div className="bg-gray-800 rounded-lg px-2 py-1.5 text-center">
              <div className="text-sm font-bold text-white">{logements.length}</div>
              <div className="text-xs text-gray-400">Logements</div>
            </div>
            <div className="bg-gray-800 rounded-lg px-2 py-1.5 text-center">
              <div className="text-sm font-bold text-blue-400">{totalEL}</div>
              <div className="text-xs text-gray-400">Total EL</div>
            </div>
            <div className="bg-gray-800 rounded-lg px-2 py-1.5 text-center">
              <div className="text-sm font-bold text-green-400">{totalDone}</div>
              <div className="text-xs text-gray-400">Raccordés</div>
            </div>
            <div className="bg-gray-800 rounded-lg px-2 py-1.5 text-center">
              <div className="text-sm font-bold text-orange-400">{tauxPen}%</div>
              <div className="text-xs text-gray-400">Taux pén.</div>
            </div>
          </div>

          {/* Barre pénétration */}
          <div className="mt-2 h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full" style={{ width:`${Math.min(tauxPen,100)}%` }} />
          </div>
        </div>

        {/* Filtres */}
        <div className="px-3 py-2 border-b border-gray-800 space-y-2">
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="🔍 Rechercher..."
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-1.5 text-white text-xs outline-none focus:border-blue-500 placeholder-gray-600" />
          <div className="flex gap-1 flex-wrap">
            {['tous','raccorde','raccordable','non_raccordable','en_attente'].map(s => (
              <button key={s} onClick={() => { setFiltreStatut(s); setPage(1) }}
                className={`px-2 py-0.5 rounded-lg text-xs transition-all ${filtreStatut===s ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
                {s === 'tous' ? 'Tous' : s.replace('_',' ')}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500">{filtres.length} résultat(s)</p>
        </div>

        {/* Liste */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-800">
          {loading ? (
            Array(5).fill(0).map((_,i) => <div key={i} className="h-14 bg-gray-800/30 animate-pulse m-2 rounded-xl" />)
          ) : paginated.map(l => (
            <div key={l.id}
              onClick={() => { setPanel('list'); setSelected(selected?.id === l.id ? null : l) }}
              className={`px-3 py-2.5 cursor-pointer hover:bg-gray-800 transition-all ${selected?.id === l.id ? 'bg-gray-800 border-l-2 border-blue-500' : ''}`}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-white truncate flex-1">{l.nom_unique}</p>
                <span className={`text-xs px-1.5 py-0.5 rounded-md ml-1 flex-shrink-0 ${STATUT_COLOR[l.statut_ftth] || 'text-gray-400 bg-gray-800'}`}>
                  {l.nb_el_reel}EL
                </span>
              </div>
              <p className="text-xs text-gray-400 truncate mt-0.5">{l.commune || l.adresse || '—'}</p>
              {selected?.id === l.id && isAdmin && (
                <div className="flex gap-1 mt-1.5">
                  <button onClick={e => { e.stopPropagation(); ouvrirEdit(l) }}
                    className="flex-1 py-1 bg-blue-900/50 text-blue-400 rounded-lg text-xs hover:bg-blue-900">✏️ Modifier</button>
                  <button onClick={e => { e.stopPropagation(); supprimer(l.id) }}
                    className="px-2 py-1 bg-red-900/50 text-red-400 rounded-lg text-xs hover:bg-red-900">🗑️</button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-gray-800 px-3 py-2 flex items-center justify-between">
            <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}
              className="text-xs text-gray-400 hover:text-white disabled:opacity-30">← Préc</button>
            <span className="text-xs text-gray-500">{page}/{totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages}
              className="text-xs text-gray-400 hover:text-white disabled:opacity-30">Suiv →</button>
          </div>
        )}
      </div>

      {/* ZONE PRINCIPALE */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toggle vue */}
        {panel === 'list' && (
          <>
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-900 border-b border-gray-800 flex-shrink-0">
              <button onClick={() => setMapMode(false)}
                className={`px-3 py-1.5 rounded-xl text-xs transition-all ${!mapMode ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}>
                📋 Tableau
              </button>
              <button onClick={() => setMapMode(true)}
                className={`px-3 py-1.5 rounded-xl text-xs transition-all ${mapMode ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}>
                🗺️ Carte ({logWithGPS.length} localisés)
              </button>
              {selected && (
                <div className="ml-auto text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded-lg">
                  Sélectionné: <span className="text-white">{selected.nom_unique}</span>
                </div>
              )}
            </div>

            {/* Tableau */}
            {!mapMode && (
              <div className="flex-1 overflow-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-gray-900 border-b border-gray-700">
                    <tr>
                      {['Nom unique','Commune','Type','EL réels','Raccordables','Raccordés','Statut'].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-gray-400 font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {paginated.map(l => (
                      <tr key={l.id}
                        onClick={() => setSelected(selected?.id === l.id ? null : l)}
                        className={`cursor-pointer transition-colors hover:bg-gray-800/50 ${selected?.id === l.id ? 'bg-gray-800' : ''}`}>
                        <td className="px-3 py-2 text-white font-medium">{l.nom_unique}</td>
                        <td className="px-3 py-2 text-gray-300">{l.commune || '—'}</td>
                        <td className="px-3 py-2 text-gray-400">{l.type_logement?.replace('_',' ') || '—'}</td>
                        <td className="px-3 py-2 text-blue-400 font-bold text-center">{l.nb_el_reel||0}</td>
                        <td className="px-3 py-2 text-yellow-400 font-bold text-center">{l.nb_el_raccordables||0}</td>
                        <td className="px-3 py-2 text-green-400 font-bold text-center">{l.nb_el_raccordes||0}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded-md text-xs ${STATUT_COLOR[l.statut_ftth] || 'text-gray-400 bg-gray-800'}`}>
                            {l.statut_ftth}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Carte */}
            {mapMode && (
              <div className="flex-1 relative">
                <MapContainer center={[5.3599,-4.0083]} zoom={13} className="h-full w-full">
                  <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                  {logWithGPS.map(l => (
                    <Marker key={l.id} position={[l.latitude, l.longitude]} icon={LIST_ICON}
                      eventHandlers={{ click: () => setSelected(l) }}>
                    </Marker>
                  ))}
                  {selected?.latitude && selected?.longitude && (
                    <Marker position={[selected.latitude, selected.longitude]} />
                  )}
                </MapContainer>
                {selected && (
                  <div className="absolute bottom-4 left-4 z-[1000] bg-gray-900/95 border border-gray-700 rounded-xl p-3 max-w-xs">
                    <p className="text-sm font-bold text-white">{selected.nom_unique}</p>
                    <p className="text-xs text-gray-400">{selected.commune} · {selected.type_logement}</p>
                    <div className="flex gap-2 mt-1 text-xs">
                      <span className="text-blue-400">{selected.nb_el_reel} EL</span>
                      <span className="text-green-400">{selected.nb_el_raccordes} raccordés</span>
                      <span className={STATUT_COLOR[selected.statut_ftth]?.split(' ')[0]}>{selected.statut_ftth}</span>
                    </div>
                    {isAdmin && (
                      <button onClick={() => ouvrirEdit(selected)} className="mt-2 w-full py-1 bg-blue-600 text-white rounded-lg text-xs">✏️ Modifier</button>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* FORMULAIRE DE CRÉATION/ÉDITION */}
        {panel === 'form' && (
          <div className="flex-1 overflow-auto">
            <div className="flex h-full">
              {/* Formulaire gauche */}
              <div className="w-96 flex-shrink-0 overflow-y-auto border-r border-gray-800 bg-gray-900">
                <div className="sticky top-0 bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
                  <h2 className="font-bold text-white text-sm">{selected ? '✏️ Modifier' : '+ Nouveau logement'}</h2>
                  <button onClick={() => { setPanel('list'); setSelected(null); setDraftPos(null) }} className="text-gray-400 hover:text-white">✕</button>
                </div>
                <div className="p-4 space-y-3">
                  {[
                    ['nom_unique','Nom unique *','text','ex: LOG-COC-042'],
                    ['adresse','Adresse','text','ex: 24 rue des Jardins'],
                    ['commune','Commune','text','ex: Cocody'],
                    ['quartier','Quartier','text','ex: Angré'],
                  ].map(([f,l,t,p]) => (
                    <div key={f}>
                      <label className="block text-xs text-gray-400 mb-1">{l}</label>
                      <input type={t} value={form[f]||''} placeholder={p}
                        onChange={e => setForm((x: any) => ({...x, [f]:e.target.value}))}
                        className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-blue-500" />
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Type logement</label>
                    <select value={form.type_logement||'VILLA_SIMPLE'} onChange={e => setForm((x: any) => ({...x, type_logement:e.target.value}))}
                      className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm outline-none">
                      {TYPE_LOGEMENT.map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Statut FTTH</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {['raccordable','raccorde','non_raccordable','en_attente'].map(s => (
                        <button key={s} onClick={() => setForm((x: any) => ({...x, statut_ftth:s}))}
                          className={`py-1.5 rounded-xl text-xs transition-all ${form.statut_ftth===s ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                          {s.replace(/_/g,' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[['nb_el_reel','EL réels'],['nb_el_raccordables','Raccordables'],['nb_el_raccordes','Raccordés']].map(([f,l]) => (
                      <div key={f}>
                        <label className="block text-xs text-gray-400 mb-1">{l}</label>
                        <input type="number" min={0} value={form[f]||0}
                          onChange={e => setForm((x: any) => ({...x, [f]:parseInt(e.target.value)||0}))}
                          className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm outline-none text-center" />
                      </div>
                    ))}
                  </div>

                  {/* Position GPS */}
                  <div className="bg-gray-800 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-gray-300">📍 Position GPS</label>
                      {draftPos && (
                        <span className="text-xs text-green-400">✅ Sélectionnée</span>
                      )}
                    </div>
                    {draftPos ? (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-gray-700 rounded-lg px-2 py-1.5 text-center">
                          <div className="text-gray-400">Lat</div>
                          <div className="text-white font-mono">{draftPos[0].toFixed(6)}</div>
                        </div>
                        <div className="bg-gray-700 rounded-lg px-2 py-1.5 text-center">
                          <div className="text-gray-400">Lng</div>
                          <div className="text-white font-mono">{draftPos[1].toFixed(6)}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Latitude</label>
                          <input type="number" step="0.000001" value={form.latitude||''} placeholder="5.3599"
                            onChange={e => setForm((x: any) => ({...x, latitude:e.target.value}))}
                            className="w-full bg-gray-700 border border-gray-600 rounded-xl px-2 py-1.5 text-white text-xs outline-none" />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Longitude</label>
                          <input type="number" step="0.000001" value={form.longitude||''} placeholder="-4.0083"
                            onChange={e => setForm((x: any) => ({...x, longitude:e.target.value}))}
                            className="w-full bg-gray-700 border border-gray-600 rounded-xl px-2 py-1.5 text-white text-xs outline-none" />
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      {draftPos ? <button onClick={() => setDraftPos(null)} className="text-red-400 hover:text-red-300">✕ Effacer position</button>
                        : '→ Ou cliquez sur la carte à droite'}
                    </p>
                  </div>
                </div>
                <div className="sticky bottom-0 bg-gray-900 border-t border-gray-800 p-4 flex gap-2">
                  <button onClick={() => { setPanel('list'); setSelected(null); setDraftPos(null) }}
                    className="flex-1 py-2 border border-gray-600 text-gray-300 rounded-xl text-sm">Annuler</button>
                  <button onClick={sauvegarder} disabled={saving}
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl text-sm font-bold">
                    {saving ? '⏳...' : selected ? 'Mettre à jour' : 'Créer'}
                  </button>
                </div>
              </div>

              {/* Carte pour position */}
              <div className="flex-1 relative">
                <div className="absolute top-3 left-3 z-[1000] bg-gray-900/90 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white">
                  📍 Cliquez sur la carte pour placer le logement
                </div>
                <MapContainer center={draftPos || [5.3599,-4.0083]} zoom={14} className="h-full w-full">
                  <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                  <MapClickHandler onMapClick={p => setDraftPos(p)} />
                  {draftPos && <Marker position={draftPos} icon={DRAFT_ICON} />}
                  {logWithGPS.slice(0,100).map(l => (
                    <Marker key={l.id} position={[l.latitude, l.longitude]} icon={LIST_ICON} />
                  ))}
                </MapContainer>
              </div>
            </div>
          </div>
        )}

        {/* IMPORT CSV */}
        {panel === 'import' && (
          <div className="flex-1 overflow-auto p-6">
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-white text-lg">📥 Import CSV</h2>
                <button onClick={() => setPanel('list')} className="text-gray-400 hover:text-white">✕</button>
              </div>
              <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 space-y-4">
                <div>
                  <p className="text-sm font-medium text-white mb-2">Format attendu (entête obligatoire)</p>
                  <code className="block bg-gray-800 rounded-xl p-3 text-xs text-green-400 font-mono overflow-x-auto">
                    nom_unique,adresse,commune,nb_el_reel,nb_el_raccordables,statut_ftth,latitude,longitude
                    <br/>LOG-COC-001,24 rue Jardins,Cocody,4,4,raccordable,5.3599,-4.0083
                    <br/>LOG-PLT-002,Plateau Centre,Plateau,8,6,raccorde,5.3181,-4.0234
                  </code>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Coller le contenu CSV ici</label>
                  <textarea value={csvText} onChange={e => setCsvText(e.target.value)}
                    rows={10} placeholder="nom_unique,adresse,commune,..."
                    className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-white text-xs font-mono outline-none focus:border-blue-500 resize-none" />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-400">
                    {csvText ? `${csvText.trim().split('\n').length - 1} lignes détectées` : 'Collez votre CSV ci-dessus'}
                  </p>
                  <button onClick={importerCSV} disabled={!csvText.trim() || saving}
                    className="px-5 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white text-sm font-medium rounded-xl">
                    📥 Importer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
