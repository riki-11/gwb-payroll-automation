// services/authStore.ts
import { reactive, readonly } from 'vue';
import { checkAuth } from '../api/api';

// User interface
interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

// Authentication store state
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

// Create a reactive state
const state = reactive<AuthState>({
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null
});

// Auth store with methods to update state
const authStore = {
  // Get readonly state
  getState: () => readonly(state),
  
  // Initialize auth state - checks with server using cookie authentication
  init: async () => {
    try {
      state.loading = true;
      state.error = null;
      
      const { isAuthenticated, user } = await checkAuth();
      
      state.isAuthenticated = isAuthenticated;
      state.user = isAuthenticated ? user : null;
      
      return isAuthenticated;
    } catch (error) {
      console.error('Auth initialization error:', error);
      state.isAuthenticated = false;
      state.user = null;
      state.error = 'Failed to initialize authentication';
      return false;
    } finally {
      state.loading = false;
    }
  },
  
  // Login - redirects to server auth endpoint
  login: () => {
    window.location.href = `${import.meta.env.VITE_API_BASE_URL}/auth/login`;
  },
  
  // Logout - redirects to server logout endpoint
  logout: () => {
    window.location.href = `${import.meta.env.VITE_API_BASE_URL}/auth/logout`;
  },
  
  // Clear authentication state
  clearAuth: () => {
    state.user = null;
    state.isAuthenticated = false;
    state.error = null;
  },
  
  // Check if user has a specific role
  hasRole: (role: string): boolean => {
    return state.user?.role === role;
  }
};

export default authStore;