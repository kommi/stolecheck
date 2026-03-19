import axios from 'axios';

const API_BASE = process.env.REACT_APP_BACKEND_URL;
const API = `${API_BASE}/api`;

const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('stolecheck_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('stolecheck_token');
      localStorage.removeItem('stolecheck_user');
      if (!window.location.pathname.includes('/auth') && window.location.pathname !== '/') {
        window.location.href = '/auth';
      }
    }
    return Promise.reject(err);
  }
);

// Auth
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  googleSession: (sessionId) => api.post('/auth/google-session', { session_id: sessionId }),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

// Items
export const itemsAPI = {
  create: (data) => api.post('/items', data),
  getAll: (params) => api.get('/items', { params }),
  getOne: (id) => api.get(`/items/${id}`),
  update: (id, data) => api.patch(`/items/${id}`, data),
  delete: (id) => api.delete(`/items/${id}`),
};

// Verification
export const verifyAPI = {
  scan: (data) => api.post('/verify', data),
  history: () => api.get('/verify/history'),
};

// Law Enforcement
export const lawAPI = {
  getAlerts: (params) => api.get('/law/alerts', { params }),
  updateAlert: (id, data) => api.patch(`/law/alerts/${id}`, data),
  getCases: (params) => api.get('/law/cases', { params }),
  createCase: (data) => api.post('/law/cases', data),
  updateCase: (id, data) => api.patch(`/law/cases/${id}`, data),
  getStats: () => api.get('/law/stats'),
  getItems: (params) => api.get('/law/items', { params }),
};

// Admin
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getUsers: () => api.get('/admin/users'),
  updateRole: (userId, role) => api.patch(`/admin/users/${userId}/role`, { role }),
};

// Public
export const publicAPI = {
  stats: () => api.get('/public/stats'),
};

export default api;
