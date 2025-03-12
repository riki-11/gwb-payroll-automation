<script setup lang="ts">
import { ref, computed } from 'vue';
import XLSX from 'xlsx';
 
// Components
import EmployeeDataTable from './EmployeeDataTable.vue';
import EmailBodyEditor from './EmailBodyEditor.vue';
import EmailSubjectEditor from './EmailSubjectEditor.vue';
import EmailPayslipsInstructions from './EmailPayslipsInstructions.vue';
import SendPayslipModal from './SendPayslipModal.vue';
import SendAllPayslipsModal from './SendAllPayslipsModal.vue';
import EmailSignatureEditor from './EmailSignatureEditor.vue';

// APIs
import { sendPayslipToEmail } from '../api/api';

// Define types for rows and headers
type RowData = Record<string, any>; // A single row object (key-value pair)
type HeaderData = { text: string; value: string }; // Header structure for Vuetify

// Table variables
const tableHeaders = ref<HeaderData[]>([]);
const tableData = ref<RowData[]>([]);
const emailBodyContent = ref<string>('');
const emailSignature = ref<string>('');
const emailSubject = ref<string>('');

// Combine email body and signature
const fullEmailContent = computed(() => {
  if (emailSignature.value) {
    return emailBodyContent.value + emailSignature.value;
  }
  return emailBodyContent.value;
});

// Payslip variables
const payslipFiles = ref<Record<string, File>>({}); // Store payslip files indexed by email
const loadingStates = ref<Record<string, boolean>>({}); // Track loading state for each email
const sentStates = ref<Record<string, boolean>>({});

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
        { text: 'Payslip', value: 'payslip' },
        { text: 'Send Email', value: 'send-email' }
      );

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
  emailSignature.value = '';
  payslipFiles.value = {};
  loadingStates.value = {};
  sentStates.value = {};
}

const sendPayslipToEmployee = async (email: string) => {
  const payslip = payslipFiles.value[email];
  if (!payslip) {
    console.error(`No payslip found for email: ${email}`);
    return;
  }

  try {
    loadingStates.value[email] = true;

    // Create FormData and append necessary fields
    const formData = new FormData();
    formData.append('to', email);
    formData.append('subject', emailSubject.value);
    formData.append('html', fullEmailContent.value); // Use the combined content
    formData.append('file', payslip);

    await sendPayslipToEmail(formData);
    sentStates.value[email] = true;

    sendPayslipDialog.value = false;
  } catch (error) {
    console.error('Error uploading file or sending email:', error);
  } finally {
    loadingStates.value[email] = false;
  }
};


const sendAllPayslips = async () => {
  try {
    const emailPromises = tableData.value.map(async row => {
      const email = row['Email'];
      const payslip = payslipFiles.value[email];

      if (email && payslip) {
        try {
          // Create FormData for each email
          loadingStates.value[email] = true;

          const formData = new FormData();
          formData.append('to', email);
          formData.append('subject', emailSubject.value);
          formData.append('html', fullEmailContent.value); // Use the combined content
          formData.append('file', payslip);
  
          // Use the centralized API function
          await sendPayslipToEmail(formData);
          sentStates.value[email] = true;
        } catch (error) {
          console.error(`Error sending payslip to: ${email}`, error);
        } finally {
          loadingStates.value[email] = false;
        }
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
};

const openSendAllPayslipsDialog = () => {
  sendAllPayslipsDialog.value = true;
};

</script>


<template>
  <h1 class="py-10">Upload Employee Data and Email Payslips</h1>
  <v-container class="d-flex flex-column align-start">
    <EmailPayslipsInstructions/>
    <v-container class="d-flex flex-column w-100 text-left py-4 ga-4">
    <h2>Upload Employee Data</h2>
      <p>Ensure that spreadsheet has, at the very least, columns entitled "Worker No." and "Email" (strict capitalization and spelling).</p>
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
      :sent-states="sentStates"
      @open-send-payslip-dialog="openSendPayslipDialog"
    />
    <v-container
      v-if="tableHeaders.length && tableData.length"
      class="d-flex flex-column w-100 text-left py-4 ga-4"
    >
      <h2>Email Subject</h2>
      <EmailSubjectEditor
        v-model="emailSubject"
      />
    </v-container>
    <v-container
      v-if="tableHeaders.length && tableData.length"
      class="d-flex flex-column w-100 text-left py-4 ga-4"
    >
      <h2>Email Body</h2>
      <EmailBodyEditor 
        v-model="emailBodyContent"
      />
    </v-container>
    <v-container
      v-if="tableHeaders.length && tableData.length"
      class="d-flex flex-column w-100 text-left py-4"
    >
      <!-- <MinTiptapEditor
        v-model="emailSignature"
      /> -->
      <EmailSignatureEditor
        v-model="emailSignature"
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
        color="primary"
        prepend-icon="mdi-email-send"
        size="large"
        class="mt-4"
      />
    </v-container>
  </v-container>

  <!-- Send Payslip Dialog -->
  <SendPayslipModal
    :payslipFiles="payslipFiles"
    :dialog="sendPayslipDialog"
    :rowData="selectedRowForDialog"
    :sendPayslipToEmployee="sendPayslipToEmployee"
    :email-subject="emailSubject"
    :email-body-content="fullEmailContent"
    @update:dialog="sendPayslipDialog = $event"
  />
  
  <!-- Send All Payslips Dialog -->
  <SendAllPayslipsModal
    :dialog="sendAllPayslipsDialog"
    :sendAllPayslips="sendAllPayslips"
    :email-subject="emailSubject"
    :email-body-content="fullEmailContent"
    :tableData="tableData"
    :payslipFiles="payslipFiles"
    @update:dialog="sendAllPayslipsDialog = $event"
  />
</template>