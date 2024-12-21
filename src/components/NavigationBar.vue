<script setup lang="ts">
import {useRouter} from 'vue-router';
import { ref } from 'vue';

const router = useRouter();
const currentTab = ref(router.currentRoute.value.path);

const navigateTo = (path: string) => {
  currentTab.value = path;
  router.push(path);
};
</script>

<template>
    <v-app-bar app>
      <v-toolbar-title class="text-left">Payroll Automation</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-tabs v-model="currentTab" background-color="primary" dark>
        <v-tab @click="navigateTo('/')">Upload Employee Data and Email Payslips</v-tab>
        <v-tab @click="navigateTo('/generate-payslips')">Generate Payslips</v-tab>
      </v-tabs>
    </v-app-bar>
</template>