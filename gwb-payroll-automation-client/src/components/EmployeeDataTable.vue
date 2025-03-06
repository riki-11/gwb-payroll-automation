<script setup lang="ts">
import { ref } from 'vue';

// Define types for rows and headers
type RowData = Record<string, any>; // A single row object (key-value pair)
type HeaderData = { text: string; value: string }; // Header structure for Vuetify

type ValidationState = {
  isValid: boolean;
  message: string;
};

const props = defineProps({
  tableHeaders: {
    type: Array as () => HeaderData[],
    required: true,
  },
  tableData: {
    type: Array as () => RowData[],
    required: true,
  },
  payslipFiles: {
    type: Object as () => Record<string, File>,
    required: true,
  },
  loadingStates: {
    type: Object as () => Record<string, boolean>,
    required: true,
  },
  sentStates: {
    type: Object as () => Record<string, boolean>,
    required: true,
  }
});

// Store validation state for each employee
const validationStates = ref<Record<string, ValidationState>>({});

/**
 * Extracts worker number from payslip filename
 * @param filename The payslip filename (e.g., "C0001_-_Mr._LEJANO_Enrique_Payslip.pdf")
 * @returns The worker number or null if not found
 */
const extractWorkerNumberFromFilename = (filename: string): string | null => {
  // Common patterns for worker numbers in filenames
  // TODO: be smart about extracting the filename prefix.
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
 * @param filename The payslip filename
 * @param workerNumber The employee's worker number from the data
 * @returns Object with validation result and message
 */
 const validatePayslipMatch = (
  filename: string, 
  workerNumber: string | number
): ValidationState => {
  // Standardize worker number for comparison (remove leading zeros and 'C' prefix if present)
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


const assignPayslipToEmployee = (email: string, workerNumber: string | number, event: Event) => {
  const input = event.target as HTMLInputElement;

  // Assign the uploaded payslip to that particular email address. 
  if (input && input.files && input.files[0]) {
    const payslipFile = input.files[0];
    
    // Validate the payslip file against worker number
    const validation = validatePayslipMatch(payslipFile.name, workerNumber);
    validationStates.value[email] = validation;
    
    // Still assign the file even if validation fails, 
    // so the user can decide whether to proceed
    props.payslipFiles[email] = payslipFile;

    console.log(`Payslip with filename "${payslipFile.name}" assigned to ${email} - Validation: ${validation.message}`);
  } else {
    console.error('Input is null');
  }
};

const getValidationColor = (email: string): string => {
  if (!validationStates.value[email]) {
    return '';
  }
  return validationStates.value[email].isValid ? 'success' : 'error';
};
</script>

<template>
  <!-- TODO: Upon confirming sending all payslips. Show loading indicators for all rows accordingly. -->
  <v-container class="d-flex flex-column align-start w-100">
    <h2>Attach Employee Payslips</h2>
  </v-container>
  <v-container class="d-flex flex-column align-center w-100">
    <v-data-table 
      :items="props.tableData"
      items-per-page="-1" 
      class="elevation-1"
      height="65vh"
      hide-default-footer
      >
      <template v-slot:body="{ items }">
        <tr v-for="(item, index) in items" :key="index">
          <td v-for="header in tableHeaders" :key="header.value">
            <!-- Table Data -->
            <span v-if="header.value !== 'payslip' && header.value !== 'send-email'">
              {{ item[header.value] }}
            </span>
            <!-- Payslip File Input -->
            <template v-else-if="header.value === 'payslip'">
              <v-file-input
                label="Upload Payslip" 
                @change="(event: Event) => assignPayslipToEmployee(item['Email'], item['Worker No.'], event)"
                :color="getValidationColor(item['Email'])"
                :hint="validationStates[item['Email']]?.message"
                persistent-hint
                :error="validationStates[item['Email']] && !validationStates[item['Email']].isValid"
              />
            </template>
            <!-- Send Email Button (or Spinner if loading) -->
            <template v-else>
              <v-progress-circular
                v-if="props.loadingStates[item['Email']]"
                indeterminate
                color="primary"
                size="24"
              ></v-progress-circular>
              <v-btn
                v-else
                text="Send"
                :disabled="!props.payslipFiles[item['Email']] || 
                            props.sentStates[item['Email']] || 
                            (validationStates[item['Email']] && 
                            !validationStates[item['Email']].isValid)"
                :color="props.sentStates[item['Email']] ? 'success' : 'primary'"
                @click="$emit('open-send-payslip-dialog', item)"
              >
                {{ props.sentStates[item['Email']] ? 'Sent' : 'Send' }}
              </v-btn>
            </template>
          </td>
        </tr>
      </template>
    </v-data-table>
  </v-container>
</template>

<style scoped>
/* Enable vertical scrolling */
.v-data-table {
  overflow-y: auto; 
}
</style>