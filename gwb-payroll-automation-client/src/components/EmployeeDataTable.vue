<script setup lang="ts">
import { ref, computed , watch} from 'vue';
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
    const workersWithPayslips = props.tableData
      .filter(row => props.payslipFiles[row['Worker No.']])
      .map(row => row['Worker No.']);

    if (workersWithPayslips.length === 0) return false;

    return workersWithPayslips.every(workerNumber => props.selectedRows[workerNumber]);
  },
  set(value: boolean) {
    const newSelectedRows: Record<string, boolean> = {};

    props.tableData.forEach(row => {
      const workerNumber = row['Worker No.'];
      if (workerNumber && props.payslipFiles[workerNumber]) {
        newSelectedRows[workerNumber] = value;
      }
    });

    emit('update:selected-rows', newSelectedRows);
  }
});

const assignPayslipToEmployee = (workerNumber: string | number, event: Event) => {
  const input = event.target as HTMLInputElement;

  // Assign the uploaded payslip to that particular worker number
  if (input && input.files && input.files[0]) {
    const payslipFile = input.files[0];

    // Validate the payslip file against worker number
    const validation = validatePayslipMatch(payslipFile.name, workerNumber);
    validationStates.value[workerNumber] = validation;

    // Assign the file to the worker number
    props.payslipFiles[workerNumber] = payslipFile;

    console.log(
      `Payslip with filename "${payslipFile.name}" assigned to Worker No. ${workerNumber} - Validation: ${validation.message}`
    );
  } else {
    console.error('Input is null');
  }
};

const getValidationColor = (workerNumber: string): string => {
  if (!validationStates.value[workerNumber]) {
    return '';
  }
  return validationStates.value[workerNumber].isValid ? 'success' : 'error';
};

watch(
  () => props.payslipFiles,
  (newPayslipFiles) => {
    console.log(`New payslip files detected: ${JSON.stringify(newPayslipFiles)}`);
    Object.keys(newPayslipFiles).forEach((workerNumber) => {
      const payslipFile = newPayslipFiles[workerNumber];
      const email = props.tableData.find((row) => row['Worker No.'] === workerNumber)?.['Email'];

      if (payslipFile && email) {
        const validation = validatePayslipMatch(payslipFile.name, workerNumber);
        validationStates.value[workerNumber] = validation;

        console.log(
          `Payslip "${payslipFile.name}" validated for Worker No. ${workerNumber} - Validation: ${validation.message}`
        );
      }
    });
  },
  { deep: true }
);
</script>

<template>
  <v-container class="d-flex flex-column align-start w-100">
    <h2>Attach Employee Payslips</h2>
    <p>Note: For bulk attachments, upload a zip below.</p>
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
              v-model="props.selectedRows[item['Worker No.']]"
              hide-details
              @change="() => emit('update:selected-rows', {...props.selectedRows})"
              :disabled="!props.payslipFiles[item['Worker No.']]"
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
                @change="(event: Event) => assignPayslipToEmployee(item['Worker No.'], event)"
                :color="getValidationColor(item['Worker No.'])"
                :hint="validationStates[item['Worker No.']]?.message"
                persistent-hint
                :error="validationStates[item['Worker No.']] && !validationStates[item['Worker No.']].isValid"
              />
            </template>
            <template v-else>
              <v-progress-circular
                v-if="props.loadingStates[item['Worker No.']]"
                indeterminate
                color="primary"
                size="24"
              />
              <v-btn
                v-else
                text="Send"
                :disabled="!props.payslipFiles[item['Worker No.']] || 
                            props.sentStates[item['Worker No.']] || 
                            (validationStates[item['Worker No.']] && 
                            !validationStates[item['Worker No.']].isValid)"
                :color="props.sentStates[item['Worker No.']] ? 'success' : 'primary'"
                @click="$emit('open-send-payslip-dialog', item)"
              >
                {{ props.sentStates[item['Worker No.']] ? 'Sent' : 'Send' }}
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