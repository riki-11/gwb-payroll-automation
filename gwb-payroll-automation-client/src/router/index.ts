import { createRouter, createWebHistory } from 'vue-router';
import Home from '../components/Home.vue';
import GeneratePayslipsPage from '../components/GeneratePayslipsPage.vue';
import { authGuard } from './guards';

const routes = [
  { 
    path: '/', 
    component: Home,
    meta: { requiresAuth: true } 
  },
  { 
    path: '/generate-payslips', 
    component: GeneratePayslipsPage,
    meta: { requiresAuth: true } 
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Apply global navigation guard
router.beforeEach(authGuard);

export default router;