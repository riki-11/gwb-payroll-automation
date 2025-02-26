<script setup lang="ts">
import { useRouter } from 'vue-router';
import { ref } from 'vue';
import AuthButton from './AuthButton.vue';

const router = useRouter();
const currentTab = ref(router.currentRoute.value.path);

const navigateTo = (path: string) => {
  currentTab.value = path;
  router.push(path);
};
</script>

<template>
  <v-app-bar app>
    <v-toolbar-title class="text-left">GWB Entertainment Payroll Automation</v-toolbar-title>
    <v-spacer></v-spacer>
    <v-tabs v-model="currentTab" background-color="primary" dark>
      <v-tab @click="navigateTo('/')">Upload Employee Data</v-tab>
      <v-tab @click="navigateTo('/generate-payslips')" disabled>Generate Payslips</v-tab>
      <AuthButton/>
    </v-tabs>
  </v-app-bar>
</template>
