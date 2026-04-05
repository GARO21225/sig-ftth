import axios from 'axios'

const RAILWAY_URL = 'https://sig-ftth-production.up.railway.app'

const API_URL = import.meta.env.VITE_API_URL || RAILWAY_URL

const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
})

// Ajout token automatique
api.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Refresh token automatique
api.interceptors.response.use(
  response => response,
  async error => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refresh = localStorage.getItem('refresh_token')
        const res = await axios.post(
          `${API_URL}/auth/refresh-token`,
          { refresh_token: refresh }
        )
        const { access_token } = res.data
        localStorage.setItem('access_token', access_token)
        original.headers.Authorization = `Bearer ${access_token}`
        return api(original)
      } catch {
        localStorage.clear()
        const base = import.meta.env.BASE_URL || '/'
        window.location.href = base + 'login'
      }
    }
    return Promise.reject(error)
  }
)

export const authApi = axios.create({
  baseURL: `${API_URL}/auth`,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
})

export default api
