<script setup>
import { ref, onMounted, computed } from 'vue'

// 状态管理
const nfcSupported = ref(false)
const isListening = ref(false)
const statusMessage = ref('初始化中...')
const showHistory = ref(false)
const records = ref([])
const installPrompt = ref(null)
const showInstallBtn = ref(false)
const isDev = ref(import.meta.env.DEV) // 开发环境标识

// 初始化 - 检查 NFC 支持
onMounted(async () => {
  loadRecords()
  
  if ('NDEFReader' in window) {
    nfcSupported.value = true
    await startNFCListener()
  } else {
    nfcSupported.value = false
    statusMessage.value = '⚠️ 当前设备不支持 NFC 打卡'
  }
  
  // 监听 PWA 安装提示
  window.addEventListener('beforeinstallprompt', (e) => {
    console.log('✅ beforeinstallprompt 事件触发')
    e.preventDefault()
    installPrompt.value = e
    showInstallBtn.value = true
  })
  
  // 监听安装成功事件
  window.addEventListener('appinstalled', () => {
    console.log('✅ PWA 安装成功')
    showInstallBtn.value = false
    installPrompt.value = null
  })
  
  // 开发环境：检测 PWA 配置
  if (isDev.value) {
    console.log('🔍 PWA 配置检查:')
    console.log('- Service Worker 支持:', 'serviceWorker' in navigator)
    console.log('- beforeinstallprompt 监听已设置')
    
    // 延迟检查是否触发了事件
    setTimeout(() => {
      if (!installPrompt.value) {
        console.warn('⚠️ beforeinstallprompt 未触发，可能原因:')
        console.warn('1. 已安装该 PWA')
        console.warn('2. 不满足安装条件（需 HTTPS 或已注册 SW）')
        console.warn('3. 用户参与度不足（需访问2次，间隔5分钟）')
        console.warn('4. 在开发环境中，Chrome 可能不会自动触发')
        console.warn('\n💡 解决方案:')
        console.warn('- 打开 DevTools > Application > Manifest，检查配置')
        console.warn('- 打开 DevTools > Application > Service Workers，确认已注册')
        console.warn('- 运行 Lighthouse 审计查看 PWA 评分')
        console.warn('- 或直接部署到 Vercel 测试')
      }
    }, 3000)
  }
})

// 从 localStorage 加载打卡记录
function loadRecords() {
  try {
    const stored = localStorage.getItem('nfc-checkin-records')
    records.value = stored ? JSON.parse(stored) : []
  } catch (e) {
    records.value = []
  }
}

// 保存打卡记录到 localStorage
function saveRecord(type) {
  const record = {
    time: new Date().toISOString(),
    type: type, // 'in' 或 'out'
    displayTime: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  
  records.value.unshift(record)
  localStorage.setItem('nfc-checkin-records', JSON.stringify(records.value))
  
  // 触发震动反馈
  if ('vibrate' in navigator) {
    navigator.vibrate(100)
  }
  
  const typeText = type === 'in' ? '上班' : '下班'
  statusMessage.value = `✔️ ${typeText}打卡成功 ${record.displayTime}`
}

// 启动 NFC 监听
async function startNFCListener() {
  try {
    const ndef = new NDEFReader()
    
    // 请求权限并开始扫描
    await ndef.scan()
    isListening.value = true
    statusMessage.value = '📱 等待刷卡...'
    
    // 监听 NFC 读取事件
    ndef.addEventListener('reading', () => {
      handleNFCDetected()
    })
    
    // 监听错误
    ndef.addEventListener('readingerror', () => {
      statusMessage.value = '⚠️ NFC 读取错误，请重试'
      setTimeout(() => {
        if (isListening.value) {
          statusMessage.value = '📱 等待刷卡...'
        }
      }, 2000)
    })
    
  } catch (error) {
    console.error('NFC 启动失败:', error)
    
    if (error.name === 'NotAllowedError') {
      statusMessage.value = '⚠️ 需要授予 NFC 权限'
    } else {
      statusMessage.value = '⚠️ NFC 启动失败，请刷新页面重试'
    }
  }
}

// 处理 NFC 检测到的事件
function handleNFCDetected() {
  const now = new Date()
  const hour = now.getHours()
  
  // 小于 12 点为上班，否则为下班
  const type = hour < 12 ? 'in' : 'out'
  
  saveRecord(type)
  
  // 2秒后恢复等待状态
  setTimeout(() => {
    if (isListening.value) {
      statusMessage.value = '📱 等待刷卡...'
    }
  }, 2000)
}

// 按日期分组记录
const groupedRecords = computed(() => {
  const groups = {}
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  
  records.value.forEach(record => {
    const recordDate = new Date(record.time)
    
    // 只显示最近 7 天
    if (recordDate >= sevenDaysAgo) {
      const dateKey = recordDate.toLocaleDateString('zh-CN', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      })
      
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      
      groups[dateKey].push(record)
    }
  })
  
  // 转换为数组并按日期倒序排序
  return Object.keys(groups)
    .sort((a, b) => new Date(b) - new Date(a))
    .map(date => ({
      date,
      records: groups[date]
    }))
})

// 切换历史记录显示
function toggleHistory() {
  showHistory.value = !showHistory.value
}

// 安装应用
async function installApp() {
  if (!installPrompt.value) {
    console.error('❌ installPrompt 为空，安装事件未捕获')
    
    // 开发环境提示
    if (isDev.value) {
      alert('⚠️ 安装事件未触发\n\n请检查:\n1. Chrome DevTools > Application > Manifest\n2. Service Worker 是否已注册\n3. 尝试构建后访问: npm run build && npm run preview')
    }
    return
  }
  
  try {
    const result = await installPrompt.value.prompt()
    console.log('✅ 安装结果:', result.outcome)
    
    if (result.outcome === 'accepted') {
      console.log('✅ 用户接受安装')
    } else {
      console.log('❌ 用户拒绝安装')
    }
  } catch (err) {
    console.error('❌ 安装失败:', err)
  }
  
  installPrompt.value = null
  showInstallBtn.value = false
}

// 检查 PWA 安装状态
function checkPWAStatus() {
  console.log('📊 PWA 状态检查:')
  console.log('- 是否为独立模式:', window.matchMedia('(display-mode: standalone)').matches)
  console.log('- installPrompt 是否存在:', !!installPrompt.value)
  console.log('- Service Worker 状态:', navigator.serviceWorker?.controller ? '已激活' : '未激活')
}

// 开发环境：暴露到 window
if (isDev.value) {
  window.checkPWAStatus = checkPWAStatus
  console.log('💡 调试命令: window.checkPWAStatus()')
}
</script>

<template>
  <div class="app-container">
    <!-- 主界面 -->
    <div v-if="!showHistory" class="main-page">
      <div class="header">
        <h1>NFC 打卡</h1>
      </div>
      
      <div class="status-card">
        <div class="status-icon">
          {{ nfcSupported ? (isListening ? '📱' : '⚠️') : '⚠️' }}
        </div>
        <div class="status-text">{{ statusMessage }}</div>
      </div>
      
      <div v-if="nfcSupported" class="tip-card">
        <div class="tip-text">将门禁卡靠近设备背面</div>
        <div class="tip-subtext">上午刷卡记为上班 / 下午刷卡记为下班</div>
      </div>
      
      <!-- 开发环境调试面板 -->
      <div v-if="isDev" class="debug-panel">
        <div class="debug-title">🔍 PWA 调试面板</div>
        <div class="debug-item">
          <span class="debug-label">beforeinstallprompt:</span>
          <span :class="installPrompt ? 'debug-success' : 'debug-error'">
            {{ installPrompt ? '✅ 已捕获' : '❌ 未触发' }}
          </span>
        </div>
        <div class="debug-item">
          <span class="debug-label">Service Worker:</span>
          <span class="debug-info">{{ 'serviceWorker' in navigator ? '✅ 支持' : '❌ 不支持' }}</span>
        </div>
        <div class="debug-tips">
          💡 在 DevTools 中:<br>
          1. Application > Manifest 检查配置<br>
          2. Application > Service Workers 检查注册<br>
          3. Console 输入 window.checkPWAStatus()
        </div>
      </div>
      
      <button v-if="showInstallBtn" class="install-btn" @click="installApp">
        📥 安装到桌面
      </button>
      
      <button v-if="nfcSupported" class="history-btn" @click="toggleHistory">
        查看记录
      </button>
    </div>
    
    <!-- 历史记录页面 -->
    <div v-else class="history-page">
      <div class="header">
        <button class="back-btn" @click="toggleHistory">← 返回</button>
        <h1>打卡记录</h1>
      </div>
      
      <div class="history-content">
        <div v-if="groupedRecords.length === 0" class="empty-state">
          <div class="empty-icon">📝</div>
          <div class="empty-text">暂无打卡记录</div>
        </div>
        
        <div v-else class="records-list">
          <div v-for="group in groupedRecords" :key="group.date" class="date-group">
            <div class="date-header">{{ group.date }}</div>
            <div class="record-items">
              <div v-for="(record, index) in group.records" :key="index" class="record-item">
                <div class="record-type" :class="record.type === 'in' ? 'type-in' : 'type-out'">
                  {{ record.type === 'in' ? '上班' : '下班' }}
                </div>
                <div class="record-time">{{ record.displayTime }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.app-container {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: env(safe-area-inset-bottom);
}

/* 头部 */
.header {
  background: #fff;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  box-shadow: 0 1px 0 0 rgba(0, 0, 0, 0.05);
  position: relative;
}

.header h1 {
  font-size: 18px;
  font-weight: 600;
  color: #323233;
  flex: 1;
  text-align: center;
}

.back-btn {
  position: absolute;
  left: 12px;
  background: none;
  border: none;
  font-size: 16px;
  color: #1989fa;
  padding: 4px 8px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.back-btn:active {
  opacity: 0.6;
}

/* 主页面 */
.main-page {
  padding: 20px 16px;
}

/* 状态卡片 */
.status-card {
  background: #fff;
  border-radius: 12px;
  padding: 40px 20px;
  margin-top: 20px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.status-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.status-text {
  font-size: 16px;
  color: #323233;
  line-height: 1.5;
}

/* 提示卡片 */
.tip-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-top: 16px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.tip-text {
  font-size: 14px;
  color: #646566;
  margin-bottom: 8px;
}

.tip-subtext {
  font-size: 12px;
  color: #969799;
}

/* 调试面板 */
.debug-panel {
  background: #fffbe8;
  border: 1px solid #ffe58f;
  border-radius: 8px;
  padding: 12px;
  margin-top: 16px;
  font-size: 13px;
}

.debug-title {
  font-weight: 600;
  color: #d48806;
  margin-bottom: 8px;
}

.debug-item {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  border-bottom: 1px solid #fff7e6;
}

.debug-item:last-of-type {
  border-bottom: none;
  margin-bottom: 8px;
}

.debug-label {
  color: #8c8c8c;
}

.debug-success {
  color: #52c41a;
  font-weight: 500;
}

.debug-error {
  color: #ff4d4f;
  font-weight: 500;
}

.debug-info {
  color: #1890ff;
  font-weight: 500;
}

.debug-tips {
  background: #fff;
  border-radius: 4px;
  padding: 8px;
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.6;
  color: #595959;
}

/* 安装按钮 */
.install-btn {
  width: 100%;
  background: #07c160;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 14px;
  font-size: 16px;
  font-weight: 500;
  margin-top: 24px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: opacity 0.2s;
}

.install-btn:active {
  opacity: 0.8;
}

/* 查看记录按钮 */
.history-btn {
  width: 100%;
  background: #1989fa;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 14px;
  font-size: 16px;
  font-weight: 500;
  margin-top: 12px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: opacity 0.2s;
}

.history-btn:active {
  opacity: 0.8;
}

/* 历史记录页面 */
.history-page {
  min-height: 100vh;
  background: #f5f5f5;
}

.history-content {
  padding: 12px 16px;
}

/* 空状态 */
.empty-state {
  background: #fff;
  border-radius: 12px;
  padding: 60px 20px;
  text-align: center;
  margin-top: 20px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.empty-text {
  font-size: 14px;
  color: #969799;
}

/* 记录列表 */
.records-list {
  padding-top: 8px;
}

.date-group {
  margin-bottom: 20px;
}

.date-header {
  font-size: 13px;
  color: #969799;
  padding: 8px 12px;
  background: transparent;
}

.record-items {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.record-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid #f5f5f5;
}

.record-item:last-child {
  border-bottom: none;
}

.record-type {
  font-size: 15px;
  font-weight: 500;
  padding: 4px 12px;
  border-radius: 4px;
}

.type-in {
  background: #e8f8f0;
  color: #07c160;
}

.type-out {
  background: #fff3e6;
  color: #ff976a;
}

.record-time {
  font-size: 15px;
  color: #646566;
}
</style>
