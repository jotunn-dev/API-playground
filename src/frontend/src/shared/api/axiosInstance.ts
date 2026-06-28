import axios from 'axios'

const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

export const axiosInstance = axios.create({
  baseURL: apiBaseUrl,
})

// Attach Bearer token from localStorage on every request
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers = config.headers ?? {}
    config.headers['Authorization'] = `Bearer ${token}`
  }
  return config
})
