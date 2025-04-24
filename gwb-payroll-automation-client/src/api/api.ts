import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important: this enables sending cookies with cross-origin requests
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
});

// Add response interceptor to handle common errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log the error for debugging
    console.error('API Error:', error);
    
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.log('Error data:', error.response.data);
      console.log('Error status:', error.response.status);
      console.log('Error headers:', error.response.headers);
    } else if (error.request) {
      // The request was made but no response was received
      console.log('Error request:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.log('Error message:', error.message);
    }
    
    // CORS errors don't typically reach this interceptor,
    // but we can still pass the error down for handling
    return Promise.reject(error);
  }
);

export const checkAuthStatus = async () => {
  return api.get('/auth/status');
};

export const logout = async () => {
  return api.get('/auth/logout');
};

export const getCurrentUser = async () => {
  return api.get('/auth/get-current-user');
};

// Legacy API for sending payslips (using Nodemailer)
export const sendPayslipToEmail = async (formData: FormData) => {
  return axios.post(`${API_BASE_URL}/api/send-payslip-to-email`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    withCredentials: true
  });
};

// New API for sending payslips using Microsoft Graph
export const sendPayslipViaGraph = async (formData: FormData) => {
  return axios.post(`${API_BASE_URL}/email/send-payslip`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    withCredentials: true
  });
};

export const sendTestEmail = async (recipient: string) => {
  return api.post('/email/send-test-graph-email', { email: recipient });
}

export default api;