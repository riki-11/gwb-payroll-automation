<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { checkAuthStatus } from '../api/api'; // Import the API function
import { useUserStore } from '../stores/userStore';

const isLoggedIn = ref(false);
const userName = ref<string | null>(null);
const userEmail = ref<string | null>(null);
const isLoading = ref(true);

const backendUrl = import.meta.env.VITE_API_BASE_URL;

// Check user's authentication status
const checkUserAuth = async () => {
  try {
    isLoading.value = true;
    
    const response = await checkAuthStatus();
    
    const userStore = useUserStore();

    if (response.data.isAuthenticated) {
      isLoggedIn.value = true;
      userName.value = response.data.name;
      userEmail.value = response.data.email;
      userStore.setUserInfo(response.data.email, response.data.name);
    } else {
      isLoggedIn.value = false;
      userName.value = null;
      userEmail.value = null;
      userStore.clearUserInfo();
    }
  } catch (error) {
    console.error('Error checking authentication status:', error);
    isLoggedIn.value = false;
    userName.value = null;
    userEmail.value = null;
  } finally {
    isLoading.value = false;
  }
};

// Initiate login
const authenticateLogin = () => {
  window.location.href = `${backendUrl}/auth/login`;
};

// Initiate logout
const authenticateLogout = () => {
  window.location.href = `${backendUrl}/auth/logout`;
};

// Check auth status when component mounts
onMounted(async () => {
  await checkUserAuth();
});
</script>

<template>
  <v-container>
    <div v-if="isLoading">
      <v-progress-circular indeterminate size="20" width="2" color="primary"></v-progress-circular>
    </div>
    <template v-else>
      <span v-if="isLoggedIn" class="mr-4">{{ userName }} ({{ userEmail }})</span>
      <v-btn v-if="!isLoggedIn" @click="authenticateLogin">Login</v-btn>
      <v-btn v-else @click="authenticateLogout">Logout</v-btn>
    </template>
  </v-container>
</template>