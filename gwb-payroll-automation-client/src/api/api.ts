// gwb-payroll-automation-client/src/api/api.ts
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true // Important: this enables sending cookies with cross-origin requests
});

export const checkAuthStatus = async () => {
  return api.get('/auth/status');
};

export const logout = async () => {
  return api.get('/auth/logout');
};

export const getCurrentUser = async () => {
  return api.get('/auth/get-current-user');
};

export const sendPayslipToEmail = async (formData: FormData) => {
  return axios.post(`${API_BASE_URL}/api/send-payslip-to-email`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    withCredentials: true
  });
};

export default api;