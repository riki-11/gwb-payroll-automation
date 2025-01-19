<script setup lang="ts">

// Define types for rows and headers
type RowData = Record<string, any>; // A single row object (key-value pair)
type HeaderData = { text: string; value: string }; // Header structure for Vuetify

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

const assignPayslipToEmployee = (email: string, event: Event) => {
  const input = event.target as HTMLInputElement;

  // Assign the uploaded payslip to that particular email address. 
  if (input && input.files && input.files[0]) {
    // TODO: add more information within payslipFiles object.
    const payslipFile = input.files[0]
    props.payslipFiles[email] = payslipFile

    console.log(`Payslip with filename "${payslipFile.name}" assigned to ${email}`)
  } else {
    console.error('Input is null');
  }
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
            <!-- TODO: Clean this up by removing file icon and making file input more visible. -->
            <v-file-input
              v-else-if="header.value === 'payslip'"
              label="Upload Payslip" 
              @change="(event: Event) => assignPayslipToEmployee(item['Email'], event)"
            />
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
                :disabled="!props.payslipFiles[item['Email']] || props.sentStates[item['Email']]"
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