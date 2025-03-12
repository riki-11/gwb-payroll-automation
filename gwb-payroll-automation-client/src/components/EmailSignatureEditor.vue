<script setup lang="ts">
import { ref, onBeforeUnmount, watch } from 'vue';
import { useEditor, EditorContent} from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Image from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Color from '@tiptap/extension-color';
import TextStyle from '@tiptap/extension-text-style';

// Define template interface
interface SignatureTemplate {
  title: string;
  html: string;
}

// Define input methods
type InputMethod = 'editor' | 'paste' | 'upload';

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['update:modelValue']);

// Track the current input method
const currentInputMethod = ref<InputMethod>('editor');

// Reference to the HTML paste textarea
const htmlInput = ref<string>('');

// Store the signature content
const signatureContent = ref<string>(props.modelValue);

// Create the editor with TypeScript types and necessary extensions
const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit,
    Underline,
    Link.configure({
      openOnClick: false,
    }),
    Image,
    Table.configure({
      resizable: true,
    }),
    TableRow,
    TableCell,
    TableHeader,
    TextStyle,
    Color,
  ],
  onUpdate: ({ editor }) => {
    signatureContent.value = editor.getHTML();
    emit('update:modelValue', signatureContent.value);
  },
});

// Emit changes when signature content changes by other means
watch(signatureContent, (newValue) => {
  emit('update:modelValue', newValue);
});

// Update editor content when the input method changes
watch(currentInputMethod, (newMethod) => {
  if (newMethod === 'editor' && editor.value) {
    editor.value.commands.setContent(signatureContent.value);
  } else if (newMethod === 'paste') {
    // Set the HTML input value when switching to paste mode
    htmlInput.value = signatureContent.value;
  }
});

// Watch for external changes to modelValue
watch(() => props.modelValue, (newValue) => {
  signatureContent.value = newValue;
  if (editor.value && currentInputMethod.value === 'editor') {
    editor.value.commands.setContent(newValue);
  }
});

// Predefined signature templates with proper typing
const signatureTemplates = ref<SignatureTemplate[]>([
  {
    title: 'GWB Entertainment',
    html: `<table style="width: 704px;">
  <tbody>
    <tr style="height: 21px;">
      <td style="height: 21px; width: 130px;" rowspan="2">
        <a href="http://www.gwbentertainment.com/">
          <img height="73" width="120" src="https://i.imgur.com/Vk5yV7R.jpg" />
        </a>
      </td>
      <td style="height: 21px; width: 500px;">
        <span style="font-family:helvetica; font-size:14px">
          <b>NAME NAME NAME NAME</b>
        </span>
        <span style="font-family:helvetica; font-size:14px; color:#878787">
          | TITLE TITLE TITLE TITLE
        </span>
      </td>
    </tr>
    <tr style="height: 21px;">
      <td style="height: 21px; width: 500px;">
        <span style="font-family:helvetica; font-size:12px; color:#878787">
          +44 203 903 8758 | www.gwbentertainment.com
          <br />
          GWB Entertainment UK Ltd | 11 Russell Gardens Mews, London W14 8EU, United Kingdom
          <br />
          GWB Entertainment Pty Ltd | 50 Sir Donald Bradman Drive, Mile End, SA, 5031, Australia
        </span>
      </td>
    </tr>
    <tr style="height: 30px;">
      <td style="height: 30px; width: 500px;" colspan="2">
        <span style="font-family:helvetica; font-size:8px; color:#878787">
          IMPORTANT: The contents of this email and any attachments are confidential. It is strictly forbidden to share any part of this message with any third party, without a written consent of the sender. If you received this message by mistake, please reply to this message and follow with its deletion, so that we can ensure such a mistake does not occur in the future.
        </span>
      </td>
    </tr>
  </tbody>
</table>`
  }
]);

// Apply a template to the signature
const applyTemplate = (template: SignatureTemplate | null) => {
  if (template) {
    signatureContent.value = template.html;
    
    if (currentInputMethod.value === 'editor' && editor.value) {
      editor.value.commands.setContent(template.html);
    } else if (currentInputMethod.value === 'paste') {
      htmlInput.value = template.html;
    }
  }
};

// Show link dialog with proper typing - fixed for TypeScript
const addLink = () => {
  // Use the global window object with proper TypeScript typing
  const url = globalThis.window.prompt('Enter URL', 'https://');
  
  if (url && editor.value) {
    if (url.trim() !== '') {
      editor.value.chain().focus().setLink({ href: url }).run();
    } else {
      editor.value.chain().focus().unsetLink().run();
    }
  }
};

// Handle inserting an image - fixed for TypeScript
const addImage = () => {
  const url = globalThis.window.prompt('Enter image URL', 'https://');
  
  if (url && editor.value) {
    editor.value.chain().focus().setImage({ src: url }).run();
  }
};

// Handle pasted HTML
const handlePastedHtml = () => {
  signatureContent.value = htmlInput.value;
};

// Handle file upload
const handleFileUpload = (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;
  
  const file = input.files[0];
  const reader = new FileReader();
  
  reader.onload = (e) => {
    const content = e.target?.result as string;
    signatureContent.value = content;
    htmlInput.value = content;
  };
  
  reader.readAsText(file);
};

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
        <!-- Input method selector -->
        <v-tabs v-model="currentInputMethod" class="mb-4">
          <v-tab value="editor">Rich Text Editor</v-tab>
          <v-tab value="paste">Paste HTML</v-tab>
          <v-tab value="upload">Upload HTML</v-tab>
        </v-tabs>
        
        <!-- Template selector - visible in all modes -->
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
        
        <!-- Rich Text Editor -->
        <div v-if="currentInputMethod === 'editor'">
          <!-- Editor toolbar -->
          <div class="editor-toolbar mb-2 pa-1 d-flex flex-wrap bg-grey-lighten-4 rounded">
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
              class="mr-1"
            ></v-btn>
            <v-btn 
              size="small" 
              density="comfortable" 
              variant="text"
              icon="mdi-table-plus"
              @click="editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()"
              class="mr-1"
            ></v-btn>
            <v-btn 
              size="small" 
              density="comfortable" 
              variant="text"
              icon="mdi-image"
              @click="addImage"
              class="mr-1"
            ></v-btn>
          </div>
          
          <!-- The editor itself -->
          <div class="editor-container">
            <editor-content :editor="editor" />
          </div>
        </div>
        
        <!-- HTML Paste Method -->
        <div v-else-if="currentInputMethod === 'paste'">
          <v-textarea
            v-model="htmlInput"
            label="Paste your HTML signature here"
            hint="You can paste complex HTML code for your email signature"
            persistent-hint
            rows="10"
            auto-grow
            @input="handlePastedHtml"
          ></v-textarea>
        </div>
        
        <!-- HTML Upload Method -->
        <div v-else-if="currentInputMethod === 'upload'">
          <v-file-input
            label="Upload HTML signature file"
            accept=".html,.htm"
            @change="handleFileUpload"
            prepend-icon="mdi-file-upload"
            hint="Upload an HTML file containing your email signature"
            persistent-hint
          ></v-file-input>
        </div>
        
        <!-- Preview (for all methods) -->
        <div class="mt-4">
          <p class="text-subtitle-1">Preview:</p>
          <v-card variant="outlined" class="pa-3 signature-preview">
            <div v-html="signatureContent"></div>
          </v-card>
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

.signature-preview {
  overflow: auto;
  max-height: 300px;
}

/* Table styles for the editor */
.signature-editor .ProseMirror table {
  border-collapse: collapse;
  margin: 0;
  overflow: hidden;
  table-layout: fixed;
  width: 100%;
}

.signature-editor .ProseMirror td,
.signature-editor .ProseMirror th {
  border: 1px solid #ddd;
  box-sizing: border-box;
  min-width: 1em;
  padding: 3px 5px;
  position: relative;
  vertical-align: top;
}

.signature-editor .ProseMirror img {
  max-width: 100%;
  height: auto;
}
</style>