import { useState, useRef } from 'react'
import api from '@services/api'
import toast from 'react-hot-toast'
import { useAuthStore } from '@store/useStore'

interface RapportErreur {
  type_erreur: string; objet: string
  description: string; niveau: 'bloquant' | 'warning' | 'info'
}

interface ResultatValidation {
  import_id: string; statut: string
  stats: { noeuds: number; liens: number; erreurs_topo: number; erreurs_attr: number }
  nb_erreurs: number; erreurs_bloquantes: number; erreurs_warning: number
  erreurs: RapportErreur[]
  message?: string
}

interface HistoriqueImport {
  id: string; nom_fichier: string; date_import: string
  statut_import: string; statut_validation: string
  nb_erreurs: number; nb_corrigees: number
  systeme_projection: string; importe_par: string
}

export default function ImportDWGPage() {
  const [step, setStep] = useState<1|2|3|4>(1)
  const [fichier, setFichier] = useState<File | null>(null)
  const [geojsonContent, setGeojsonContent] = useState('')
  const [projection, setProjection] = useState('EPSG:4326')
  const [modeValidation, setModeValidation] = useState<'strict'|'assiste'>('assiste')
  const [validating, setValidating] = useState(false)
  const [integrating, setIntegrating] = useState(false)
  const [resultat, setResultat] = useState<ResultatValidation | null>(null)
  const [historique, setHistorique] = useState<HistoriqueImport[]>([])
  const [loadingHisto, setLoadingHisto] = useState(false)
  const [activeTab, setActiveTab] = useState<'import'|'historique'>('import')
  const fileRef = useRef<HTMLInputElement>(null)
  const { hasRole } = useAuthStore()
  const canIntegrate = hasRole('admin', 'chef_projet')

  const chargerHistorique = async () => {
    setLoadingHisto(true)
    try {
      const res = await api.get('/import-dwg')
      setHistorique(res.data)
    } catch { /* silencieux */ }
    setLoadingHisto(false)
  }

  const onFichierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFichier(f)
    const reader = new FileReader()
    reader.onload = (evt) => {
      const content = evt.target?.result as string
      setGeojsonContent(content)
      setStep(2)
    }
    reader.readAsText(f)
  }

  const valider = async () => {
    if (!geojsonContent || !fichier) { toast.error('Chargez d\'abord un fichier GeoJSON'); return }
    setValidating(true)
    try {
      const formData = new FormData()
      formData.append('nom_fichier', fichier.name)
      formData.append('geojson_content', geojsonContent)
      formData.append('systeme_projection', projection)
      formData.append('mode_validation', modeValidation)
      const res = await api.post('/import-dwg/valider-geojson', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setResultat(res.data)
      setStep(3)
      if (res.data.erreurs_bloquantes === 0) {
        toast.success(`Validation OK — ${res.data.stats.noeuds} nœuds, ${res.data.stats.liens} liens`)
      } else {
        toast.error(`${res.data.erreurs_bloquantes} erreur(s) bloquante(s) détectée(s)`)
      }
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Erreur de validation')
    } finally { setValidating(false) }
  }

  const integrer = async () => {
    if (!resultat || !geojsonContent) return
    if (resultat.erreurs_bloquantes > 0 && modeValidation === 'strict') {
      toast.error('Des erreurs bloquantes empêchent l\'intégration en mode strict')
      return
    }
    setIntegrating(true)
    try {
      const formData = new FormData()
      formData.append('geojson_content', geojsonContent)
      const res = await api.post(`/import-dwg/${resultat.import_id}/integrer`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      toast.success(`✅ Intégration réussie — ${res.data.noeuds_inseres} nœuds, ${res.data.liens_inseres} liens`)
      setStep(4)
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Erreur d\'intégration')
    } finally { setIntegrating(false) }
  }

  const reset = () => {
    setStep(1); setFichier(null); setGeojsonContent(''); setResultat(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const STATUT_COLOR: Record<string, string> = {
    integre: 'text-green-400', valide: 'text-blue-400',
    rejete: 'text-red-400', en_cours: 'text-yellow-400',
    echec: 'text-red-400', warning: 'text-orange-400'
  }

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">📥 Import DWG / GeoJSON</h1>
        <p className="text-gray-400 text-sm mt-1">Pipeline d'intégration avec validation topologique et attributaire (PCR v2.5)</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-800/50 rounded-xl p-1 w-fit">
        {(['import', 'historique'] as const).map(tab => (
          <button key={tab} onClick={() => { setActiveTab(tab); if (tab === 'historique') chargerHistorique() }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize
              ${activeTab === tab ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}>
            {tab === 'import' ? '📤 Importer' : '📋 Historique'}
          </button>
        ))}
      </div>

      {activeTab === 'import' && (
        <>
          {/* Stepper */}
          <div className="flex items-center gap-2">
            {[
              { n: 1, label: 'Charger' },
              { n: 2, label: 'Configurer' },
              { n: 3, label: 'Valider' },
              { n: 4, label: 'Intégrer' },
            ].map((s, i) => (
              <div key={s.n} className="flex items-center gap-2 flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0
                  ${step >= s.n ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'}`}>
                  {step > s.n ? '✓' : s.n}
                </div>
                <span className={`text-xs hidden sm:block ${step >= s.n ? 'text-white' : 'text-gray-500'}`}>{s.label}</span>
                {i < 3 && <div className={`flex-1 h-0.5 ${step > s.n ? 'bg-blue-600' : 'bg-gray-700'}`} />}
              </div>
            ))}
          </div>

          {/* Étape 1 : Upload */}
          {step === 1 && (
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 space-y-4">
              <h2 className="font-semibold text-white">📂 Étape 1 — Charger le fichier GeoJSON</h2>
              <p className="text-gray-400 text-sm">
                Convertissez votre fichier DWG en GeoJSON avec QGIS ou GDAL, puis importez-le ici.
              </p>
              <div className="bg-gray-800 rounded-xl p-3 text-xs text-gray-400 space-y-1">
                <p className="text-gray-300 font-medium">💡 Conversion DWG → GeoJSON avec GDAL :</p>
                <code className="block bg-gray-900 rounded-lg p-2 text-green-400 font-mono">
                  ogr2ogr -f GeoJSON -t_srs EPSG:4326 output.geojson input.dwg
                </code>
              </div>
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-gray-600 hover:border-blue-500 rounded-2xl p-10 text-center cursor-pointer transition-all hover:bg-blue-900/10">
                <div className="text-5xl mb-3">📁</div>
                <p className="text-white font-medium">Cliquez pour sélectionner un fichier GeoJSON</p>
                <p className="text-gray-400 text-sm mt-1">Format : .geojson, .json — Max 50 MB</p>
              </div>
              <input ref={fileRef} type="file" accept=".geojson,.json" onChange={onFichierChange} className="hidden" />
            </div>
          )}

          {/* Étape 2 : Configuration */}
          {step >= 2 && step < 4 && (
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-white">⚙️ Étape 2 — Configuration</h2>
                <button onClick={reset} className="text-xs text-gray-500 hover:text-white">↩ Recommencer</button>
              </div>
              <div className="flex items-center gap-3 bg-gray-800 rounded-xl p-3">
                <span className="text-2xl">📄</span>
                <div>
                  <p className="text-white font-medium text-sm">{fichier?.name}</p>
                  <p className="text-gray-400 text-xs">{fichier ? (fichier.size / 1024).toFixed(1) + ' KB' : ''}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Système de projection</label>
                  <select value={projection} onChange={e => setProjection(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-blue-500">
                    <option value="EPSG:4326">EPSG:4326 (WGS84 — GPS)</option>
                    <option value="EPSG:32630">EPSG:32630 (UTM Zone 30N)</option>
                    <option value="EPSG:32629">EPSG:32629 (UTM Zone 29N)</option>
                    <option value="EPSG:3857">EPSG:3857 (Web Mercator)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Mode de validation</label>
                  <select value={modeValidation} onChange={e => setModeValidation(e.target.value as any)}
                    className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-blue-500">
                    <option value="assiste">Assisté (corrections auto possibles)</option>
                    <option value="strict">Strict (blocage sur erreurs critiques)</option>
                  </select>
                </div>
              </div>
              <div className="bg-blue-900/20 border border-blue-800 rounded-xl p-3 text-xs text-blue-300">
                <p className="font-medium mb-1">🔍 Contrôles appliqués :</p>
                <p>✔ Géométrie valide (ST_IsValid) · ✔ Doublons spatiaux · ✔ Champs obligatoires</p>
                <p>✔ Cohérence fibres (fibres_utilisees ≤ nb_fibres) · ✔ Connectivité liens</p>
              </div>
              <button onClick={valider} disabled={validating || !geojsonContent}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium rounded-xl transition-all">
                {validating ? '⏳ Validation en cours...' : '🔍 Lancer la validation'}
              </button>
            </div>
          )}

          {/* Étape 3 : Résultats validation */}
          {step === 3 && resultat && (
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 space-y-4">
              <h2 className="font-semibold text-white">📊 Étape 3 — Rapport de validation</h2>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Nœuds', value: resultat.stats.noeuds, color: 'text-blue-400' },
                  { label: 'Liens', value: resultat.stats.liens, color: 'text-green-400' },
                  { label: 'Err. topo', value: resultat.stats.erreurs_topo, color: resultat.stats.erreurs_topo > 0 ? 'text-red-400' : 'text-gray-400' },
                  { label: 'Err. attr', value: resultat.stats.erreurs_attr, color: resultat.stats.erreurs_attr > 0 ? 'text-orange-400' : 'text-gray-400' },
                ].map((s, i) => (
                  <div key={i} className="bg-gray-800 rounded-xl p-3 text-center">
                    <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-gray-500">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Statut global */}
              <div className={`rounded-xl p-4 flex items-center gap-3 ${
                resultat.erreurs_bloquantes === 0 ? 'bg-green-900/30 border border-green-700'
                  : 'bg-red-900/30 border border-red-700'}`}>
                <span className="text-3xl">{resultat.erreurs_bloquantes === 0 ? '✅' : '❌'}</span>
                <div>
                  <p className={`font-bold ${resultat.erreurs_bloquantes === 0 ? 'text-green-300' : 'text-red-300'}`}>
                    {resultat.erreurs_bloquantes === 0 ? 'Validation réussie — Prêt pour intégration' : `${resultat.erreurs_bloquantes} erreur(s) bloquante(s)`}
                  </p>
                  <p className="text-xs text-gray-400">
                    {resultat.erreurs_warning} warning(s) · Statut : {resultat.statut}
                  </p>
                </div>
              </div>

              {/* Liste d'erreurs */}
              {resultat.erreurs.length > 0 && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Rapport d'erreurs ({resultat.erreurs.length})
                  </p>
                  {resultat.erreurs.map((e, i) => (
                    <div key={i} className={`rounded-xl p-3 border text-xs ${
                      e.niveau === 'bloquant' ? 'bg-red-900/20 border-red-800'
                        : 'bg-orange-900/20 border-orange-800'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span>{e.niveau === 'bloquant' ? '🔴' : '🟡'}</span>
                        <span className={`font-medium ${e.niveau === 'bloquant' ? 'text-red-300' : 'text-orange-300'}`}>
                          {e.type_erreur}
                        </span>
                        <span className="text-gray-400 font-mono">{e.objet}</span>
                      </div>
                      <p className="text-gray-300">{e.description}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Bouton intégration */}
              {canIntegrate && (
                <div className="space-y-2">
                  {resultat.erreurs_bloquantes > 0 && modeValidation === 'strict' ? (
                    <div className="bg-red-900/20 border border-red-800 rounded-xl p-3 text-xs text-red-300">
                      ⛔ Intégration bloquée — Corrigez les erreurs bloquantes ou passez en mode Assisté
                    </div>
                  ) : null}
                  <button onClick={integrer}
                    disabled={integrating || (resultat.erreurs_bloquantes > 0 && modeValidation === 'strict')}
                    className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white font-bold rounded-xl transition-all">
                    {integrating ? '⏳ Intégration en cours...' : '🔗 Intégrer dans PostGIS'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Étape 4 : Succès */}
          {step === 4 && (
            <div className="bg-green-900/30 border border-green-700 rounded-2xl p-8 text-center space-y-4">
              <div className="text-6xl">✅</div>
              <p className="text-green-300 font-bold text-xl">Intégration réussie !</p>
              <p className="text-gray-400 text-sm">Les données sont maintenant disponibles sur la carte</p>
              <button onClick={reset}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-all">
                📤 Importer un autre fichier
              </button>
            </div>
          )}
        </>
      )}

      {/* Historique des imports */}
      {activeTab === 'historique' && (
        <div className="space-y-3">
          {loadingHisto ? (
            Array(3).fill(0).map((_, i) => <div key={i} className="h-20 bg-gray-800/50 rounded-xl animate-pulse" />)
          ) : historique.length === 0 ? (
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 text-center">
              <p className="text-4xl mb-2">📋</p>
              <p className="text-gray-500">Aucun import enregistré</p>
            </div>
          ) : historique.map(h => (
            <div key={h.id} className="bg-gray-900 border border-gray-700 rounded-xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-white font-medium text-sm">{h.nom_fichier}</p>
                  <p className="text-gray-400 text-xs mt-0.5">
                    {new Date(h.date_import).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                    {' · '}{h.systeme_projection}
                    {h.importe_par ? ` · ${h.importe_par}` : ''}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={`text-xs font-medium ${STATUT_COLOR[h.statut_import] || 'text-gray-400'}`}>
                    {h.statut_import}
                  </span>
                  <p className="text-xs text-gray-500 mt-0.5">{h.nb_erreurs} erreur(s)</p>
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUT_COLOR[h.statut_validation] || 'text-gray-400'} bg-gray-800`}>
                  validation: {h.statut_validation}
                </span>
                {h.nb_corrigees > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full text-green-400 bg-gray-800">
                    {h.nb_corrigees} corrigée(s)
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const STATUT_COLOR: Record<string, string> = {
    integre: 'text-green-400', valide: 'text-blue-400',
    rejete: 'text-red-400', en_cours: 'text-yellow-400',
    warning: 'text-orange-400', echec: 'text-red-400'
  }
}
