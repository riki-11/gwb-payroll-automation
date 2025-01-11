<script setup lang="ts">
import { ref } from 'vue';
import XLSX from 'xlsx';
import axios from 'axios';

// Components
import EmployeeDataTable from './EmployeeDataTable.vue';
import EmailBodyEditor from './EmailBodyEditor.vue';
import EmailPayslipsInstructions from './EmailPayslipsInstructions.vue';
import SendPayslipModal from './SendPayslipModal.vue';
import SendAllPayslipsModal from './SendAllPayslipsModal.vue';

// Define types for rows and headers
type RowData = Record<string, any>; // A single row object (key-value pair)
type HeaderData = { text: string; value: string }; // Header structure for Vuetify

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// Table variables
const tableHeaders = ref<HeaderData[]>([]);
const tableData = ref<RowData[]>([]);
const emailBodyContent = ref<string>('');

// Payslip variables
const payslipFiles = ref<Record<string, File>>({}); // Store payslip files indexed by email

// Button states
const loadingStates = ref<Record<string, boolean>>({}); // Track loading state for each email

// Dialog states
const sendPayslipDialog = ref(false);
const sendAllPayslipsDialog = ref(false);
const selectedRowForDialog = ref<RowData | null>(null);

async function generateTableFromXLSX(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input?.files?.[0];
  if (!file) {
    console.error('No file selected.');
    return;
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array', nodim: true });
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

function clearTableData() {
  tableHeaders.value = [];
  tableData.value = [];
  emailBodyContent.value = '';
}

// potential bug: this only works well if it's one attachment per email.
const sendPayslipToEmployee = async (email: string) => {
  const payslip = payslipFiles.value[email];
  if (!payslip) {
    console.error(`No payslip found for email: ${email}`);
    return;
  }
  const formData = new FormData();

  // Add the email data to the form
  formData.append('to', email);
  formData.append('subject', 'Sample payslip Email');
  formData.append('text', emailBodyContent.value);
  formData.append('file', payslip);

  try {
    // Set loading state for current email being sent
    loadingStates.value[email] = true;

    const response = await axios.post(`${API_BASE_URL}/api/send-payslip-to-email`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    console.log('File uploaded and email sent successfully:', response.data);
    sendPayslipDialog.value = false;
  } catch (error) {
    console.error('Error uploading file or sending email:', error);
  } finally {
    loadingStates.value[email] = false;
  }
}

const sendAllPayslips = async () => {
  try {
    const emailPromises = tableData.value.map(async row => {
      const email = row['Email'];
      const payslip = payslipFiles.value[email];

      if (email && payslip) {
        const formData = new FormData();
        formData.append('to', email);
        formData.append('subject', 'Sample payslip Email');
        formData.append('text', emailBodyContent.value);
        formData.append('file', payslip);

        await axios.post(`${API_BASE_URL}/api/send-payslip-to-email`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        console.log(`Payslip sent to: ${email}`);
      }
    });

    await Promise.all(emailPromises);
    console.log('All payslips sent successfully!');
    sendAllPayslipsDialog.value = false;
  } catch (error) {
    console.error('Error sending payslips:', error);
  }
};

// Dialog event functions
const openSendPayslipDialog = (row: RowData) => {
  selectedRowForDialog.value = row;
  sendPayslipDialog.value = true;
}

const openSendAllPayslipsDialog = () => {
  sendAllPayslipsDialog.value = true;
}
</script>

<template>
  <h1 class="py-10">Upload Employee Data and Email Payslips</h1>
  <v-container class="d-flex flex-column align-start">
    <!-- TODO: Limit file input to XLSX (and maybe CSV) -->
    <EmailPayslipsInstructions/>
    <v-container class="d-flex flex-column w-100 text-left py-4 ga-4">
    <h2>Upload Employee Data</h2>
      <v-file-input 
        label="Upload XLSX or CSV File" 
        @change="generateTableFromXLSX"
        @click:clear="clearTableData" 
        accept=".xlsx,.xls,.csv"
        clearable
      />
    </v-container>
    <EmployeeDataTable
      v-if="tableHeaders.length && tableData.length"
      :table-headers="tableHeaders"
      :table-data="tableData"
      :payslip-files="payslipFiles"
      :loading-states="loadingStates"
      :email-body-content="emailBodyContent"
      @open-send-payslip-dialog="openSendPayslipDialog"
    />
    <v-container
      v-if="tableHeaders.length && tableData.length"
      class="d-flex flex-column w-100 text-left py-4 ga-4"
    >
      <h2>Write the Email Template</h2>
      <EmailBodyEditor 
        v-if="tableHeaders.length && tableData.length"
        v-model="emailBodyContent"
      />
    </v-container>
    <v-container
      v-if="tableHeaders.length && tableData.length" 
      class="d-flex flex-column w-100 text-left py-4 ga-4"
    >
      <v-btn 
        text="Send All Payslips"
        :disabled="!tableData.length || Object.keys(payslipFiles).length === 0" 
        @click="openSendAllPayslipsDialog"
      />
    </v-container>
  </v-container>

  <!-- Send Payslip Dialog -->
  <SendPayslipModal
    :payslipFiles="payslipFiles"
    :dialog="sendPayslipDialog"
    :rowData="selectedRowForDialog"
    :sendPayslipToEmployee="sendPayslipToEmployee"
    @update:dialog="sendPayslipDialog = $event"
  />
  <SendAllPayslipsModal
    :dialog="sendAllPayslipsDialog"
    :sendAllPayslips="sendAllPayslips"
    @update:dialog="sendAllPayslipsDialog = $event"
  />
</template>