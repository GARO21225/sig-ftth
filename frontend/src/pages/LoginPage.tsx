import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@store/useStore'
import { authApi } from '@services/api'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [mdp, setMdp] = useState('')
  const [showMdp, setShowMdp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState('')

  const { login } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault()
    setLoading(true)
    setErreur('')

    try {
      const res = await authApi.post('/login', {
        email,
        mot_de_passe: mdp
      })
      login(res.data)
      toast.success(
        `Bienvenue ${res.data.user.prenom} ! 👋`
      )
      navigate('/map')
    } catch (err: any) {
      const msg =
        err.response?.data?.detail
        || 'Erreur de connexion'
      setErreur(msg)

      if (err.response?.status === 423) {
        setErreur(
          '🔒 Compte verrouillé. '
          + 'Réinitialisez votre mot de passe.'
        )
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950
                    flex items-center justify-center
                    p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🌐</div>
          <h1 className="text-3xl font-bold text-white">
            SIG FTTH
          </h1>
          <p className="text-gray-400 text-sm mt-2">
            Système d'Information Géographique
          </p>
        </div>

        {/* Carte login */}
        <div className="bg-gray-900 rounded-2xl p-8
                        border border-gray-700
                        shadow-2xl">
          <h2 className="text-xl font-bold
                         text-white mb-6">
            Connexion
          </h2>

          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            {/* Email */}
            <div>
              <label className="text-sm text-gray-400
                                block mb-2">
                Adresse email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="votre@email.com"
                required
                autoComplete="email"
                className="w-full bg-gray-800 rounded-xl
                           p-4 text-white border
                           border-gray-600
                           focus:border-blue-500
                           outline-none transition-colors"
              />
            </div>

            {/* Mot de passe */}
            <div>
              <label className="text-sm text-gray-400
                                block mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  type={showMdp ? 'text' : 'password'}
                  value={mdp}
                  onChange={e => setMdp(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full bg-gray-800 rounded-xl
                             p-4 text-white border
                             border-gray-600
                             focus:border-blue-500
                             outline-none pr-12
                             transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowMdp(!showMdp)}
                  className="absolute right-4 top-1/2
                             -translate-y-1/2
                             text-gray-400
                             hover:text-white text-lg"
                >
                  {showMdp ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Erreur */}
            {erreur && (
              <div className="bg-red-950 border
                              border-red-600 rounded-xl
                              p-3 text-red-300 text-sm
                              animate-fade-in">
                ❌ {erreur}
              </div>
            )}

            {/* Bouton connexion */}
            <button
              type="submit"
              disabled={loading || !email || !mdp}
              className="w-full bg-blue-600
                         hover:bg-blue-700
                         rounded-xl py-4 font-bold
                         text-white transition-all
                         disabled:opacity-50
                         active:scale-95
                         flex items-center
                         justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="animate-spin">⚙️</span>
                  Connexion...
                </>
              ) : (
                '🔐 Se connecter'
              )}
            </button>

            {/* Mot de passe oublié */}
            <div className="text-center">
              <Link
                to="/mot-de-passe-oublie"
                className="text-blue-400
                           hover:text-blue-300
                           text-sm transition-colors"
              >
                Mot de passe oublié ?
              </Link>
            </div>
          </form>
        </div>

        {/* Comptes de test */}
        <div className="mt-4 bg-gray-900/50
                        rounded-xl p-4
                        border border-gray-800">
          <p className="text-xs text-gray-500
                        text-center mb-3">
            Comptes de démonstration
          </p>
          <div className="space-y-2">
            {[
              {
                role: '👑 Admin',
                email: 'admin@sig-ftth.ci',
                color: 'blue'
              },
              {
                role: '💼 Commercial',
                email: 'commercial@sig-ftth.ci',
                color: 'green'
              },
              {
                role: '🔧 Technicien',
                email: 'technicien@sig-ftth.ci',
                color: 'orange'
              },
            ].map(c => (
              <button
                key={c.email}
                onClick={() => {
                  setEmail(c.email)
                  setMdp('Admin@2026!')
                }}
                className="w-full text-left px-3 py-2
                           bg-gray-800 rounded-lg
                           hover:bg-gray-700
                           transition-colors text-xs"
              >
                <span className="font-medium
                                 text-white">
                  {c.role}
                </span>
                <span className="text-gray-400 ml-2">
                  {c.email}
                </span>
              </button>
            ))}
            <p className="text-xs text-gray-600
                          text-center mt-1">
              MDP : Admin@2026!
            </p>
          </div>
        </div>

        <p className="text-center text-gray-600
                      text-xs mt-6">
          SIG FTTH v6.1 — Edgar KOUAME © 2026
        </p>
      </div>
    </div>
  )
}
