<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps({
  payslipFiles: {
    type: Object as () => Record<string, File> | null,
    required: true
  },
  dialog: {
    type: Boolean,
    required: true,
  },
  rowData: {
    type: Object as () => Record<string, any> | null,
    required: false,
    default: null
  },
  sendPayslipToEmployee: {
    type: Function,
    required: true
  }
});

// Emit the event when the dialog is updated
const emit = defineEmits(['update:dialog']);

const closeDialog = () => emit('update:dialog', false);

const payslip = computed(() => {
  if (props.payslipFiles) {
    if (props.rowData) {
      const email = props.rowData['Email'];
      return props.payslipFiles[email]
    }
  } else {
    console.error("No payslip files have been uploaded.")
    return null
  }
})

const handleSendPayslipToEmployee = () => {
  if (props.rowData) {
    const email = props.rowData['Email'];
    if (email) {
      props.sendPayslipToEmployee(email);
      closeDialog();
    } else {
      console.error("No email found for sending payslip to employee.");
    }
  } else {
    console.error("No row data found for sending payslip to employee.")
  }
}
</script>

<template>
   <!-- Shared Dialog -->
   <v-dialog v-model="props.dialog" width="auto">
    <v-card>
      <v-card-title>Proceed with sending payslip?</v-card-title>
      <v-card-text>
        <div v-if="props.rowData">
          <p><strong>Worker No.:</strong> {{ props.rowData['Worker No.'] }}</p>
          <p><strong>Employee:</strong> {{ props.rowData['Name'] }}</p>
          <p><strong>Email:</strong> {{ props.rowData['Email'] }}</p>
          <p><strong>File:</strong> {{ payslip?.name }}</p>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-btn text="Cancel" @click="closeDialog"></v-btn>
        <v-btn text="Send" @click="handleSendPayslipToEmployee"></v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
