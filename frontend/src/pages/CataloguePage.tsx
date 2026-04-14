import { useState, useEffect } from 'react'
import api from '@services/api'
import toast from 'react-hot-toast'
import { useAuthStore } from '@store/useStore'

interface TypeEquipement {
  id: string; code: string; nom: string
  geom_type: string; statut: string; icone: string; couleur: string
  description?: string; categorie_nom?: string; famille?: string
}

const FAMILLES: Record<string, { label: string; icon: string; color: string; codes: string[] }> = {
  'noeud_telecom': {
    label: 'Nœuds Télécom', icon: '📡', color: '#1D4ED8',
    codes: ['NRO','SRO','PM','PBO','PTO','SBO','EOC']
  },
  'lien_telecom': {
    label: 'Câbles & Liens Télécom', icon: '〰️', color: '#3B82F6',
    codes: ['CAB_OPT','CAB_72FO','CAB_24FO','CAB_12FO','JARRETIERE','LOVAGE']
  },
  'noeud_gc': {
    label: 'Nœuds Génie Civil', icon: '🏗️', color: '#F59E0B',
    codes: ['L1T','L2T','L3T','L4T','REGARD','POTEAU','PYLONE']
  },
  'lien_gc': {
    label: 'Fourreaux & Conduites GC', icon: '⚡', color: '#D97706',
    codes: ['FOURREAU','MCR','TRANCHEE','CHEMIN_CAB','GAINE','AERIEN']
  },
  'zone': {
    label: 'Zones & Périmètres', icon: '🗺️', color: '#10B981',
    codes: ['ZONE_NRO','ZONE_SRO','ZONE_PM','ZONE_PRIORITAIRE','ZONE_EXCLUSION']
  },
  'autre': {
    label: 'Autres équipements', icon: '📦', color: '#6B7280',
    codes: []
  }
}

// Données de référence PCR v2.5
const PCR_TYPES: TypeEquipement[] = [
  // Nœuds Télécom
  { id:'nt1', code:'NRO', nom:'Nœud Raccordement Optique',    geom_type:'POINT', statut:'valide', icone:'🔵', couleur:'#1D4ED8', famille:'noeud_telecom', categorie_nom:'Télécom', description:'OLT GPON/XGS-PON — Jusqu\'à 128 splitters' },
  { id:'nt2', code:'SRO', nom:'Sous-Répartiteur Optique',      geom_type:'POINT', statut:'valide', icone:'🟣', couleur:'#6366F1', famille:'noeud_telecom', categorie_nom:'Télécom', description:'Boîtier étanche IP55 — Splitter 1:8 à 1:32' },
  { id:'nt3', code:'PM',  nom:'Point de Mutualisation',         geom_type:'POINT', statut:'valide', icone:'🔹', couleur:'#60A5FA', famille:'noeud_telecom', categorie_nom:'Télécom', description:'Armoire rue — 300 EL max — Accès opérateurs tiers' },
  { id:'nt4', code:'PBO', nom:'Point de Branchement Optique',   geom_type:'POINT', statut:'valide', icone:'🔷', couleur:'#8B5CF6', famille:'noeud_telecom', categorie_nom:'Télécom', description:'Boîtier façade — 4 à 12 abonnés' },
  { id:'nt5', code:'PTO', nom:'Point de Terminaison Optique',   geom_type:'POINT', statut:'valide', icone:'◾', couleur:'#A78BFA', famille:'noeud_telecom', categorie_nom:'Télécom', description:'Prise fibre logement — Standard SC/APC' },
  { id:'nt6', code:'SBO', nom:'Sous-Boîtier Optique',          geom_type:'POINT', statut:'valide', icone:'🔸', couleur:'#7C3AED', famille:'noeud_telecom', categorie_nom:'Télécom', description:'Intermédiaire PBO→PTO — Immeuble collectif' },
  // Liens Télécom
  { id:'lt1', code:'CAB_OPT', nom:'Câble Optique Générique',   geom_type:'LINESTRING', statut:'valide', icone:'〰️', couleur:'#3B82F6', famille:'lien_telecom', categorie_nom:'Télécom', description:'Monomode G.657 — Transport/Distribution/Branchement' },
  { id:'lt2', code:'CAB_72FO',nom:'Câble Optique 72 Fibres',   geom_type:'LINESTRING', statut:'valide', icone:'〰️', couleur:'#2563EB', famille:'lien_telecom', categorie_nom:'Télécom', description:'Transport NRO→SRO — Armé ADSS ou souterrain' },
  { id:'lt3', code:'CAB_24FO',nom:'Câble Optique 24 Fibres',   geom_type:'LINESTRING', statut:'valide', icone:'〰️', couleur:'#3B82F6', famille:'lien_telecom', categorie_nom:'Télécom', description:'Distribution SRO→PM' },
  { id:'lt4', code:'CAB_12FO',nom:'Câble Optique 12 Fibres',   geom_type:'LINESTRING', statut:'valide', icone:'〰️', couleur:'#60A5FA', famille:'lien_telecom', categorie_nom:'Télécom', description:'Branchement PM→PBO' },
  { id:'lt5', code:'JARRETIERE',nom:'Jarretière Optique',       geom_type:'LINESTRING', statut:'valide', icone:'〰️', couleur:'#93C5FD', famille:'lien_telecom', categorie_nom:'Télécom', description:'Raccordement intérieur — SC/APC duplex' },
  // Nœuds GC
  { id:'gc1', code:'L1T',    nom:'Chambre de tirage L1T',       geom_type:'POINT', statut:'valide', icone:'🟡', couleur:'#F59E0B', famille:'noeud_gc', categorie_nom:'Génie Civil', description:'1000×600×800mm — 1 à 4 fourreaux' },
  { id:'gc2', code:'L2T',    nom:'Chambre de tirage L2T',       geom_type:'POINT', statut:'valide', icone:'🟠', couleur:'#F97316', famille:'noeud_gc', categorie_nom:'Génie Civil', description:'1200×700×1000mm — 4 à 8 fourreaux' },
  { id:'gc3', code:'L3T',    nom:'Chambre de tirage L3T',       geom_type:'POINT', statut:'valide', icone:'🔴', couleur:'#EF4444', famille:'noeud_gc', categorie_nom:'Génie Civil', description:'1400×800×1200mm — 8 à 12 fourreaux' },
  { id:'gc4', code:'L4T',    nom:'Chambre de jonction L4T',     geom_type:'POINT', statut:'valide', icone:'🔴', couleur:'#DC2626', famille:'noeud_gc', categorie_nom:'Génie Civil', description:'1600×900×1400mm — 12 à 24 fourreaux' },
  { id:'gc5', code:'POTEAU', nom:'Appui Aérien / Poteau',       geom_type:'POINT', statut:'valide', icone:'🪵', couleur:'#92400E', famille:'noeud_gc', categorie_nom:'Génie Civil', description:'Béton armé H=8m min — Zone urbaine' },
  { id:'gc6', code:'REGARD', nom:'Regard de visite',            geom_type:'POINT', statut:'valide', icone:'⬜', couleur:'#78716C', famille:'noeud_gc', categorie_nom:'Génie Civil', description:'Accès réseau souterrain — Fonte ou béton' },
  // Liens GC
  { id:'lg1', code:'FOURREAU', nom:'Fourreau PEHD Ø32mm',      geom_type:'LINESTRING', statut:'valide', icone:'⚡', couleur:'#D97706', famille:'lien_gc', categorie_nom:'Génie Civil', description:'Couleur orange — Dédié fibre optique Orange CI' },
  { id:'lg2', code:'MCR',      nom:'Micro-Tranchée',            geom_type:'LINESTRING', statut:'valide', icone:'〰️', couleur:'#B45309', famille:'lien_gc', categorie_nom:'Génie Civil', description:'Largeur 30mm, profondeur 200mm — Zone urbaine dense' },
  { id:'lg3', code:'TRANCHEE', nom:'Tranchée standard',         geom_type:'LINESTRING', statut:'valide', icone:'⬜', couleur:'#78350F', famille:'lien_gc', categorie_nom:'Génie Civil', description:'Profondeur ≥60cm — Grillage avertisseur orange' },
  { id:'lg4', code:'AERIEN',   nom:'Lien aérien / Poteau',      geom_type:'LINESTRING', statut:'valide', icone:'〰️', couleur:'#A16207', famille:'lien_gc', categorie_nom:'Génie Civil', description:'Entre poteaux — Câble ADSS autoportant' },
  // Zones
  { id:'zo1', code:'ZONE_NRO', nom:'Zone de desserte NRO',      geom_type:'POLYGON', statut:'valide', icone:'🗺️', couleur:'#1D4ED8', famille:'zone', categorie_nom:'Zone', description:'Périmètre de desserte d\'un NRO — ~30 000 EL' },
  { id:'zo2', code:'ZONE_SRO', nom:'Zone de desserte SRO',      geom_type:'POLYGON', statut:'valide', icone:'🗺️', couleur:'#6366F1', famille:'zone', categorie_nom:'Zone', description:'Périmètre de desserte d\'un SRO — ~3 000 EL' },
  { id:'zo3', code:'ZONE_PM',  nom:'Zone de desserte PM',       geom_type:'POLYGON', statut:'valide', icone:'🗺️', couleur:'#10B981', famille:'zone', categorie_nom:'Zone', description:'Zone de mutualisation — 300 EL max' },
]

const GEOM_LABELS: Record<string,string> = { POINT:'Ponctuel', LINESTRING:'Linéaire', POLYGON:'Surfacique' }

export default function CataloguePage() {
  const [types,      setTypes]      = useState<TypeEquipement[]>([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [showForm,   setShowForm]   = useState(false)
  const [selected,   setSelected]   = useState<TypeEquipement | null>(null)
  const [saving,     setSaving]     = useState(false)
  const [collapsed,  setCollapsed]  = useState<Record<string,boolean>>({})
  const [form, setForm] = useState<any>({
    code:'', nom:'', geom_type:'POINT', statut:'valide',
    icone:'📡', couleur:'#3B82F6', description:'', famille:'noeud_telecom'
  })
  const { hasRole } = useAuthStore()
  const isAdmin = hasRole('admin')

  useEffect(() => { charger() }, [])

  const charger = async () => {
    setLoading(true)
    try {
      const r = await api.get('/equipements/types')
      const data = r.data || []
      // Merge API types avec PCR types, API types priment
      const apiCodes = new Set(data.map((t: any) => t.code))
      const merged = [
        ...PCR_TYPES.filter(t => !apiCodes.has(t.code)),
        ...data
      ]
      setTypes(merged)
    } catch {
      setTypes(PCR_TYPES)
    }
    setLoading(false)
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
        toast.success(`${form.code} créé`)
      }
      setShowForm(false); setSelected(null); charger()
    } catch {
      // Mode local si API non dispo
      if (selected) {
        setTypes(ts => ts.map(t => t.id === selected.id ? { ...t, ...form } : t))
      } else {
        setTypes(ts => [...ts, { ...form, id: `local_${Date.now()}` }])
      }
      toast.success(selected ? 'Mis à jour' : `${form.code} créé`)
      setShowForm(false); setSelected(null)
    }
    setSaving(false)
  }

  const supprimer = async (type: TypeEquipement) => {
    if (!confirm(`Supprimer "${type.nom}" ?`)) return
    try {
      await api.delete(`/equipements/types/${type.id}`)
    } catch {}
    setTypes(ts => ts.filter(t => t.id !== type.id))
    toast.success('Supprimé')
  }

  const toggleFamille = (f: string) =>
    setCollapsed(c => ({ ...c, [f]: !c[f] }))

  // Organiser par famille
  const byFamille = Object.entries(FAMILLES).map(([key, def]) => {
    const items = types.filter(t => {
      const match = search.toLowerCase()
      const matchSearch = !match || t.nom.toLowerCase().includes(match) || t.code.toLowerCase().includes(match)
      const famille = t.famille || (def.codes.includes(t.code) ? key : null) || 'autre'
      return famille === key && matchSearch
    })
    return { key, def, items }
  }).filter(({ items }) => items.length > 0)

  return (
    <div className="h-full overflow-auto bg-gray-950">
      {/* Header sticky */}
      <div className="sticky top-0 z-10 bg-gray-900 border-b border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-bold text-white">📦 Catalogue PCR v2.5</h1>
            <p className="text-xs text-gray-400 hidden sm:block">{types.length} types · Référentiel Orange CI</p>
          </div>
          <div className="flex gap-2">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="w-32 sm:w-48 bg-gray-800 border border-gray-700 rounded-xl px-3 py-1.5 text-white text-xs outline-none focus:border-blue-500 placeholder-gray-600" />
            {isAdmin && (
              <button onClick={() => { setSelected(null); setForm({ code:'', nom:'', geom_type:'POINT', statut:'valide', icone:'📡', couleur:'#3B82F6', famille:'noeud_telecom' }); setShowForm(true) }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-xl font-medium whitespace-nowrap">
                + Nouveau
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-3 sm:p-4 space-y-3">
        {loading ? (
          Array(4).fill(0).map((_,i) => <div key={i} className="h-20 bg-gray-800/50 rounded-xl animate-pulse" />)
        ) : byFamille.map(({ key, def, items }) => (
          <div key={key} className="bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden">
            {/* En-tête famille */}
            <button onClick={() => toggleFamille(key)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800 transition-all">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                style={{ background: def.color + '22', border: `1.5px solid ${def.color}66` }}>
                {def.icon}
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-bold text-white">{def.label}</p>
                <p className="text-xs text-gray-400">{items.length} type(s)</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: def.color }} />
                <span className="text-gray-400 text-xs">{collapsed[key] ? '▼' : '▲'}</span>
              </div>
            </button>

            {/* Liste équipements */}
            {!collapsed[key] && (
              <div className="border-t border-gray-800 divide-y divide-gray-800/50">
                {items.map(t => (
                  <div key={t.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-800/30">
                    {/* Icone colorée */}
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                      style={{ background: t.couleur + '22', border: `1px solid ${t.couleur}55` }}>
                      {t.icone}
                    </div>

                    {/* Infos */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md"
                          style={{ background: t.couleur + '33', color: t.couleur }}>
                          {t.code}
                        </span>
                        <span className="text-sm font-medium text-white truncate">{t.nom}</span>
                      </div>
                      {t.description && (
                        <p className="text-xs text-gray-500 mt-0.5 truncate hidden sm:block">{t.description}</p>
                      )}
                    </div>

                    {/* Tags */}
                    <div className="hidden md:flex items-center gap-1.5 flex-shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-lg ${
                        t.geom_type==='POINT' ? 'bg-blue-900/40 text-blue-300' :
                        t.geom_type==='LINESTRING' ? 'bg-purple-900/40 text-purple-300' :
                        'bg-teal-900/40 text-teal-300'}`}>
                        {GEOM_LABELS[t.geom_type]}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-lg ${
                        t.statut==='valide' ? 'bg-green-900/40 text-green-400' : 'bg-gray-800 text-gray-400'}`}>
                        {t.statut}
                      </span>
                    </div>

                    {/* Actions admin */}
                    {isAdmin && (
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => { setSelected(t); setForm({...t}); setShowForm(true) }}
                          className="p-1.5 bg-blue-900/40 text-blue-400 rounded-lg hover:bg-blue-900 text-xs">✏️</button>
                        <button onClick={() => supprimer(t)}
                          className="p-1.5 bg-red-900/40 text-red-400 rounded-lg hover:bg-red-900 text-xs">🗑️</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Formulaire */}
      {showForm && isAdmin && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-white">{selected ? 'Modifier' : 'Nouveau type'}</h2>
              <button onClick={() => { setShowForm(false); setSelected(null) }} className="text-gray-500 hover:text-white text-xl">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Famille</label>
                <select value={form.famille||'noeud_telecom'} onChange={e => setForm((x:any)=>({...x, famille:e.target.value}))}
                  className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm outline-none">
                  {Object.entries(FAMILLES).map(([k,v]) => (
                    <option key={k} value={k}>{v.icon} {v.label}</option>
                  ))}
                </select>
              </div>
              {[['code','Code PCR (ex: NRO)'],['nom','Nom complet'],['icone','Icône (emoji)'],['couleur','Couleur hex']].map(([f,l]) => (
                <div key={f}>
                  <label className="block text-xs text-gray-400 mb-1">{l}</label>
                  <input value={form[f]||''} onChange={e => setForm((x:any)=>({...x,[f]:e.target.value}))}
                    className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-blue-500" />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Géométrie</label>
                  <select value={form.geom_type||'POINT'} onChange={e => setForm((x:any)=>({...x,geom_type:e.target.value}))}
                    className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-white text-xs outline-none">
                    {Object.entries(GEOM_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Statut</label>
                  <select value={form.statut||'valide'} onChange={e => setForm((x:any)=>({...x,statut:e.target.value}))}
                    className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-white text-xs outline-none">
                    {['valide','en_attente','archive'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Description</label>
                <textarea value={form.description||''} onChange={e => setForm((x:any)=>({...x,description:e.target.value}))} rows={2}
                  className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm outline-none resize-none" />
              </div>
              {form.icone && form.couleur && (
                <div className="flex items-center gap-3 bg-gray-800 rounded-xl p-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                    style={{ background: form.couleur+'33', border: `1px solid ${form.couleur}66` }}>
                    {form.icone}
                  </div>
                  <div>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md"
                      style={{ background: form.couleur+'33', color: form.couleur }}>{form.code||'CODE'}</span>
                    <p className="text-xs text-gray-300 mt-1">{form.nom||'Nom'}</p>
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
