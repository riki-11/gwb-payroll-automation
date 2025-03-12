<script setup lang="ts">
import { computed, ref } from 'vue';

// Define type for row data
type RowData = Record<string, any>;

const props = defineProps({
  dialog: {
    type: Boolean,
    required: true
  },
  sendAllPayslips: {
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
  },
  tableData: {
    type: Array as () => RowData[],
    required: true
  },
  payslipFiles: {
    type: Object as () => Record<string, File>,
    required: true
  }
});

const emit = defineEmits(['update:dialog']);

const closeDialog = () => emit('update:dialog', false);

// Determine if content contains HTML
const isHtmlContent = computed(() => {
  return /<[a-z][\s\S]*>/i.test(props.emailBodyContent);
});

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
      // If found with C prefix but without it in the data, or vice versa
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

// Check for any validation issues
const validationIssues = computed(() => {
  const issues = [];
  
  for (const row of props.tableData) {
    const email = row['Email'];
    const workerNumber = row['Worker No.'];
    const payslip = props.payslipFiles[email];
    
    if (payslip) {
      const validation = validatePayslipMatch(payslip.name, workerNumber);
      if (!validation.isValid) {
        issues.push({
          employee: row['Name'],
          email: email,
          workerNumber: workerNumber,
          filename: payslip.name,
          message: validation.message
        });
      }
    }
  }
  
  return issues;
});

// Count of files assigned
const assignedFilesCount = computed(() => {
  return Object.keys(props.payslipFiles).length;
});

// Force user to acknowledge mismatches before sending
const mismatchesAcknowledged = ref(false);

const canSend = computed(() => {
  return validationIssues.value.length === 0 || mismatchesAcknowledged.value;
});

const handleSendAllPayslips = () => {
  closeDialog();
  props.sendAllPayslips();
}
</script>

<template>
  <v-dialog v-model="props.dialog" width="600px">
    <v-card>
      <v-card-title>Proceed with sending all payslips?</v-card-title>
      <v-card-text>
        <p>Please double check that all payslip files have been uploaded to the corresponding employee.</p>
        <p><strong>Files assigned:</strong> {{ assignedFilesCount }} out of {{ tableData.length }} employees</p>
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
        
        <!-- Show validation summary -->
        <v-alert v-if="validationIssues.length > 0" 
                 type="warning" 
                 prominent 
                 border="start"
                 class="mt-3">
          <strong>{{ validationIssues.length }} Worker Number Mismatches Detected:</strong>
          <v-list density="compact">
            <v-list-item v-for="(issue, index) in validationIssues" :key="index">
              <v-list-item-title>{{ issue.employee }} (Worker No. {{ issue.workerNumber }})</v-list-item-title>
              <v-list-item-subtitle>{{ issue.message }}</v-list-item-subtitle>
            </v-list-item>
          </v-list>
          <v-checkbox 
            v-model="mismatchesAcknowledged"
            label="I understand the risks and want to proceed anyway"
            color="warning"
            hide-details
          ></v-checkbox>
        </v-alert>
        
        <!-- Show success message if no issues -->
        <v-alert v-else-if="assignedFilesCount > 0" 
                 type="success" 
                 prominent 
                 border="start"
                 class="mt-3">
          All payslip files match their respective employees.
        </v-alert>
      </v-card-text>
      <v-card-actions>
        <v-btn text="Cancel" @click="closeDialog"></v-btn>
        <v-btn 
          text="Send All" 
          @click="handleSendAllPayslips" 
          :disabled="!canSend || assignedFilesCount === 0"
          color="primary"
        ></v-btn>
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