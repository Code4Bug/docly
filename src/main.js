import { createApp } from 'vue'
import { createPinia } from 'pinia'
import naive from 'naive-ui'
import './assets/css/style.css'
import './assets/css/global.css'
import './assets/css/editor.css'
import './assets/css/components.css'
import './assets/css/fonts.css'

import App from './App.vue'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(naive)
app.mount('#app')
