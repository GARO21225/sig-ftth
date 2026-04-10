import { useState, useEffect } from 'react'
import api from '@services/api'
import api from '@services/api'
import toast from 'react-hot-toast'

interface User { id: string; email: string; nom: string; prenom: string; role: string; actif: boolean; date_creation: string; date_derniere_connexion?: string }

const ROLES = ['admin','chef_projet','technicien','analyste','commercial','invite']
const ROLE_COLORS: Record<string,string> = {
  admin:'bg-red-900 text-red-300', chef_projet:'bg-purple-900 text-purple-300',
  technicien:'bg-blue-900 text-blue-300', analyste:'bg-yellow-900 text-yellow-300',
  commercial:'bg-green-900 text-green-300', invite:'bg-gray-800 text-gray-400'
}

export default function AdminPage() {
  const [users,       setUsers]       = useState<User[]>([])
  const [loading,     setLoading]     = useState(true)
  const [tab,         setTab]         = useState<'users'|'system'|'api'>('users')
  const [cles,        setCles]        = useState<any[]>([])
  const [creatingCle, setCreatingCle] = useState(false)
  const [cleForm,     setCleForm]     = useState({ nom_client:'', email_contact:'', quota_jour:1000 })
  const [nouvelleCle, setNouvelleCle] = useState<string|null>(null)
  const [search,      setSearch]      = useState('')
  const [creating,    setCreating]    = useState(false)
  const [form, setForm] = useState({ email:'', nom:'', prenom:'', role:'technicien', mot_de_passe:'' })
  const [saving, setSaving] = useState(false)
  const [health, setHealth] = useState<any>(null)

  useEffect(() => { charger() }, [])

  const chargerCles = async () => {
    try {
      const r = await api.get('/api-keys')
      setCles(r.data || [])
    } catch {}
  }

  const creerCle = async () => {
    if (!cleForm.nom_client) return toast.error('Nom client requis')
    try {
      const r = await api.post('/api-keys', cleForm)
      setNouvelleCle(r.data.cle)
      setCreatingCle(false)
      chargerCles()
      toast.success('Clé API créée')
    } catch (e: any) { toast.error(e.response?.data?.detail || 'Erreur') }
  }

  const charger = async () => {
    setLoading(true)
    try {
      const [rUsers, rHealth] = await Promise.allSettled([
        api.get('/auth/utilisateurs'),
        fetch('/health').then(r => r.json())
      ])
      if (rUsers.status === 'fulfilled') setUsers(rUsers.value.data || [])
      if (rHealth.status === 'fulfilled') setHealth(rHealth.value)
    } catch (e) {
      // L'endpoint /utilisateurs peut ne pas exister encore
    } finally { setLoading(false) }
  }

  const creerUtilisateur = async () => {
    if (!form.email || !form.nom || !form.prenom || !form.mot_de_passe)
      return toast.error('Tous les champs sont requis')
    setSaving(true)
    try {
      await api.post('/auth/creer-utilisateur', form)
      toast.success(`Utilisateur ${form.email} créé`)
      setCreating(false)
      setForm({ email:'', nom:'', prenom:'', role:'technicien', mot_de_passe:'' })
      charger()
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Erreur création')
    } finally { setSaving(false) }
  }

  const usersFiltres = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.nom.toLowerCase().includes(search.toLowerCase()) ||
    u.prenom.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="h-full overflow-auto bg-gray-950 p-6">
      <div className="max-w-5xl mx-auto">

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-1">⚙️ Administration</h1>
          <p className="text-gray-400 text-sm">Gestion des utilisateurs et supervision système</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-900 border border-gray-700 rounded-xl p-1 w-fit">
          {([['users','👥 Utilisateurs'],['system','🖥️ Système'],['api','🔑 Clés API']] as const).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab===t ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Tab utilisateurs */}
        {tab === 'users' && (
          <div>
            <div className="flex gap-3 mb-4">
              <div className="flex-1 flex items-center bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
                <span className="pl-4 text-gray-500">🔍</span>
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Rechercher un utilisateur..."
                  className="flex-1 bg-transparent px-3 py-2.5 text-white text-sm outline-none placeholder-gray-600" />
              </div>
              <button onClick={() => setCreating(!creating)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${creating ? 'bg-red-700 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}>
                {creating ? '✕ Annuler' : '+ Nouvel utilisateur'}
              </button>
            </div>

            {/* Formulaire création */}
            {creating && (
              <div className="bg-gray-900 border border-amber-600/50 rounded-2xl p-4 mb-4">
                <h3 className="font-semibold text-white text-sm mb-3">Créer un utilisateur</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ['email','Email *','email'], ['nom','Nom *','text'],
                    ['prenom','Prénom *','text'], ['mot_de_passe','Mot de passe *','password']
                  ].map(([field, label, type]) => (
                    <div key={field}>
                      <label className="block text-xs text-gray-400 mb-1">{label}</label>
                      <input type={type} value={(form as any)[field]}
                        onChange={e => setForm(f => ({...f, [field]: e.target.value}))}
                        className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-blue-500" />
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Rôle</label>
                    <select value={form.role} onChange={e => setForm(f => ({...f, role: e.target.value}))}
                      className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-blue-500">
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
                <button onClick={creerUtilisateur} disabled={saving}
                  className="mt-3 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white text-sm rounded-xl transition-all">
                  {saving ? '⏳...' : '✅ Créer'}
                </button>
              </div>
            )}

            {/* Liste utilisateurs */}
            <div className="bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
                <h2 className="font-semibold text-white text-sm">Utilisateurs</h2>
                <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded-lg">{users.length} comptes</span>
              </div>
              {loading ? (
                <div className="py-12 text-center text-gray-500">⏳ Chargement...</div>
              ) : users.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="text-4xl mb-3">👥</div>
                  <p className="text-gray-400 text-sm">Endpoint /auth/utilisateurs à implémenter</p>
                  <p className="text-gray-600 text-xs mt-1">Les utilisateurs créés via seed.sql sont visibles en base</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-800">
                  {usersFiltres.map(u => (
                    <div key={u.id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-800/50">
                      <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {u.prenom?.[0]}{u.nom?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white">{u.prenom} {u.nom}</p>
                        <p className="text-xs text-gray-400 truncate">{u.email}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-lg ${ROLE_COLORS[u.role]||'bg-gray-800 text-gray-400'}`}>{u.role}</span>
                      <span className={`text-xs px-2 py-1 rounded-lg ${u.actif ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>
                        {u.actif ? 'Actif' : 'Inactif'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab API Keys */}
        {tab === 'api' && (
          <div>
            <div className="flex gap-3 mb-4">
              <div className="flex-1"></div>
              <button onClick={() => setCreatingCle(!creatingCle)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${creatingCle ? 'bg-red-700 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}>
                {creatingCle ? '✕ Annuler' : '+ Nouvelle clé'}
              </button>
              <button onClick={chargerCles} className="px-3 py-2 bg-gray-800 text-gray-300 rounded-xl text-sm">🔄</button>
            </div>
            {nouvelleCle && (
              <div className="bg-green-900/30 border border-green-600/50 rounded-2xl p-4 mb-4">
                <p className="text-green-300 text-sm font-medium mb-2">✅ Clé créée — copiez-la maintenant !</p>
                <code className="text-xs text-white bg-gray-900 px-3 py-2 rounded-xl block break-all">{nouvelleCle}</code>
                <button onClick={() => {navigator.clipboard.writeText(nouvelleCle); toast.success('Clé copiée')}}
                  className="mt-2 px-3 py-1.5 bg-green-700 text-white text-xs rounded-xl">📋 Copier</button>
              </div>
            )}
            {creatingCle && (
              <div className="bg-gray-900 border border-amber-600/50 rounded-2xl p-4 mb-4">
                <div className="space-y-3">
                  <div><label className="block text-xs text-gray-400 mb-1">Nom client *</label>
                    <input value={cleForm.nom_client} onChange={e => setCleForm(f => ({...f, nom_client: e.target.value}))}
                      className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-blue-500" placeholder="ex: QGIS Orange CI" />
                  </div>
                  <div><label className="block text-xs text-gray-400 mb-1">Email contact</label>
                    <input value={cleForm.email_contact} onChange={e => setCleForm(f => ({...f, email_contact: e.target.value}))}
                      className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-blue-500" placeholder="contact@client.ci" />
                  </div>
                  <div><label className="block text-xs text-gray-400 mb-1">Quota / jour</label>
                    <input type="number" value={cleForm.quota_jour} onChange={e => setCleForm(f => ({...f, quota_jour: parseInt(e.target.value)}))}
                      className="w-full bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-blue-500" />
                  </div>
                  <button onClick={creerCle} className="w-full py-2 bg-green-600 hover:bg-green-500 text-white text-sm rounded-xl">✅ Créer la clé</button>
                </div>
              </div>
            )}
            <div className="bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-700"><h2 className="font-semibold text-white text-sm">Clés actives ({cles.length})</h2></div>
              {cles.length === 0 ? (
                <div className="py-8 text-center text-gray-500 text-sm">
                  <p>Aucune clé API créée</p>
                  <p className="text-xs mt-1">Usage : header X-API-Key dans QGIS / Power BI</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-800">
                  {cles.map((cle: any) => (
                    <div key={cle.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-800/50">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{cle.nom_client}</p>
                        <code className="text-xs text-gray-500">{cle.cle_masquee}</code>
                      </div>
                      <div className="text-right text-xs">
                        <p className="text-gray-300">{cle.nb_appels_jour}/{cle.quota_jour} appels/j</p>
                        <p className={cle.actif ? 'text-green-400' : 'text-red-400'}>{cle.actif ? 'Active' : 'Révoquée'}</p>
                      </div>
                      {cle.actif && (
                        <button onClick={async () => { await api.delete(`/api-keys/${cle.id}`); chargerCles(); toast.success('Clé révoquée') }}
                          className="px-2 py-1 bg-red-900/50 text-red-400 text-xs rounded-lg hover:bg-red-900">Révoquer</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-4 bg-gray-900 border border-gray-700 rounded-2xl p-4 text-xs text-gray-400 space-y-1">
              <p className="font-medium text-gray-300">📖 Utilisation dans QGIS</p>
              <p>1. Layer → Add Layer → WFS/API</p>
              <p>2. URL: https://sig-ftth-production-a3aa.up.railway.app/api/v1/public/noeuds-telecom</p>
              <p>3. Header: X-API-Key: <span className="text-yellow-400">votre-clé</span></p>
            </div>
          </div>
        )}

        {/* Tab système */}
        {tab === 'system' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: 'Backend',    value: 'Railway',         icon: '🚂', color: 'text-green-400' },
                { label: 'Base de données', value: 'PostGIS 15', icon: '🗄️', color: 'text-blue-400' },
                { label: 'Frontend',   value: 'GitHub Pages',    icon: '🌐', color: 'text-purple-400' },
                { label: 'API',        value: 'FastAPI v0.109',  icon: '⚡', color: 'text-yellow-400' },
                { label: 'Auth',       value: 'JWT + bcrypt',    icon: '🔐', color: 'text-orange-400' },
                { label: 'Cache',      value: 'Redis (désactivé)',icon: '💾', color: 'text-gray-400'  },
              ].map((s,i) => (
                <div key={i} className="bg-gray-900 border border-gray-700 rounded-2xl p-4">
                  <div className="text-2xl mb-2">{s.icon}</div>
                  <div className="text-xs text-gray-400 mb-1">{s.label}</div>
                  <div className={`text-sm font-semibold ${s.color}`}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Santé API */}
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4">
              <h3 className="font-semibold text-white text-sm mb-3">🩺 Santé de l'application</h3>
              <button onClick={() => fetch(`${import.meta.env.VITE_API_URL || 'https://sig-ftth-production-a3aa.up.railway.app'}/health`).then(r=>r.json()).then(setHealth)}
                className="mb-3 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-xl transition-all">
                🔄 Vérifier maintenant
              </button>
              {health ? (
                <div className="space-y-2">
                  {Object.entries(health).map(([k,v]) => (
                    <div key={k} className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">{k}</span>
                      <span className={`px-2 py-0.5 rounded ${String(v).includes('ok')||String(v).includes('connected') ? 'bg-green-900/40 text-green-400' : 'bg-gray-800 text-gray-300'}`}>
                        {String(v)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500">Cliquez pour vérifier l'état du backend</p>
              )}
            </div>

            {/* Comptes seed */}
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4">
              <h3 className="font-semibold text-white text-sm mb-3">🔑 Comptes par défaut (seed.sql)</h3>
              <div className="space-y-2">
                {[
                  { email:'admin@sig-ftth.ci',       role:'admin',      mdp:'Admin@2026!' },
                  { email:'commercial@sig-ftth.ci',  role:'commercial', mdp:'Admin@2026!' },
                  { email:'technicien@sig-ftth.ci',  role:'technicien', mdp:'Admin@2026!' },
                ].map((u,i) => (
                  <div key={i} className="flex items-center gap-3 text-xs bg-gray-800 rounded-xl px-3 py-2">
                    <span className={`px-2 py-0.5 rounded ${ROLE_COLORS[u.role]}`}>{u.role}</span>
                    <span className="text-gray-300 flex-1 font-mono">{u.email}</span>
                    <span className="text-gray-500 font-mono">{u.mdp}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
