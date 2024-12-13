<script setup lang="ts">
import axios from 'axios';
import { ref } from 'vue';

const sendEmail = async () => {
  try {
    const response = await axios.post('http://localhost:3000/send-email', {
      to: 'enrique.lejano@outlook.com',
      subject: 'Test Email',
      text: 'This is a test email sent from Vue.js using Axios and Nodemailer on the backend!',
    });

    console.log('Email sent successfully:', response.data);
  } catch (error) {
    console.error('Error sending email:', error);
  }
};
</script>

<template>
    <h1>Hi!</h1>
    <h2>This is pretty cool</h2>
    <v-container class="text-center">
      <v-btn @click="sendEmail" height="72" min-width="164">
        Send Email
      </v-btn>
    </v-container>
</template>
  