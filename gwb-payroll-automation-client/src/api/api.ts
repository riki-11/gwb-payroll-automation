import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Create axios instance with cookie authentication
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true // Important: needed to send cookies with requests
});

// Export common API functions
export const sendPayslipToEmail = async (formData: FormData) => {
  return api.post('/api/send-payslip-to-email', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    withCredentials: true
  });
};

// Check authentication status
export const checkAuth = async () => {
  try {
    const response = await api.get('/auth/current-user');
    return response.data;
  } catch (error) {
    console.error('Auth check failed:', error);
    return { isAuthenticated: false };
  }
};

// Add more API functions here as needed

export default api;