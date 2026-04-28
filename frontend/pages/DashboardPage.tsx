import { useState, useEffect } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import api from '@services/api'
import toast from 'react-hot-toast'

const COLORS = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#6366F1']

interface KPI {
  nb_noeuds_telecom: number; nb_noeuds_gc: number
  nb_liens_telecom: number;  nb_liens_gc: number
  total_logements: number;   el_raccordables: number
  el_raccordes: number;      taux_penetration_pct: number
  ot_en_cours: number;       ot_planifie: number; ot_termine: number
  longueur_reseau_km: number
}

export default function DashboardPage() {
  const [kpi,      setKpi]      = useState<KPI | null>(null)
  const [noeuds,   setNoeuds]   = useState<any[]>([])
  const [alertes,  setAlertes]  = useState<any[]>([])
  const [activite, setActivite] = useState<any[]>([])
  const [satNodes, setSatNodes] = useState<any[]>([])
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState<'overview'|'reseau'|'travaux'|'el'>('overview')

  useEffect(() => { charger() }, [])

  const charger = async () => {
    setLoading(true)
    try {
      const [rSynthese, rAnalytics] = await Promise.allSettled([
        api.get('/dashboard/synthese'),
        api.get('/analytics/saturation-noeuds'),
      ])

      if (rSynthese.status === 'fulfilled') {
        const d = rSynthese.value.data
        setKpi(d)
        setNoeuds(d.repartition_noeuds || [])
        setAlertes(d.alertes || [])
      }
      if (rAnalytics.status === 'fulfilled') {
        const nodes = rAnalytics.value.data || []
        setSatNodes(nodes.slice(0, 8))
      }

      // Données d'activité simulées (évolution sur 7 jours)
      const dates = Array.from({length:7}, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (6-i))
        return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })
      })
      setActivite(dates.map((d, i) => ({
        date: d,
        noeuds: Math.floor(Math.random() * 5),
        liens: Math.floor(Math.random() * 8),
        logements: Math.floor(Math.random() * 20),
      })))

    } catch (e: any) {
      toast.error('Erreur chargement dashboard')
    } finally { setLoading(false) }
  }

  const pct = ((kpi?.el_raccordes || 0) / Math.max(kpi?.el_raccordables || 1, 1) * 100).toFixed(1)

  const safeKpi = {
    nb_noeuds_telecom: kpi?.nb_noeuds_telecom || 0,
    nb_noeuds_gc: kpi?.nb_noeuds_gc || 0,
    nb_liens_telecom: kpi?.nb_liens_telecom || 0,
    nb_liens_gc: kpi?.nb_liens_gc || 0,
    total_logements: kpi?.total_logements || 0,
    el_raccordables: kpi?.el_raccordables || 0,
    el_raccordes: kpi?.el_raccordes || 0,
    taux_penetration_pct: kpi?.taux_penetration_pct || 0,
    ot_en_cours: kpi?.ot_en_cours || 0,
    ot_planifie: kpi?.ot_planifie || 0,
    ot_termine: kpi?.ot_termine || 0,
    longueur_reseau_km: kpi?.longueur_reseau_km || 0,
  }
  const kpiCards = [
    { label: 'Nœuds Télécom', value: safeKpi.nb_noeuds_telecom, icon: '📡', color: 'text-blue-400', sub: `+ ${safeKpi.nb_noeuds_gc} GC` },
    { label: 'Câbles Optiques', value: safeKpi.nb_liens_telecom, icon: '〰️', color: 'text-indigo-400', sub: `+ ${safeKpi.nb_liens_gc} GC` },
    { label: 'Logements EL', value: safeKpi.total_logements.toLocaleString(), icon: '🏠', color: 'text-emerald-400', sub: `${safeKpi.el_raccordables.toLocaleString()} raccordables` },
    { label: 'Taux pénétration', value: `${pct}%`, icon: '📈', color: Number(pct) > 50 ? 'text-green-400' : 'text-orange-400', sub: `${safeKpi.el_raccordes.toLocaleString()} raccordés` },
    { label: 'OT en cours', value: safeKpi.ot_en_cours, icon: '🔧', color: 'text-yellow-400', sub: `${safeKpi.ot_planifie} planifiés` },
    { label: 'Réseau total', value: `${safeKpi.longueur_reseau_km.toFixed(1)} km`, icon: '📏', color: 'text-purple-400', sub: 'fibre déployée' },
  ]

  const pieData = [
    { name: 'Raccordés',     value: safeKpi.el_raccordes },
    { name: 'Raccordables',  value: Math.max(0, kpi.el_raccordables - safeKpi.el_raccordes) },
    { name: 'Non raccordables', value: Math.max(0, safeKpi.total_logements - safeKpi.el_raccordables) },
  ]

  const otData = [
    { name: 'Planifiés', value: safeKpi.ot_planifie, fill: '#3B82F6' },
    { name: 'En cours',  value: safeKpi.ot_en_cours,  fill: '#F59E0B' },
    { name: 'Terminés',  value: safeKpi.ot_termine,   fill: '#10B981' },
  ]

  return (
    <div className="h-full overflow-auto bg-gray-950 p-3 sm:p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-white">📊 Dashboard SIG FTTH</h1>
          <p className="text-xs text-gray-400">Vue d'ensemble du réseau Orange CI — Grand Abidjan</p>
        </div>
        <div className="flex gap-2">
          <button onClick={charger}
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-xl flex items-center gap-1">
            🔄 Actualiser
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-800/50 rounded-xl p-1 w-fit overflow-x-auto">
        {(['overview','reseau','travaux','el'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${tab===t ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}>
            {t==='overview'?'🏠 Vue générale':t==='reseau'?'📡 Réseau':t==='travaux'?'🔧 Travaux':'🏠 EL'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Array(6).fill(0).map((_,i) => <div key={i} className="h-24 bg-gray-800/50 rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <>
          {/* KPI Cards — toujours visibles */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mb-4">
            {kpiCards.map((k, i) => (
              <div key={i} className="bg-gray-900 border border-gray-700 rounded-2xl p-3 sm:p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400 truncate">{k.label}</p>
                    <p className={`text-xl sm:text-2xl font-bold mt-0.5 ${k.color}`}>{k.value}</p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{k.sub}</p>
                  </div>
                  <span className="text-2xl flex-shrink-0 ml-2">{k.icon}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Barre pénétration globale */}
          {kpi && (
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-white">Taux de pénétration FTTH</span>
                <span className={`text-lg font-bold ${Number(pct) >= 50 ? 'text-green-400' : 'text-orange-400'}`}>{pct}%</span>
              </div>
              <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min(Number(pct), 100)}%`,
                    background: `linear-gradient(90deg, #3B82F6, ${Number(pct) >= 50 ? '#10B981' : '#F59E0B'})` }} />
              </div>
              <div className="flex justify-between mt-1 text-xs text-gray-500">
                <span>0</span>
                <span>{safeKpi.el_raccordes.toLocaleString()} raccordés sur {kpi.el_raccordables.toLocaleString()}</span>
                <span>100%</span>
              </div>
            </div>
          )}

          {/* Contenu par onglet */}
          {tab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Répartition EL */}
              <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4">
                <h3 className="text-sm font-semibold text-white mb-3">🏠 Répartition logements</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={70}
                      dataKey="value" label={({name, percent}) => `${name} ${(percent*100).toFixed(0)}%`}
                      labelLine={false}>
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                    </Pie>
                    <Tooltip formatter={(v:any) => v.toLocaleString()} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Activité 7 jours */}
              <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4">
                <h3 className="text-sm font-semibold text-white mb-3">📈 Activité 7 jours</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={activite}>
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6B7280' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} />
                    <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }} />
                    <Area type="monotone" dataKey="noeuds"   stroke="#3B82F6" fill="#3B82F633" strokeWidth={2} name="Nœuds" />
                    <Area type="monotone" dataKey="liens"    stroke="#10B981" fill="#10B98133" strokeWidth={2} name="Liens" />
                    <Area type="monotone" dataKey="logements"stroke="#F59E0B" fill="#F59E0B33" strokeWidth={2} name="Logements" />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {tab === 'reseau' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Saturation nœuds */}
              <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 md:col-span-2">
                <h3 className="text-sm font-semibold text-white mb-3">⚠️ Saturation nœuds principaux</h3>
                {satNodes.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-8">Aucun nœud avec capacité définie</p>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={satNodes} layout="vertical">
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#6B7280' }}
                        tickFormatter={v => `${v}%`} />
                      <YAxis type="category" dataKey="nom_unique" width={110}
                        tick={{ fontSize: 10, fill: '#D1D5DB' }} />
                      <Tooltip formatter={(v: any) => [`${v}%`, 'Saturation']}
                        contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }} />
                      <Bar dataKey="saturation_pct" radius={[0,4,4,0]}>
                        {satNodes.map((n, i) => (
                          <Cell key={i}
                            fill={n.saturation_pct >= 90 ? '#EF4444' : n.saturation_pct >= 75 ? '#F59E0B' : '#10B981'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Alertes */}
              <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 md:col-span-2">
                <h3 className="text-sm font-semibold text-white mb-3">🔔 Alertes réseau</h3>
                {alertes.length === 0 ? (
                  <div className="text-center py-6">
                    <div className="text-3xl mb-2">✅</div>
                    <p className="text-green-400 text-sm">Aucune alerte — Réseau nominal</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {alertes.slice(0, 6).map((a: any, i: number) => (
                      <div key={i} className={`flex items-start gap-3 p-2.5 rounded-xl text-xs ${
                        a.niveau === 'critique' ? 'bg-red-900/20 border border-red-700/50' :
                        a.niveau === 'warning'  ? 'bg-orange-900/20 border border-orange-700/50' :
                        'bg-gray-800 border border-gray-700'}`}>
                        <span className="flex-shrink-0">{a.niveau === 'critique' ? '🔴' : a.niveau === 'warning' ? '🟡' : 'ℹ️'}</span>
                        <div>
                          <p className="text-white font-medium">{a.message}</p>
                          {a.noeud && <p className="text-gray-400 mt-0.5">{a.noeud}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'travaux' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4">
                <h3 className="text-sm font-semibold text-white mb-3">🔧 Répartition OT par statut</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={otData}>
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                    <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }} />
                    <Bar dataKey="value" radius={[6,6,0,0]}>
                      {otData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4">
                <h3 className="text-sm font-semibold text-white mb-3">📋 Récapitulatif OT</h3>
                <div className="space-y-3">
                  {otData.map((d, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: d.fill }} />
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-300">{d.name}</span>
                          <span className="text-white font-bold">{d.value}</span>
                        </div>
                        <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full rounded-full"
                            style={{ width: `${Math.min(d.value / Math.max(kpi?.ot_planifie||1 + kpi?.ot_en_cours||1 + kpi?.ot_termine||1, 1) * 100, 100)}%`,
                              background: d.fill }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'el' && kpi && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4">
                <h3 className="text-sm font-semibold text-white mb-3">🏠 Entonnoir EL</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Total logements', val: kpi.total_logements, color: '#6B7280', pct: 100 },
                    { label: 'EL raccordables', val: kpi.el_raccordables, color: '#3B82F6', pct: Math.round(kpi.el_raccordables/kpi.total_logements*100) },
                    { label: 'EL raccordés', val: safeKpi.el_raccordes, color: '#10B981', pct: Math.round(safeKpi.el_raccordes/kpi.total_logements*100) },
                  ].map((s, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">{s.label}</span>
                        <span className="text-white font-bold">{s.val.toLocaleString()} ({s.pct}%)</span>
                      </div>
                      <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${s.pct}%`, background: s.color }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 bg-gray-800 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-green-400">{pct}%</p>
                  <p className="text-xs text-gray-400">Taux de pénétration</p>
                </div>
              </div>
              <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4">
                <h3 className="text-sm font-semibold text-white mb-3">📊 Distribution EL</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} innerRadius={40}
                      dataKey="value">
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                    </Pie>
                    <Tooltip formatter={(v:any) => v.toLocaleString()} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
