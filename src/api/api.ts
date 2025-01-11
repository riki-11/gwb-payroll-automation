import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000', // Use env variable for base URL
  headers: {
    'Content-Type': 'application/json',
  },
});

export const sendPayslipToEmail = async (formData: FormData) => {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
    return axios.post(`${API_BASE_URL}/api/send-payslip-to-email`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  };

export default api;
