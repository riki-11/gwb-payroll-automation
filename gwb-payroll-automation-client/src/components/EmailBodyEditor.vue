<script setup lang="ts">
import { ref } from 'vue';

const textValue = ref('');

const emit = defineEmits(['update:modelValue']);

const handleInput = () => {
  // Whenever there is a change in the input, there is an emit to update the model value.
  emit('update:modelValue', textValue.value);
};
</script>

<template>
  <v-container>
    <v-sheet class="mx-auto">
      <v-textarea 
        v-model="textValue" 
        @input="handleInput"
        label="Email Body"
        prepend-icon="mdi-pencil"
        clearable 
      ></v-textarea>
    </v-sheet>
  </v-container>
</template>
