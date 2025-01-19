import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
  baseURL: API_BASE_URL, // Use env variable for base URL
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getUserInfo = async () => {
  return axios.get(`${API_BASE_URL}/auth/get-user-info`, {
    withCredentials: true
  })
}

export const verifySession = async () => {
  return axios.get(`${API_BASE_URL}/auth/verify-session`, {
    withCredentials: true
  })
}

export const sendPayslipToEmail = async (formData: FormData) => {
    
    return axios.post(`${API_BASE_URL}/api/send-payslip-to-email`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  };

export default api;
