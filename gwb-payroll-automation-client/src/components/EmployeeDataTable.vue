<script setup lang="ts">
import { ref, computed } from 'vue';
import { validatePayslipMatch } from '../utils/payslipFileValidation'

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
  },
  selectedRows: {
    type: Object as () => Record<string, boolean>,
    required: true,
  }
});

const emit = defineEmits([
  'update:selected-rows',
  'open-send-payslip-dialog'
])

// Store validation state for each employee
const validationStates = ref<Record<string, ValidationState>>({});

const allSelected = computed({
  get() {
    const emailsWithPayslips = props.tableData
      .filter(row => props.payslipFiles[row['Email']])
      .map(row => row['Email']);

    if (emailsWithPayslips.length === 0) return false;

    return emailsWithPayslips.every(email => props.selectedRows[email]);
  },
  set(value: boolean) {
    const newSelectedRows: Record<string, boolean> = {};

    props.tableData.forEach(row => {
      const email = row['Email'];
      if (email && props.payslipFiles[email]) {
        newSelectedRows[email] = value;
      }
    });

    emit('update:selected-rows', newSelectedRows);
  }
});

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
      <template v-slot:headers>
        <tr>
          <th>
            <v-checkbox
              v-model="allSelected"
              hide-details
              class="pa-0"
            />
          </th>
          <th v-for="header in props.tableHeaders" :key="header.value">
            {{ header.text }}
          </th>
        </tr>
      </template>

      <template v-slot:body="{ items }">
        <tr v-for="(item, index) in items" :key="index">
          <td>
            <v-checkbox
              v-model="props.selectedRows[item['Email']]"
              hide-details
              @change="() => emit('update:selected-rows', {...props.selectedRows})"
              :disabled="!props.payslipFiles[item['Email']]"
              class="pa-0"
            />
          </td>
          <td v-for="header in props.tableHeaders" :key="header.value">
            <!-- Your other logic here stays the same -->
            <span v-if="header.value !== 'payslip' && header.value !== 'send-email'">
              {{ item[header.value] }}
            </span>
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
            <template v-else>
              <v-progress-circular
                v-if="props.loadingStates[item['Email']]"
                indeterminate
                color="primary"
                size="24"
              />
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