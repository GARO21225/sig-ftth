import { useNavigate } from 'react-router-dom'

export default function AdminPage() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 text-center p-8">
      <div className="text-6xl">🚧</div>
      <h1 className="text-2xl font-bold text-white">AdminPage</h1>
      <p className="text-gray-400 max-w-md">
        Ce module est en cours de développement.<br/>
        Il sera disponible dans la prochaine version.
      </p>
      <button
        onClick={() => navigate('/map')}
        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
      >
        ← Retour à la carte
      </button>
    </div>
  )
}
