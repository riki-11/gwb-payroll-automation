<script setup lang="ts">
import { ref, onBeforeUnmount, watch } from 'vue';
import { useEditor, EditorContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link'; // Import the link extension
import Underline from '@tiptap/extension-underline'; // Import the underline extension

// Define template interface
interface SignatureTemplate {
  title: string;
  html: string;
}

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['update:modelValue']);

// Create the editor with TypeScript types
const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit,
    Underline, // Add the underline extension
    Link.configure({
      openOnClick: false,
    }),
  ],
  onUpdate: ({ editor }) => {
    emit('update:modelValue', editor.getHTML());
  },
});

// Predefined signature templates with proper typing
const signatureTemplates = ref<SignatureTemplate[]>([
  {
    title: 'Simple',
    html: `<div style="font-family: Arial, sans-serif; margin-top: 20px; border-top: 1px solid #ccc; padding-top: 10px;">
  <p><strong>Your Name</strong><br>
  Job Title<br>
  Company Name<br>
  Phone: (123) 456-7890<br>
  Email: your.email@example.com</p>
</div>`
  },
  {
    title: 'Professional',
    html: `<table style="font-family: Arial, sans-serif; margin-top: 20px; border-top: 1px solid #ccc; padding-top: 10px;">
  <tr>
    <td style="padding-right: 15px; vertical-align: top;">
      <strong style="color: #333; font-size: 16px;">Your Name</strong><br>
      <span style="color: #666;">Job Title | Company Name</span><br>
      <span>Phone: (123) 456-7890</span><br>
      <a href="mailto:your.email@example.com" style="color: #1a73e8; text-decoration: none;">your.email@example.com</a>
    </td>
  </tr>
</table>`
  },
  {
    title: 'Minimal',
    html: `<div style="font-family: Arial, sans-serif; margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px; color: #666; font-size: 12px;">
  <p>Your Name | Job Title | Company Name<br>
  <a href="mailto:your.email@example.com" style="color: #1a73e8; text-decoration: none;">your.email@example.com</a></p>
</div>`
  }
]);

// Apply a template to the editor - properly typed to accept null
const applyTemplate = (template: SignatureTemplate | null) => {
  // Only proceed if template and editor exist
  if (template && editor.value) {
    editor.value.commands.setContent(template.html);
  }
};

// Show link dialog with proper typing
const addLink = () => {
  // Use window.prompt instead of just prompt for proper typing
  const url = window.prompt('Enter URL', 'https://');
  
  // Only set link if a URL was entered and editor exists
  if (url && editor.value) {
    // Set link or clear it if URL is empty
    if (url.trim() !== '') {
      editor.value.chain().focus().setLink({ href: url }).run();
    } else {
      editor.value.chain().focus().unsetLink().run();
    }
  }
};

// Watch for external changes to modelValue
watch(() => props.modelValue, (newValue) => {
  // Only update if the editor exists and the content is different
  if (editor.value && newValue !== editor.value.getHTML()) {
    editor.value.commands.setContent(newValue);
  }
});

// Cleanup on component unmount
onBeforeUnmount(() => {
  if (editor.value) {
    editor.value.destroy();
  }
});
</script>

<template>
  <div class="signature-editor">
    <v-card variant="outlined" class="mb-2">
      <v-card-title class="text-subtitle-1 pb-0">Email Signature</v-card-title>
      <v-card-subtitle>Add a professional signature to your emails</v-card-subtitle>
      
      <v-card-text>
        <!-- Template selector -->
        <div class="mb-4">
          <v-select
            label="Choose a template"
            :items="signatureTemplates"
            item-title="title"
            item-value="html"
            variant="outlined"
            density="comfortable"
            @update:model-value="applyTemplate"
            return-object
          >
            <template v-slot:prepend-inner>
              <v-icon>mdi-signature-text</v-icon>
            </template>
          </v-select>
        </div>
        
        <!-- Editor toolbar -->
        <div class="editor-toolbar mb-2 pa-1 d-flex bg-grey-lighten-4 rounded">
          <v-btn 
            size="small" 
            density="comfortable" 
            variant="text"
            icon="mdi-format-bold"
            :color="editor?.isActive('bold') ? 'primary' : undefined"
            @click="editor?.chain().focus().toggleBold().run()"
            class="mr-1"
          ></v-btn>
          <v-btn 
            size="small" 
            density="comfortable" 
            variant="text"
            icon="mdi-format-italic"
            :color="editor?.isActive('italic') ? 'primary' : undefined"
            @click="editor?.chain().focus().toggleItalic().run()"
            class="mr-1"
          ></v-btn>
          <v-btn 
            size="small" 
            density="comfortable" 
            variant="text"
            icon="mdi-format-underline"
            :color="editor?.isActive('underline') ? 'primary' : undefined"
            @click="editor?.chain().focus().toggleUnderline().run()"
            class="mr-1"
          ></v-btn>
          <v-divider vertical class="mx-2"></v-divider>
          <v-btn 
            size="small" 
            density="comfortable" 
            variant="text"
            icon="mdi-link"
            :color="editor?.isActive('link') ? 'primary' : undefined"
            @click="addLink"
          ></v-btn>
        </div>
        
        <!-- The editor itself -->
        <div class="editor-container">
          <editor-content :editor="editor" />
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<style>
.signature-editor .editor-container {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

.signature-editor .ProseMirror {
  padding: 12px;
  min-height: 150px;
  outline: none;
}

.signature-editor .ProseMirror p {
  margin: 0.5em 0;
}

.signature-editor .is-active {
  background-color: #e0e0e0;
}
</style>