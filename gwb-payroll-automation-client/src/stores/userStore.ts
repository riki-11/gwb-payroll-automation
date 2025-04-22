import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useUserStore = defineStore('user', () => {
  // State as refs
  const email = ref<string | null>(null);
  const name = ref<string | null>(null);

  // Getters as computed properties
  const getUserEmail = computed(() => email.value || '');
  const getUserName = computed(() => name.value || '');

  // Actions as functions
  function setUserInfo(userEmail: string | null, userName: string | null) {
    email.value = userEmail;
    name.value = userName;
  }

  function clearUserInfo() {
    email.value = null;
    name.value = null;
  }

  return {
    // State
    email,
    name,
    
    // Getters
    getUserEmail,
    getUserName,
    
    // Actions
    setUserInfo,
    clearUserInfo
  };
});