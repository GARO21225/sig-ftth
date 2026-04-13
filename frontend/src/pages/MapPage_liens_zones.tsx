import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Polygon, useMapEvents } from 'react-leaflet'
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
  onClose: () => void; onSaved: () => void
}) {
  const [noeud1,   setNoeud1]   = useState('')
  const [noeud2,   setNoeud2]   = useState('')
  const [search1,  setSearch1]  = useState('')
  const [search2,  setSearch2]  = useState('')
  const [form, setForm] = useState({
    nom_unique: '', type_lien: mode === 'lien_telecom' ? 'branchement' : 'fourreau',
    type_cable: 'monomode', nb_fibres: 4, nb_fourreaux: 4, etat: 'actif', commentaire: ''
  })
  const [saving,   setSaving]   = useState(false)
  const liste = mode === 'lien_telecom' ? noeuds : noeudsGC
  const isTelecom = mode === 'lien_telecom'

  // Auto-générer nom_unique
  useEffect(() => {
    if (noeud1 && noeud2) {
      const n1 = liste.find((n: any) => n.id === noeud1)
      const n2 = liste.find((n: any) => n.id === noeud2)
      if (n1 && n2) {
        const prefix = isTelecom ? 'LT' : 'LGC'
        setForm(f => ({ ...f, nom_unique: `${prefix}-${n1.nom_unique}-${n2.nom_unique}` }))
      }
    }
  }, [noeud1, noeud2])

  const n1obj = liste.find((n: any) => n.id === noeud1)
  const n2obj = liste.find((n: any) => n.id === noeud2)

  const filtres1 = liste.filter((n: any) =>
    !search1 || n.nom_unique?.toLowerCase().includes(search1.toLowerCase()) || n.type_noeud?.toLowerCase().includes(search1.toLowerCase())
  ).slice(0, 10)

  const filtres2 = liste.filter((n: any) =>
    n.id !== noeud1 && (!search2 || n.nom_unique?.toLowerCase().includes(search2.toLowerCase()) || n.type_noeud?.toLowerCase().includes(search2.toLowerCase()))
  ).slice(0, 10)

  const creer = async () => {
    if (!noeud1 || !noeud2 || !form.nom_unique) return toast.error('Sélectionnez les 2 nœuds et saisissez un nom')
    if (noeud1 === noeud2) return toast.error('Les 2 nœuds doivent être différents')
    setSaving(true)
    try {
      const endpoint = isTelecom ? '/liens-telecom' : '/liens-gc'
      const payload: any = {
        nom_unique: form.nom_unique, id_noeud_depart: noeud1, id_noeud_arrivee: noeud2,
        type_lien: form.type_lien, etat: form.etat, commentaire: form.commentaire || undefined,
      }
      if (isTelecom) { payload.type_cable = form.type_cable; payload.nb_fibres = form.nb_fibres }
      else { payload.nb_fourreaux = form.nb_fourreaux }
      await api.post(endpoint, payload)
      toast.success(`Lien créé : ${form.nom_unique}`)
      onSaved(); onClose()
    } catch (e: any) { toast.error(errMsg(e))
    } finally { setSaving(false) }
  }

  const NoeudSelector = ({ value, onSelect, search, onSearch, filtres, label }: {
    value: string; onSelect: (id: string) => void
    search: string; onSearch: (v: string) => void
    filtres: any[]; label: string
  }) => {
    const selected = liste.find((n: any) => n.id === value)
    return (
      <div>
        <label className="block text-xs text-gray-400 mb-1">{label}</label>
        {selected ? (
          <div className="flex items-center gap-2 bg-blue-900/30 border border-blue-700 rounded-xl px-3 py-2">
            <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
              {selected.type_noeud?.slice(0,2)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{selected.nom_unique}</p>
              <p className="text-xs text-gray-400">{selected.type_noeud}</p>
            </div>
            <button onClick={() => onSelect('')} className="text-gray-500 hover:text-white text-lg">✕</button>
          </div>
        ) : (
          <div>
            <input value={search} onChange={e => onSearch(e.target.value)}
              placeholder="Rechercher par nom ou type..."
              className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-blue-500 mb-1" />
            <div className="max-h-40 overflow-y-auto bg-gray-800 rounded-xl border border-gray-700">
              {filtres.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-3">Aucun nœud trouvé</p>
              ) : filtres.map((n: any) => (
                <button key={n.id} onClick={() => { onSelect(n.id); onSearch('') }}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-700 transition-colors text-left border-b border-gray-700 last:border-0">
                  <div className="w-6 h-6 rounded-md bg-gray-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                    {n.type_noeud?.slice(0,2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{n.nom_unique}</p>
                    <p className="text-xs text-gray-400">{n.type_noeud} · {n.etat}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[2000] bg-black/70 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-4 flex items-center justify-between">
          <h2 className="font-bold text-white">
            {isTelecom ? '〰️ Nouveau lien télécom' : '⚡ Nouveau lien GC'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl">✕</button>
        </div>
        <div className="p-4 space-y-4">
          {/* Sélection nœuds */}
          <div className="bg-gray-800 rounded-xl p-3 space-y-3">
            <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider">1. Sélectionner les nœuds</p>
            <NoeudSelector value={noeud1} onSelect={setNoeud1} search={search1} onSearch={setSearch1} filtres={filtres1} label="Nœud de départ *" />
            {noeud1 && (
              <div className="flex justify-center">
                <div className="flex flex-col items-center">
                  <div className="w-0.5 h-4 bg-gray-600" />
                  <div className="text-gray-400 text-sm">↕</div>
                  <div className="w-0.5 h-4 bg-gray-600" />
                </div>
              </div>
            )}
            {noeud1 && <NoeudSelector value={noeud2} onSelect={setNoeud2} search={search2} onSearch={setSearch2} filtres={filtres2} label="Nœud d'arrivée *" />}
          </div>

          {/* Récapitulatif connexion */}
          {n1obj && n2obj && (
            <div className="bg-blue-900/20 border border-blue-700/50 rounded-xl p-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-blue-700 text-white rounded-md font-mono">{n1obj.type_noeud}</span>
                <div className="flex-1 border-t-2 border-dashed border-blue-500" />
                <span className="px-2 py-0.5 bg-blue-700 text-white rounded-md font-mono">{n2obj.type_noeud}</span>
              </div>
              <p className="text-blue-300 mt-2 text-center">
                {n1obj.nom_unique} → {n2obj.nom_unique}
              </p>
            </div>
          )}

          {/* Attributs */}
          {noeud1 && noeud2 && (
            <div className="bg-gray-800 rounded-xl p-3 space-y-3">
              <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider">2. Attributs du lien</p>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Nom unique *</label>
                <input value={form.nom_unique} onChange={e => setForm(f => ({...f, nom_unique: e.target.value}))}
                  placeholder={isTelecom ? "LT-NRO01-SRO01-001" : "LGC-CH01-CH02-001"}
                  className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Type lien</label>
                  <select value={form.type_lien} onChange={e => setForm(f => ({...f, type_lien: e.target.value}))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-white text-xs outline-none">
                    {isTelecom
                      ? ['transport','distribution','branchement','jarretiere'].map(t => <option key={t} value={t}>{t}</option>)
                      : ['fourreau','aerien','micro_tranchee','chemin_cables'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                {isTelecom ? (
                  <>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Type câble</label>
                      <select value={form.type_cable} onChange={e => setForm(f => ({...f, type_cable: e.target.value}))}
                        className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-white text-xs outline-none">
                        <option value="monomode">Monomode</option>
                        <option value="multimodes">Multimodes</option>
                        <option value="OPGW">OPGW</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Nb fibres</label>
                      <input type="number" value={form.nb_fibres} onChange={e => setForm(f => ({...f, nb_fibres: parseInt(e.target.value)||4}))}
                        min={2} max={1728}
                        className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-white text-xs outline-none" />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Nb fourreaux</label>
                    <input type="number" value={form.nb_fourreaux} onChange={e => setForm(f => ({...f, nb_fourreaux: parseInt(e.target.value)||4}))}
                      min={1}
                      className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-white text-xs outline-none" />
                  </div>
                )}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">État</label>
                  <select value={form.etat} onChange={e => setForm(f => ({...f, etat: e.target.value}))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-white text-xs outline-none">
                    {['actif','inactif','en_travaux','planifie'].map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Commentaire</label>
                <textarea value={form.commentaire} onChange={e => setForm(f => ({...f, commentaire: e.target.value}))} rows={2}
                  className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm outline-none resize-none" />
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl text-sm">Annuler</button>
            <button onClick={creer} disabled={saving || !noeud1 || !noeud2 || !form.nom_unique}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-medium rounded-xl text-sm">
              {saving ? '⏳...' : '✅ Créer le lien'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ================================================================
// PANNEAU ZONES D'INFLUENCE — avec CRUD complet
// ================================================================
function ZoneDrawHandler({ onPoint }: { onPoint: (p: [number,number]) => void }) {
  useMapEvents({ click(e) { onPoint([e.latlng.lat, e.latlng.lng]) } })
  return null
}

export function PanneauZones({ onClose }: { onClose: () => void }) {
  const [zones,    setZones]    = useState<ZoneData[]>([])
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState<ZoneData | null>(null)
  const [clients,  setClients]  = useState<any[]>([])
  const [showClients, setShowClients] = useState<string | null>(null)
  const [saving,   setSaving]   = useState(false)
  const [drawPoints, setDrawPoints] = useState<[number,number][]>([])
  const [form, setForm] = useState({
    nom: '', code: '', type_zone: 'standard', statut: 'active', capacite_max: 100
  })

  useEffect(() => { charger() }, [])

  const charger = async () => {
    setLoading(true)
    try {
      const r = await api.get('/zones-influence')
      setZones(r.data || [])
    } catch { }
    setLoading(false)
  }

  const sauvegarder = async () => {
    if (!form.nom) return toast.error('Nom requis')
    setSaving(true)
    try {
      const payload = { 
        ...form,
        ...(drawPoints.length >= 3 ? {
          geom: {
            type: 'Polygon',
            coordinates: [[...drawPoints.map(([lat, lng]) => [lng, lat]), [drawPoints[0][1], drawPoints[0][0]]]]
          }
        } : {})
      }
      if (selected) {
        await api.put(`/zones-influence/${selected.id}`, payload)
        toast.success('Zone mise à jour')
      } else {
        await api.post('/zones-influence', payload)
        toast.success('Zone créée')
      }
      setShowForm(false); setSelected(null); setDrawPoints([]); charger()
    } catch (e: any) { toast.error(errMsg(e))
    } finally { setSaving(false) }
  }

  const supprimer = async (id: string) => {
    if (!confirm('Supprimer cette zone ?')) return
    try {
      await api.delete(`/zones-influence/${id}`)
      toast.success('Zone supprimée'); charger()
    } catch (e: any) { toast.error(errMsg(e)) }
  }

  const voirClients = async (zone: ZoneData) => {
    if (showClients === zone.id) { setShowClients(null); return }
    try {
      const r = await api.get(`/zones-influence/${zone.id}/clients`)
      setClients(r.data.logements || [])
      setShowClients(zone.id)
    } catch { setClients([]) }
  }

  const affecter = async (zone: ZoneData) => {
    try {
      const r = await api.post(`/zones-influence/${zone.id}/affecter-automatique`)
      toast.success(`${r.data.nb_clients_affectes} clients affectés`); charger()
    } catch { toast.error('Erreur') }
  }

  const ZONE_COLOR: Record<string, string> = {
    standard: 'border-blue-700 bg-blue-900/20', prioritaire: 'border-green-700 bg-green-900/20',
    exclusion: 'border-red-700 bg-red-900/20', gc: 'border-yellow-700 bg-yellow-900/20'
  }

  return (
    <div className="fixed inset-0 z-[1500] bg-black/70 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-t-2xl md:rounded-2xl w-full md:max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
          <h2 className="font-bold text-white">🗺️ Zones d'influence</h2>
          <div className="flex gap-2">
            <button onClick={() => { setSelected(null); setForm({ nom:'', code:'', type_zone:'standard', statut:'active', capacite_max:100 }); setShowForm(true) }}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-xl">+ Créer</button>
            <button onClick={onClose} className="text-gray-500 hover:text-white">✕</button>
          </div>
        </div>

        {showForm && (
          <div className="p-4 border-b border-gray-700 bg-gray-800 flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white">{selected ? 'Modifier' : 'Nouvelle zone'}</h3>
              <button onClick={() => { setShowForm(false); setSelected(null) }} className="text-gray-500 hover:text-white">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Nom *</label>
                <input value={form.nom} onChange={e => setForm(f => ({...f, nom: e.target.value}))}
                  placeholder="Zone Cocody Centre" className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm outline-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Code</label>
                <input value={form.code} onChange={e => setForm(f => ({...f, code: e.target.value}))}
                  placeholder="ZN-COC-001" className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm outline-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Type</label>
                <select value={form.type_zone} onChange={e => setForm(f => ({...f, type_zone: e.target.value}))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-white text-xs outline-none">
                  {['standard','prioritaire','exclusion','gc'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Capacité max</label>
                <input type="number" value={form.capacite_max} onChange={e => setForm(f => ({...f, capacite_max: parseInt(e.target.value)||100}))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm outline-none" />
              </div>
            </div>
            {/* Mini-carte pour dessiner le périmètre */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-gray-400">Périmètre géographique</label>
                {drawPoints.length > 0 && (
                  <button onClick={() => setDrawPoints([])} className="text-xs text-red-400 hover:text-red-300">
                    🗑️ Effacer ({drawPoints.length} pts)
                  </button>
                )}
              </div>
              <div className="rounded-xl overflow-hidden border border-gray-600" style={{height:'200px'}}>
                <MapContainer center={[5.3599, -4.0083]} zoom={12} style={{height:'100%',width:'100%'}} zoomControl={false}>
                  <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                  <ZoneDrawHandler onPoint={pt => setDrawPoints((ps: [number,number][]) => [...ps, pt])} />
                  {drawPoints.length >= 3 && (
                    <Polygon positions={drawPoints} pathOptions={{color:'#3B82F6',fillOpacity:0.2,weight:2}} />
                  )}
                </MapContainer>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {drawPoints.length < 3
                  ? `Cliquez sur la carte pour définir le périmètre (${drawPoints.length}/3 minimum)`
                  : `✅ ${drawPoints.length} points — périmètre prêt`}
              </p>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={() => { setShowForm(false); setSelected(null) }} className="flex-1 py-1.5 bg-gray-700 text-gray-300 rounded-xl text-xs">Annuler</button>
              <button onClick={sauvegarder} disabled={saving} className="flex-1 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-medium disabled:opacity-40">
                {saving ? '...' : selected ? 'Mettre à jour' : 'Créer'}
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            Array(2).fill(0).map((_, i) => <div key={i} className="h-20 bg-gray-800/50 rounded-xl animate-pulse" />)
          ) : zones.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p className="text-4xl mb-2">🗺️</p>
              <p className="text-sm">Aucune zone définie</p>
              <p className="text-xs mt-1 text-gray-600">Cliquez "+ Créer" pour ajouter une zone</p>
            </div>
          ) : zones.map(zone => (
            <div key={zone.id} className={`border rounded-xl p-3 ${ZONE_COLOR[zone.type_zone] || 'border-gray-700 bg-gray-800'}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-white font-semibold text-sm">{zone.nom}</p>
                  {zone.code && <p className="text-xs text-gray-400 font-mono">{zone.code}</p>}
                  <p className="text-xs text-gray-500">{zone.type_zone} · {zone.statut}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setSelected(zone); setForm({nom:zone.nom, code:zone.code||'', type_zone:zone.type_zone, statut:zone.statut, capacite_max:zone.capacite_max||100}); setShowForm(true) }}
                    className="p-1.5 bg-blue-900/50 text-blue-400 rounded-lg text-xs hover:bg-blue-900">✏️</button>
                  <button onClick={() => supprimer(zone.id)}
                    className="p-1.5 bg-red-900/50 text-red-400 rounded-lg text-xs hover:bg-red-900">🗑️</button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2 text-center text-xs">
                {[
                  { l:'Clients', v: zone.nb_clients_actifs ?? '—' },
                  { l:'Logements', v: zone.nb_logements ?? '—' },
                  { l:'Capacité', v: zone.capacite_max ?? '∞' },
                ].map((s, i) => (
                  <div key={i} className="bg-gray-800/50 rounded-lg py-1.5">
                    <p className="font-bold text-white">{s.v}</p>
                    <p className="text-gray-500">{s.l}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <button onClick={() => voirClients(zone)} className="flex-1 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded-lg">
                  👁️ Clients
                </button>
                <button onClick={() => affecter(zone)} className="flex-1 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded-lg">
                  🔄 Affecter auto
                </button>
              </div>
              {showClients === zone.id && (
                <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
                  {clients.length === 0 ? <p className="text-xs text-gray-500 text-center py-2">Aucun client dans cette zone</p>
                    : clients.slice(0,8).map((c, i) => (
                      <div key={i} className="text-xs bg-gray-800 rounded-lg px-2 py-1 flex justify-between">
                        <span className="text-white truncate">{c.nom_unique}</span>
                        <span className="text-gray-400 ml-2">{c.nb_el_reel} EL</span>
                      </div>
                    ))}
                  {clients.length > 8 && <p className="text-xs text-gray-500 text-center">+{clients.length-8} autres</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ================================================================
// PANNEAU ITINÉRAIRES — 2 modes de calcul
// ================================================================
export function PanneauItineraires({ onClose }: { onClose: () => void }) {
  const [itis,     setItis]     = useState<any[]>([])
  const [loading,  setLoading]  = useState(true)
  const [creating, setCreating] = useState(false)
  const [mode,     setMode]     = useState<'gps'|'refs'>('gps')
  const [gpsPos,   setGpsPos]   = useState<[number,number]|null>(null)
  const [gpsErr,   setGpsErr]   = useState('')
  const [noeuds,   setNoeuds]   = useState<any[]>([])
  const [form, setForm] = useState({
    // Mode GPS
    lat_depart:'', lng_depart:'', lat_arrivee:'', lng_arrivee:'',
    // Mode références
    noeud_depart_id:'', noeud_arrivee_id:'',
    search_dep:'', search_arr:'',
    // Commun
    type_itineraire:'client_raccordement', nom:''
  })
  const [result, setResult] = useState<any>(null)

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
    if (!navigator.geolocation) return setGpsErr('GPS non disponible')
    navigator.geolocation.getCurrentPosition(
      pos => {
        setGpsPos([pos.coords.latitude, pos.coords.longitude])
        setForm(f => ({ ...f, lat_depart: pos.coords.latitude.toFixed(6), lng_depart: pos.coords.longitude.toFixed(6) }))
        toast.success(`Position: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`)
      },
      err => setGpsErr(err.message)
    )
  }

  const calculer = async () => {
    let payload: any = { type_itineraire: form.type_itineraire, nom: form.nom || undefined }

    if (mode === 'gps') {
      if (!form.lat_depart || !form.lng_depart || !form.lat_arrivee || !form.lng_arrivee)
        return toast.error('Saisissez les 4 coordonnées')
      payload = { ...payload,
        lat_depart: parseFloat(form.lat_depart), lng_depart: parseFloat(form.lng_depart),
        lat_arrivee: parseFloat(form.lat_arrivee), lng_arrivee: parseFloat(form.lng_arrivee) }
    } else {
      if (!form.noeud_depart_id || !form.noeud_arrivee_id)
        return toast.error('Sélectionnez les 2 nœuds')
      const nd = noeuds.find(n => n.id === form.noeud_depart_id)
      const na = noeuds.find(n => n.id === form.noeud_arrivee_id)
      if (!nd || !na) return toast.error('Nœuds introuvables')
      payload = { ...payload,
        lat_depart: nd.latitude, lng_depart: nd.longitude,
        lat_arrivee: na.latitude, lng_arrivee: na.longitude }
    }

    setCreating(true)
    try {
      const r = await api.post('/itineraires/calculer', payload)
      setResult(r.data)
      toast.success(`Itinéraire calculé — ${r.data.distance_directe_m}m`)
      charger()
    } catch (e: any) { toast.error(errMsg(e))
    } finally { setCreating(false) }
  }

  const filtresDep = noeuds.filter(n =>
    n.id !== form.noeud_arrivee_id && (!form.search_dep || n.nom_unique?.toLowerCase().includes(form.search_dep.toLowerCase()))
  ).slice(0,6)

  const filtresArr = noeuds.filter(n =>
    n.id !== form.noeud_depart_id && (!form.search_arr || n.nom_unique?.toLowerCase().includes(form.search_arr.toLowerCase()))
  ).slice(0,6)

  const nDep = noeuds.find(n => n.id === form.noeud_depart_id)
  const nArr = noeuds.find(n => n.id === form.noeud_arrivee_id)

  return (
    <div className="fixed inset-0 z-[1500] bg-black/70 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-t-2xl md:rounded-2xl w-full md:max-w-lg max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
          <h2 className="font-bold text-white">🧭 Calcul d'itinéraire</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Toggle mode */}
          <div className="flex bg-gray-800 rounded-xl p-1">
            <button onClick={() => setMode('gps')}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${mode==='gps' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>
              📍 Mode GPS / Coordonnées
            </button>
            <button onClick={() => setMode('refs')}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${mode==='refs' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>
              📡 Mode Références nœuds
            </button>
          </div>

          {/* Mode GPS */}
          {mode === 'gps' && (
            <div className="bg-gray-800 rounded-xl p-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-300">Point de départ</p>
                <button onClick={maPosition} className="px-2 py-1 bg-green-700 text-white text-xs rounded-lg">
                  📍 Ma position
                </button>
              </div>
              {gpsErr && <p className="text-xs text-red-400">{gpsErr}</p>}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Latitude</label>
                  <input value={form.lat_depart} onChange={e => setForm(f => ({...f, lat_depart:e.target.value}))}
                    placeholder="5.3599" className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-white text-xs outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Longitude</label>
                  <input value={form.lng_depart} onChange={e => setForm(f => ({...f, lng_depart:e.target.value}))}
                    placeholder="-4.0083" className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-white text-xs outline-none" />
                </div>
              </div>
              <div className="border-t border-gray-700 pt-3">
                <p className="text-xs font-semibold text-gray-300 mb-2">Point d'arrivée</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Latitude</label>
                    <input value={form.lat_arrivee} onChange={e => setForm(f => ({...f, lat_arrivee:e.target.value}))}
                      placeholder="5.3650" className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-white text-xs outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Longitude</label>
                    <input value={form.lng_arrivee} onChange={e => setForm(f => ({...f, lng_arrivee:e.target.value}))}
                      placeholder="-4.0050" className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-white text-xs outline-none" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Mode références nœuds */}
          {mode === 'refs' && (
            <div className="bg-gray-800 rounded-xl p-3 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">Nœud de départ</label>
                {nDep ? (
                  <div className="flex items-center gap-2 bg-blue-900/30 border border-blue-700 rounded-xl px-3 py-2">
                    <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center text-xs font-bold text-white">{nDep.type_noeud?.slice(0,2)}</div>
                    <div className="flex-1"><p className="text-sm text-white">{nDep.nom_unique}</p></div>
                    <button onClick={() => setForm(f => ({...f, noeud_depart_id:''}))} className="text-gray-500 hover:text-white">✕</button>
                  </div>
                ) : (
                  <div>
                    <input value={form.search_dep} onChange={e => setForm(f => ({...f, search_dep:e.target.value}))}
                      placeholder="Rechercher nœud de départ..." className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-white text-xs outline-none mb-1" />
                    <div className="max-h-32 overflow-y-auto bg-gray-700 rounded-xl">
                      {filtresDep.map((n: any) => (
                        <button key={n.id} onClick={() => setForm(f => ({...f, noeud_depart_id:n.id, search_dep:''}))}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-600 text-left border-b border-gray-600 last:border-0">
                          <span className="text-xs font-mono bg-gray-600 px-1 rounded">{n.type_noeud}</span>
                          <span className="text-xs text-white">{n.nom_unique}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">Nœud d'arrivée / Équipement</label>
                {nArr ? (
                  <div className="flex items-center gap-2 bg-green-900/30 border border-green-700 rounded-xl px-3 py-2">
                    <div className="w-6 h-6 rounded-md bg-green-600 flex items-center justify-center text-xs font-bold text-white">{nArr.type_noeud?.slice(0,2)}</div>
                    <div className="flex-1"><p className="text-sm text-white">{nArr.nom_unique}</p></div>
                    <button onClick={() => setForm(f => ({...f, noeud_arrivee_id:''}))} className="text-gray-500 hover:text-white">✕</button>
                  </div>
                ) : (
                  <div>
                    <input value={form.search_arr} onChange={e => setForm(f => ({...f, search_arr:e.target.value}))}
                      placeholder="Rechercher nœud / équipement..." className="w-full bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-white text-xs outline-none mb-1" />
                    <div className="max-h-32 overflow-y-auto bg-gray-700 rounded-xl">
                      {filtresArr.map((n: any) => (
                        <button key={n.id} onClick={() => setForm(f => ({...f, noeud_arrivee_id:n.id, search_arr:''}))}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-600 text-left border-b border-gray-600 last:border-0">
                          <span className="text-xs font-mono bg-gray-600 px-1 rounded">{n.type_noeud}</span>
                          <span className="text-xs text-white">{n.nom_unique}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Commun */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Type itinéraire</label>
              <select value={form.type_itineraire} onChange={e => setForm(f => ({...f, type_itineraire:e.target.value}))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-xs outline-none">
                {['client_raccordement','chemin_optique','maintenance','gc_tranchee','urgence'].map(t => (
                  <option key={t} value={t}>{t.replace(/_/g,' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Nom (optionnel)</label>
              <input value={form.nom} onChange={e => setForm(f => ({...f, nom:e.target.value}))}
                placeholder="Iti-Cocody-01"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-xs outline-none" />
            </div>
          </div>

          <button onClick={calculer} disabled={creating}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm">
            {creating ? '⏳ Calcul en cours...' : '📐 Calculer l\'itinéraire'}
          </button>

          {/* Résultat */}
          {result && (
            <div className="bg-green-900/30 border border-green-700 rounded-xl p-3 space-y-2">
              <p className="text-green-300 font-bold text-sm">✅ Itinéraire calculé</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-gray-800 rounded-lg p-2 text-center">
                  <p className="text-gray-400">Distance directe</p>
                  <p className="text-white font-bold text-lg">{result.distance_directe_m}m</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-2 text-center">
                  <p className="text-gray-400">Distance réseau</p>
                  <p className="text-white font-bold text-lg">{result.distance_reseau_m}m</p>
                </div>
                {result.noeud_depart && (
                  <div className="bg-gray-800 rounded-lg p-2">
                    <p className="text-gray-400">Nœud départ</p>
                    <p className="text-white font-medium truncate">{result.noeud_depart.nom}</p>
                    <p className="text-gray-400">à {result.noeud_depart.distance_m}m</p>
                  </div>
                )}
                {result.noeud_arrivee && (
                  <div className="bg-gray-800 rounded-lg p-2">
                    <p className="text-gray-400">Nœud arrivée</p>
                    <p className="text-white font-medium truncate">{result.noeud_arrivee.nom}</p>
                    <p className="text-gray-400">à {result.noeud_arrivee.distance_m}m</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Historique */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Historique ({itis.length})</p>
            {loading ? <div className="h-12 bg-gray-800/50 rounded-xl animate-pulse" />
            : itis.length === 0 ? <p className="text-xs text-gray-600 text-center py-3">Aucun itinéraire</p>
            : itis.map(iti => (
              <div key={iti.id} className="flex items-center gap-2 bg-gray-800 rounded-xl p-2.5 mb-1.5">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium truncate">{iti.nom || iti.id?.slice(0,8)}</p>
                  <p className="text-gray-400 text-xs">{iti.type_itineraire?.replace(/_/g,' ')} — {iti.distance_m}m</p>
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
