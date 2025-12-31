<script setup>
import { ref, onMounted, computed } from 'vue'

// 状态管理
const nfcSupported = ref(false)
const isListening = ref(false)
const statusMessage = ref('初始化中...')
const showHistory = ref(false)
const records = ref([])

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
  margin-top: 24px;
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
