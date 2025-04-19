import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'

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


createApp(App).use(vuetify).use(router).mount('#app')
