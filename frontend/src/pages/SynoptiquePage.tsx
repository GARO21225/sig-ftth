import { useState, useEffect, useRef } from 'react'
import api from '@services/api'
import toast from 'react-hot-toast'

interface Noeud { id: string; nom_unique: string; type_noeud: string; etat: string; latitude: number; longitude: number; capacite_fibres_max?: number; nb_fibres_utilisees?: number }
interface Lien { id: string; nom_unique: string; id_noeud_depart: string; id_noeud_arrivee: string; type_lien: string; etat: string; longueur_m?: number; nb_fibres?: number }

const TYPE_COLORS: Record<string, string> = {
  NRO: '#1D4ED8', SRO: '#6366F1', PBO: '#8B5CF6', PTO: '#A78BFA', PM: '#60A5FA',
  L1T: '#F59E0B', L2T: '#F97316', L4T: '#EF4444', POTEAU: '#92400E', default: '#6B7280'
}

export default function SynoptiquePage() {
  const [noeuds,  setNoeuds]  = useState<Noeud[]>([])
  const [liens,   setLiens]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected,setSelected]= useState<any>(null)
  const [view,    setView]    = useState<'arbre'|'hierarchie'|'saturation'>('hierarchie')
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => { charger() }, [])

  const charger = async () => {
    setLoading(true)
    try {
      const [rN, rL] = await Promise.allSettled([
        api.get('/noeuds-telecom'), api.get('/liens-telecom')
      ])
      if (rN.status === 'fulfilled') setNoeuds(rN.value.data || [])
      if (rL.status === 'fulfilled') {
        const d = rL.value.data
        const feats = d?.features || (Array.isArray(d) ? d : [])
        setLiens(feats.map((f: any) => f.properties || f))
      }
    } catch { toast.error('Erreur chargement') }
    finally { setLoading(false) }
  }

  const HIERARCHY = ['NRO','SRO','PM','PBO','PTO']
  const byType = (type: string) => noeuds.filter(n => n.type_noeud === type)

  const satColor = (n: Noeud) => {
    if (!n.capacite_fibres_max) return '#6B7280'
    const pct = (n.nb_fibres_utilisees || 0) / n.capacite_fibres_max * 100
    return pct >= 90 ? '#EF4444' : pct >= 75 ? '#F59E0B' : '#22C55E'
  }

  const NoeudCard = ({ noeud, showSat = false }: { noeud: Noeud; showSat?: boolean }) => (
    <div onClick={() => setSelected(noeud)}
      className="cursor-pointer bg-gray-900 border border-gray-700 hover:border-blue-500 rounded-xl p-3 transition-all min-w-32 text-center"
      style={{ borderColor: selected?.id === noeud.id ? TYPE_COLORS[noeud.type_noeud] || '#6B7280' : undefined }}>
      <div className="w-8 h-8 rounded-lg mx-auto mb-1 flex items-center justify-center text-xs font-bold text-white"
        style={{ background: TYPE_COLORS[noeud.type_noeud] || '#6B7280' }}>
        {noeud.type_noeud}
      </div>
      <p className="text-xs text-white font-medium truncate max-w-24 mx-auto">{noeud.nom_unique}</p>
      <p className={`text-xs mt-0.5 ${noeud.etat === 'actif' ? 'text-green-400' : 'text-gray-500'}`}>{noeud.etat}</p>
      {showSat && noeud.capacite_fibres_max && (
        <div className="mt-1">
          <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{
              width: `${Math.min(((noeud.nb_fibres_utilisees||0)/noeud.capacite_fibres_max)*100, 100)}%`,
              background: satColor(noeud)
            }} />
          </div>
          <p className="text-xs mt-0.5" style={{ color: satColor(noeud) }}>
            {Math.round(((noeud.nb_fibres_utilisees||0)/noeud.capacite_fibres_max)*100)}%
          </p>
        </div>
      )}
    </div>
  )

  return (
    <div className="h-full flex flex-col bg-gray-950">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900 flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold text-white">📐 Synoptique réseau</h1>
          <p className="text-xs text-gray-400">{noeuds.length} nœuds · {liens.length} liens</p>
        </div>
        <div className="flex gap-1">
          {(['hierarchie','arbre','saturation'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${view===v ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
              {v === 'hierarchie' ? '🏗️ Hiérarchie' : v === 'arbre' ? '🌳 Arbre' : '⚠️ Saturation'}
            </button>
          ))}
          <button onClick={charger} className="px-2 py-1.5 bg-gray-800 text-gray-400 rounded-lg text-xs">🔄</button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Synoptique */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full text-gray-500">⏳ Chargement...</div>
          ) : noeuds.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="text-5xl mb-3">📡</div>
              <p className="text-gray-400">Aucun nœud en base</p>
              <p className="text-xs text-gray-600 mt-1">Créez des nœuds depuis la carte</p>
            </div>
          ) : view === 'hierarchie' ? (
            <div className="space-y-6">
              {HIERARCHY.filter(t => byType(t).length > 0).map(type => (
                <div key={type}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold text-white"
                      style={{ background: TYPE_COLORS[type] }}>
                      {type[0]}
                    </div>
                    <h3 className="text-sm font-semibold text-white">{type}</h3>
                    <div className="flex-1 h-px bg-gray-700" />
                    <span className="text-xs text-gray-500">{byType(type).length} nœuds</span>
                  </div>
                  <div className="flex flex-wrap gap-3 pl-8">
                    {byType(type).map(n => <NoeudCard key={n.id} noeud={n} />)}
                  </div>
                </div>
              ))}
              {/* Autres types */}
              {noeuds.filter(n => !HIERARCHY.includes(n.type_noeud)).length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-md bg-gray-600 flex items-center justify-center text-xs font-bold text-white">?</div>
                    <h3 className="text-sm font-semibold text-white">Autres</h3>
                    <div className="flex-1 h-px bg-gray-700" />
                  </div>
                  <div className="flex flex-wrap gap-3 pl-8">
                    {noeuds.filter(n => !HIERARCHY.includes(n.type_noeud)).map(n => <NoeudCard key={n.id} noeud={n} />)}
                  </div>
                </div>
              )}
            </div>
          ) : view === 'saturation' ? (
            <div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: 'Critique ≥90%', count: noeuds.filter(n => n.capacite_fibres_max && (n.nb_fibres_utilisees||0)/n.capacite_fibres_max >= 0.9).length, color: 'text-red-400' },
                  { label: 'Alerte 75-89%', count: noeuds.filter(n => n.capacite_fibres_max && (n.nb_fibres_utilisees||0)/n.capacite_fibres_max >= 0.75 && (n.nb_fibres_utilisees||0)/n.capacite_fibres_max < 0.9).length, color: 'text-orange-400' },
                  { label: 'Normal <75%', count: noeuds.filter(n => n.capacite_fibres_max && (n.nb_fibres_utilisees||0)/n.capacite_fibres_max < 0.75).length, color: 'text-green-400' },
                ].map((s, i) => (
                  <div key={i} className="bg-gray-900 border border-gray-700 rounded-xl p-3 text-center">
                    <div className={`text-2xl font-bold ${s.color}`}>{s.count}</div>
                    <div className="text-xs text-gray-400">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-3">
                {noeuds.filter(n => n.capacite_fibres_max).sort((a,b) =>
                  ((b.nb_fibres_utilisees||0)/b.capacite_fibres_max!) - ((a.nb_fibres_utilisees||0)/a.capacite_fibres_max!)
                ).map(n => <NoeudCard key={n.id} noeud={n} showSat />)}
                {noeuds.filter(n => !n.capacite_fibres_max).length > 0 && (
                  <div className="w-full mt-2">
                    <p className="text-xs text-gray-500">Nœuds sans capacité définie: {noeuds.filter(n => !n.capacite_fibres_max).length}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Vue arbre */
            <div className="space-y-4">
              {noeuds.map(n => {
                const connected = liens.filter(l => l.id_noeud_depart === n.id || l.id_noeud_arrivee === n.id)
                return (
                  <div key={n.id} className="bg-gray-900 border border-gray-700 rounded-xl p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                        style={{ background: TYPE_COLORS[n.type_noeud] || '#6B7280' }}>
                        {n.type_noeud.slice(0,3)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{n.nom_unique}</p>
                        <p className="text-xs text-gray-400">{n.type_noeud} · {n.etat} · {connected.length} lien(s)</p>
                      </div>
                      {n.capacite_fibres_max && (
                        <div className="text-right text-xs">
                          <p className="text-gray-300">{n.nb_fibres_utilisees||0}/{n.capacite_fibres_max}</p>
                          <p style={{ color: satColor(n) }}>
                            {Math.round(((n.nb_fibres_utilisees||0)/n.capacite_fibres_max)*100)}%
                          </p>
                        </div>
                      )}
                    </div>
                    {connected.length > 0 && (
                      <div className="mt-2 pl-13 flex flex-wrap gap-1">
                        {connected.map(l => {
                          const other = noeuds.find(x => x.id === (l.id_noeud_depart === n.id ? l.id_noeud_arrivee : l.id_noeud_depart))
                          return (
                            <span key={l.id} className="text-xs px-2 py-0.5 bg-gray-800 text-gray-400 rounded-lg">
                              ↔ {other?.nom_unique || '?'} ({l.longueur_m ? Math.round(l.longueur_m)+'m' : '?'})
                            </span>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Panel détail */}
        {selected && (
          <div className="w-64 border-l border-gray-700 bg-gray-900 p-4 flex-shrink-0 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-white text-sm">Détail</h3>
              <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-white">✕</button>
            </div>
            <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center text-sm font-bold text-white"
              style={{ background: TYPE_COLORS[selected.type_noeud] || '#6B7280' }}>
              {selected.type_noeud}
            </div>
            <div className="space-y-2 text-xs">
              {[
                ['Nom', selected.nom_unique],
                ['Type', selected.type_noeud],
                ['État', selected.etat],
                ['Latitude', selected.latitude?.toFixed(6)],
                ['Longitude', selected.longitude?.toFixed(6)],
                ['Capacité', selected.capacite_fibres_max ? `${selected.capacite_fibres_max} fibres` : '—'],
                ['Utilisées', selected.nb_fibres_utilisees ?? '—'],
              ].map(([k,v]) => (
                <div key={k} className="flex justify-between border-b border-gray-800 pb-1">
                  <span className="text-gray-400">{k}</span>
                  <span className="text-white font-medium">{v}</span>
                </div>
              ))}
            </div>
            {selected.capacite_fibres_max && (
              <div className="mt-3">
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(((selected.nb_fibres_utilisees||0)/selected.capacite_fibres_max)*100, 100)}%`,
                      background: satColor(selected)
                    }} />
                </div>
                <p className="text-xs text-center mt-1" style={{ color: satColor(selected) }}>
                  Saturation {Math.round(((selected.nb_fibres_utilisees||0)/selected.capacite_fibres_max)*100)}%
                </p>
              </div>
            )}
            <div className="mt-3 space-y-1">
              <p className="text-xs font-medium text-gray-400">Liens connectés</p>
              {liens.filter(l => l.id_noeud_depart === selected.id || l.id_noeud_arrivee === selected.id).map(l => (
                <div key={l.id} className="text-xs bg-gray-800 rounded-lg px-2 py-1">
                  <span className="text-blue-400">{l.nom_unique}</span>
                  {l.longueur_m && <span className="text-gray-500 ml-1">({Math.round(l.longueur_m)}m)</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
