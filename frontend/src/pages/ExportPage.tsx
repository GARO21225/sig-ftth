import { useState } from 'react'
import api from '@services/api'
import toast from 'react-hot-toast'

const FORMATS = [
  { id: 'geojson',  label: 'GeoJSON',    icon: '🗺️', desc: 'Format standard SIG (QGIS, ArcGIS)' },
  { id: 'shapefile',label: 'Shapefile',  icon: '📦', desc: 'Format ESRI pour SIG desktop' },
  { id: 'csv',      label: 'CSV',        icon: '📊', desc: 'Tableur Excel/Calc' },
  { id: 'xlsx',     label: 'Excel',      icon: '📗', desc: 'Classeur Microsoft Excel' },
  { id: 'kml',      label: 'KML',        icon: '🌐', desc: 'Google Earth / Maps' },
  { id: 'pdf',      label: 'Rapport PDF',icon: '📄', desc: 'Rapport cartographique imprimable' },
]

const COUCHES = [
  { id: 'noeuds_telecom', label: 'Nœuds télécom',  icon: '📡' },
  { id: 'liens_telecom',  label: 'Câbles optiques', icon: '〰️' },
  { id: 'noeuds_gc',      label: 'Nœuds GC',        icon: '🏗️' },
  { id: 'liens_gc',       label: 'Fourreaux GC',    icon: '⚡' },
  { id: 'logements',      label: 'Logements EL',    icon: '🏠' },
  { id: 'zones',          label: 'Zones influence',  icon: '🗺️' },
  { id: 'itineraires',    label: 'Itinéraires',     icon: '🧭' },
]

export default function ExportPage() {
  const [format,    setFormat]    = useState('geojson')
  const [couches,   setCouches]   = useState<string[]>(['noeuds_telecom','liens_telecom'])
  const [loading,   setLoading]   = useState(false)
  const [commune,   setCommune]   = useState('')
  const [statut,    setStatut]    = useState('')
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin,   setDateFin]   = useState('')
  const [lastExport,setLastExport]= useState<any>(null)

  const toggleCouche = (id: string) => {
    setCouches(cs => cs.includes(id) ? cs.filter(c => c !== id) : [...cs, id])
  }

  const exporter = async () => {
    if (couches.length === 0) return toast.error('Sélectionnez au moins une couche')
    setLoading(true)
    try {
      // Build query params
      const params = new URLSearchParams()
      params.set('format', format)
      params.set('couches', couches.join(','))
      if (commune) params.set('commune', commune)
      if (statut) params.set('statut', statut)

      if (format === 'pdf') {
        // Rapport PDF via analytics
        const r = await api.get('/analytics/rapport-pdf-data')
        const d = r.data
        const w = window.open('', '_blank')!
        const date = new Date().toLocaleDateString('fr-FR')
        w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
        <title>Rapport SIG FTTH — ${date}</title>
        <style>body{font-family:Arial;padding:2rem;max-width:900px;margin:auto}
        h1{color:#1D4ED8;border-bottom:2px solid #1D4ED8;padding-bottom:8px}
        h2{color:#374151;margin-top:24px}.kpi{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin:16px 0}
        .k{background:#f3f4f6;border-radius:8px;padding:12px;text-align:center}
        .kv{font-size:28px;font-weight:700;color:#1D4ED8}.kl{font-size:12px;color:#6B7280}
        table{width:100%;border-collapse:collapse}th{background:#1D4ED8;color:#fff;padding:8px;font-size:12px}
        td{padding:6px 8px;border-bottom:1px solid #E5E7EB;font-size:12px}
        tr:nth-child(even){background:#f9fafb}.footer{margin-top:2rem;text-align:center;color:#9CA3AF;font-size:11px}</style>
        </head><body>
        <h1>📊 Rapport SIG FTTH — Orange CI Côte d'Ivoire</h1>
        <p>Date : ${date} | Généré automatiquement</p>
        <h2>KPI Réseau</h2>
        <div class="kpi">
          <div class="k"><div class="kv">${d.kpi?.nb_noeuds_telecom||0}</div><div class="kl">Nœuds télécom</div></div>
          <div class="k"><div class="kv">${d.kpi?.nb_liens_telecom||0}</div><div class="kl">Câbles optiques</div></div>
          <div class="k"><div class="kv">${d.kpi?.total_logements||0}</div><div class="kl">Logements</div></div>
          <div class="k"><div class="kv">${d.kpi?.el_raccordables||0}</div><div class="kl">EL raccordables</div></div>
          <div class="k"><div class="kv">${d.kpi?.el_raccordes||0}</div><div class="kl">EL raccordés</div></div>
          <div class="k"><div class="kv">${d.kpi?.ot_en_cours||0}</div><div class="kl">OT en cours</div></div>
        </div>
        <h2>Nœuds critiques</h2>
        <table><tr><th>Nœud</th><th>Type</th><th>Saturation</th></tr>
        ${(d.noeuds_critiques||[]).map((n:any)=>`<tr><td>${n.nom_unique}</td><td>${n.type_noeud}</td><td style="color:${n.saturation_pct>=90?'red':'orange'}">${n.saturation_pct}%</td></tr>`).join('')}
        </table>
        <h2>Ordres de travail actifs</h2>
        <table><tr><th>N° OT</th><th>Titre</th><th>Statut</th><th>Priorité</th></tr>
        ${(d.ot_actifs||[]).map((o:any)=>`<tr><td>${o.numero_ot}</td><td>${o.titre}</td><td>${o.statut}</td><td>${o.priorite}</td></tr>`).join('')}
        </table>
        <div class="footer">SIG FTTH v6.1 — Confidentiel Orange CI</div>
        </body></html>`)
        w.document.close()
        setTimeout(() => w.print(), 500)
        setLastExport({ format: 'PDF', couches, date: new Date().toLocaleString() })
        toast.success('Rapport PDF généré')
        return
      }

      const r = await api.get(`/export?${params.toString()}`, { responseType: 'blob' })
      const blob = new Blob([r.data])
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const ext = format === 'shapefile' ? 'zip' : format
      a.href = url
      a.download = `sig-ftth-export-${Date.now()}.${ext}`
      a.click()
      URL.revokeObjectURL(url)
      setLastExport({ format: format.toUpperCase(), couches, date: new Date().toLocaleString() })
      toast.success(`Export ${format.toUpperCase()} téléchargé`)
    } catch (e: any) {
      if (e.response?.status === 404 || e.response?.status === 501) {
        toast.error('Format non encore disponible côté serveur — utilisez GeoJSON ou PDF')
      } else {
        toast.error(e.response?.data?.detail || 'Erreur export')
      }
    } finally { setLoading(false) }
  }

  return (
    <div className="h-full overflow-auto bg-gray-950 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-5">
          <h1 className="text-xl font-bold text-white">📤 Exportation des données</h1>
          <p className="text-gray-400 text-xs mt-0.5">Exporter les couches du réseau FTTH dans différents formats</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Colonne gauche: Format + Couches */}
          <div className="md:col-span-2 space-y-4">

            {/* Format */}
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4">
              <h2 className="font-semibold text-white text-sm mb-3">Format d'export</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {FORMATS.map(f => (
                  <button key={f.id} onClick={() => setFormat(f.id)}
                    className={`p-3 rounded-xl border text-left transition-all ${format === f.id ? 'border-blue-500 bg-blue-900/20' : 'border-gray-700 bg-gray-800 hover:border-gray-500'}`}>
                    <div className="text-xl mb-1">{f.icon}</div>
                    <div className="text-xs font-bold text-white">{f.label}</div>
                    <div className="text-xs text-gray-400 mt-0.5 leading-tight">{f.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Couches */}
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-white text-sm">Couches à exporter</h2>
                <div className="flex gap-1">
                  <button onClick={() => setCouches(COUCHES.map(c => c.id))} className="text-xs text-blue-400 hover:text-blue-300">Tout</button>
                  <span className="text-gray-600">·</span>
                  <button onClick={() => setCouches([])} className="text-xs text-gray-400 hover:text-gray-300">Aucun</button>
                </div>
              </div>
              <div className="space-y-2">
                {COUCHES.map(c => (
                  <label key={c.id} className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all ${couches.includes(c.id) ? 'bg-blue-900/30 border border-blue-700/50' : 'bg-gray-800 border border-transparent hover:border-gray-600'}`}>
                    <input type="checkbox" checked={couches.includes(c.id)} onChange={() => toggleCouche(c.id)} className="w-4 h-4 rounded text-blue-600" />
                    <span className="text-lg">{c.icon}</span>
                    <span className="text-sm text-white">{c.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Filtres */}
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4">
              <h2 className="font-semibold text-white text-sm mb-3">Filtres (optionnel)</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Commune</label>
                  <input value={commune} onChange={e => setCommune(e.target.value)} placeholder="ex: Cocody"
                    className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Statut</label>
                  <select value={statut} onChange={e => setStatut(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm outline-none">
                    <option value="">Tous statuts</option>
                    <option value="actif">Actif</option>
                    <option value="inactif">Inactif</option>
                    <option value="planifie">Planifié</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Date début</label>
                  <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Date fin</label>
                  <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm outline-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Colonne droite: Résumé + Bouton */}
          <div className="space-y-4">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 sticky top-4">
              <h2 className="font-semibold text-white text-sm mb-3">Résumé</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Format</span>
                  <span className="text-white font-bold">{FORMATS.find(f => f.id === format)?.icon} {format.toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Couches</span>
                  <span className="text-white font-bold">{couches.length}</span>
                </div>
                {commune && <div className="flex justify-between"><span className="text-gray-400">Commune</span><span className="text-white">{commune}</span></div>}
                {statut && <div className="flex justify-between"><span className="text-gray-400">Statut</span><span className="text-white">{statut}</span></div>}
              </div>

              <button onClick={exporter} disabled={loading || couches.length === 0}
                className="w-full mt-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold rounded-xl transition-all text-sm">
                {loading ? '⏳ Export en cours...' : `📥 Exporter en ${format.toUpperCase()}`}
              </button>

              {/* Formats disponibles */}
              <div className="mt-4 text-xs text-gray-500 space-y-1">
                <p className="font-medium text-gray-400">Disponibilité :</p>
                <p>✅ GeoJSON — disponible</p>
                <p>✅ PDF rapport — disponible</p>
                <p>✅ CSV — disponible</p>
                <p>✅ Shapefile — disponible (format ZIP+GeoJSON)</p>
                <p>✅ Excel — disponible</p>
                <p>✅ KML — disponible</p>
              </div>
            </div>

            {lastExport && (
              <div className="bg-green-900/30 border border-green-700 rounded-2xl p-3 text-xs">
                <p className="text-green-300 font-medium mb-1">✅ Dernier export</p>
                <p className="text-gray-400">Format : {lastExport.format}</p>
                <p className="text-gray-400">Couches : {lastExport.couches.length}</p>
                <p className="text-gray-400">Date : {lastExport.date}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
