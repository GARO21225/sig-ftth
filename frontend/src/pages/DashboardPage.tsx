import { useState, useEffect } from 'react'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from 'chart.js'
import { Doughnut, Bar } from 'react-chartjs-2'
import api from '@services/api'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title)

interface KPI {
  logements: {
    total: number
    total_el: number
    el_raccordables: number
    el_raccordes: number
    taux_couverture_pct: number
    taux_penetration_pct: number
  }
  reseau: {
    nb_noeuds_telecom: number
    nb_noeuds_gc: number
    nb_liens_telecom: number
    nb_liens_gc: number
  }
  travaux: {
    ot_en_cours: number
    ot_en_retard: number
  }
  commercial: {
    bons_commande_attente: number
  }
}

interface GroupeData {
  code: string
  nom: string
  icone: string
  couleur: string
  total_el: number
  el_raccordes: number
  taux_pct: number
}

function KPICard({
  icon, label, value, sub, color = 'blue', loading = false
}: {
  icon: string
  label: string
  value: string | number
  sub?: string
  color?: string
  loading?: boolean
}) {
  const colors: Record<string, string> = {
    blue:   'from-blue-900/50 to-blue-800/30 border-blue-700/50',
    green:  'from-green-900/50 to-green-800/30 border-green-700/50',
    purple: 'from-purple-900/50 to-purple-800/30 border-purple-700/50',
    orange: 'from-orange-900/50 to-orange-800/30 border-orange-700/50',
    red:    'from-red-900/50 to-red-800/30 border-red-700/50',
    yellow: 'from-yellow-900/50 to-yellow-800/30 border-yellow-700/50',
  }
  return (
    <div className={`bg-gradient-to-br ${colors[color] || colors.blue} border rounded-2xl p-5 flex flex-col gap-2`}>
      <div className="flex items-center gap-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">{label}</span>
      </div>
      {loading ? (
        <div className="h-8 bg-gray-700/50 rounded animate-pulse" />
      ) : (
        <div className="text-3xl font-bold text-white">{value}</div>
      )}
      {sub && <div className="text-xs text-gray-400">{sub}</div>}
    </div>
  )
}

function GaugeBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-400">
        <span>{label}</span>
        <span>{value.toLocaleString('fr-FR')} / {max.toLocaleString('fr-FR')}</span>
      </div>
      <div className="h-2.5 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <div className="text-right text-xs font-semibold" style={{ color }}>{pct.toFixed(1)}%</div>
    </div>
  )
}

export default function DashboardPage() {
  const [kpi,     setKpi]     = useState<KPI | null>(null)
  const [groupes, setGroupes] = useState<GroupeData[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => { chargerDonnees() }, [])

  const chargerDonnees = async () => {
    setLoading(true)
    setError(null)
    const [resKPI, resGroupes] = await Promise.allSettled([
      api.get('/dashboard/kpi'),
      api.get('/dashboard/el-par-groupe'),
    ])
    if (resKPI.status === 'fulfilled') {
      setKpi(resKPI.value.data)
    } else {
      setError('Impossible de charger les KPI.')
    }
    if (resGroupes.status === 'fulfilled') {
      setGroupes(resGroupes.value.data)
    }
    setLoading(false)
  }

  const doughnutData = {
    labels: ['Raccordés', 'Raccordables non raccordés', 'Non raccordables'],
    datasets: [{
      data: [
        kpi?.logements.el_raccordes ?? 0,
        Math.max(0, (kpi?.logements.el_raccordables ?? 0) - (kpi?.logements.el_raccordes ?? 0)),
        Math.max(0, (kpi?.logements.total_el ?? 0) - (kpi?.logements.el_raccordables ?? 0)),
      ],
      backgroundColor: ['#10B981', '#3B82F6', '#374151'],
      borderColor:     ['#059669', '#2563EB', '#1F2937'],
      borderWidth: 2,
    }],
  }

  const barData = {
    labels: groupes.map(g => g.nom),
    datasets: [
      {
        label: 'EL raccordés',
        data: groupes.map(g => g.el_raccordes),
        backgroundColor: '#10B981',
        borderRadius: 6,
      },
      {
        label: 'EL total',
        data: groupes.map(g => g.total_el),
        backgroundColor: '#1E40AF',
        borderRadius: 6,
      },
    ],
  }

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#9CA3AF', font: { size: 11 } } },
      title: { display: false },
    },
    scales: {
      x: { ticks: { color: '#6B7280' }, grid: { color: '#1F2937' } },
      y: { ticks: { color: '#6B7280' }, grid: { color: '#1F2937' } },
    },
  }

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { color: '#9CA3AF', font: { size: 10 }, padding: 12 },
      },
    },
  }

  return (
    <div className="p-6 space-y-6 overflow-auto h-full bg-gray-950">

      {/* ── Header ───────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">📊 Dashboard FTTH</h1>
          <p className="text-gray-400 text-sm mt-1">Vue d'ensemble du réseau fibre optique</p>
        </div>
        <button
          onClick={chargerDonnees}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-sm text-gray-300 transition-all"
        >
          🔄 Actualiser
        </button>
      </div>

      {/* ── Erreur ───────────────────────── */}
      {error && (
        <div className="bg-red-950 border border-red-700 rounded-xl p-4 text-red-300 text-sm">
          ❌ {error}
        </div>
      )}

      {/* ── KPI principaux ───────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          icon="🏠" label="Logements" color="blue" loading={loading}
          value={kpi?.logements.total?.toLocaleString('fr-FR') ?? '—'}
          sub={`${kpi?.logements.total_el?.toLocaleString('fr-FR') ?? '—'} EL réels`}
        />
        <KPICard
          icon="📡" label="Taux couverture" color="green" loading={loading}
          value={kpi ? `${kpi.logements.taux_couverture_pct}%` : '—'}
          sub={`${kpi?.logements.el_raccordables?.toLocaleString('fr-FR') ?? '—'} EL raccordables`}
        />
        <KPICard
          icon="✅" label="Taux pénétration" color="purple" loading={loading}
          value={kpi ? `${kpi.logements.taux_penetration_pct}%` : '—'}
          sub={`${kpi?.logements.el_raccordes?.toLocaleString('fr-FR') ?? '—'} EL raccordés`}
        />
        <KPICard
          icon="📋" label="Commandes attente" color="orange" loading={loading}
          value={kpi?.commercial.bons_commande_attente ?? '—'}
          sub="Bons de commande"
        />
      </div>

      {/* ── Réseau + Travaux ─────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          icon="🔵" label="Nœuds Télécom" color="blue" loading={loading}
          value={kpi?.reseau.nb_noeuds_telecom ?? '—'}
        />
        <KPICard
          icon="🟡" label="Nœuds GC" color="yellow" loading={loading}
          value={kpi?.reseau.nb_noeuds_gc ?? '—'}
        />
        <KPICard
          icon="🏗️" label="OT en cours" color="orange" loading={loading}
          value={kpi?.travaux.ot_en_cours ?? '—'}
        />
        <KPICard
          icon="⚠️" label="OT en retard" color="red" loading={loading}
          value={kpi?.travaux.ot_en_retard ?? '—'}
        />
      </div>

      {/* ── Graphiques ───────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Doughnut — répartition EL */}
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4">🎯 Répartition des EL</h2>
          {loading ? (
            <div className="h-56 bg-gray-800 rounded-xl animate-pulse" />
          ) : (
            <div style={{ height: 220 }}>
              <Doughnut data={doughnutData} options={doughnutOptions} />
            </div>
          )}
        </div>

        {/* Bar — EL par groupe de logement */}
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4">📊 EL par groupe de logement</h2>
          {loading ? (
            <div className="h-56 bg-gray-800 rounded-xl animate-pulse" />
          ) : groupes.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-gray-500 text-sm">
              Aucune donnée disponible
            </div>
          ) : (
            <div style={{ height: 220 }}>
              <Bar data={barData} options={barOptions} />
            </div>
          )}
        </div>
      </div>

      {/* ── Barres de progression EL ─────── */}
      {kpi && (
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-white">📈 Progression réseau</h2>
          <GaugeBar
            label="Couverture (EL raccordables / total)"
            value={kpi.logements.el_raccordables}
            max={kpi.logements.total_el}
            color="#3B82F6"
          />
          <GaugeBar
            label="Pénétration (EL raccordés / raccordables)"
            value={kpi.logements.el_raccordes}
            max={kpi.logements.el_raccordables}
            color="#10B981"
          />
          <GaugeBar
            label="Liens télécom déployés"
            value={kpi.reseau.nb_liens_telecom}
            max={kpi.reseau.nb_noeuds_telecom * 2 || 1}
            color="#8B5CF6"
          />
        </div>
      )}

      {/* ── Tableau groupes de logement ──── */}
      {groupes.length > 0 && (
        <div className="bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-gray-700">
            <h2 className="text-sm font-semibold text-white">🏘️ Détail par groupe de logement</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-3 px-4 text-xs text-gray-500 uppercase tracking-wider">Groupe</th>
                  <th className="text-right py-3 px-4 text-xs text-gray-500 uppercase tracking-wider">Total EL</th>
                  <th className="text-right py-3 px-4 text-xs text-gray-500 uppercase tracking-wider">Raccordés</th>
                  <th className="text-right py-3 px-4 text-xs text-gray-500 uppercase tracking-wider">Taux</th>
                  <th className="py-3 px-4 text-xs text-gray-500 uppercase tracking-wider">Progression</th>
                </tr>
              </thead>
              <tbody>
                {groupes.map((g, i) => (
                  <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <span className="text-lg mr-2">{g.icone}</span>
                      <span className="text-white font-medium">{g.nom}</span>
                    </td>
                    <td className="py-3 px-4 text-right text-gray-300">{(g.total_el || 0).toLocaleString('fr-FR')}</td>
                    <td className="py-3 px-4 text-right text-green-400 font-medium">{(g.el_raccordes || 0).toLocaleString('fr-FR')}</td>
                    <td className="py-3 px-4 text-right">
                      <span className={`font-bold ${(g.taux_pct || 0) >= 50 ? 'text-green-400' : (g.taux_pct || 0) >= 25 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {(g.taux_pct || 0).toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden w-24">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(g.taux_pct || 0, 100)}%`,
                            background: g.couleur || '#3B82F6'
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Footer ───────────────────────── */}
      <div className="text-center text-xs text-gray-600 pb-2">
        SIG FTTH v6.1 — Edgar KOUAME © 2026 — Données actualisées en temps réel
      </div>
    </div>
  )
}
