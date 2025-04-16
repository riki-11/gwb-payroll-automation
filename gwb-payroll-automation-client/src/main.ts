import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import authStore from './services/authStore'

// Vuetify
// TODO: fix vuetify styles
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/dist/vuetify.min.css'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

const vuetify = createVuetify({
  components,
  directives,
})

// Initialize authentication state before mounting the app
const initApp = async () => {
  // Initialize auth state by checking with the server
  await authStore.init();
  
  // Create and mount Vue app
  createApp(App)
    .use(vuetify)
    .use(router)
    .mount('#app');
};

initApp();
