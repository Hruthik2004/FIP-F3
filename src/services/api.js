/**
 * API Service — Axios client with JWT auth, interceptors, and all endpoints.
 * All methods return real data or throw; no mock fallbacks.
 */
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// ─── Axios instance ───────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 45000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('fi_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}, Promise.reject);

// Handle 401 globally — redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('fi_token');
      localStorage.removeItem('fi_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  login:         (email, password) => api.post('/auth/login', { email, password }).then(r => r.data),
  register:      (data)            => api.post('/auth/register', data).then(r => r.data),
  me:            ()                => api.get('/auth/me').then(r => r.data),
  updateProfile: (data)            => api.patch('/auth/me', data).then(r => r.data),
  googleAuth:    (token)           => api.post('/auth/google', { token }).then(r => r.data),
};

// ─── Providers ────────────────────────────────────────────────────────────────
export const providersAPI = {
  list:    (params = {})  => api.get('/providers', { params }).then(r => r.data),
  get:     (id)           => api.get(`/providers/${id}`).then(r => r.data),
  search:  (q, params={}) => api.get('/providers/search', { params: { q, ...params } }).then(r => r.data),
  enrich:  (id)           => api.post(`/providers/${id}/enrich`).then(r => r.data),
  delete:  (id)           => api.delete(`/providers/${id}`).then(r => r.data),
  summary: ()             => api.get('/providers/stats/summary').then(r => r.data),
};

// ─── Scraper ──────────────────────────────────────────────────────────────────
export const scraperAPI = {
  start:     (url, name, config = {}) => api.post('/scraper/start', { url, name, config }).then(r => r.data),
  bulk:      (urls, config = {})      => api.post('/scraper/bulk', { urls, config }).then(r => r.data),
  listJobs:  (status)                 => api.get('/scraper/jobs', { params: status ? { status } : {} }).then(r => r.data),
  getJob:    (id)                     => api.get(`/scraper/jobs/${id}`).then(r => r.data),
  cancelJob: (id)                     => api.delete(`/scraper/jobs/${id}`).then(r => r.data),
  stats:     ()                       => api.get('/scraper/stats').then(r => r.data),
};

// ─── Analytics ────────────────────────────────────────────────────────────────
export const analyticsAPI = {
  dashboard: () => api.get('/analytics').then(r => r.data),
  export:    (fmt = 'csv') => api.get('/analytics/export', { params: { format: fmt }, responseType: 'blob' }).then(r => r.data),
};

// ─── Import ───────────────────────────────────────────────────────────────────
export const importAPI = {
  upload: (file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/import/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },
  listBatches: () => api.get('/import/batches').then(r => r.data),
  deleteBatch: (id) => api.delete(`/import/batches/${id}`).then(r => r.data),
};

// ─── Chat / AI ────────────────────────────────────────────────────────────────
export const chatAPI = {
  sendMessage:  (content, session_id = null) => api.post('/chat/message', { content, session_id }).then(r => r.data),
  listSessions: ()  => api.get('/chat/sessions').then(r => r.data),
  getSession:   (id) => api.get(`/chat/sessions/${id}`).then(r => r.data),
  deleteSession:(id) => api.delete(`/chat/sessions/${id}`).then(r => r.data),
};

export default api;
