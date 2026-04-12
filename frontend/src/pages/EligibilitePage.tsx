import { useState } from 'react'
import api from '@services/api'
import toast from 'react-hot-toast'

interface ResultatEligibilite {
  eligible: boolean
  niveau: string
  adresse: string
  pbo_proche?: { nom: string; distance_m: number; fibres_dispo: number }
  logement?: { type: string; nb_el: number; statut_ftth: string }
  delai_estime?: string
  offres_disponibles: Array<{ nom: string; debit: string; prix: string; promo: string | null }>
  message_commercial: string
  contact_commercial: string
}

interface BonCommandeForm {
  nom: string; prenom: string; telephone: string; email: string
  adresse: string; commune: string; offre: string; commentaire: string
}

const NIVEAU_CONFIG: Record<string, { color: string; bg: string; border: string; icon: string }> = {
  immediat:    { color: 'text-green-300',  bg: 'bg-green-900/40',  border: 'border-green-600', icon: '✅' },
  planifie:    { color: 'text-blue-300',   bg: 'bg-blue-900/40',   border: 'border-blue-600',  icon: '📅' },
  en_etude:    { color: 'text-yellow-300', bg: 'bg-yellow-900/40', border: 'border-yellow-600',icon: '🔍' },
  non_eligible:{ color: 'text-red-300',    bg: 'bg-red-900/40',    border: 'border-red-600',   icon: '❌' },
}

export default function EligibilitePage() {
  const [adresse, setAdresse] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [loading, setLoading] = useState(false)
  const [resultat, setResultat] = useState<ResultatEligibilite | null>(null)
  const [showBonCommande, setShowBonCommande] = useState(false)
  const [bcForm, setBcForm] = useState<BonCommandeForm>({
    nom: '', prenom: '', telephone: '', email: '',
    adresse: '', commune: '', offre: '', commentaire: ''
  })
  const [bcLoading, setBcLoading] = useState(false)
  const [bcDone, setBcDone] = useState(false)
  const [locating, setLocating] = useState(false)

  const localiser = () => {
    if (!navigator.geolocation) { toast.error('GPS non supporté'); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6))
        setLng(pos.coords.longitude.toFixed(6))
        setLocating(false)
        toast.success('Position GPS obtenue !')
      },
      () => { toast.error('Impossible d\'obtenir la position'); setLocating(false) }
    )
  }

  const verifier = async () => {
    if (!adresse && !lat) { toast.error('Saisissez une adresse ou utilisez le GPS'); return }
    setLoading(true); setResultat(null)
    try {
      const payload: any = {}
      if (adresse) payload.adresse = adresse
      if (lat && lng) { payload.lat = parseFloat(lat); payload.lng = parseFloat(lng) }
      const res = await api.post('/eligibilite/verifier', payload)
      setResultat(res.data)
      if (adresse && !bcForm.adresse) setBcForm(f => ({ ...f, adresse }))
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Erreur lors de la vérification')
    } finally { setLoading(false) }
  }

  const envoyerBonCommande = async () => {
    if (!bcForm.nom || !bcForm.prenom || !bcForm.telephone || !bcForm.adresse) {
      toast.error('Remplissez les champs obligatoires (Nom, Prénom, Téléphone, Adresse)'); return
    }
    setBcLoading(true)
    try {
      await api.post('/eligibilite/bon-commande', bcForm)
      setBcDone(true)
      toast.success('Demande envoyée avec succès !')
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Erreur envoi')
    } finally { setBcLoading(false) }
  }

  const cfg = resultat ? (NIVEAU_CONFIG[resultat.niveau] || NIVEAU_CONFIG.non_eligible) : null

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">📡 Éligibilité FTTH</h1>
        <p className="text-gray-400 text-sm mt-1">Vérifiez si votre adresse est couverte par la fibre optique</p>
      </div>

      {/* Formulaire de recherche */}
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 space-y-4">
        <h2 className="font-semibold text-white text-sm">🔍 Rechercher une adresse</h2>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Adresse complète</label>
          <input
            value={adresse} onChange={e => setAdresse(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && verifier()}
            placeholder="ex: Rue des Bougainvillées, Cocody, Abidjan"
            className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500"
          />
        </div>
        <div className="grid grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Latitude GPS</label>
            <input value={lat} onChange={e => setLat(e.target.value)} placeholder="5.3599"
              className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Longitude GPS</label>
            <input value={lng} onChange={e => setLng(e.target.value)} placeholder="-4.0083"
              className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-blue-500" />
          </div>
          <button onClick={localiser} disabled={locating}
            className="py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl text-sm transition-all disabled:opacity-50">
            {locating ? '⏳' : '📍'} GPS
          </button>
        </div>
        <button onClick={verifier} disabled={loading || (!adresse && !lat)}
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-medium rounded-xl transition-all">
          {loading ? '⏳ Vérification en cours...' : '🔍 Vérifier l\'éligibilité'}
        </button>
      </div>

      {/* Résultat */}
      {resultat && cfg && (
        <div className={`${cfg.bg} border ${cfg.border} rounded-2xl p-5 space-y-4`}>
          <div className="flex items-start gap-3">
            <span className="text-3xl">{cfg.icon}</span>
            <div>
              <p className={`font-bold text-lg ${cfg.color}`}>
                {resultat.niveau === 'immediat' && 'Éligible — Connexion immédiate'}
                {resultat.niveau === 'planifie' && 'Zone bientôt éligible'}
                {resultat.niveau === 'en_etude' && 'Zone en cours d\'étude'}
                {resultat.niveau === 'non_eligible' && 'Zone non couverte'}
              </p>
              <p className="text-gray-300 text-sm mt-1">{resultat.message_commercial}</p>
            </div>
          </div>

          {/* Infos techniques */}
          <div className="grid grid-cols-2 gap-3">
            {resultat.pbo_proche && (
              <div className="bg-gray-800/50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-1">📡 PBO le plus proche</p>
                <p className="text-white font-medium text-sm">{resultat.pbo_proche.nom}</p>
                <p className="text-gray-300 text-xs">{Math.round(resultat.pbo_proche.distance_m)}m — {resultat.pbo_proche.fibres_dispo} fibre(s) dispo</p>
              </div>
            )}
            {resultat.delai_estime && (
              <div className="bg-gray-800/50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-1">⏱️ Délai estimé</p>
                <p className="text-white font-medium text-sm">{resultat.delai_estime}</p>
              </div>
            )}
            {resultat.logement && (
              <div className="bg-gray-800/50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-1">🏠 Logement détecté</p>
                <p className="text-white text-sm">{resultat.logement.type}</p>
                <p className="text-gray-300 text-xs">{resultat.logement.nb_el} EL — {resultat.logement.statut_ftth}</p>
              </div>
            )}
            <div className="bg-gray-800/50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-1">📞 Commercial</p>
              <p className="text-white text-sm font-medium">{resultat.contact_commercial}</p>
            </div>
          </div>

          {/* Offres disponibles */}
          {resultat.offres_disponibles.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-white mb-3">💎 Offres disponibles</p>
              <div className="grid gap-2">
                {resultat.offres_disponibles.map((offre, i) => (
                  <button key={i} onClick={() => { setBcForm(f => ({ ...f, offre: offre.nom })); setShowBonCommande(true) }}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all text-left hover:bg-gray-700/50
                      ${bcForm.offre === offre.nom ? 'border-blue-500 bg-blue-900/20' : 'border-gray-700 bg-gray-800/50'}`}>
                    <div>
                      <p className="text-white font-medium text-sm">{offre.nom}</p>
                      <p className="text-gray-400 text-xs">{offre.debit}</p>
                      {offre.promo && <span className="text-xs bg-green-900 text-green-300 px-2 py-0.5 rounded-full mt-1 inline-block">{offre.promo}</span>}
                    </div>
                    <p className="text-blue-400 font-bold text-sm">{offre.prix}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Bouton bon de commande */}
          {resultat.eligible && (
            <button onClick={() => setShowBonCommande(true)}
              className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-all">
              📋 Souscrire / Demande de raccordement
            </button>
          )}
          {!resultat.eligible && (
            <button onClick={() => setShowBonCommande(true)}
              className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl transition-all text-sm">
              📬 Être notifié quand la zone sera couverte
            </button>
          )}
        </div>
      )}

      {/* Formulaire Bon de Commande */}
      {showBonCommande && !bcDone && (
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white">📋 Bon de commande / Inscription</h2>
            <button onClick={() => setShowBonCommande(false)} className="text-gray-500 hover:text-white">✕</button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Nom *', key: 'nom', placeholder: 'KOUAME' },
              { label: 'Prénom *', key: 'prenom', placeholder: 'Edgar' },
              { label: 'Téléphone *', key: 'telephone', placeholder: '+225 07 00 00 00' },
              { label: 'Email', key: 'email', placeholder: 'votre@email.ci' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs text-gray-400 mb-1">{f.label}</label>
                <input value={(bcForm as any)[f.key]} onChange={e => setBcForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-blue-500" />
              </div>
            ))}
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Adresse complète *</label>
            <input value={bcForm.adresse} onChange={e => setBcForm(p => ({ ...p, adresse: e.target.value }))}
              placeholder="Rue, quartier, commune"
              className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Commune</label>
              <input value={bcForm.commune} onChange={e => setBcForm(p => ({ ...p, commune: e.target.value }))}
                placeholder="Cocody"
                className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Offre choisie</label>
              <select value={bcForm.offre} onChange={e => setBcForm(p => ({ ...p, offre: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-blue-500">
                <option value="">-- Choisir --</option>
                <option value="Fibre Essentiel">Fibre Essentiel — 100 Mb/s</option>
                <option value="Fibre Confort">Fibre Confort — 300 Mb/s</option>
                <option value="Fibre Premium">Fibre Premium — 1 Gb/s</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Commentaire</label>
            <textarea value={bcForm.commentaire} onChange={e => setBcForm(p => ({ ...p, commentaire: e.target.value }))}
              placeholder="Informations supplémentaires..."
              rows={2}
              className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-blue-500 resize-none" />
          </div>
          <button onClick={envoyerBonCommande} disabled={bcLoading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all">
            {bcLoading ? '⏳ Envoi...' : '✅ Envoyer la demande'}
          </button>
        </div>
      )}

      {bcDone && (
        <div className="bg-green-900/40 border border-green-600 rounded-2xl p-6 text-center space-y-3">
          <div className="text-4xl">✅</div>
          <p className="text-green-300 font-bold text-lg">Demande envoyée avec succès !</p>
          <p className="text-gray-400 text-sm">Un commercial vous contactera sous 24h au {bcForm.telephone}</p>
          <button onClick={() => { setBcDone(false); setShowBonCommande(false); setResultat(null); setAdresse('') }}
            className="px-6 py-2.5 bg-green-700 hover:bg-green-600 text-white rounded-xl text-sm transition-all">
            Nouvelle recherche
          </button>
        </div>
      )}
    </div>
  )
}
