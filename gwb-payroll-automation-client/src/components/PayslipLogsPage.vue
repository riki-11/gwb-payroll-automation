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
const headers = [
    { title: 'Sender', value: 'senderName' },
    { title: 'Recipient', value: 'recipientName' },
    { title: 'Email', value: 'recipientEmail' },
    { title: ' Worker No.', value: 'recipientWorkerNum' },
    { title: 'Payslip File', value: 'recipientPayslipFile' },
    { title: 'Date', value: 'date' },
    { title: 'Subject', value: 'subject' },
    { title: 'Successful', value: 'successful' }
]

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
    <div v-if="isAuthenticated" class="p-6">
      <h1 class="py-6 text-2xl font-bold">Payslip Email Logs</h1>
  
      <v-card>
        <v-card-text>
          <v-data-table
            :headers="headers"
            :items="emailLogs"
            :loading="isLoading"
            class="elevation-1"
            fixed-header
            height="600px"
            item-value="id"
          >
            <template #item.successful="{ item }">
              <v-chip :color="item.successful ? 'green' : 'red'" dark>
                {{ item.successful ? 'Yes' : 'No' }}
              </v-chip>
            </template>
            <template #no-data>
              <v-alert type="info">No email logs found.</v-alert>
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>
    </div>
  </template>
  