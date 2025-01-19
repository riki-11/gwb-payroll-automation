<script setup lang="ts">
import { ref } from 'vue';
const textValue = ref('');

const emit = defineEmits(['update:modelValue']);

const handleInput = () => {
  emit('update:modelValue', textValue.value);
}
</script>

<template>
  <v-container>
    <v-sheet class="mx-auto">
      <v-text-field
        v-model="textValue"
        @input="handleInput"
        label="Email Subject"
        prepend-icon="mdi-email"
        clearable
      ></v-text-field>
    </v-sheet>
  </v-container>
</template>