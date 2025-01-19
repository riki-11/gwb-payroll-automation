<script setup lang="ts">
import { ref, onMounted } from 'vue';

const isLoggedIn = ref(false);
const accessToken = ref<string>('');
const backendUrl = import.meta.env.VITE_API_BASE_URL;

// Check login status without relying on URL params
const checkLoginStatus = () => {
  // Check if the access token exists in localStorage
  const savedToken = localStorage.getItem('accessToken');
  if (savedToken) {
    accessToken.value = savedToken;
    isLoggedIn.value = true;
  } else {
    isLoggedIn.value = false;
  }

  // If the access token is passed in the URL (after login callback)
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('accessToken');
  if (token) {
    // Save the token in localStorage and update login status
    localStorage.setItem('accessToken', token);
    accessToken.value = token;
    isLoggedIn.value = true;

    // Remove the token from the URL to keep it clean
    window.history.replaceState({}, document.title, window.location.pathname);
  }
};

// Authenticate login, redirecting to the backend's login route
const authenticateLogin = () => {
  window.location.href = `${backendUrl}/auth/login`;
};

// Authenticate logout, redirecting to the backend's logout route
const authenticateLogout = () => {
  // Redirect the browser to the backend logout route
  window.location.href = `${backendUrl}/auth/logout`;

  // Clear local state (optional since the backend redirect happens)
  isLoggedIn.value = false;
  localStorage.removeItem('accessToken');
};

onMounted(() => {
  checkLoginStatus();
});
</script>

<template>
  <v-container>
    <v-btn 
      v-if="!isLoggedIn" 
      @click="authenticateLogin" 
      color="primary"
      class="mr-2"
    >
      Login
    </v-btn>
    
    <v-btn 
      v-else 
      @click="authenticateLogout" 
      color="secondary"
    >
      Logout
    </v-btn>
  </v-container>
</template>
