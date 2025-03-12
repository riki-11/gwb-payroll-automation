<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue';
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'

const htmlContent = ref('');

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['update:modelValue']);

// Create the Tiptap editor
const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit,
  ],
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
</script>

<template>
  <v-container>
    <v-sheet class="mx-auto">
      <div class="tiptap-editor mb-4">
        <h3>Email Body</h3>
        <p class="text-caption mb-2">You can paste your email signature here.</p>
        
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