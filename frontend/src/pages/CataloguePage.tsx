import { useState, useEffect } from 'react'
import api from '@services/api'
import toast from 'react-hot-toast'

interface Categorie { id: string; nom: string; icone: string; couleur: string; reseau: string }
interface TypeEquipement { id: string; code: string; nom: string; geom_type: string; statut: string; icone: string; couleur: string }

export default function CataloguePage() {
  const [categories,  setCategories]  = useState<Categorie[]>([])
  const [types,       setTypes]       = useState<TypeEquipement[]>([])
  const [catActive,   setCatActive]   = useState<string | null>(null)
  const [search,      setSearch]      = useState('')
  const [loading,     setLoading]     = useState(true)

  useEffect(() => { charger() }, [])

  const charger = async () => {
    setLoading(true)
    try {
      const [rCat, rTypes] = await Promise.allSettled([
        api.get('/catalogue'),
        api.get('/equipements'),
      ])
      if (rCat.status === 'fulfilled') setCategories(rCat.value.data?.categories || [])
      if (rTypes.status === 'fulfilled') setTypes(rTypes.value.data?.types || [])
    } catch {
      // Fallback: seed data visible même sans PostGIS
    } finally { setLoading(false) }
  }

  // Seed statique basé sur seed.sql si l'API retourne vide
  const categoriesSeed: Categorie[] = categories.length ? categories : [
    { id: '1', nom: 'Télécom',     icone: '📡', couleur: '#3B82F6', reseau: 'telecom' },
    { id: '2', nom: 'Génie Civil', icone: '🏗️', couleur: '#F59E0B', reseau: 'gc'     },
    { id: '3', nom: 'Énergie',     icone: '⚡', couleur: '#10B981', reseau: 'energie' },
    { id: '4', nom: 'Sécurité',    icone: '🔒', couleur: '#EF4444', reseau: 'securite'},
  ]

  const typesSeed: TypeEquipement[] = types.length ? types : [
    { id:'1', code:'NRO', nom:'Nœud Raccordement Optique', geom_type:'POINT',      statut:'valide', icone:'🔵', couleur:'#1D4ED8' },
    { id:'2', code:'SRO', nom:'Sous-Répartiteur Optique',  geom_type:'POINT',      statut:'valide', icone:'🟣', couleur:'#6366F1' },
    { id:'3', code:'PBO', nom:'Point Branchement Optique', geom_type:'POINT',      statut:'valide', icone:'🔷', couleur:'#8B5CF6' },
    { id:'4', code:'PTO', nom:'Point Terminaison Optique', geom_type:'POINT',      statut:'valide', icone:'◾', couleur:'#A78BFA' },
    { id:'5', code:'PM',  nom:'Point Mutualisation',       geom_type:'POINT',      statut:'valide', icone:'🔹', couleur:'#60A5FA' },
    { id:'6', code:'CAB_OPT', nom:'Câble Optique',         geom_type:'LINESTRING', statut:'valide', icone:'〰️', couleur:'#3B82F6' },
    { id:'7', code:'L1T', nom:'Chambre L1T',               geom_type:'POINT',      statut:'valide', icone:'🟡', couleur:'#F59E0B' },
    { id:'8', code:'L2T', nom:'Chambre L2T',               geom_type:'POINT',      statut:'valide', icone:'🟠', couleur:'#F97316' },
    { id:'9', code:'L4T', nom:'Chambre L4T',               geom_type:'POINT',      statut:'valide', icone:'🔴', couleur:'#EF4444' },
    { id:'10',code:'POTEAU', nom:'Appui Aérien',           geom_type:'POINT',      statut:'valide', icone:'🪵', couleur:'#92400E' },
    { id:'11',code:'FOURREAU', nom:'Fourreau/Conduite',    geom_type:'LINESTRING', statut:'valide', icone:'⚡', couleur:'#D97706' },
    { id:'12',code:'MICRO_TR', nom:'Micro-tranchée',       geom_type:'LINESTRING', statut:'valide', icone:'〰️', couleur:'#B45309' },
  ]

  const typesFiltres = typesSeed.filter(t =>
    (!catActive) &&
    (t.nom.toLowerCase().includes(search.toLowerCase()) ||
     t.code.toLowerCase().includes(search.toLowerCase()))
  )

  const GEOM_LABELS: Record<string,string> = { POINT:'Ponctuel', LINESTRING:'Linéaire', POLYGON:'Surfacique' }

  return (
    <div className="h-full overflow-auto bg-gray-950 p-6">
      <div className="max-w-5xl mx-auto">

        {/* Entête */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-1">📦 Catalogue équipements</h1>
          <p className="text-gray-400 text-sm">Référentiel des types d'équipements SIG FTTH — PCR v2.5</p>
        </div>

        {/* Filtre recherche */}
        <div className="mb-4 flex gap-3">
          <div className="flex-1 flex items-center bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
            <span className="pl-4 text-gray-500">🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un équipement (code, nom)..."
              className="flex-1 bg-transparent px-3 py-2.5 text-white text-sm outline-none placeholder-gray-600" />
          </div>
          <button onClick={() => setCatActive(null)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${!catActive ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
            Tous
          </button>
        </div>

        {/* Catégories */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {categoriesSeed.map(cat => (
            <button key={cat.id} onClick={() => setCatActive(catActive === cat.id ? null : cat.id)}
              className={`p-4 rounded-2xl border-2 text-left transition-all ${catActive === cat.id ? 'border-blue-500 bg-blue-900/20' : 'border-gray-700 bg-gray-900 hover:border-gray-500'}`}>
              <div className="text-2xl mb-2">{cat.icone}</div>
              <div className="font-medium text-white text-sm">{cat.nom}</div>
              <div className="text-xs text-gray-400 mt-1">{cat.reseau}</div>
            </button>
          ))}
        </div>

        {/* Types équipements */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">⏳ Chargement...</div>
        ) : (
          <div className="bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
              <h2 className="font-semibold text-white text-sm">
                Types d'équipements {catActive ? `— ${categoriesSeed.find(c=>c.id===catActive)?.nom}` : '— Tous'}
              </h2>
              <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded-lg">{typesSeed.length} types</span>
            </div>
            <div className="divide-y divide-gray-800">
              {typesSeed
                .filter(t => !search || t.nom.toLowerCase().includes(search.toLowerCase()) || t.code.toLowerCase().includes(search.toLowerCase()))
                .map(t => (
                <div key={t.id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-800/50 transition-colors">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{ background: t.couleur + '22', border: `1px solid ${t.couleur}55` }}>
                    {t.icone}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md"
                        style={{ background: t.couleur + '33', color: t.couleur }}>
                        {t.code}
                      </span>
                      <span className="text-sm font-medium text-white truncate">{t.nom}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs px-2 py-1 rounded-lg ${t.geom_type==='POINT' ? 'bg-blue-900/50 text-blue-300' : t.geom_type==='LINESTRING' ? 'bg-purple-900/50 text-purple-300' : 'bg-teal-900/50 text-teal-300'}`}>
                      {GEOM_LABELS[t.geom_type] || t.geom_type}
                    </span>
                    <span className="text-xs px-2 py-1 rounded-lg bg-green-900/40 text-green-400">{t.statut}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contraintes PCR */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4">
            <h3 className="font-semibold text-white text-sm mb-3">🔒 Contraintes topologiques (PCR v2.5)</h3>
            <ul className="space-y-2 text-xs text-gray-400">
              <li className="flex gap-2"><span className="text-green-400">✓</span> Géométrie valide (ST_IsValid)</li>
              <li className="flex gap-2"><span className="text-green-400">✓</span> Pas de doublons spatiaux (&lt; 1m)</li>
              <li className="flex gap-2"><span className="text-green-400">✓</span> Câbles connectés à 2 nœuds</li>
              <li className="flex gap-2"><span className="text-green-400">✓</span> Continuité réseau assurée</li>
              <li className="flex gap-2"><span className="text-green-400">✓</span> Cohérence câble / fourreau GC</li>
            </ul>
          </div>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4">
            <h3 className="font-semibold text-white text-sm mb-3">📋 Contraintes attributaires</h3>
            <ul className="space-y-2 text-xs text-gray-400">
              <li className="flex gap-2"><span className="text-green-400">✓</span> Champs obligatoires vérifiés</li>
              <li className="flex gap-2"><span className="text-green-400">✓</span> fibres_utilisees ≤ nb_fibres</li>
              <li className="flex gap-2"><span className="text-green-400">✓</span> ports_utilises ≤ nombre_ports</li>
              <li className="flex gap-2"><span className="text-green-400">✓</span> Unicité nom_unique</li>
              <li className="flex gap-2"><span className="text-green-400">✓</span> Typologie contrôlée</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
