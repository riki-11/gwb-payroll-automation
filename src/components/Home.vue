<script setup lang="ts">
import axios from 'axios';
import { ref, computed } from 'vue';
import XLSX from 'xlsx';

// Define types for rows and headers
type RowData = Record<string, any>; // A single row object (key-value pair)
type HeaderData = { text: string; value: string }; // Header structure for Vuetify

const tableHeaders = ref<HeaderData[]>([]); // Array of headers
const tableData = ref<RowData[]>([]); // Array of rows
const payslipFiles = ref<Record<string, File>>({}); // Store payslip files indexed by email

async function handleFileUpload(event: Event) {
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
      tableHeaders.value.push({ text: 'Payslip', value: 'payslip' });

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

const handlePayslipUpload = (email: string, event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input?.files?.[0];
  if (file) {
    console.log(`FILE: ${file} | NAME: ${file.name}`)
    payslipFiles.value[email] = file; // Map email to file

    for (const [email, file] of Object.entries(payslipFiles.value)) {
      console.log(`Email: ${email}, File Name: ${file.name}`);
      console.log(`File Content:`, file); // Full file object
    }

    // Send file to server via POST request
    const formData = new FormData();
    formData.append('file', file);

    axios.post('http://localhost:3000/upload', formData)
      .then((response) => {
        console.log(`File uploaded successfully: ${response.data}`)
      })
      .catch((error) => {
        console.error(`Error uploading file: ${error}`)
      })
  }
};

const sendPayslipEmails = async () => {
  try {
    const emailPromises = tableData.value.map(async row => {
      const email = row['Email'];
      const payslip = payslipFiles.value[email];

      if (email && payslip) {
        const formData = new FormData();
        formData.append('email', email);
        formData.append('payslip', payslip);

        await axios.post('http://localhost:3000/send-payslip', formData, {
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
</script>

<template>
  <h1>Upload Employee Data and Payslips</h1>
  <v-container>
    <v-file-input label="Upload XLSX File" @change="handleFileUpload" />
    <v-data-table
      v-if="tableHeaders.length && tableData.length"
      :items="tableData"
      class="elevation-1"
    >
      <template v-slot:body="{ items }">
        <tr v-for="(item, index) in items" :key="index">
          <td v-for="header in tableHeaders" :key="header.value">
            <span v-if="header.value !== 'payslip'">{{ item[header.value] }}</span>
            <v-file-input
              v-else
              label="Upload Payslip"
              @change="(event: Event) => handlePayslipUpload(item['Email'], event)"
            />
          </td>
        </tr>
      </template>
    </v-data-table>
    <v-btn :disabled="!tableData.length" @click="sendPayslipEmails">Send Emails</v-btn>
  </v-container>
</template>
