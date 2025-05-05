<script setup lang="ts">
import { useRouter } from 'vue-router';
import { ref, computed } from 'vue';
import AuthButton from './AuthButton.vue';
import { useUserStore } from '../stores/userStore';

const router = useRouter();
const userStore = useUserStore();
const currentTab = ref(router.currentRoute.value.path);

const isAuthenticated = computed(() => !!userStore.getUserEmail);

const navigateTo = (path: string) => {
  currentTab.value = path;
  router.push(path);
};
</script>

<template>
  <v-app-bar app>
    <v-toolbar-title 
      class="text-left cursor-pointer" 
      @click="navigateTo('/')"
    >
      GWB Entertainment Payroll Automation
    </v-toolbar-title>
    <v-spacer></v-spacer>
    <v-tabs v-model="currentTab" background-color="primary" dark>
      <v-tab @click="navigateTo('/')">Send Payslips</v-tab>
      <v-tab v-if="isAuthenticated" @click="navigateTo('/payslip-logs')">Payslip Logs</v-tab>
      <v-tab @click="navigateTo('/generate-payslips')" disabled>Generate Payslips</v-tab>
      <AuthButton/>
    </v-tabs>
  </v-app-bar>
</template>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}
</style>
