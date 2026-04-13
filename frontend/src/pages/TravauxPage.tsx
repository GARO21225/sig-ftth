import { useState, useEffect } from 'react'
import api from '@services/api'
import toast from 'react-hot-toast'
import { useAuthStore } from '@store/useStore'

const errMsg = (e: any): string => {
  const d = e?.response?.data?.detail
  if (!d) return e?.message || 'Erreur'
  if (typeof d === 'string') return d
  if (Array.isArray(d)) return d.map((x: any) => x.msg || JSON.stringify(x)).join(', ')
  return String(d)
}

interface OT {
  id: string; numero_ot: string; titre: string
  description?: string; statut: string; priorite: string
  type_travaux: string; nature_travaux?: string
  prestataire?: string; prestataire_contact?: string; prestataire_zone?: string
  equipe_membres?: string[]; chef_equipe?: string
  date_debut_prevue?: string; date_fin_prevue?: string
  noeud_telecom_nom?: string; noeud_gc_nom?: string
  avancement_pct?: number; cout_estime?: number
}

const STATUT_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  brouillon:    { color: 'text-gray-400',   bg: 'bg-gray-800',    label: 'Brouillon' },
  planifie:     { color: 'text-blue-400',   bg: 'bg-blue-900/40', label: 'Planifié' },
  en_cours:     { color: 'text-yellow-400', bg: 'bg-yellow-900/40', label: 'En cours' },
  suspendu:     { color: 'text-orange-400', bg: 'bg-orange-900/40', label: 'Suspendu' },
  termine:      { color: 'text-green-400',  bg: 'bg-green-900/40', label: 'Terminé' },
  annule:       { color: 'text-red-400',    bg: 'bg-red-900/40',   label: 'Annulé' },
}

const PRIORITE_COLOR: Record<string, string> = {
  basse: 'text-gray-400', normale: 'text-blue-400', haute: 'text-orange-400', urgente: 'text-red-400'
}

const NATURE_TRAVAUX = [
  'Génie Civil','Pose câble optique','Raccordement fibre','Maintenance préventive',
  'Maintenance corrective','Mise en service','Extension réseau','Remplacement équipement',
  'Audit réseau','Splice optique','Mesures OTDR','Pose fourreaux','Installation NRO',
  'Installation SRO','Installation PM','Installation PBO','Autre'
]

const TYPE_TRAVAUX = ['installation','maintenance','extension','remplacement','audit','urgence']

export default function TravauxPage() {
  const [ots,      setOts]      = useState<OT[]>([])
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState<OT | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [filtreStatut, setFiltreStatut] = useState('tous')
  const [search,   setSearch]   = useState('')
  const [view,     setView]     = useState<'liste'|'kanban'>('liste')
  const [form,     setForm]     = useState<any>({
    titre: '', description: '', type_travaux: 'installation', nature_travaux: 'Pose câble optique',
    priorite: 'normale', statut: 'brouillon',
    prestataire: '', prestataire_contact: '', prestataire_zone: '',
    chef_equipe: '', equipe_membres_str: '',
    cout_estime: '', avancement_pct: 0,
    date_debut_prevue: '', date_fin_prevue: '',
  })
  const { hasRole } = useAuthStore()
  const isAdmin = hasRole('admin', 'chef_projet')

  useEffect(() => { charger() }, [])

  const charger = async () => {
    setLoading(true)
    try {
      const r = await api.get('/travaux')
      setOts(r.data || [])
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
          ? form.equipe_membres_str.split(',').map((s: string) => s.trim()).filter(Boolean)
          : [],
        cout_estime: form.cout_estime ? parseFloat(form.cout_estime) : undefined,
        avancement_pct: parseInt(form.avancement_pct) || 0,
        date_debut_prevue: form.date_debut_prevue || undefined,
        date_fin_prevue: form.date_fin_prevue || undefined,
      }
      if (selected) {
        await api.put(`/travaux/${selected.id}`, payload)
        toast.success('OT mis à jour')
      } else {
        await api.post('/travaux', payload)
        toast.success('OT créé')
      }
      setShowForm(false); setSelected(null); charger()
    } catch (e: any) { toast.error(errMsg(e))
    } finally { setSaving(false) }
  }

  const changerStatut = async (ot: OT, statut: string) => {
    if (!isAdmin) return toast.error('Droits administrateur requis')
    try {
      await api.put(`/travaux/${ot.id}`, { statut })
      toast.success(`Statut → ${STATUT_CONFIG[statut]?.label}`)
      charger()
    } catch (e: any) { toast.error(errMsg(e)) }
  }

  const supprimer = async (id: string) => {
    if (!isAdmin) return toast.error('Droits administrateur requis')
    if (!confirm('Supprimer cet OT ?')) return
    try { await api.delete(`/travaux/${id}`); toast.success('OT supprimé'); charger() }
    catch (e: any) { toast.error(errMsg(e)) }
  }

  const filtres = ots.filter(o => {
    const matchStatut = filtreStatut === 'tous' || o.statut === filtreStatut
    const q = search.toLowerCase()
    const matchSearch = !q || o.numero_ot?.toLowerCase().includes(q) || o.titre?.toLowerCase().includes(q)
      || o.prestataire?.toLowerCase().includes(q) || o.nature_travaux?.toLowerCase().includes(q)
    return matchStatut && matchSearch
  })

  const ouvrirForm = (ot?: OT) => {
    if (ot) {
      setSelected(ot)
      setForm({
        ...ot,
        equipe_membres_str: ot.equipe_membres?.join(', ') || '',
        cout_estime: ot.cout_estime?.toString() || '',
      })
    } else {
      setSelected(null)
      setForm({ titre:'', description:'', type_travaux:'installation', nature_travaux:'Pose câble optique',
        priorite:'normale', statut:'brouillon', prestataire:'', prestataire_contact:'',
        prestataire_zone:'', chef_equipe:'', equipe_membres_str:'', cout_estime:'', avancement_pct:0,
        date_debut_prevue:'', date_fin_prevue:'' })
    }
    setShowForm(true)
  }

  const KanbanCol = ({ statut }: { statut: string }) => {
    const cfg = STATUT_CONFIG[statut]
    const items = filtres.filter(o => o.statut === statut)
    return (
      <div className="flex-1 min-w-48">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl mb-2 ${cfg.bg}`}>
          <span className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</span>
          <span className="ml-auto text-xs text-gray-500">{items.length}</span>
        </div>
        <div className="space-y-2">
          {items.map(ot => (
            <div key={ot.id} onClick={() => ouvrirForm(ot)}
              className="bg-gray-900 border border-gray-700 hover:border-gray-500 rounded-xl p-3 cursor-pointer text-xs">
              <p className="text-gray-400 font-mono">{ot.numero_ot}</p>
              <p className="text-white font-medium truncate mt-0.5">{ot.titre}</p>
              {ot.nature_travaux && <p className="text-gray-500 mt-1 truncate">{ot.nature_travaux}</p>}
              {ot.prestataire && <p className="text-blue-400 mt-1 truncate">🏢 {ot.prestataire}</p>}
              <div className={`mt-1 text-xs ${PRIORITE_COLOR[ot.priorite]}`}>● {ot.priorite}</div>
              {ot.avancement_pct !== undefined && (
                <div className="mt-2 h-1 bg-gray-700 rounded-full">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${ot.avancement_pct}%` }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  const stats = {
    total: ots.length,
    en_cours: ots.filter(o => o.statut === 'en_cours').length,
    planifie: ots.filter(o => o.statut === 'planifie').length,
    termine: ots.filter(o => o.statut === 'termine').length,
  }

  return (
    <div className="h-full flex flex-col bg-gray-950">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900 flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold text-white">🔧 Ordres de Travail</h1>
          <div className="flex gap-3 mt-0.5 text-xs text-gray-400">
            <span>{stats.total} total</span>
            <span className="text-yellow-400">{stats.en_cours} en cours</span>
            <span className="text-blue-400">{stats.planifie} planifiés</span>
            <span className="text-green-400">{stats.termine} terminés</span>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-gray-800 rounded-xl p-0.5">
            {(['liste','kanban'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-lg text-xs transition-all ${view===v ? 'bg-gray-700 text-white' : 'text-gray-400'}`}>
                {v === 'liste' ? '☰ Liste' : '⬜ Kanban'}
              </button>
            ))}
          </div>
          {isAdmin && (
            <button onClick={() => ouvrirForm()}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-xl font-medium">
              + Nouveau OT
            </button>
          )}
        </div>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 px-4 py-2 border-b border-gray-800 flex-shrink-0 flex-wrap">
        <div className="flex-1 min-w-40 flex items-center bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
          <span className="pl-3 text-gray-500 text-sm">🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher OT, prestataire..."
            className="flex-1 bg-transparent px-3 py-1.5 text-white text-xs outline-none placeholder-gray-600" />
        </div>
        <div className="flex gap-1 flex-wrap">
          {['tous',...Object.keys(STATUT_CONFIG)].map(s => (
            <button key={s} onClick={() => setFiltreStatut(s)}
              className={`px-2.5 py-1.5 rounded-xl text-xs transition-all ${filtreStatut===s ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
              {s === 'tous' ? 'Tous' : STATUT_CONFIG[s]?.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contenu */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="space-y-3">
            {Array(3).fill(0).map((_, i) => <div key={i} className="h-24 bg-gray-800/50 rounded-xl animate-pulse" />)}
          </div>
        ) : view === 'kanban' ? (
          <div className="flex gap-3 h-full overflow-x-auto pb-4">
            {Object.keys(STATUT_CONFIG).map(s => <KanbanCol key={s} statut={s} />)}
          </div>
        ) : filtres.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">🔧</div>
            <p className="text-gray-400">Aucun OT trouvé</p>
            {isAdmin && <button onClick={() => ouvrirForm()} className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm rounded-xl">+ Créer un OT</button>}
          </div>
        ) : (
          <div className="space-y-3">
            {filtres.map(ot => {
              const cfg = STATUT_CONFIG[ot.statut] || STATUT_CONFIG.brouillon
              return (
                <div key={ot.id} className="bg-gray-900 border border-gray-700 hover:border-gray-600 rounded-2xl p-4 transition-all">
                  {/* Header OT */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-gray-400 bg-gray-800 px-2 py-0.5 rounded-lg">{ot.numero_ot}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-lg ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                        <span className={`text-xs ${PRIORITE_COLOR[ot.priorite]}`}>● {ot.priorite}</span>
                      </div>
                      <h3 className="text-white font-semibold mt-1.5">{ot.titre}</h3>
                      {ot.description && <p className="text-gray-400 text-xs mt-0.5 line-clamp-2">{ot.description}</p>}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {isAdmin && (
                        <>
                          <button onClick={() => ouvrirForm(ot)} className="p-1.5 bg-blue-900/50 text-blue-400 rounded-lg hover:bg-blue-900 text-xs">✏️</button>
                          <button onClick={() => supprimer(ot.id)} className="p-1.5 bg-red-900/50 text-red-400 rounded-lg hover:bg-red-900 text-xs">🗑️</button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Grille infos */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                    {/* Nature travaux */}
                    <div className="bg-gray-800 rounded-xl p-2.5">
                      <p className="text-xs text-gray-500 mb-0.5">Nature des travaux</p>
                      <p className="text-xs font-medium text-white">{ot.nature_travaux || ot.type_travaux}</p>
                    </div>
                    {/* Prestataire */}
                    <div className="bg-gray-800 rounded-xl p-2.5">
                      <p className="text-xs text-gray-500 mb-0.5">Prestataire</p>
                      <p className="text-xs font-medium text-white">{ot.prestataire || '—'}</p>
                      {ot.prestataire_contact && <p className="text-xs text-gray-400">{ot.prestataire_contact}</p>}
                    </div>
                    {/* Zone intervention */}
                    <div className="bg-gray-800 rounded-xl p-2.5">
                      <p className="text-xs text-gray-500 mb-0.5">Zone d'intervention</p>
                      <p className="text-xs font-medium text-white">{ot.prestataire_zone || '—'}</p>
                    </div>
                    {/* Dates */}
                    <div className="bg-gray-800 rounded-xl p-2.5">
                      <p className="text-xs text-gray-500 mb-0.5">Période</p>
                      <p className="text-xs text-white">
                        {ot.date_debut_prevue ? new Date(ot.date_debut_prevue).toLocaleDateString('fr-FR') : '?'}
                        {' → '}
                        {ot.date_fin_prevue ? new Date(ot.date_fin_prevue).toLocaleDateString('fr-FR') : '?'}
                      </p>
                    </div>
                  </div>

                  {/* Équipe */}
                  {(ot.chef_equipe || (ot.equipe_membres && ot.equipe_membres.length > 0)) && (
                    <div className="mt-3 bg-gray-800/50 rounded-xl p-2.5">
                      <p className="text-xs text-gray-500 mb-1.5">👥 Équipe</p>
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {ot.chef_equipe && (
                          <span className="text-xs px-2 py-0.5 bg-blue-900/50 text-blue-300 rounded-lg border border-blue-700/50">
                            👑 {ot.chef_equipe}
                          </span>
                        )}
                        {ot.equipe_membres?.map((m, i) => (
                          <span key={i} className="text-xs px-2 py-0.5 bg-gray-700 text-gray-300 rounded-lg">{m}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Avancement + changement statut */}
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">Avancement</span>
                        <span className="text-white font-bold">{ot.avancement_pct || 0}%</span>
                      </div>
                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${ot.avancement_pct && ot.avancement_pct >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                          style={{ width: `${ot.avancement_pct || 0}%` }} />
                      </div>
                    </div>
                    {isAdmin && (
                      <select value={ot.statut} onChange={e => changerStatut(ot, e.target.value)}
                        className="bg-gray-800 border border-gray-600 rounded-xl px-2 py-1 text-white text-xs outline-none">
                        {Object.entries(STATUT_CONFIG).map(([k, v]) => (
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
      </div>

      {/* Formulaire OT */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-900 border-b border-gray-700 px-5 py-4 flex items-center justify-between">
              <h2 className="font-bold text-white text-lg">{selected ? '✏️ Modifier OT' : '+ Nouvel Ordre de Travail'}</h2>
              <button onClick={() => { setShowForm(false); setSelected(null) }} className="text-gray-400 hover:text-white text-xl">✕</button>
            </div>
            <div className="p-5 space-y-5">

              {/* Infos générales */}
              <section>
                <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 bg-blue-600 rounded-md flex items-center justify-center text-xs text-white">1</span>
                  Informations générales
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Titre *</label>
                    <input value={form.titre} onChange={e => setForm((f: any) => ({...f, titre:e.target.value}))}
                      placeholder="ex: Pose câble 24FO Cocody-Adjamé" className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Description</label>
                    <textarea value={form.description} onChange={e => setForm((f: any) => ({...f, description:e.target.value}))} rows={2}
                      className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-blue-500 resize-none" />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Nature des travaux</label>
                      <select value={form.nature_travaux} onChange={e => setForm((f: any) => ({...f, nature_travaux:e.target.value}))}
                        className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-white text-xs outline-none">
                        {NATURE_TRAVAUX.map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Type</label>
                      <select value={form.type_travaux} onChange={e => setForm((f: any) => ({...f, type_travaux:e.target.value}))}
                        className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-white text-xs outline-none">
                        {TYPE_TRAVAUX.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Priorité</label>
                      <select value={form.priorite} onChange={e => setForm((f: any) => ({...f, priorite:e.target.value}))}
                        className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-white text-xs outline-none">
                        {['basse','normale','haute','urgente'].map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </section>

              {/* Prestataire */}
              <section>
                <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 bg-purple-600 rounded-md flex items-center justify-center text-xs text-white">2</span>
                  Prestataire
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Nom prestataire</label>
                    <input value={form.prestataire} onChange={e => setForm((f: any) => ({...f, prestataire:e.target.value}))}
                      placeholder="ex: FIBTEC CI" className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Contact</label>
                    <input value={form.prestataire_contact} onChange={e => setForm((f: any) => ({...f, prestataire_contact:e.target.value}))}
                      placeholder="ex: +225 07 XX XX XX" className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Zone d'intervention</label>
                    <input value={form.prestataire_zone} onChange={e => setForm((f: any) => ({...f, prestataire_zone:e.target.value}))}
                      placeholder="ex: Cocody, Plateau" className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-blue-500" />
                  </div>
                </div>
              </section>

              {/* Équipe */}
              <section>
                <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 bg-green-600 rounded-md flex items-center justify-center text-xs text-white">3</span>
                  Équipe terrain
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Chef d'équipe</label>
                    <input value={form.chef_equipe} onChange={e => setForm((f: any) => ({...f, chef_equipe:e.target.value}))}
                      placeholder="ex: KOUAME Jean" className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Membres de l'équipe (séparés par virgule)</label>
                    <input value={form.equipe_membres_str} onChange={e => setForm((f: any) => ({...f, equipe_membres_str:e.target.value}))}
                      placeholder="ex: BAMBA A., COULIBALY M., TRAORE K." className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-blue-500" />
                  </div>
                </div>
              </section>

              {/* Planification */}
              <section>
                <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 bg-orange-600 rounded-md flex items-center justify-center text-xs text-white">4</span>
                  Planification & suivi
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Statut</label>
                    <select value={form.statut} onChange={e => setForm((f: any) => ({...f, statut:e.target.value}))}
                      className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-white text-xs outline-none">
                      {Object.entries(STATUT_CONFIG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Avancement %</label>
                    <input type="number" min={0} max={100} value={form.avancement_pct}
                      onChange={e => setForm((f: any) => ({...f, avancement_pct:parseInt(e.target.value)||0}))}
                      className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Date début</label>
                    <input type="date" value={form.date_debut_prevue} onChange={e => setForm((f: any) => ({...f, date_debut_prevue:e.target.value}))}
                      className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Date fin</label>
                    <input type="date" value={form.date_fin_prevue} onChange={e => setForm((f: any) => ({...f, date_fin_prevue:e.target.value}))}
                      className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm outline-none" />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-xs text-gray-400 mb-1">Coût estimé (FCFA)</label>
                  <input type="number" value={form.cout_estime} onChange={e => setForm((f: any) => ({...f, cout_estime:e.target.value}))}
                    placeholder="ex: 5000000" className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm outline-none" />
                </div>
              </section>
            </div>
            <div className="sticky bottom-0 bg-gray-900 border-t border-gray-700 px-5 py-4 flex gap-3">
              <button onClick={() => { setShowForm(false); setSelected(null) }}
                className="flex-1 py-2.5 border border-gray-600 text-gray-300 rounded-xl text-sm">Annuler</button>
              <button onClick={sauvegarder} disabled={saving}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl text-sm font-bold">
                {saving ? '⏳...' : selected ? 'Mettre à jour' : 'Créer l\'OT'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
