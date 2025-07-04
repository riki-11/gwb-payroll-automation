<script setup lang="ts">
import { ref, computed } from 'vue';
import XLSX from 'xlsx';
import JSZip from 'jszip'; 

// Components
import EmployeeDataTable from './EmployeeDataTable.vue';
import EmailBodyEditor from './EmailBodyEditor.vue';
import EmailSubjectEditor from './EmailSubjectEditor.vue';
import EmailPayslipsInstructions from './EmailPayslipsInstructions.vue';
import SendPayslipModal from './SendPayslipModal.vue';
import SendAllPayslipsModal from './SendAllPayslipsModal.vue';
import EmailSignatureEditor from './EmailSignatureEditor.vue';

// APIs
import { sendPayslipEmail } from '../api/api';
import { useUserStore } from '../stores/userStore';

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
const selectedRows = ref<Record<string, boolean>>({});
const zipFileNames = ref<string[]>([]);

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

      selectedRows.value = {};
      tableData.value.forEach(row => {
        if (row['Email']) {
          selectedRows.value[row['Email']] = false;
        }
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
  selectedRows.value = {};
}

async function handleZipUpload(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input?.files?.[0];
  if (!file) {
    console.error('No zip file selected.');
    return;
  }

  try {
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(file);

    // Filter to include only PDF files and exclude unwanted files
    zipFileNames.value = Object.keys(zipContent.files).filter(
      (fileName) =>
        fileName.endsWith('.pdf') && // Only include PDF files
        !fileName.startsWith('__MACOSX/') && // Exclude macOS metadata
        !fileName.includes('/._') // Exclude macOS resource forks
    );

    console.log('Filtered PDF file names:', zipFileNames.value);

    // Match worker numbers with filenames and assign files
    tableData.value.forEach(async (row) => {
    const workerNumber = row['Worker No.'];
    const email = row['Email'];

    if (workerNumber && email) {
      const matchedFileName = zipFileNames.value.find((fileName) =>
        fileName.includes(workerNumber)
      );

      if (matchedFileName) {
        console.log(`Worker No. ${workerNumber}: Match found (${matchedFileName})`);

        // Extract the matched file from the zip
        const fileData = await zipContent.files[matchedFileName].async('blob');
        const payslipFile = new File([fileData], matchedFileName, { type: 'application/pdf' });

        // Assign the file to the corresponding worker number in payslipFiles
        payslipFiles.value[workerNumber] = payslipFile;

        console.log(`Payslip "${matchedFileName}" assigned to Worker No. ${workerNumber}`);
      } else {
        console.log(`Worker No. ${workerNumber}: No match found`);
      }
    }
  });
  } catch (error) {
    console.error('Error processing zip file:', error);
  }
}

const sendPayslipToEmployee = async (email: string, workerNum: string, workerName: string) => {
  const payslip = payslipFiles.value[workerNum];
  const userStore = useUserStore();
  const userEmail = userStore.getUserEmail;
  const userName = userStore.getUserName;

  if (!payslip) {
    console.error(`No payslip found for Worker No.: ${workerNum}`);
    return;
  }

  if (!userEmail || !userName) {
    console.error('User email or name is not available.');
    return;
  }

  try {
    loadingStates.value[workerNum] = true;

    // Generate a unique batch ID for this individual send operation
    const batchId = new Date().getTime().toString() + '_' + '1';
    
    const formData = new FormData();
    formData.append('to', email);
    formData.append('subject', emailSubject.value);
    formData.append('html', fullEmailContent.value);
    formData.append('file', payslip);
    formData.append('workerNum', workerNum);
    formData.append('workerName', workerName);
    formData.append('senderEmail', userEmail);
    formData.append('senderName', userName);
    
    // For individual sends, mark as batch size 1, with item number 1
    formData.append('batchId', batchId);
    formData.append('batchItemNum', '1');
    formData.append('batchSize', '1');

    await sendPayslipEmail(formData);
    sentStates.value[workerNum] = true;

    sendPayslipDialog.value = false;
  } catch (error) {
    console.error('Error uploading file or sending email:', error);
  } finally {
    loadingStates.value[workerNum] = false;
  }
};


const sendAllPayslips = async () => {
  try {
    const userStore = useUserStore();
    const userEmail = userStore.getUserEmail;
    const userName = userStore.getUserName;

    if (!userEmail || !userName) {
      console.error('User email or name is not available.');
      return;
    }

    // Count total selected payslips for batch size
    const selectedCount = Object.values(selectedRows.value).filter(val => val).length;
    
    // Use index to track batch item number
    let batchItemNum = 0;

    // Generate a unique batch ID for this send operation
    const batchId = new Date().getTime().toString() + '_' + batchItemNum;
    
    const emailPromises = tableData.value.map(async row => {
      const workerNum = row['Worker No.'];
      const email = row['Email'];
      const workerName = row['Name'];
      const payslip = payslipFiles.value[workerNum];

      if (selectedRows.value[workerNum] && payslip) {
        try {
          // Increment batch item number for each selected payslip
          batchItemNum++;
          
          loadingStates.value[workerNum] = true;

          const formData = new FormData();
          formData.append('to', email);
          formData.append('subject', emailSubject.value);
          formData.append('html', fullEmailContent.value);
          formData.append('file', payslip);
          formData.append('workerNum', workerNum);
          formData.append('workerName', workerName);
          formData.append('senderEmail', userEmail);
          formData.append('senderName', userName);
          formData.append('batchId', batchId);
          formData.append('batchItemNum', batchItemNum.toString()); 
          formData.append('batchSize', selectedCount.toString());

          await sendPayslipEmail(formData);
          sentStates.value[workerNum] = true;
        } catch (error) {
          console.error(`Error sending payslip to Worker No.: ${workerNum}`, error);
        } finally {
          loadingStates.value[workerNum] = false;
        }
      }
    });

    await Promise.all(emailPromises);
    console.log(`Batch ${batchId}: ${batchItemNum} payslips sent successfully!`);
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
  <h1 class="py-10">Upload Employee Data and Send Payslips</h1>
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
      :selected-rows="selectedRows"
      @update:selected-rows="selectedRows = $event"
      @open-send-payslip-dialog="openSendPayslipDialog"
    />
    <v-container
      v-if="tableHeaders.length && tableData.length"
      class="d-flex flex-column w-100 text-left py-4 ga-4"
    >
      <h2>Upload Payslip Zip File</h2>
      <p>Note: Only PDF files are allowed for payslips at the moment.</p>
      <v-file-input 
        label="Upload Zip File" 
        @change="handleZipUpload"
        accept=".zip"
        clearable
      />
      <v-list v-if="zipFileNames.length" class="mt-4">
        <v-list-item v-for="fileName in zipFileNames" :key="fileName">
          <v-list-item-title>{{ fileName }}</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-container>
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
      text:disabled="!Object.values(selectedRows).includes(true)" 
      @click="openSendAllPayslipsDialog"
      color="primary"
      prepend-icon="mdi-email-send"
      size="large"
      class="mt-4"
    >
    {{ Object.values(selectedRows).filter(val => val).length === 0 ? 'No Payslips Selected' : `Send ${Object.values(selectedRows).filter(val => val).length} Selected Payslips` }}
    </v-btn>
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
    :selected-rows="selectedRows"
    @update:dialog="sendAllPayslipsDialog = $event"
  />
</template>