<script setup lang="ts">
import { ref, reactive} from 'vue';
import axios from 'axios';

// Components
import SendPayslipModal from './SendPayslipModal.vue';
import SendAllPayslipsModal from './SendAllPayslipsModal.vue';

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
  emailBodyContent: {
    type: String,
    required: true
  }
});

// Payslip variables
const payslipFiles = ref<Record<string, File>>({}); // Store payslip files indexed by email

// Button states
const loadingStates = reactive<Record<string, boolean>>({}); // Track loading state for each email

// Dialog states
const sendPayslipDialog = ref(false);
const sendAllPayslipsDialog = ref(false);
const selectedRowForDialog = ref<RowData | null>(null);


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
  formData.append('text', props.emailBodyContent);
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
    const emailPromises = props.tableData.map(async row => {
      const email = row['Email'];
      const payslip = payslipFiles.value[email];

      if (email && payslip) {
        const formData = new FormData();
        formData.append('to', email);
        formData.append('subject', 'Sample payslip Email');
        formData.append('text', props.emailBodyContent);
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
  <!-- TODO: Upon confirming sending all payslips. Show loading indicators for all rows accordingly. -->

  <v-container class="d-flex flex-column align-center w-100">

    <v-data-table :items="props.tableData" class="elevation-1">
      <template v-slot:body="{ items }">
        <tr v-for="(item, index) in items" :key="index">
          <td v-for="header in tableHeaders" :key="header.value">
            <!-- Table Data -->
            <span v-if="header.value !== 'payslip' && header.value !== 'send-email'">
              {{ item[header.value] }}
            </span>
            <!-- Payslip File Input -->
            <v-file-input
              v-else-if="header.value === 'payslip'"
              label="Upload Payslip" 
              @change="(event: Event) => assignPayslipToEmployee(item['Email'], event)"
            />
            <!-- Send Email Button (or Spinner if loading) -->
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
  
    <v-btn 
      text="Send All Payslips"
      :disabled="!tableData.length || Object.keys(payslipFiles).length === 0" 
      @click="openSendAllPayslipsDialog"
    />
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