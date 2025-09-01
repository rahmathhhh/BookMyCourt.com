import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authService = {
  // Register new user
  register: async (userData) => {
    return await api.post('/auth/register', userData);
  },

  // Login user
  login: async (credentials) => {
    return await api.post('/auth/login', credentials);
  },

  // Get current user
  getCurrentUser: async () => {
    return await api.get('/auth/me');
  },

  // Update user profile
  updateProfile: async (userData) => {
    return await api.put('/auth/profile', userData);
  },

  // Verify OTP
  verifyOTP: async (otp, userId) => {
    return await api.post('/auth/verify-otp', { otp, userId });
  },

  // Resend OTP
  resendOTP: async (userId) => {
    return await api.post('/auth/resend-otp', { userId });
  },

  // Forgot password
  forgotPassword: async (phone) => {
    return await api.post('/auth/forgot-password', { phone });
  },

  // Reset password
  resetPassword: async (phone, otp, newPassword) => {
    return await api.post('/auth/reset-password', {
      phone,
      otp,
      newPassword
    });
  }
};

export default api; 