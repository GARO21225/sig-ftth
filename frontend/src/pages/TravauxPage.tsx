import { useState, useEffect } from 'react'
import api from '@services/api'
import toast from 'react-hot-toast'
import { useAuthStore } from '@store/useStore'

interface OT {
  id: string; numero_ot: string; titre: string
  type_travaux: string; priorite: string; statut: string
  avancement_pct: number; date_debut_prevue: string
  date_fin_prevue: string; equipe_nom?: string
  responsable_nom?: string; responsable_prenom?: string
  en_retard?: boolean; jours_retard?: number
  cout_estime?: number; devise?: string
}

interface OTForm {
  titre: string; description: string; type_travaux: string
  priorite: string; date_debut_prevue: string; date_fin_prevue: string
  adresse_chantier: string; commentaire: string
}

const STATUT_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  planifie:              { color: 'text-gray-300',   bg: 'bg-gray-700',    label: 'Planifié' },
  en_attente_validation: { color: 'text-yellow-300', bg: 'bg-yellow-900/40', label: 'En attente' },
  valide:                { color: 'text-blue-300',   bg: 'bg-blue-900/40', label: 'Validé' },
  en_cours:              { color: 'text-green-300',  bg: 'bg-green-900/40', label: 'En cours' },
  suspendu:              { color: 'text-orange-300', bg: 'bg-orange-900/40', label: 'Suspendu' },
  termine:               { color: 'text-teal-300',   bg: 'bg-teal-900/40', label: 'Terminé' },
  cloture:               { color: 'text-purple-300', bg: 'bg-purple-900/40', label: 'Clôturé' },
  annule:                { color: 'text-red-300',    bg: 'bg-red-900/40',  label: 'Annulé' },
}

const PRIORITE_COLOR: Record<string, string> = {
  basse: 'text-gray-400', normale: 'text-blue-400',
  haute: 'text-yellow-400', urgente: 'text-orange-400', critique: 'text-red-400'
}

export default function TravauxPage() {
  const [ots, setOts] = useState<OT[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<OT | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [filterStatut, setFilterStatut] = useState('')
  const [filterPriorite, setFilterPriorite] = useState('')
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [alertes, setAlertes] = useState<any[]>([])
  const { hasRole } = useAuthStore()
  const canEdit = hasRole('admin', 'chef_projet', 'technicien')

  const [form, setForm] = useState<OTForm>({
    titre: '', description: '', type_travaux: 'raccordement_client',
    priorite: 'normale', date_debut_prevue: '', date_fin_prevue: '',
    adresse_chantier: '', commentaire: ''
  })

  useEffect(() => { charger() }, [])

  const charger = async () => {
    setLoading(true)
    const [resOT, resAlertes] = await Promise.allSettled([
      api.get('/travaux/ot'),
      api.get('/travaux/alertes')
    ])
    if (resOT.status === 'fulfilled') setOts(resOT.value.data)
    if (resAlertes.status === 'fulfilled') setAlertes(resAlertes.value.data)
    setLoading(false)
  }

  const creerOT = async () => {
    if (!form.titre || !form.date_debut_prevue || !form.date_fin_prevue) {
      toast.error('Titre et dates obligatoires'); return
    }
    setSaving(true)
    try {
      await api.post('/travaux/ot', form)
      toast.success('Ordre de travail créé !')
      setShowForm(false)
      setForm({ titre: '', description: '', type_travaux: 'raccordement_client',
        priorite: 'normale', date_debut_prevue: '', date_fin_prevue: '',
        adresse_chantier: '', commentaire: '' })
      charger()
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Erreur création')
    } finally { setSaving(false) }
  }

  const majStatut = async (id: string, statut: string, avancement?: number) => {
    try {
      await api.put(`/travaux/ot/${id}`, { statut, ...(avancement !== undefined ? { avancement_pct: avancement } : {}) })
      toast.success('OT mis à jour')
      charger()
      if (selected?.id === id) setSelected(prev => prev ? { ...prev, statut, avancement_pct: avancement ?? prev.avancement_pct } : null)
    } catch { toast.error('Erreur mise à jour') }
  }

  const filtered = ots.filter(ot => {
    if (filterStatut && ot.statut !== filterStatut) return false
    if (filterPriorite && ot.priorite !== filterPriorite) return false
    if (search && !ot.numero_ot.toLowerCase().includes(search.toLowerCase()) &&
        !ot.titre.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const stats = {
    total: ots.length,
    en_cours: ots.filter(o => o.statut === 'en_cours').length,
    en_retard: ots.filter(o => o.en_retard).length,
    termine: ots.filter(o => o.statut === 'termine' || o.statut === 'cloture').length,
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-white">🏗️ Suivi des Travaux</h1>
            <p className="text-gray-400 text-xs mt-0.5">Ordres de travail — PCR v2.5</p>
          </div>
          {canEdit && (
            <button onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition-all">
              + Nouvel OT
            </button>
          )}
        </div>

        {/* KPI */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Total', value: stats.total, color: 'text-white' },
            { label: 'En cours', value: stats.en_cours, color: 'text-green-400' },
            { label: 'En retard', value: stats.en_retard, color: 'text-red-400' },
            { label: 'Terminés', value: stats.termine, color: 'text-teal-400' },
          ].map((s, i) => (
            <div key={i} className="bg-gray-900 rounded-xl p-3 border border-gray-700 text-center">
              <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Alertes */}
        {alertes.length > 0 && (
          <div className="bg-orange-900/30 border border-orange-700 rounded-xl p-3 mb-4">
            <p className="text-orange-300 text-xs font-semibold mb-1">⚠️ {alertes.length} alerte(s) non lue(s)</p>
            <p className="text-orange-400 text-xs truncate">{alertes[0]?.message}</p>
          </div>
        )}

        {/* Filtres */}
        <div className="flex gap-2 flex-wrap">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Rechercher..."
            className="flex-1 min-w-[150px] bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-blue-500" />
          <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-gray-300 text-xs outline-none">
            <option value="">Tous statuts</option>
            {Object.entries(STATUT_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={filterPriorite} onChange={e => setFilterPriorite(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-gray-300 text-xs outline-none">
            <option value="">Toutes priorités</option>
            {['basse','normale','haute','urgente','critique'].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <button onClick={charger} className="px-3 py-2 bg-gray-700 rounded-xl text-gray-300 text-xs hover:bg-gray-600">🔄</button>
        </div>
      </div>

      {/* Liste + Détail */}
      <div className="flex flex-1 overflow-hidden">
        {/* Liste */}
        <div className={`${selected ? 'hidden md:flex' : 'flex'} flex-col flex-1 overflow-y-auto p-3 gap-2`}>
          {loading ? (
            Array(5).fill(0).map((_, i) => (
              <div key={i} className="h-24 bg-gray-800/50 rounded-xl animate-pulse" />
            ))
          ) : filtered.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
              Aucun ordre de travail trouvé
            </div>
          ) : filtered.map(ot => {
            const sc = STATUT_CONFIG[ot.statut] || STATUT_CONFIG.planifie
            return (
              <button key={ot.id} onClick={() => setSelected(ot)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${selected?.id === ot.id ? 'border-blue-500 bg-blue-900/10' : 'border-gray-700 bg-gray-900 hover:border-gray-600'}`}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-gray-400">{ot.numero_ot}</span>
                      {ot.en_retard && <span className="text-xs bg-red-900 text-red-300 px-2 py-0.5 rounded-full">⚠️ Retard</span>}
                    </div>
                    <p className="text-white font-medium text-sm mt-0.5 truncate">{ot.titre}</p>
                  </div>
                  <span className={`flex-shrink-0 text-xs px-2 py-1 rounded-full font-medium ${sc.bg} ${sc.color}`}>
                    {sc.label}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className={PRIORITE_COLOR[ot.priorite]}>● {ot.priorite}</span>
                  <span>{ot.type_travaux?.replace(/_/g,' ')}</span>
                  <span>{ot.equipe_nom || '—'}</span>
                </div>
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Avancement</span>
                    <span className="text-white font-medium">{ot.avancement_pct}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${ot.avancement_pct}%` }} />
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Panneau détail */}
        {selected && (
          <div className="w-full md:w-80 lg:w-96 border-l border-gray-800 overflow-y-auto flex-shrink-0 bg-gray-950">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">Détail OT</h3>
              <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-white">✕</button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <p className="text-xs text-gray-400 font-mono">{selected.numero_ot}</p>
                <h4 className="text-white font-bold mt-1">{selected.titre}</h4>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: 'Statut', value: STATUT_CONFIG[selected.statut]?.label || selected.statut },
                  { label: 'Priorité', value: selected.priorite },
                  { label: 'Type', value: selected.type_travaux?.replace(/_/g,' ') },
                  { label: 'Équipe', value: selected.equipe_nom || '—' },
                  { label: 'Début prévu', value: selected.date_debut_prevue ? new Date(selected.date_debut_prevue).toLocaleDateString('fr-FR') : '—' },
                  { label: 'Fin prévue', value: selected.date_fin_prevue ? new Date(selected.date_fin_prevue).toLocaleDateString('fr-FR') : '—' },
                  { label: 'Coût estimé', value: selected.cout_estime ? `${selected.cout_estime.toLocaleString()} ${selected.devise || 'XOF'}` : '—' },
                ].map((item, i) => (
                  <div key={i} className="bg-gray-800 rounded-xl p-2.5">
                    <p className="text-xs text-gray-400">{item.label}</p>
                    <p className="text-white text-xs font-medium mt-0.5">{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Avancement */}
              <div className="bg-gray-800 rounded-xl p-3">
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-gray-400">Avancement</span>
                  <span className="text-white font-bold">{selected.avancement_pct}%</span>
                </div>
                <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all"
                    style={{ width: `${selected.avancement_pct}%` }} />
                </div>
              </div>

              {/* Actions rapides */}
              {canEdit && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-400 font-medium">Actions rapides</p>
                  <div className="grid grid-cols-2 gap-2">
                    {selected.statut === 'planifie' && (
                      <button onClick={() => majStatut(selected.id, 'en_cours', 10)}
                        className="py-2 bg-green-700 hover:bg-green-600 text-white text-xs rounded-xl transition-all">
                        ▶ Démarrer
                      </button>
                    )}
                    {selected.statut === 'en_cours' && (
                      <>
                        <button onClick={() => majStatut(selected.id, 'suspendu')}
                          className="py-2 bg-orange-700 hover:bg-orange-600 text-white text-xs rounded-xl transition-all">
                          ⏸ Suspendre
                        </button>
                        <button onClick={() => majStatut(selected.id, 'termine', 100)}
                          className="py-2 bg-teal-700 hover:bg-teal-600 text-white text-xs rounded-xl transition-all">
                          ✅ Terminer
                        </button>
                      </>
                    )}
                    {selected.statut === 'suspendu' && (
                      <button onClick={() => majStatut(selected.id, 'en_cours')}
                        className="py-2 bg-blue-700 hover:bg-blue-600 text-white text-xs rounded-xl transition-all">
                        ▶ Reprendre
                      </button>
                    )}
                    {['planifie','en_attente_validation'].includes(selected.statut) && (
                      <button onClick={() => majStatut(selected.id, 'annule')}
                        className="py-2 bg-red-900 hover:bg-red-800 text-red-300 text-xs rounded-xl transition-all">
                        ✕ Annuler
                      </button>
                    )}
                  </div>
                  {selected.statut === 'en_cours' && (
                    <div>
                      <label className="text-xs text-gray-400">Mettre à jour l'avancement (%)</label>
                      <input type="range" min="0" max="100" step="5"
                        defaultValue={selected.avancement_pct}
                        onChange={e => majStatut(selected.id, 'en_cours', parseInt(e.target.value))}
                        className="w-full mt-1 accent-blue-500" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal création OT */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-white">+ Nouvel Ordre de Travail</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white">✕</button>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Titre *</label>
              <input value={form.titre} onChange={e => setForm(f => ({ ...f, titre: e.target.value }))}
                placeholder="ex: Raccordement client — Résidence Les Palmiers"
                className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-blue-500" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Type de travaux</label>
                <select value={form.type_travaux} onChange={e => setForm(f => ({ ...f, type_travaux: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-blue-500">
                  {['pose_cable','pose_fourreau','installation_noeud','maintenance','reparation','raccordement_client','audit_reseau','autre'].map(t => (
                    <option key={t} value={t}>{t.replace(/_/g,' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Priorité</label>
                <select value={form.priorite} onChange={e => setForm(f => ({ ...f, priorite: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-blue-500">
                  {['basse','normale','haute','urgente','critique'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Date début *</label>
                <input type="date" value={form.date_debut_prevue} onChange={e => setForm(f => ({ ...f, date_debut_prevue: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Date fin *</label>
                <input type="date" value={form.date_fin_prevue} onChange={e => setForm(f => ({ ...f, date_fin_prevue: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-blue-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Adresse du chantier</label>
              <input value={form.adresse_chantier} onChange={e => setForm(f => ({ ...f, adresse_chantier: e.target.value }))}
                placeholder="Rue, quartier, commune"
                className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3} placeholder="Description détaillée des travaux..."
                className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-blue-500 resize-none" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl text-sm transition-all">
                Annuler
              </button>
              <button onClick={creerOT} disabled={saving}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium rounded-xl text-sm transition-all">
                {saving ? '⏳...' : '✅ Créer l\'OT'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
