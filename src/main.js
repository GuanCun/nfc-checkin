import { createApp } from 'vue'
import App from './App.vue'

const app = createApp(App)
app.mount('#app')

// 注册 Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.log('Service Worker 注册失败:', err)
    })
  })
}
