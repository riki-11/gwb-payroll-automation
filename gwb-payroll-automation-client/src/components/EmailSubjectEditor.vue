<script setup lang="ts">
import { ref, watch } from 'vue';

// Define template interface
interface SubjectTemplate {
  title: string;
  subject: string;
}

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['update:modelValue']);

const textValue = ref(props.modelValue);

// Predefined subject templates
const subjectTemplates = ref<SubjectTemplate[]>([
  {
    title: "Matilda The Musical UK and Ireland Tour",
    subject: "Matilda The Musical UK and Ireland Tour - Payslip w/c XXXXXXXX"
  },
  {
    title: "Phantom of the Opera",
    subject: "POTO Payslip - Period ending XXXXXXXX"
  }
]);

// Apply a template to the subject
const applyTemplate = (template: SubjectTemplate | null) => {
  if (template) {
    textValue.value = template.subject;
  }
};

const handleInput = () => {
  emit('update:modelValue', textValue.value);
};

// Watch for external changes to modelValue
watch(() => props.modelValue, (newValue) => {
  textValue.value = newValue;
});
</script>

<template>
  <v-container>
    <v-sheet class="mx-auto">
      <!-- Template Selector -->
      <v-select
        label="Choose a template"
        :items="subjectTemplates"
        item-title="title"
        item-value="subject"
        variant="outlined"
        density="comfortable"
        @update:model-value="applyTemplate"
        return-object
        class="mb-4"
      >
        <template v-slot:prepend-inner>
          <v-icon>mdi-email</v-icon>
        </template>
      </v-select>

      <v-text-field
        v-model="textValue"
        @input="handleInput"
        label="Email Subject"
        clearable
      ></v-text-field>
    </v-sheet>
  </v-container>
</template>
