<script setup lang="ts">
import { ref, onMounted } from 'vue';
import axios from 'axios';

const isLoggedIn = ref(false);
const userName = ref<string | null>(null);
const userEmail = ref<string | null>(null);
const userRole = ref<string | null>(null);
const loading = ref(false);

const backendUrl = import.meta.env.VITE_API_BASE_URL;

// Handle Microsoft login
const handleLogin = () => {
  // Redirect to the server's login endpoint which will initiate Microsoft OAuth flow
  window.location.href = `${backendUrl}/auth/login`;
};

// Handle logout
const handleLogout = () => {
  // Redirect to the server's logout endpoint which will clear the session
  window.location.href = `${backendUrl}/auth/logout`;
};

// Check login status
const checkLoginStatus = async () => {
  try {
    loading.value = true;
    
    // The server will use the session cookie to authenticate this request
    const response = await axios.get(`${backendUrl}/auth/current-user`, {
      withCredentials: true // Important: needed to send cookies with the request
    });
    
    if (response.data.isAuthenticated) {
      isLoggedIn.value = true;
      userName.value = response.data.user.name;
      userEmail.value = response.data.user.email;
      userRole.value = response.data.user.role;
      return true;
    } else {
      isLoggedIn.value = false;
      return false;
    }
  } catch (error) {
    console.error('Failed to check authentication status:', error);
    isLoggedIn.value = false;
    return false;
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  checkLoginStatus();
});
</script>

<template>
  <v-container>
    <div v-if="loading">
      <v-progress-circular indeterminate size="24" class="mr-2"></v-progress-circular>
      Checking login status...
    </div>
    <div v-else>
      <span v-if="isLoggedIn" class="mr-4">{{ userName }} ({{ userEmail }})</span>
      <v-btn v-if="!isLoggedIn" @click="handleLogin">Login</v-btn>
      <v-btn v-else @click="handleLogout">Logout</v-btn>
    </div>
  </v-container>
</template>