import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL || 'https://sig-ftth-production-a3aa.up.railway.app'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [mdp, setMdp] = useState('')
  const [confirm, setConfirm] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const reinitialiser = async () => {
    if (!mdp || mdp.length < 8) { setError('Minimum 8 caractères'); return }
    if (mdp !== confirm) { setError('Les mots de passe ne correspondent pas'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API}/auth/reinitialiser-mdp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, nouveau_mdp: mdp, confirmation_mdp: confirm }),
      })
      if (res.ok) {
        setDone(true)
      } else {
        const data = await res.json()
        setError(data.detail || 'Lien expiré ou invalide')
      }
    } catch {
      setError('Erreur réseau.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🔐</div>
          <h1 className="text-2xl font-bold text-white">Nouveau mot de passe</h1>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          {done ? (
            <div className="text-center space-y-4">
              <div className="text-4xl">✅</div>
              <p className="text-green-400 font-medium">Mot de passe modifié !</p>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium"
              >
                Se connecter
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">{error}</div>
              )}
              {['Nouveau mot de passe', 'Confirmer le mot de passe'].map((label, i) => (
                <div key={i}>
                  <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">{label}</label>
                  <input
                    type="password"
                    value={i === 0 ? mdp : confirm}
                    onChange={e => i === 0 ? setMdp(e.target.value) : setConfirm(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500"
                  />
                </div>
              ))}
              <p className="text-xs text-gray-500">Min. 8 caractères, 1 majuscule, 1 chiffre, 1 spécial</p>
              <button
                onClick={reinitialiser}
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-medium"
              >
                {loading ? 'Traitement...' : 'Changer le mot de passe'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
