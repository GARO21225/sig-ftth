import axios from 'axios'
import type { AxiosRequestConfig } from 'axios'

const RAILWAY_URL = 'https://sig-ftth-production-a3aa.up.railway.app'
const API_URL = import.meta.env.VITE_API_URL || RAILWAY_URL

// ── Instance principale ────────────────────────────────────────
const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

export const authApi = axios.create({
  baseURL: `${API_URL}/auth`,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// ── Token auto-inject ──────────────────────────────────────────
const injectToken = (config: any) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
}
api.interceptors.request.use(injectToken)
authApi.interceptors.request.use(injectToken)

// ── Refresh token avec file d'attente (évite les races 401) ───
let refreshing = false
let queue: Array<{ resolve: (v: any) => void; reject: (e: any) => void }> = []

const processQueue = (error: any, token: string | null = null) => {
  queue.forEach(p => error ? p.reject(error) : p.resolve(token))
  queue = []
}

api.interceptors.response.use(
  res => res,
  async (error) => {
    const original = error.config
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error)
    }
    if (refreshing) {
      return new Promise((resolve, reject) => {
        queue.push({ resolve, reject })
      }).then(token => {
        original.headers.Authorization = `Bearer ${token}`
        return api(original)
      })
    }
    original._retry = true
    refreshing = true
    try {
      const refresh = localStorage.getItem('refresh_token')
      const res = await axios.post(`${API_URL}/auth/refresh-token`, { refresh_token: refresh })
      const { access_token } = res.data
      localStorage.setItem('access_token', access_token)
      original.headers.Authorization = `Bearer ${access_token}`
      processQueue(null, access_token)
      return api(original)
    } catch (e) {
      processQueue(e)
      localStorage.clear()
      const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')
      window.location.href = base + '/login'
      return Promise.reject(e)
    } finally {
      refreshing = false
    }
  }
)

// ── Helpers typés pour les prochains modules ──────────────────
export const apiGet  = <T>(url: string, config?: AxiosRequestConfig) => api.get<T>(url, config).then(r => r.data)
export const apiPost = <T>(url: string, data?: any, config?: AxiosRequestConfig) => api.post<T>(url, data, config).then(r => r.data)
export const apiPut  = <T>(url: string, data?: any, config?: AxiosRequestConfig) => api.put<T>(url, data, config).then(r => r.data)
export const apiDel  = (url: string) => api.delete(url).then(r => r.data)

export { API_URL }
export default api
