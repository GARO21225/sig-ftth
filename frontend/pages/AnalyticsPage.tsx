import { useState, useEffect } from 'react'
import api from '@services/api'
import toast from 'react-hot-toast'

export default function AnalyticsPage() {
  const [saturation,  setSaturation]  = useState<any[]>([])
  const [activite,    setActivite]    = useState<any[]>([])
  const [prediction,  setPrediction]  = useState<any>(null)
  const [selectedNode,setSelectedNode]= useState('')
  const [noeuds,      setNoeuds]      = useState<any[]>([])
  const [loading,     setLoading]     = useState(true)
  const [tab,         setTab]         = useState<'saturation'|'prediction'|'activite'>('saturation')

  useEffect(() => { charger() }, [])

  const charger = async () => {
    setLoading(true)
    const [rSat, rAct, rNoeuds] = await Promise.allSettled([
      api.get('/analytics/saturation-noeuds?seuil=0'),
      api.get('/analytics/activite-reseau?jours=30'),
      api.get('/noeuds-telecom'),
    ])
    if (rSat.status === 'fulfilled') setSaturation(rSat.value.data.noeuds || [])
    if (rAct.status === 'fulfilled') setActivite(rAct.value.data.activite || [])
    if (rNoeuds.status === 'fulfilled') setNoeuds(rNoeuds.value.data || [])
    setLoading(false)
  }

  const fetchPrediction = async () => {
    if (!selectedNode) return toast.error('Sélectionnez un nœud')
    try {
      const r = await api.get(`/analytics/prediction-saturation/${selectedNode}`)
      setPrediction(r.data)
    } catch (e: any) { toast.error(e.response?.data?.detail || 'Erreur') }
  }

  const SAT_COLOR = (pct: number) => pct >= 90 ? '#EF4444' : pct >= 75 ? '#F59E0B' : pct >= 50 ? '#3B82F6' : '#10B981'

  return (
    <div className="h-full overflow-auto bg-gray-950 p-6">
      <div className="max-w-5xl mx-auto">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">📈 Analytics réseau</h1>
            <p className="text-gray-400 text-sm mt-1">Saturation, prédictions, activité</p>
          </div>
          <button onClick={charger} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-sm text-gray-300">🔄</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-900 border border-gray-700 rounded-xl p-1 w-fit">
          {([['saturation','⚠️ Saturation'],['prediction','🤖 Prédiction IA'],['activite','📊 Activité']] as const).map(([t,label]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab===t?'bg-blue-600 text-white':'text-gray-400 hover:text-white'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Saturation tab */}
        {tab === 'saturation' && (
          <div>
            <div className="grid grid-cols-4 gap-3 mb-6">
              {[
                { label:'Critique (≥90%)', count: saturation.filter(n=>n.saturation_pct>=90).length, color:'#EF4444' },
                { label:'Alerte (75-89%)', count: saturation.filter(n=>n.saturation_pct>=75&&n.saturation_pct<90).length, color:'#F59E0B' },
                { label:'Attention (50-74%)', count: saturation.filter(n=>n.saturation_pct>=50&&n.saturation_pct<75).length, color:'#3B82F6' },
                { label:'Normal (<50%)', count: saturation.filter(n=>n.saturation_pct<50).length, color:'#10B981' },
              ].map((s,i) => (
                <div key={i} className="bg-gray-900 border border-gray-700 rounded-2xl p-4 text-center">
                  <div className="text-2xl font-bold" style={{color:s.color}}>{s.count}</div>
                  <div className="text-xs text-gray-400 mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            {loading ? <div className="text-center py-12 text-gray-500">⏳ Chargement...</div> : (
              <div className="bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-700">
                  <h2 className="font-semibold text-white text-sm">Saturation par nœud — {saturation.length} nœuds</h2>
                </div>
                <div className="divide-y divide-gray-800">
                  {saturation.sort((a,b)=>b.saturation_pct-a.saturation_pct).map((n: any) => (
                    <div key={n.id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-800/50">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{n.nom_unique}</p>
                        <p className="text-xs text-gray-400">{n.type_noeud}</p>
                      </div>
                      <div className="text-xs text-gray-400">{n.nb_fibres_utilisees}/{n.capacite_fibres_max} fibres</div>
                      <div className="w-24">
                        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all"
                            style={{width:`${Math.min(n.saturation_pct,100)}%`, background: SAT_COLOR(n.saturation_pct)}} />
                        </div>
                      </div>
                      <div className="text-sm font-bold w-12 text-right" style={{color:SAT_COLOR(n.saturation_pct)}}>
                        {n.saturation_pct}%
                      </div>
                      <button onClick={() => {setSelectedNode(n.id); setTab('prediction')}}
                        className="px-2 py-1 bg-gray-800 text-gray-400 text-xs rounded-lg hover:bg-gray-700">
                        🤖 Préd.
                      </button>
                    </div>
                  ))}
                  {saturation.length === 0 && (
                    <div className="py-8 text-center text-gray-500 text-sm">Aucun nœud avec capacité définie — ajoutez capacite_fibres_max aux nœuds</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Prédiction IA tab */}
        {tab === 'prediction' && (
          <div>
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 mb-4">
              <h2 className="font-semibold text-white text-sm mb-3">🤖 Prédiction de saturation par régression linéaire</h2>
              <div className="flex gap-3">
                <select value={selectedNode} onChange={e => setSelectedNode(e.target.value)}
                  className="flex-1 bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm outline-none">
                  <option value="">-- Choisir un nœud --</option>
                  {noeuds.filter((n:any)=>n.capacite_fibres_max>0).map((n:any) => (
                    <option key={n.id} value={n.id}>{n.nom_unique} ({n.type_noeud})</option>
                  ))}
                </select>
                <button onClick={fetchPrediction}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-xl font-medium">
                  Analyser
                </button>
              </div>
            </div>

            {prediction && (
              <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-white">{prediction.nom}</h3>
                  <span className={`text-xs px-2 py-1 rounded-lg ${
                    prediction.statut==='critique'?'bg-red-900/50 text-red-400':
                    prediction.statut==='alerte'?'bg-orange-900/50 text-orange-400':
                    'bg-green-900/50 text-green-400'
                  }`}>{prediction.statut}</span>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-gray-800 rounded-xl p-3 text-center">
                    <div className="text-xl font-bold text-white">{prediction.saturation_pct}%</div>
                    <div className="text-xs text-gray-400">Saturation actuelle</div>
                  </div>
                  <div className="bg-gray-800 rounded-xl p-3 text-center">
                    <div className="text-xl font-bold text-white">{prediction.fibres_utilisees}/{prediction.capacite_max}</div>
                    <div className="text-xs text-gray-400">Fibres utilisées/max</div>
                  </div>
                  {prediction.prediction && (
                    <div className="bg-gray-800 rounded-xl p-3 text-center">
                      <div className={`text-xl font-bold ${prediction.prediction.jours_avant_saturation < 30 ? 'text-red-400' : prediction.prediction.jours_avant_saturation < 90 ? 'text-orange-400' : 'text-green-400'}`}>
                        {prediction.prediction.jours_avant_saturation}j
                      </div>
                      <div className="text-xs text-gray-400">Avant saturation</div>
                    </div>
                  )}
                </div>

                {prediction.prediction ? (
                  <div className="bg-blue-900/20 border border-blue-700/30 rounded-xl p-3 text-xs text-blue-300 space-y-1">
                    <p>📈 Croissance : +{prediction.prediction.slope_par_periode} fibres/période</p>
                    <p>🎯 Confiance : {prediction.prediction.niveau_confiance} ({prediction.prediction.nb_points_historique} points)</p>
                    <p>⚠️ Action recommandée : {prediction.prediction.jours_avant_saturation < 60 ? 'Planifier extension réseau rapidement' : 'Surveiller l\'évolution mensuelle'}</p>
                  </div>
                ) : (
                  <div className="bg-gray-800 rounded-xl p-3 text-sm text-gray-400">
                    {prediction.message || 'Données historiques insuffisantes pour la prédiction'}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Activité tab */}
        {tab === 'activite' && (
          <div>
            <div className="bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-700">
                <h2 className="font-semibold text-white text-sm">Activité réseau — 30 derniers jours</h2>
              </div>
              {activite.length === 0 ? (
                <div className="py-8 text-center text-gray-500 text-sm">
                  Aucune activité enregistrée — les triggers d'historisation seront actifs après le prochain déploiement
                </div>
              ) : (
                <div className="divide-y divide-gray-800">
                  {activite.slice(0,30).map((a: any, i: number) => (
                    <div key={i} className="flex items-center gap-4 px-4 py-2.5">
                      <div className="text-xs text-gray-500 w-24 flex-shrink-0">{String(a.jour).slice(0,10)}</div>
                      <div className="text-xs font-mono text-blue-400 w-32">{a.table_cible}</div>
                      <div className={`text-xs px-2 py-0.5 rounded ${
                        a.action==='INSERT'?'bg-green-900/40 text-green-400':
                        a.action==='UPDATE'?'bg-blue-900/40 text-blue-400':
                        'bg-red-900/40 text-red-400'
                      }`}>{a.action}</div>
                      <div className="text-xs text-white ml-auto">{a.nb} opération(s)</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
