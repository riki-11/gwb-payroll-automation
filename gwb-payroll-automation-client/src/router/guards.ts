// router/guards.ts
import type { RouteLocationNormalized, NavigationGuardNext } from 'vue-router';
import { checkAuth } from '../api/api';

// Authentication guard for protected routes
export const authGuard = async (
  to: RouteLocationNormalized,
  _from: RouteLocationNormalized, // TODO: Figure why this is necessary.
  next: NavigationGuardNext
) => {
  // Check if the route requires authentication
  if (to.meta.requiresAuth) {
    try {
      // Check authentication with the server
      const { isAuthenticated } = await checkAuth();
      
      if (isAuthenticated) {
        // User is authenticated, proceed to route
        next();
      } else {
        // Not authenticated, redirect to login
        // This will redirect to the server's login endpoint
        window.location.href = `${import.meta.env.VITE_API_BASE_URL}/auth/login?redirect=${encodeURIComponent(to.fullPath)}`;
        return;
      }
    } catch (error) {
      console.error('Auth guard error:', error);
      // On error, redirect to login
      window.location.href = `${import.meta.env.VITE_API_BASE_URL}/auth/login?redirect=${encodeURIComponent(to.fullPath)}`;
      return;
    }
  } else {
    // Route doesn't require auth, proceed
    next();
  }
};