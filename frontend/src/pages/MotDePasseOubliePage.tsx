import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL || 'https://sig-ftth-production-a3aa.up.railway.app'

export default function MotDePasseOubliePage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const envoyer = async () => {
    if (!email) { setError('Email requis'); return }
    setLoading(true)
    setError('')
    try {
      await fetch(`${API}/auth/mot-de-passe-oublie`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setSent(true)
    } catch {
      setError('Erreur réseau. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🔑</div>
          <h1 className="text-2xl font-bold text-white">Mot de passe oublié</h1>
          <p className="text-gray-400 text-sm mt-2">
            Saisissez votre email pour recevoir un lien de réinitialisation
          </p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="text-4xl">📧</div>
              <p className="text-green-400 font-medium">Email envoyé !</p>
              <p className="text-gray-400 text-sm">Vérifiez votre boîte mail et cliquez le lien.</p>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
              >
                Retour à la connexion
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">
                  Adresse e-mail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && envoyer()}
                  placeholder="votre@email.ci"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500"
                />
              </div>
              <button
                onClick={envoyer}
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-medium transition-colors"
              >
                {loading ? 'Envoi...' : 'Envoyer le lien'}
              </button>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-3 text-gray-400 hover:text-white text-sm transition-colors"
              >
                ← Retour à la connexion
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
