<script setup lang="ts">
import { ref, onMounted } from 'vue';


const isLoggedIn = ref(false);
const accessToken = ref<string>('');
const backendUrl = import.meta.env.VITE_API_BASE_URL;


const checkLoginStatus = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  if (token) {
    accessToken.value = token;
    isLoggedIn.value = true;
    // TODO: Use a better way of storing the token
    localStorage.setItem('accessToken', token);

    // Remove the token from the URL to keep it clean
    window.history.replaceState({}, document.title, window.location.pathname);
  } else {
    const savedToken = localStorage.getItem('accessToken');
    if (savedToken) {
      accessToken.value = savedToken;
      isLoggedIn.value = true;
    } else {
      isLoggedIn.value = false;
    }
  }
};

// TODO: Find a way to make the authentication less hard coded/client-side dependent

const authenticateLogin = () => {
  window.location.href = `${backendUrl}/auth/login`;
};

const authenticateLogout = () => {
  // Redirect the browser to the backend logout route
  window.location.href = `${backendUrl}/auth/logout`;

  // Clear local state (optional since the backend redirect happens)
  isLoggedIn.value = false;
  localStorage.removeItem('accessToken');
};

onMounted(() => {
  checkLoginStatus();
})
</script>

<template>
  <v-container>
    <v-btn v-if="!isLoggedIn" @click="authenticateLogin">Login</v-btn>
    <v-btn v-else @click="authenticateLogout">Logout</v-btn>
  </v-container>
</template>