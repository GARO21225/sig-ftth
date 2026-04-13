import { useState, useEffect } from 'react'
import api from '@services/api'
import toast from 'react-hot-toast'

interface TypeEquipement {
  id: string; code: string; nom: string
  geom_type: string; statut: string; icone: string; couleur: string
  description?: string; categorie_nom?: string
}

const GEOM_TYPES = ['POINT','LINESTRING','POLYGON']
const STATUTS = ['valide','en_attente','archive']

export default function CataloguePage() {
  const [types,      setTypes]      = useState<TypeEquipement[]>([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [showForm,   setShowForm]   = useState(false)
  const [selected,   setSelected]   = useState<TypeEquipement | null>(null)
  const [saving,     setSaving]     = useState(false)
  const [form,       setForm]       = useState<any>({
    code:'', nom:'', geom_type:'POINT', statut:'valide', icone:'📡', couleur:'#3B82F6', description:''
  })

  const SEED_TYPES: TypeEquipement[] = [
    { id:'1', code:'NRO', nom:'Nœud Raccordement Optique',  geom_type:'POINT',      statut:'valide', icone:'🔵', couleur:'#1D4ED8', categorie_nom:'Télécom' },
    { id:'2', code:'SRO', nom:'Sous-Répartiteur Optique',   geom_type:'POINT',      statut:'valide', icone:'🟣', couleur:'#6366F1', categorie_nom:'Télécom' },
    { id:'3', code:'PBO', nom:'Point Branchement Optique',  geom_type:'POINT',      statut:'valide', icone:'🔷', couleur:'#8B5CF6', categorie_nom:'Télécom' },
    { id:'4', code:'PTO', nom:'Point Terminaison Optique',  geom_type:'POINT',      statut:'valide', icone:'◾', couleur:'#A78BFA', categorie_nom:'Télécom' },
    { id:'5', code:'PM',  nom:'Point Mutualisation',        geom_type:'POINT',      statut:'valide', icone:'🔹', couleur:'#60A5FA', categorie_nom:'Télécom' },
    { id:'6', code:'CAB_OPT', nom:'Câble Optique',          geom_type:'LINESTRING', statut:'valide', icone:'〰️', couleur:'#3B82F6', categorie_nom:'Télécom' },
    { id:'7', code:'L1T', nom:'Chambre L1T',                geom_type:'POINT',      statut:'valide', icone:'🟡', couleur:'#F59E0B', categorie_nom:'Génie Civil' },
    { id:'8', code:'L2T', nom:'Chambre L2T',                geom_type:'POINT',      statut:'valide', icone:'🟠', couleur:'#F97316', categorie_nom:'Génie Civil' },
    { id:'9', code:'L4T', nom:'Chambre L4T',                geom_type:'POINT',      statut:'valide', icone:'🔴', couleur:'#EF4444', categorie_nom:'Génie Civil' },
    { id:'10',code:'POTEAU', nom:'Appui Aérien',            geom_type:'POINT',      statut:'valide', icone:'🪵', couleur:'#92400E', categorie_nom:'Génie Civil' },
    { id:'11',code:'FOURREAU', nom:'Fourreau/Conduite',     geom_type:'LINESTRING', statut:'valide', icone:'⚡', couleur:'#D97706', categorie_nom:'Génie Civil' },
    { id:'12',code:'MICRO_TR', nom:'Micro-tranchée',        geom_type:'LINESTRING', statut:'valide', icone:'〰️', couleur:'#B45309', categorie_nom:'Génie Civil' },
  ]

  useEffect(() => { charger() }, [])

  const charger = async () => {
    setLoading(true)
    try {
      const r = await api.get('/equipements/types')
      setTypes(r.data?.length ? r.data : SEED_TYPES)
    } catch { setTypes(SEED_TYPES) }
    finally { setLoading(false) }
  }

  const sauvegarder = async () => {
    if (!form.code || !form.nom) return toast.error('Code et nom requis')
    setSaving(true)
    try {
      if (selected) {
        await api.put(`/equipements/types/${selected.id}`, form)
        toast.success('Type mis à jour')
      } else {
        await api.post('/equipements/types', form)
        toast.success(`Type ${form.code} créé`)
      }
      setShowForm(false); setSelected(null)
      charger()
    } catch (e: any) {
      // En cas d'erreur API, mettre à jour localement pour la démo
      if (selected) {
        setTypes(ts => ts.map(t => t.id === selected.id ? { ...t, ...form } : t))
        toast.success('Type mis à jour (local)')
      } else {
        const newType = { ...form, id: Date.now().toString() }
        setTypes(ts => [...ts, newType])
        toast.success(`Type ${form.code} créé (local)`)
      }
      setShowForm(false); setSelected(null)
    } finally { setSaving(false) }
  }

  const supprimer = async (type: TypeEquipement) => {
    if (!confirm(`Supprimer "${type.nom}" ?`)) return
    try {
      await api.delete(`/equipements/types/${type.id}`)
      toast.success('Type supprimé')
      charger()
    } catch {
      setTypes(ts => ts.filter(t => t.id !== type.id))
      toast.success('Type supprimé (local)')
    }
  }

  const filtres = types.filter(t =>
    !search || t.nom.toLowerCase().includes(search.toLowerCase()) || t.code.toLowerCase().includes(search.toLowerCase())
  )

  const GEOM_LABELS: Record<string,string> = { POINT:'Ponctuel', LINESTRING:'Linéaire', POLYGON:'Surfacique' }

  return (
    <div className="h-full overflow-auto bg-gray-950 p-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-white">📦 Catalogue équipements</h1>
            <p className="text-gray-400 text-xs mt-0.5">Référentiel PCR v2.5 — Gérer vos types d'équipements</p>
          </div>
          <button onClick={() => { setSelected(null); setForm({ code:'', nom:'', geom_type:'POINT', statut:'valide', icone:'📡', couleur:'#3B82F6' }); setShowForm(true) }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-xl font-medium">
            + Nouveau type
          </button>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 flex items-center bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
            <span className="pl-3 text-gray-500">🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
              className="flex-1 bg-transparent px-3 py-2 text-white text-sm outline-none placeholder-gray-600" />
          </div>
          <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded-lg">{filtres.length} types</span>
        </div>

        <div className="bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="py-12 text-center text-gray-500">⏳ Chargement...</div>
          ) : (
            <div className="divide-y divide-gray-800">
              {filtres.map(t => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-800/50">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{ background: t.couleur + '22', border: `1px solid ${t.couleur}55` }}>
                    {t.icone}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md"
                        style={{ background: t.couleur + '33', color: t.couleur }}>{t.code}</span>
                      <span className="text-sm font-medium text-white truncate">{t.nom}</span>
                    </div>
                    {t.categorie_nom && <span className="text-xs text-gray-500">{t.categorie_nom}</span>}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-lg ${t.geom_type==='POINT' ? 'bg-blue-900/50 text-blue-300' : t.geom_type==='LINESTRING' ? 'bg-purple-900/50 text-purple-300' : 'bg-teal-900/50 text-teal-300'}`}>
                    {GEOM_LABELS[t.geom_type]}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-lg ${t.statut==='valide' ? 'bg-green-900/40 text-green-400' : 'bg-gray-800 text-gray-400'}`}>
                    {t.statut}
                  </span>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => { setSelected(t); setForm({...t}); setShowForm(true) }}
                      className="p-1.5 bg-blue-900/50 text-blue-400 rounded-lg hover:bg-blue-900 text-xs">✏️</button>
                    <button onClick={() => supprimer(t)}
                      className="p-1.5 bg-red-900/50 text-red-400 rounded-lg hover:bg-red-900 text-xs">🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-white">{selected ? 'Modifier type' : 'Nouveau type d\'équipement'}</h2>
              <button onClick={() => { setShowForm(false); setSelected(null) }} className="text-gray-500 hover:text-white text-xl">✕</button>
            </div>
            <div className="space-y-3">
              {[['code','Code (ex: NRO)'],['nom','Nom complet'],['icone','Icone (emoji)'],['couleur','Couleur (hex)']].map(([f,l]) => (
                <div key={f}>
                  <label className="block text-xs text-gray-400 mb-1">{l}</label>
                  <input value={form[f] || ''} onChange={e => setForm((x: any) => ({...x, [f]: e.target.value}))}
                    className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-blue-500" />
                </div>
              ))}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Type géométrie</label>
                <select value={form.geom_type || 'POINT'} onChange={e => setForm((x: any) => ({...x, geom_type: e.target.value}))}
                  className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm outline-none">
                  {GEOM_TYPES.map(g => <option key={g} value={g}>{GEOM_LABELS[g]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Statut</label>
                <select value={form.statut || 'valide'} onChange={e => setForm((x: any) => ({...x, statut: e.target.value}))}
                  className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm outline-none">
                  {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Description</label>
                <textarea value={form.description || ''} onChange={e => setForm((x: any) => ({...x, description: e.target.value}))} rows={2}
                  className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-blue-500 resize-none" />
              </div>
              {form.icone && form.couleur && (
                <div className="flex items-center gap-3 bg-gray-800 rounded-xl p-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                    style={{ background: form.couleur + '33', border: `1px solid ${form.couleur}66` }}>
                    {form.icone}
                  </div>
                  <div>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md"
                      style={{ background: form.couleur + '33', color: form.couleur }}>{form.code || 'CODE'}</span>
                    <p className="text-xs text-gray-300 mt-1">{form.nom || 'Nom du type'}</p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setShowForm(false); setSelected(null) }}
                className="flex-1 py-2 border border-gray-600 text-gray-300 rounded-xl text-sm">Annuler</button>
              <button onClick={sauvegarder} disabled={saving}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl text-sm font-medium">
                {saving ? '...' : selected ? 'Mettre à jour' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
