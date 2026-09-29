import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('aarohan_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token if unauthorized and not on login pages
      const path = window.location.pathname;
      if (!path.includes('/login')) {
        localStorage.removeItem('aarohan_token');
        localStorage.removeItem('aarohan_user');
        window.location.href = path.startsWith('/team') ? '/team-login' : path.startsWith('/admin') ? '/admin-login' : '/student-login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
