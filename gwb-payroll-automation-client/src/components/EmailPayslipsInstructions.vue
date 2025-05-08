<script setup lang="ts">
import {ref} from 'vue';

const instructions = ref<string[]>([
  'Step 1: Login to your GWB Microsoft account.',
  'Step 2: Upload the .XLSX file containing employee emails.',
  'Step 3: Attach the corresponding payslips for each employee or upload a zip file containing all payslips.',
  'Step 4: Write the email body, subject, and add a signature if needed.',
  'Step 5: For individual emails, click "Send" per employee row.',
  'Step 6: For bulk emails, select employees using the checkboxes then click "Send All Payslips" at the bottom.'
]);
</script>

<template>
  <v-container class="py-4">
    <v-sheet
      :elevation="4"
      border
      rounded
      class="d-flex w-100"
    >
      <v-list 
        lines="two" 
      >
        <v-list-item
          v-for="(instruction, index) in instructions"
          :key="index"
          class="text-start"
        >
          <v-list-item-title>{{ instruction }}</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-sheet>
  </v-container>
</template>