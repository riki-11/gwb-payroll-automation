<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../stores/userStore';
import { fetchAllPayslipLogs } from '../api/api';

interface EmailLog {
    id?: string;           // Cosmos DB will generate this if not provided
    senderName: string;    // Name of user who sent the email
    senderEmail: string;   // Email address of user who sent email
    recipientName: string; // Name of worker recipient
    recipientEmail: string;// Email address of worker recipient
    recipientWorkerNum: string; // Worker no. of recipient
    recipientPayslipFile: string; // Filename of payslip that is sent
    date: string;          // Date that email was sent (YYYY-MM-DD format)
    timeSent: string;      // Time that email was sent (including the local timezone)
    subject: string;       // Email subject line
    successful: boolean;   // Whether the email was sent successfully
  }

const router = useRouter();
const userStore = useUserStore();
const isAuthenticated = ref(false);

const emailLogs = ref<EmailLog[]>([]);
const isLoading = ref(true);
const headers = ref([
    { text: 'Sender', value: 'senderName' },
    { text: 'Recipient Name', value: 'recipientName' },
    { text: 'Recipient Email', value: 'recipientEmail' },
    { text: 'Recipient Worker No.', value: 'recipientWorkerNum' },
    { text: 'Recipient Payslip File', value: 'recipientPayslipFile' },
    { text: 'Date Sent', value: 'date' },
    { text: 'Subject', value: 'subject' },
    { text: 'Successful', value: 'successful' }
])

const fetchEmailLogs = async () => {
    await fetchAllPayslipLogs()
        .then((response) => {
            emailLogs.value = response.data;
            isLoading.value = false;
        })
        .catch((error) => {
            console.error('Error fetching email logs:', error);
            isLoading.value = false;
        });

    console.log('Email logs:', emailLogs.value);
}

onMounted(async () => {
  // Check if user is authenticated
  if (!userStore.getUserEmail) {
    // Redirect to home or login page if not authenticated
    router.push('/');
    return;
  }
  await fetchEmailLogs();
  isAuthenticated.value = true;
});
</script>

<template>
  <div v-if="isAuthenticated">
    <h1 class="py-10">Payslip Email Logs</h1>
    <!-- Your logs content will go here -->
  </div>
</template>