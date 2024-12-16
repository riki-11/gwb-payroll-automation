<script setup lang="ts">
import axios from 'axios';
import { ref, reactive } from 'vue';
import XLSX from 'xlsx';

import SendPayslipModal from './SendPayslipModal.vue';
import SendAllPayslipsModal from './SendAllPayslipsModal.vue';

// Define types for rows and headers
type RowData = Record<string, any>; // A single row object (key-value pair)
type HeaderData = { text: string; value: string }; // Header structure for Vuetify

// Table variables
const tableHeaders = ref<HeaderData[]>([]);
const tableData = ref<RowData[]>([]);

// Payslip variables
const payslipFiles = ref<Record<string, File>>({}); // Store payslip files indexed by email

// Button states
const loadingStates = reactive<Record<string, boolean>>({}); // Track loading state for each email

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

const assignPayslipToEmployee = (email: string, event: Event) => {
  const input = event.target as HTMLInputElement;

  // Assign the uploaded payslip to that particular email address. 
  if (input && input.files && input.files[0]) {
    // TODO: add more information within payslipFiles object.
    const payslipFile = input.files[0]
    payslipFiles.value[email] = payslipFile

    console.log(`Payslip with filename "${payslipFile.name}" assigned to ${email}`)
  } else {
    console.error('Input is null');
  }
};

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
  formData.append('text', 'Please find your payslip below.');
  formData.append('file', payslip);

  try {
    // Set loading state for current email being sent
    loadingStates[email] = true;

    const response = await axios.post('http://localhost:3000/send-payslip-to-email', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    console.log('File uploaded and email sent successfully:', response.data);
  } catch (error) {
    console.error('Error uploading file or sending email:', error);
  } finally {
    loadingStates[email] = false;
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
        formData.append('text', 'Please find your payslip below.');
        formData.append('file', payslip);

        await axios.post('http://localhost:3000/send-payslip-to-email', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        console.log(`Payslip sent to: ${email}`);
      }
    });

    await Promise.all(emailPromises);
    console.log('All payslips sent successfully!');
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
  <h1>Upload Employee Data and Payslips</h1>
  <v-container>
    <v-file-input label="Upload XLSX File" @change="generateTableFromXLSX" />
    <!-- TODO: Upon confirming sending all payslips. Show loading indicators for all rows accordingly. -->
    <v-btn 
      text="Send All Payslips"
      :disabled="!tableData.length || Object.keys(payslipFiles).length === 0" 
      @click="openSendAllPayslipsDialog"
    ></v-btn>
    <!-- TODO: Turn table into component. -->
    <v-data-table
      v-if="tableHeaders.length && tableData.length"
      :items="tableData"
      class="elevation-1"
    >
      <template v-slot:body="{ items }">
        <tr v-for="(item, index) in items" :key="index">
          <td v-for="header in tableHeaders" :key="header.value">
            <!-- Table Data -->
            <span 
              v-if="header.value !== 'payslip' && header.value!== 'send-email'"
            >
              {{ item[header.value] }}
            </span>
            <!-- Payslip File Input -->
            <v-file-input
              v-else-if="header.value === 'payslip'"
              label="Upload Payslip"
              @change="(event: Event) => assignPayslipToEmployee(item['Email'], event)"
            />
            <!-- Send Email Button (or Spinner if loading) -->
            <!-- TODO: Turn this into a component -->
            <template v-else>
              <v-progress-circular
                v-if="loadingStates[item['Email']]"
                indeterminate
                color="primary"
                size="24"
              ></v-progress-circular>
              <v-btn
                v-else
                text="Send"
                :disabled="!payslipFiles[item['Email']]"
                @click="openSendPayslipDialog(item)"
              ></v-btn>
            </template>
          </td>
        </tr>
      </template>
    </v-data-table>
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
