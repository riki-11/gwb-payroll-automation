<script setup lang="ts">
import { computed, ref } from 'vue';
import { validatePayslipMatch } from '../utils/payslipFileValidation'

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
  },
  emailSubject: {
    type: String,
    required: true
  },
  emailBodyContent: {
    type: String,
    required: true
  }
});

// Emit the event when the dialog is updated
const emit = defineEmits(['update:dialog']);

const closeDialog = () => emit('update:dialog', false);

// Determine if content contains HTML
const isHtmlContent = computed(() => {
  return /<[a-z][\s\S]*>/i.test(props.emailBodyContent);
});

const payslip = computed(() => {
  if (props.payslipFiles && props.rowData) {
    const workerNumber = props.rowData['Worker No.'];
    return props.payslipFiles[workerNumber];
  } else {
    console.error("No payslip files have been uploaded.");
    return null;
  }
});

// Compute validation result when a payslip is selected and row data is available
const validationResult = computed(() => {
  if (props.rowData && payslip.value) {
    const workerNumber = props.rowData['Worker No.'];
    return validatePayslipMatch(payslip.value.name, workerNumber);
  }
  return null;
});

// Force user to acknowledge mismatch before sending
const mismatchAcknowledged = ref(false);

const canSend = computed(() => {
  if (!validationResult.value) return true;
  return validationResult.value.isValid || mismatchAcknowledged.value;
});

const handleSendPayslipToEmployee = () => {
  if (props.rowData) {
    const email = props.rowData['Email'];
    const workerNum = props.rowData['Worker No.'];
    const workerName = props.rowData['Name'];

    if (email && workerNum && workerName) {
      props.sendPayslipToEmployee(email, workerNum, workerName);
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
  <v-dialog v-model="props.dialog" max-width="1200px">
   <v-card>
     <v-card-title><strong>Proceed with sending payslip?</strong></v-card-title>
     <v-card-text>
       <div v-if="props.rowData">
         <p><strong>Worker No.:</strong> {{ props.rowData['Worker No.'] }}</p>
         <p><strong>Employee:</strong> {{ props.rowData['Name'] }}</p>
         <p><strong>Email:</strong> {{ props.rowData['Email'] }}</p>
         <p><strong>File:</strong> {{ payslip?.name }}</p>
         <p><strong>Email Subject: </strong> {{ props.emailSubject }} </p>
         
         <!-- Email content preview -->
         <div class="my-3">
           <div class="text-subtitle-1">Email Preview:</div>
           <v-card variant="outlined" class="pa-3 my-2 email-preview-container">
             <div v-if="isHtmlContent" v-html="props.emailBodyContent"></div>
             <pre v-else>{{ props.emailBodyContent }}</pre>
           </v-card>
           <v-chip
             v-if="isHtmlContent"
             color="info"
             size="small"
             class="mt-1"
           >
             HTML Format
           </v-chip>
         </div>
         
         <!-- Show validation warning if applicable -->
         <v-alert v-if="validationResult && !validationResult.isValid" 
                 type="warning" 
                 prominent 
                 border="start"
                 class="mt-3">
           <strong>Worker Number Mismatch Warning:</strong> 
           <p>{{ validationResult.message }}</p>
           <v-checkbox 
             v-model="mismatchAcknowledged"
             label="I understand the risk and want to proceed anyway"
             color="warning"
             hide-details
           ></v-checkbox>
         </v-alert>
         
         <!-- Show success validation message if applicable -->
         <v-alert v-else-if="validationResult && validationResult.isValid" 
                 type="success" 
                 prominent 
                 border="start"
                 class="mt-3">
           <p>{{ validationResult.message }}</p>
         </v-alert>
       </div>
     </v-card-text>
     <v-card-actions>
       <v-btn text="Cancel" @click="closeDialog"></v-btn>
       <v-btn text="Send" 
              @click="handleSendPayslipToEmployee" 
              :disabled="!canSend"
              color="primary">
       </v-btn>
     </v-card-actions>
   </v-card>
 </v-dialog>
</template>

<style scoped>
.email-preview-container {
  max-height: 300px;
  overflow-y: auto;
}
</style>