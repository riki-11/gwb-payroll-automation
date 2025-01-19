<script setup lang="ts">

const props = defineProps({
  dialog: {
    type: Boolean,
    required: true
  },
  sendAllPayslips: {
    type: Function,
    required: true
  },
  emailSubject: {
    type: String,
    required: true
  },
  emailBodyContent: {
    type: String,
    required: true
  }
});

const emit = defineEmits(['update:dialog']);

const closeDialog = () => emit('update:dialog', false);

const handleSendAllPayslips = () => {
  closeDialog();
  props.sendAllPayslips();
}
</script>

<template>
  <v-dialog v-model="props.dialog" width="auto">
    <v-card>
      <v-card-title>Proceeed with sending all payslips?</v-card-title>
      <v-card-text>
        Pleae double check that all payslip files have been uploaded to the corresponding employee.
        <p><strong>Email Subject: </strong> {{ props.emailSubject }} </p>
        <p><strong>Email Body: </strong> {{ props.emailBodyContent }} </p>
      </v-card-text>
      <v-card-actions>
        <v-btn text="Cancel" @click="closeDialog"></v-btn>
        <v-btn text="Send" @click="handleSendAllPayslips"></v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>