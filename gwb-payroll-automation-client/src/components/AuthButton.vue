<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import axios from 'axios';

const isLoggedIn = ref(false);
const username = ref<string>('');
const userEmail = ref<string>('');
const backendUrl = import.meta.env.VITE_API_BASE_URL;

// Helper function to get a cookie by name
const getCookie = (name: string): string | null => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    const cookie = parts.pop()?.split(';').shift() || null;
    console.log(`Cookie [${name}]:`, cookie); // Debugging
    return cookie;
  }
  console.log(`Cookie [${name}] not found`);
  return null;
};

const checkLoginStatus = async () => {
  try {
    const response = await axios.get(`${backendUrl}/auth/verify-session`, {
      withCredentials: true, // Ensures cookies are sent with the request
    });

    if (response.data.isLoggedIn) {
      isLoggedIn.value = true;

      // Optionally, fetch username and userEmail
      username.value = getCookie('username') || 'Guest';
      userEmail.value = getCookie('userEmail') || 'No Email';
    } else {
      isLoggedIn.value = false;
    }
  } catch (error) {
    console.error('Error verifying session:', error);
    isLoggedIn.value = false;
  }
};

// Authenticate login, redirecting to the backend's login route
const authenticateLogin = () => {
  window.location.href = `${backendUrl}/auth/login`;
};

// Authenticate logout, redirecting to the backend's logout route
const authenticateLogout = () => {
  window.location.href = `${backendUrl}/auth/logout`;

  // Clear local state after logout
  isLoggedIn.value = false;
  username.value = '';
  userEmail.value = '';
};

onMounted(() => {
  checkLoginStatus();
});

// Watch reactivity for debugging
watch(
  [isLoggedIn, username, userEmail],
  ([newLoggedIn, newUsername, newEmail]) => {
    console.log(
      `Watcher - isLoggedIn: ${newLoggedIn}, Username: ${newUsername}, Email: ${newEmail}`
    );
  }
);
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
