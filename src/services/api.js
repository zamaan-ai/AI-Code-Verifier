import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' }
});

// Attach JWT from localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, clear token (caller can redirect to login)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export const login = (username, password) =>
  api.post('/auth/login', { username, password });
export const register = (username, password) =>
  api.post('/auth/register', { username, password });
export const getMe = () => api.get('/auth/me');

export const getDashboard = () => api.get('/dashboard');
export const getProjects = () => api.get('/projects');
export const getProject = (id) => api.get(`/projects/${id}`);
export const createProject = (data) => api.post('/projects', data);
export const deleteProject = (id) => api.delete(`/projects/${id}`);

export const getFindings = (params) => api.get('/findings', { params });
export const getFinding = (id) => api.get(`/findings/${id}`);
export const updateFinding = (id, data) => api.patch(`/findings/${id}`, data);
export const generateCandidates = (id) => api.post(`/findings/${id}/candidates`);
export const verifyCandidate = (id, idx) => api.post(`/findings/${id}/candidates/${idx}/verify`);

export const getScans = (params) => api.get('/scans', { params });
export const startScan = (data) => api.post('/scans', data);
export const getScan = (id) => api.get(`/scans/${id}`);

export const getTranspilations = (params) => api.get('/transpilation', { params });
export const startTranspilation = (data) => api.post('/transpilation', data);
export const updateTranspilation = (id, data) => api.patch(`/transpilation/${id}`, data);

export const getWCET = (params) => api.get('/wcet', { params });
export const runWCET = (data) => api.post('/wcet', data);

export const getSettings = () => api.get('/settings');
export const updateSettings = (data) => api.put('/settings', data);

export const generateReport = (data) => api.post('/reports/generate', data);

export default api;
