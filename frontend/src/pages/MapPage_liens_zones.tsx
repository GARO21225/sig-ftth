import { useState, useEffect } from 'react'
import api from '@services/api'
import toast from 'react-hot-toast'

// ================================================================
// PATCH MapPage.tsx — Ajout formulaires LIENS (Télécom + GC)
//                     + panneau ZONES D'INFLUENCE
// ================================================================
// Ce patch ajoute les états et JSX manquants dans MapPage.tsx.
// Les sections marquées [AJOUT] sont nouvelles.
// ================================================================

// [AJOUT] Types supplémentaires pour liens et zones
interface LienForm {
  nom_unique: string
  id_noeud_depart: string
  id_noeud_arrivee: string
  type_lien: string
  type_cable?: string
  nb_fibres?: number
  etat: string
  commentaire?: string
}

interface ZoneData {
  id: string; nom: string; code?: string
  type_zone: string; statut: string
  capacite_max?: number; nb_clients_actifs?: number
  superficie_km2?: number; nb_logements?: number; nb_noeuds?: number
}

// [AJOUT] Dans le composant MapPage, ajouter ces états :
// const [editModeLien, setEditModeLien] = useState<'lien_telecom'|'lien_gc'|null>(null)
// const [lienStep, setLienStep] = useState<1|2>(1)
// const [lienNoeud1, setLienNoeud1] = useState<any>(null)
// const [lienNoeud2, setLienNoeud2] = useState<any>(null)
// const [lienForm, setLienForm] = useState<LienForm>({...})
// const [zones, setZones] = useState<ZoneData[]>([])
// const [showZones, setShowZones] = useState(false)

// ================================================================
// COMPOSANT PANNEAU LIENS — À intégrer dans MapPage
// ================================================================
export function PanneauCreerLien({
  mode, noeuds, noeudsGC, onClose, onSaved
}: {
  mode: 'lien_telecom' | 'lien_gc'
  noeuds: any[]; noeudsGC: any[]
  onClose: () => void; onSaved: () => void
}) {
  const [step, setStep] = useState<1|2>(1)
  const [noeud1, setNoeud1] = useState('')
  const [noeud2, setNoeud2] = useState('')
  const [form, setForm] = useState({
    nom_unique: '', type_lien: mode === 'lien_telecom' ? 'branchement' : 'fourreau',
    type_cable: 'monomode', nb_fibres: 4, nb_fourreaux: 4,
    etat: 'actif', commentaire: ''
  })
  const [saving, setSaving] = useState(false)
  const liste = mode === 'lien_telecom' ? noeuds : noeudsGC
  const isTelecom = mode === 'lien_telecom'

  const creer = async () => {
    if (!noeud1 || !noeud2 || !form.nom_unique) { alert('Remplissez tous les champs requis'); return }
    if (noeud1 === noeud2) { alert('Les 2 nœuds doivent être différents'); return }
    setSaving(true)
    try {
      const endpoint = isTelecom ? '/liens-telecom' : '/liens-gc'
      const payload: any = {
        nom_unique: form.nom_unique,
        id_noeud_depart: noeud1,
        id_noeud_arrivee: noeud2,
        type_lien: form.type_lien,
        etat: form.etat,
        commentaire: form.commentaire || undefined,
      }
      if (isTelecom) { payload.type_cable = form.type_cable; payload.nb_fibres = form.nb_fibres }
      else { payload.nb_fourreaux = form.nb_fourreaux }

      await api.post(endpoint, payload)
      toast.success(`Lien créé : ${form.nom_unique}`)
      onSaved()
      onClose()
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Erreur création')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-[2000] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-white">
            {isTelecom ? '〰️ Nouveau lien télécom' : '⚡ Nouveau lien GC'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white">✕</button>
        </div>

        {/* Étape 1 : Nœuds */}
        <div className="space-y-3">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
            Étape 1 — Sélectionner les nœuds
          </p>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Nœud de départ *</label>
            <select value={noeud1} onChange={e => setNoeud1(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-blue-500">
              <option value="">-- Choisir --</option>
              {liste.map((n: any) => (
                <option key={n.id} value={n.id}>{n.nom_unique} ({n.type_noeud})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Nœud d'arrivée *</label>
            <select value={noeud2} onChange={e => setNoeud2(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-blue-500">
              <option value="">-- Choisir --</option>
              {liste.filter((n: any) => n.id !== noeud1).map((n: any) => (
                <option key={n.id} value={n.id}>{n.nom_unique} ({n.type_noeud})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Étape 2 : Attributs */}
        <div className="space-y-3">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
            Étape 2 — Attributs du lien
          </p>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Nom unique *</label>
            <input value={form.nom_unique} onChange={e => setForm(f => ({ ...f, nom_unique: e.target.value }))}
              placeholder={isTelecom ? "ex: LT-NRO01-SRO01-001" : "ex: LGC-CH01-CH02-001"}
              className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Type de lien</label>
              <select value={form.type_lien} onChange={e => setForm(f => ({ ...f, type_lien: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-blue-500">
                {isTelecom
                  ? ['transport','distribution','branchement','jarretiere'].map(t => <option key={t} value={t}>{t}</option>)
                  : ['fourreau','aerien','micro_tranchee','chemin_cables','gaine'].map(t => <option key={t} value={t}>{t}</option>)
                }
              </select>
            </div>
            {isTelecom ? (
              <>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Type câble</label>
                  <select value={form.type_cable} onChange={e => setForm(f => ({ ...f, type_cable: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-blue-500">
                    <option value="monomode">Monomode</option>
                    <option value="multimodes">Multimodes</option>
                    <option value="OPGW">OPGW</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Nb fibres</label>
                  <input type="number" value={form.nb_fibres} onChange={e => setForm(f => ({ ...f, nb_fibres: parseInt(e.target.value) }))}
                    min={2} max={1728} placeholder="ex: 24"
                    className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-blue-500" />
                </div>
              </>
            ) : (
              <div>
                <label className="block text-xs text-gray-400 mb-1">Nb fourreaux</label>
                <input type="number" value={form.nb_fourreaux} onChange={e => setForm(f => ({ ...f, nb_fourreaux: parseInt(e.target.value) }))}
                  min={1} placeholder="ex: 4"
                  className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-blue-500" />
              </div>
            )}
            <div>
              <label className="block text-xs text-gray-400 mb-1">État</label>
              <select value={form.etat} onChange={e => setForm(f => ({ ...f, etat: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-blue-500">
                {['actif','inactif','en_travaux','planifie'].map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Commentaire</label>
            <textarea value={form.commentaire} onChange={e => setForm(f => ({ ...f, commentaire: e.target.value }))}
              rows={2} placeholder="Optionnel"
              className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-blue-500 resize-none" />
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl text-sm transition-all">
            Annuler
          </button>
          <button onClick={creer} disabled={saving || !noeud1 || !noeud2 || !form.nom_unique}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-medium rounded-xl text-sm transition-all">
            {saving ? '⏳...' : '✅ Créer le lien'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ================================================================
// COMPOSANT PANNEAU ZONES D'INFLUENCE
// ================================================================
export function PanneauZones({ onClose }: { onClose: () => void }) {
  const [zones, setZones] = useState<ZoneData[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<ZoneData | null>(null)
  const [clients, setClients] = useState<any[]>([])

  useEffect(() => { charger() }, [])

  const charger = async () => {
    setLoading(true)
    try {
      const res = await api.get('/zones-influence')
      setZones(res.data)
    } catch { /* silencieux */ }
    setLoading(false)
  }

  const voirClients = async (zone: ZoneData) => {
    setSelected(zone)
    try {
      const res = await api.get(`/zones-influence/${zone.id}/clients`)
      setClients(res.data.logements || [])
    } catch { setClients([]) }
  }

  const affecter = async (zone: ZoneData) => {
    try {
      const res = await api.post(`/zones-influence/${zone.id}/affecter-automatique`)
      toast.success(`${res.data.nb_clients_affectes} clients affectés`)
      charger()
    } catch { toast.error('Erreur') }
  }

  const ZONE_COLOR: Record<string, string> = {
    standard: 'bg-blue-900/40 border-blue-700', prioritaire: 'bg-green-900/40 border-green-700',
    exclusion: 'bg-red-900/40 border-red-700', gc: 'bg-yellow-900/40 border-yellow-700'
  }

  return (
    <div className="fixed inset-0 z-[1500] bg-black/60 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-t-2xl md:rounded-2xl w-full md:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
          <h2 className="font-bold text-white">🗺️ Zones d'influence</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            Array(3).fill(0).map((_, i) => <div key={i} className="h-20 bg-gray-800/50 rounded-xl animate-pulse" />)
          ) : zones.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p className="text-4xl mb-2">🗺️</p>
              <p>Aucune zone d'influence définie</p>
              <p className="text-xs mt-1 text-gray-600">Créez des zones polygonales via l'API ou QGIS</p>
            </div>
          ) : zones.map(zone => (
            <div key={zone.id}
              className={`border rounded-xl p-4 ${ZONE_COLOR[zone.type_zone] || 'bg-gray-800 border-gray-700'}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-white font-semibold text-sm">{zone.nom}</p>
                    {zone.code && <span className="text-xs text-gray-400 font-mono">{zone.code}</span>}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${zone.statut === 'active' ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-400'}`}>
                      {zone.statut}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{zone.type_zone}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                {[
                  { label: 'Clients actifs', value: zone.nb_clients_actifs ?? '—' },
                  { label: 'Logements', value: zone.nb_logements ?? '—' },
                  { label: 'Capacité max', value: zone.capacite_max ?? '∞' },
                ].map((s, i) => (
                  <div key={i} className="bg-gray-800/50 rounded-lg p-2">
                    <p className="text-white font-bold text-sm">{s.value}</p>
                    <p className="text-xs text-gray-500">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => voirClients(zone)}
                  className="flex-1 py-1.5 bg-blue-800/50 hover:bg-blue-700/50 text-blue-300 text-xs rounded-lg transition-all">
                  👁️ Clients ({clients.length && selected?.id === zone.id ? clients.length : '?'})
                </button>
                <button onClick={() => affecter(zone)}
                  className="flex-1 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded-lg transition-all">
                  🔄 Affecter auto
                </button>
              </div>
              {selected?.id === zone.id && clients.length > 0 && (
                <div className="mt-3 max-h-40 overflow-y-auto space-y-1">
                  <p className="text-xs text-gray-400 mb-1">{clients.length} logements dans la zone :</p>
                  {clients.slice(0, 10).map((c, i) => (
                    <div key={i} className="text-xs bg-gray-800 rounded-lg px-2 py-1 flex justify-between">
                      <span className="text-white truncate">{c.nom_unique}</span>
                      <span className="text-gray-400 ml-2">{c.nb_el_reel} EL</span>
                    </div>
                  ))}
                  {clients.length > 10 && (
                    <p className="text-xs text-gray-500 text-center">... et {clients.length - 10} autres</p>
                  )}
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
// COMPOSANT PANNEAU ITINÉRAIRES
// ================================================================
export function PanneauItineraires({ onClose }: { onClose: () => void }) {
  const [itis, setItis] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    lat_depart: '', lng_depart: '', lat_arrivee: '', lng_arrivee: '',
    type_itineraire: 'client_raccordement', nom: ''
  })
  const [result, setResult] = useState<any>(null)

  useEffect(() => { charger() }, [])

  const charger = async () => {
    setLoading(true)
    try {
      const res = await api.get('/itineraires')
      setItis(res.data)
    } catch { /* silencieux */ }
    setLoading(false)
  }

  const calculer = async () => {
    if (!form.lat_depart || !form.lng_depart || !form.lat_arrivee || !form.lng_arrivee) {
      toast.error('Saisissez les coordonnées de départ et d\'arrivée'); return
    }
    setCreating(true)
    try {
      const res = await api.post('/itineraires/calculer', {
        lat_depart: parseFloat(form.lat_depart),
        lng_depart: parseFloat(form.lng_depart),
        lat_arrivee: parseFloat(form.lat_arrivee),
        lng_arrivee: parseFloat(form.lng_arrivee),
        type_itineraire: form.type_itineraire,
        nom: form.nom || undefined
      })
      setResult(res.data)
      toast.success(`Itinéraire calculé — ${res.data.distance_directe_m}m`)
      charger()
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Erreur calcul')
    } finally { setCreating(false) }
  }

  const supprimer = async (id: string) => {
    try {
      await api.delete(`/itineraires/${id}`)
      charger()
    } catch { /* silencieux */ }
  }

  return (
    <div className="fixed inset-0 z-[1500] bg-black/60 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-t-2xl md:rounded-2xl w-full md:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
          <h2 className="font-bold text-white">🧭 Itinéraires réseau</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Formulaire calcul */}
          <div className="bg-gray-800 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Calculer un itinéraire</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: '📍 Lat départ', key: 'lat_depart', ph: '5.3599' },
                { label: '📍 Lng départ', key: 'lng_depart', ph: '-4.0083' },
                { label: '🏁 Lat arrivée', key: 'lat_arrivee', ph: '5.3650' },
                { label: '🏁 Lng arrivée', key: 'lng_arrivee', ph: '-4.0050' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs text-gray-400 mb-0.5">{f.label}</label>
                  <input value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.ph}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-2.5 py-2 text-white text-xs outline-none focus:border-blue-500" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-400 mb-0.5">Type</label>
                <select value={form.type_itineraire} onChange={e => setForm(p => ({ ...p, type_itineraire: e.target.value }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-2.5 py-2 text-white text-xs outline-none focus:border-blue-500">
                  {['client_raccordement','chemin_optique','maintenance','gc_tranchee','urgence','custom'].map(t => (
                    <option key={t} value={t}>{t.replace(/_/g,' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-0.5">Nom (opt.)</label>
                <input value={form.nom} onChange={e => setForm(p => ({ ...p, nom: e.target.value }))}
                  placeholder="ex: Iti-Cocody-01"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-2.5 py-2 text-white text-xs outline-none focus:border-blue-500" />
              </div>
            </div>
            <button onClick={calculer} disabled={creating}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-all">
              {creating ? '⏳ Calcul en cours...' : '📐 Calculer l\'itinéraire'}
            </button>
          </div>

          {/* Résultat */}
          {result && (
            <div className="bg-green-900/30 border border-green-700 rounded-xl p-4 space-y-2">
              <p className="text-green-300 font-semibold text-sm">✅ Itinéraire calculé</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-gray-800 rounded-lg p-2">
                  <p className="text-gray-400">Distance directe</p>
                  <p className="text-white font-bold">{result.distance_directe_m}m</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-2">
                  <p className="text-gray-400">Distance réseau</p>
                  <p className="text-white font-bold">{result.distance_reseau_m}m</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-2">
                  <p className="text-gray-400">Nœud départ</p>
                  <p className="text-white font-bold truncate">{result.noeud_depart?.nom} ({result.noeud_depart?.distance_m}m)</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-2">
                  <p className="text-gray-400">Nœud arrivée</p>
                  <p className="text-white font-bold truncate">{result.noeud_arrivee?.nom} ({result.noeud_arrivee?.distance_m}m)</p>
                </div>
              </div>
            </div>
          )}

          {/* Historique itinéraires */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Historique ({itis.length})
            </p>
            {loading ? (
              <div className="h-16 bg-gray-800/50 rounded-xl animate-pulse" />
            ) : itis.length === 0 ? (
              <p className="text-gray-600 text-xs text-center py-4">Aucun itinéraire calculé</p>
            ) : itis.map(iti => (
              <div key={iti.id} className="flex items-center gap-2 bg-gray-800 rounded-xl p-3 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium truncate">{iti.nom || iti.id.slice(0,8)}</p>
                  <p className="text-gray-400 text-xs">{iti.type_itineraire?.replace(/_/g,' ')} — {iti.distance_m}m</p>
                  <p className="text-gray-500 text-xs">{iti.noeud_depart_nom} → {iti.noeud_arrivee_nom}</p>
                </div>
                <button onClick={() => supprimer(iti.id)}
                  className="text-gray-600 hover:text-red-400 text-lg transition-colors flex-shrink-0">
                  🗑️
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Exporter les types pour réutilisation
export type { LienForm, ZoneData }
