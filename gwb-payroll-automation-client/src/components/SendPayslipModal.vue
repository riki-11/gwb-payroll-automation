<script setup lang="ts">
import { computed, ref } from 'vue';

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

/**
 * Extracts worker number from payslip filename
 */
 const extractWorkerNumberFromFilename = (filename: string): string | null => {
  // Common patterns for worker numbers in filenames
  const patterns = [
    /^C(\d+)_/, // Matches C0001_ at the beginning
    /C(\d+)[-_]/, // Matches C0001- or C0001_ anywhere
    /^(\d+)_/ // Matches 0001_ at the beginning (without C prefix)
  ];

  for (const pattern of patterns) {
    const match = filename.match(pattern);
    if (match && match[1]) {
      return match[1].replace(/^0+/, ''); // Remove leading zeros for comparison
    }
  }
  
  return null;
};

/**
 * Validates if the payslip file matches the employee's worker number
 */
 const validatePayslipMatch = (
  filename: string, 
  workerNumber: string | number
): { isValid: boolean; message: string } => {
  // Standardize worker number for comparison
  const standardizedWorkerNumber = String(workerNumber)
    .replace(/^C/i, '')  // Remove C prefix if present
    .replace(/^0+/, ''); // Remove leading zeros
  
  const extractedNumber = extractWorkerNumberFromFilename(filename);
  
  if (!extractedNumber) {
    return { 
      isValid: false, 
      message: 'Could not identify worker number in filename. Please verify manually.' 
    };
  }
  
  if (extractedNumber === standardizedWorkerNumber) {
    return { 
      isValid: true, 
      message: 'Worker number matches.' 
    };
  }
  
  return { 
    isValid: false, 
    message: `Possible mismatch: File appears to be for worker ${extractedNumber}, but you're sending to worker ${standardizedWorkerNumber}.` 
  };
};

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