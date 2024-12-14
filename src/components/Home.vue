<script setup lang="ts">
import axios from 'axios';
import { ref, computed } from 'vue';

// Define table header as refs
const headers = ref([
  { title: 'Worker No.', align: 'start' as const, key: 'worker_num' },
  { title: 'Email', align: 'start' as const, key: 'email' },
  { title: 'Title', align: 'start' as const, key: 'title' },
  { title: 'Name', align: 'start' as const, key: 'name' },
  { title: 'Address', align: 'start' as const, key: 'address' },
  { title: 'Birthday', align: 'start' as const, key: 'birthday' },
])

const employees = ref([
  {
    worker_num: 'C001',
    email: 'enrique.lejano@outlook.com',
    title: 'Mr.',
    name: 'Enrique Lejano',
    address: 'Manila, Philippines',
    birthday: '11-10-2002'
  },
  {
    worker_num: 'C002',
    email: 'lejanoenrique@gmail.com',
    title: 'Mr.',
    name: 'Riki Lej',
    address: 'Manila, Philippines',
    birthday: '11-10-2002'
  },
])

// Send Email functionality
const sendEmail = async () => {
  try {
    const response = await axios.post('http://localhost:3000/send-email', {
      to: 'lejanoenrique@gmail.com',
      subject: 'Test Email',
      text: 'This is a test email sent from Vue.js using Axios and Nodemailer on the backend!',
    });

    console.log('Email sent successfully:', response.data);
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

const employeeTableData = computed(() => 
  [...Array(2).keys()].map(i => {
    const employee = {...employees.value[i]}
    return employee;
  })
)

</script>

<template>
    <h1>Hi!</h1>
    <h2>This is pretty cool</h2>
    <v-container class="text-center">
      <v-btn @click="sendEmail" height="72" min-width="164">
        Send Email
      </v-btn>
    </v-container>
    <v-container>
      <v-data-table-virtual
        :headers="headers"
        :items="employeeTableData"
        height="400"
        item-value="name"
      ></v-data-table-virtual>
    </v-container>
</template>
  