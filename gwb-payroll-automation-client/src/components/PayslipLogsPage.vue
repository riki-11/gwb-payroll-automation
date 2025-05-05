<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../stores/userStore';

const router = useRouter();
const userStore = useUserStore();
const isAuthenticated = ref(false);

onMounted(async () => {
  // Check if user is authenticated
  if (!userStore.getUserEmail) {
    // Redirect to home or login page if not authenticated
    router.push('/');
    return;
  }
  
  isAuthenticated.value = true;
});
</script>

<template>
  <div v-if="isAuthenticated">
    <h1 class="py-10">Payslip Email Logs</h1>
    <!-- Your logs content will go here -->
  </div>
</template>