<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue';
import { useEditor, EditorContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';

// Define email body templates
const emailBodyTemplates = ref([
  {
    title: 'Angel of Music Body (Scott)',
    html: `<p>Greetings, </p>
           <p>I hope this email finds you well.</p>
           <p>Please find attached your payslip.</p>
           <p>For security reasons your payslip is password protected. Your password is your date of birth using the format DD-MM-YYYY.</p>
           <p>For example, if your date of birth is 28/12/1980, then your password would be 28-12-1980.</p>
           <p>If your password is not accepted please let me know.</p>
           <p>Best,</p>
           <p>Scott</p>`,
  },
]);

const htmlContent = ref('');

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['update:modelValue']);

// Create the Tiptap editor
const editor = useEditor({
  content: props.modelValue,
  extensions: [StarterKit],
  onUpdate: ({ editor }) => {
    const html = editor.getHTML();
    htmlContent.value = html;
    emit('update:modelValue', html);
  },
});

// Handle cleanup
onBeforeUnmount(() => {
  if (editor.value) {
    editor.value.destroy();
  }
});

// Apply a selected template to the editor
const applyTemplate = (template: { title: string; html: string } | null) => {
  if (template && editor.value) {
    editor.value.commands.setContent(template.html);
    emit('update:modelValue', template.html); // Emit the updated value to the parent
  }
};
</script>

<template>
  <v-container>
    <v-sheet class="mx-auto">
      <!-- Template Selector -->
      <v-select
        label="Choose a template"
        :items="emailBodyTemplates"
        item-title="title"
        item-value="html"
        variant="outlined"
        density="comfortable"
        @update:model-value="applyTemplate"
        return-object
        class="mb-4"
      >
        <template v-slot:prepend-inner>
          <v-icon>mdi-email</v-icon>
        </template>
      </v-select>

      <!-- Text Editor -->
      <div class="tiptap-editor mb-4">
        <p class="text-caption mb-2">You can type your email body here or use a template above.</p>

        <!-- Simple toolbar -->
        <div class="toolbar mb-2 pa-2 d-flex bg-grey-lighten-4 rounded">
          <v-btn
            size="small"
            density="comfortable"
            variant="text"
            icon="mdi-format-bold"
            :color="editor?.isActive('bold') ? 'primary' : undefined"
            @click="editor?.chain().focus().toggleBold().run()"
            class="mr-2"
          ></v-btn>
          <v-btn
            size="small"
            density="comfortable"
            variant="text"
            icon="mdi-format-italic"
            :color="editor?.isActive('italic') ? 'primary' : undefined"
            @click="editor?.chain().focus().toggleItalic().run()"
            class="mr-2"
          ></v-btn>
        </div>

        <!-- Editor content -->
        <div class="editor-wrapper">
          <editor-content :editor="editor" />
        </div>
      </div>
    </v-sheet>
  </v-container>
</template>

<style>
.editor-wrapper {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

.ProseMirror {
  padding: 12px;
  min-height: 200px;
  outline: none;
}

.ProseMirror p {
  margin: 0.5em 0;
}
</style>