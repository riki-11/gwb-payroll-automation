<script setup lang="ts">
import { ref } from 'vue';
import XLSX from 'xlsx';

// Components
import EmployeeDataTable from './EmployeeDataTable.vue';
import EmailBodyEditor from './EmailBodyEditor.vue';
import EmailPayslipsInstructions from './EmailPayslipsInstructions.vue';


// Define types for rows and headers
type RowData = Record<string, any>; // A single row object (key-value pair)
type HeaderData = { text: string; value: string }; // Header structure for Vuetify

// Table variables
const tableHeaders = ref<HeaderData[]>([]);
const tableData = ref<RowData[]>([]);
const emailBodyContent = ref<string>('');

async function generateTableFromXLSX(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input?.files?.[0];
  if (!file) {
    console.error('No file selected.');
    return;
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

    const jsonData = XLSX.utils.sheet_to_json<RowData>(firstSheet, { header: 1 });
    if (jsonData.length > 0) {
      tableHeaders.value = jsonData[0].map((header: any) => ({
        text: String(header),
        value: String(header),
      }));

      tableHeaders.value.push(
        { text: 'Payslip Amazing', value: 'payslip' },
        { text: 'Send Email', value: 'send-email'}
      );

      // TODO: Investigate this section and why is it causing bugs in the headers.
      tableData.value = jsonData.slice(1).map(row => {
        const rowObject: RowData = {};
        tableHeaders.value.forEach((header, index) => {
          rowObject[header.value] = row[index] ?? '';
        });
        return rowObject;
      });
    }
  } catch (error) {
    console.error('Error processing file:', error);
  }
}

</script>

<template>
  <h1 class="py-10">Upload Employee Data and Email Payslips</h1>
  <v-container class="d-flex flex-column align-start">
    <!-- TODO: Limit file input to XLSX (and maybe CSV) -->
    <EmailPayslipsInstructions/>
    <v-container class="w-100">
      <v-file-input 
        label="Upload XLSX File" 
        @change="generateTableFromXLSX" 
      />
    </v-container>
    <EmployeeDataTable
      v-if="tableHeaders.length && tableData.length"
      :table-headers="tableHeaders"
      :table-data="tableData"
      :email-body-content="emailBodyContent"
    />
    <EmailBodyEditor 
      v-if="tableHeaders.length && tableData.length"
      v-model="emailBodyContent"
    />
  </v-container>
</template>
