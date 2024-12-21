<script setup lang="ts">
import {ref} from 'vue';

const instructions = ref<string[]>([
  'Step 1: Upload the .XLSX file containing employee emails.',
  'Step 2: Attach the corresponding payslips for each employee.',
  'Step 3: Send payslip emails individually or in bulk.'
]);
</script>

<template>
  <v-sheet
    :elevation="8"
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
        <v-list-item-content>
          <v-list-item-title>{{ instruction }}</v-list-item-title>
        </v-list-item-content>
      </v-list-item>
    </v-list>
  </v-sheet>
</template>