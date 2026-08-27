import { createApp } from 'vue'
import App from './App.vue'
import { i18n } from '@/shared/config/i18n'
import { registerServiceWorker } from './providers/service-worker'
import './styles/index.css'

createApp(App).use(i18n).mount('#app')
registerServiceWorker()
