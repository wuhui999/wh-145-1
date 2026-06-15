import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const authAPI = {
  login: (username, password) => api.post('/auth/login', { username, password }),
  getMe: () => api.get('/auth/me'),
}

export const cabinetAPI = {
  list: (params) => api.get('/cabinets', { params }),
  get: (id) => api.get(`/cabinets/${id}`),
  getSlots: (id) => api.get(`/cabinets/${id}/slots`),
}

export const slotAPI = {
  get: (id) => api.get(`/slots/${id}`),
  update: (id, data) => api.put(`/slots/${id}`, data),
}

export const batteryAPI = {
  list: (params) => api.get('/batteries', { params }),
  get: (id) => api.get(`/batteries/${id}`),
  update: (id, data) => api.put(`/batteries/${id}`, data),
}

export const workOrderAPI = {
  list: (params) => api.get('/work-orders', { params }),
  get: (id) => api.get(`/work-orders/${id}`),
  create: (data) => api.post('/work-orders', data),
  update: (id, data) => api.put(`/work-orders/${id}`, data),
}

export const pathAPI = {
  suggest: (data) => api.post('/path/suggest', data),
}

export const statsAPI = {
  overview: () => api.get('/stats/overview'),
  faultRate: () => api.get('/stats/fault-rate'),
  scrapWarning: () => api.get('/stats/scrap-warning'),
  swapEfficiency: () => api.get('/stats/swap-efficiency'),
}

export const userAPI = {
  list: (params) => api.get('/users', { params }),
}

export default api
