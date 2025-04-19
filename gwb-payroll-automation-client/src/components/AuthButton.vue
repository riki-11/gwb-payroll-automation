<script setup lang="ts">
import { ref, onMounted } from 'vue';

const isLoggedIn = ref(false);
const accessToken = ref<string>('');
const userName = ref<string | null>(null);
const userEmail = ref<string | null>(null);

const backendUrl = import.meta.env.VITE_API_BASE_URL;


const checkLoginStatus = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  if (token) {

    console.log('I HAVE THE TOKEN!')

    accessToken.value = token;
    isLoggedIn.value = true;
    // TODO: Use a better way of storing the token
    localStorage.setItem('accessToken', token);

    // Remove the token from the URL to keep it clean
    // BUG: access token still shows up in URL.
    window.history.replaceState({}, document.title, window.location.pathname);
    return true;
  } else {
    console.log('Token already stored!')
    const savedToken = localStorage.getItem('accessToken');
    
    if (savedToken) {
      accessToken.value = savedToken;
      isLoggedIn.value = true;
      return true;
    } else {
      console.log('No token exists. Logged out.')
      isLoggedIn.value = false;
      return false;
    }
  }
};


// TODO: Find a way to make the authentication less hard coded/client-side dependent

const authenticateLogin = () => {
  window.location.href = `${backendUrl}/auth/login`;
};

const authenticateLogout = () => {
  // Clear all stored data
  localStorage.clear();
  sessionStorage.clear();

  // Reset login state
  isLoggedIn.value = false;
  userName.value = null;
  userEmail.value = null;
  
  // Redirect the browser to the backend logout route
  window.location.href = `${backendUrl}/auth/logout`;

};


const fetchUserDetails = async () => {
  try { 
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const response = await fetch(`${backendUrl}/auth/get-current-user`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      console.error('Failed to fetch user details');
      return;
    }

    const userData = await response.json();
    accessToken.value = userData.accessToken;
    userName.value = userData.name;
    userEmail.value = userData.email;
    isLoggedIn.value = true
  } catch (error) {
    console.error(`Error fetching user details: ${error}`);
  }
}

onMounted(() => {
  if (checkLoginStatus()) {
    fetchUserDetails();
    console.log(`BACKEND URL: ${backendUrl} used with /auth/...`)
  } else {
    // TODO: Remove this in future.
    console.log('Not currently logged in.');
  }
})
</script>

<template>
  <v-container>
    <span v-if="isLoggedIn" class="mr-4">{{ userName }} ({{ userEmail }})</span>
    <v-btn v-if="!isLoggedIn" @click="authenticateLogin">Login</v-btn>
    <v-btn v-else @click="authenticateLogout">Logout</v-btn>
  </v-container>
</template>