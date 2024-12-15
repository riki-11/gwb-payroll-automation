<script setup lang="ts">
import axios from 'axios';
import { ref, computed, onMounted } from 'vue';
import XLSX from 'xlsx';
import * as fs from "fs";
import { set_fs } from "xlsx";

set_fs(fs);

// Define types for rows and headers
type RowData = Record<string, any>; // A single row object (key-value pair)
type HeaderData = { text: string; value: string }; // Header structure for Vuetify

// Reactive state for the table
const tableHeaders = ref<HeaderData[]>([]); // Array of headers
const tableData = ref<RowData[]>([]); // Array of rows

// Send Email functionality
const sendEmail = async (email: String) => {
  try {
    const response = await axios.post('http://localhost:3000/send-email', {
      to: email,
      subject: 'Test Email',
      text: 'This is a test email sent from Vue.js using Axios and Nodemailer on the backend!',
    });

    console.log('Email sent successfully:', response.data);
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

const sendPayslipEmails = async () => {
  try {
    // Collect all email promises
    const emailPromises = tableData.value.map(employeeRow => {
      const email = employeeRow['Email'];
      if (email) {
        console.log(`Preparing to send email to: ${email}`);
        return sendEmail(email); // Return the promise for sending this email
      } else {
        console.warn('No email provided for:', employeeRow);
        return Promise.resolve(); // Resolve immediately for rows without an email
      }
    });

    // Wait for all email promises to resolve
    await Promise.all(emailPromises);
    console.log('All emails sent successfully!');
  } catch (error) {
    console.error('Error sending one or more emails:', error);
  }
};


async function handleFileUpload(event: Event) {
  console.log('AWESOME!')
  const input = event.target as HTMLInputElement; // Assert the event target is an HTMLInputElement
  const file = input?.files?.[0]; // Get the first file

  if (!file) {
    console.error('No file selected.');
    return;
  }

  try {
    const arrayBuffer = await file.arrayBuffer(); 
    // Parse workbook and automatically calculate the range depending on the values
    const workbook = XLSX.read(arrayBuffer, {nodim: true}); 

    // Parse the first sheet
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

    // Extract data as a 2D array
    const jsonData = XLSX.utils.sheet_to_json<unknown[]>(firstSheet, { header: 1 }) as unknown[][];

    if (jsonData.length > 0) {
      // Extract headers from the first row
      tableHeaders.value = jsonData[0].map(header => ({
        text: String(header), // Ensure headers are strings
        value: String(header), // Value keys for rows
      }));

      // Extract rows from the rest of the data
      tableData.value = jsonData.slice(1).map(row => {
        const rowObject: RowData = {};
        tableHeaders.value.forEach((header, index) => {
          rowObject[header.value] = row[index] ?? ''; // Default to empty string for missing values
        });
        return rowObject;
      });
    }

    console.log('Extracted Headers:', tableHeaders.value);
    console.log('Extracted Data:', tableData.value);
  } catch (error) {
    console.error('Error processing file:', error);
  }
}

</script>

<template>
  <h1>Hi!</h1>
  <h2>This is pretty cool</h2>
  <v-container class="text-center">
    <v-btn v-if="tableHeaders.length && tableData.length" @click="sendPayslipEmails" height="72" min-width="164">
      Send Emails
    </v-btn>
    <v-btn v-else height="72" min-width="164" disabled>
      Send Emails
    </v-btn>
  </v-container>
  <v-file-input label="File input" @change="handleFileUpload"/>
  <v-container>
    <!-- Render table if data is available -->
    <v-data-table
      v-if="tableHeaders.length && tableData.length"
      :items="tableData"
      class="elevation-1"
      height="400"
      
    >
    </v-data-table>

    <!-- Show a loader or message if no data is loaded yet -->
    <div v-else class="text-center">
      <v-progress-circular indeterminate color="primary" />
      <p>Loading table data...</p>
    </div>
  </v-container>
</template>
<!-- :headers="tableHeaders" -->