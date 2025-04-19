import { createRouter, createWebHistory } from 'vue-router';
import Home from '../components/Home.vue';
import GeneratePayslipsPage from '../components/GeneratePayslipsPage.vue';

const routes = [
  { path: '/', component: Home },
  { path: '/generate-payslips', component: GeneratePayslipsPage },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;