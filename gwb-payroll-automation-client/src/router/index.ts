import { createRouter, createWebHistory } from 'vue-router';
import Home from '../components/Home.vue';
import GeneratePayslipsPage from '../components/GeneratePayslipsPage.vue';
import PayslipLogsPage from '../components/PayslipLogsPage.vue';
import { useUserStore } from '../stores/userStore';

const backendUrl = import.meta.env.VITE_API_BASE_URL;

const routes = [
  { path: '/', component: Home },
  { path: '/generate-payslips', component: GeneratePayslipsPage },
  { path: '/payslip-logs', 
    component: PayslipLogsPage, 
    meta: { requiresAuth: true }
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Global navigation guard
router.beforeEach((to, _from, next) => {
  const userStore = useUserStore();
  
  // Check if route requires authentication
  if (to.matched.some(record => record.meta.requiresAuth)) {
    // Check if user is authenticated
    if (!userStore.getUserEmail) {
      // User is not authenticated, redirect to Microsoft login
      window.location.href = `${backendUrl}/auth/login`;
      return;
    } else {
      // User is authenticated, proceed to route
      next();
    }
  } else {
    // Route doesn't require authentication, proceed
    next();
  }
});

export default router;