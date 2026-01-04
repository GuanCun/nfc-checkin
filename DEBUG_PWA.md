# 开发环境 PWA 安装调试指南

## 🔍 为什么开发环境看不到安装弹窗？

在 **开发环境（npm run dev）** 中，`beforeinstallprompt` 事件通常**不会自动触发**，原因如下：

### 1. Service Worker 未正确注册
- Vite 开发服务器默认不处理 Service Worker
- 需要构建后才能正确加载 `/sw.js`

### 2. Chrome 的安装条件
- 需要 **HTTPS**（开发环境 localhost 除外）
- Manifest 必须有效
- Service Worker 必须已注册且激活
- 用户参与度要求（访问2次，间隔5分钟）

## ✅ 解决方案

### 方法 1：使用生产构建预览（推荐）

```bash
cd /home/guan/project/demo/nfc-checkin

# 1. 构建项目
npm run build

# 2. 预览构建结果
npm run preview

# 3. 访问显示的地址（通常是 http://localhost:4173）
```

此时你会看到：
- ✅ Service Worker 已注册
- ✅ `beforeinstallprompt` 事件会触发
- ✅ 页面显示"📥 安装到桌面"按钮

### 方法 2：使用 Chrome DevTools 手动触发

即使在开发环境，也可以手动安装：

1. 打开 Chrome DevTools（F12）
2. 进入 **Application** 标签
3. 左侧选择 **Manifest**
4. 检查是否有错误
5. 点击页面上方的 **"安装"** 链接（如果可用）

### 方法 3：部署到 Vercel 测试

```bash
# 部署到 Vercel
npm run build
vercel

# 访问 Vercel 提供的 HTTPS 地址
```

在 Vercel 上，所有 PWA 功能都会正常工作。

## 🐛 当前版本的调试功能

我已经添加了开发环境调试面板，访问应用时会看到：

### 页面上的调试面板（仅开发环境显示）
```
🔍 PWA 调试面板
beforeinstallprompt: ✅ 已捕获 / ❌ 未触发
Service Worker: ✅ 支持 / ❌ 不支持

💡 在 DevTools 中:
1. Application > Manifest 检查配置
2. Application > Service Workers 检查注册
3. Console 输入 window.checkPWAStatus()
```

### Console 日志
打开浏览器控制台，你会看到：
```javascript
🔍 PWA 配置检查:
- Service Worker 支持: true
- beforeinstallprompt 监听已设置

// 3秒后如果未触发：
⚠️ beforeinstallprompt 未触发，可能原因:
1. 已安装该 PWA
2. 不满足安装条件（需 HTTPS 或已注册 SW）
3. 用户参与度不足（需访问2次，间隔5分钟）
4. 在开发环境中，Chrome 可能不会自动触发

💡 解决方案:
- 打开 DevTools > Application > Manifest，检查配置
- 打开 DevTools > Application > Service Workers，确认已注册
- 运行 Lighthouse 审计查看 PWA 评分
- 或直接部署到 Vercel 测试
```

### 调试命令
在浏览器控制台输入：
```javascript
window.checkPWAStatus()
```

会显示：
```
📊 PWA 状态检查:
- 是否为独立模式: false
- installPrompt 是否存在: false
- Service Worker 状态: 未激活
```

## 📋 完整测试流程

### Step 1: 检查当前状态
```bash
cd /home/guan/project/demo/nfc-checkin
npm run dev
```

打开浏览器控制台查看日志。

### Step 2: 构建并预览
```bash
# Ctrl+C 停止开发服务器
npm run build
npm run preview
```

### Step 3: 检查 DevTools
1. F12 打开开发者工具
2. Application > Manifest
   - 查看是否有 ⚠️ 警告
3. Application > Service Workers
   - 应该显示 "activated and is running"
4. Network 标签
   - 刷新页面，查看 `/sw.js` 是否成功加载（状态码 200）

### Step 4: 触发安装
- **如果页面显示"📥 安装到桌面"按钮** → 点击它
- **如果没有按钮** → Chrome 地址栏右侧应该有安装图标 ➕
- **如果都没有** → DevTools Application 标签顶部可能有"安装"链接

## 🚨 常见问题

### Q: 预览模式也看不到安装按钮？
A: 可能已经安装过了。卸载步骤：
1. Chrome 地址栏输入 `chrome://apps`
2. 找到"NFC 打卡"，右键 → 删除
3. 刷新页面重试

### Q: Service Worker 显示"waiting to activate"？
A: 
1. DevTools > Application > Service Workers
2. 勾选 "Update on reload"
3. 点击 "skipWaiting"

### Q: Manifest 显示错误？
A: 检查控制台具体错误，通常是图标路径问题

### Q: 手机上测试？
A: 
1. 确保手机和电脑在同一网络
2. `npm run preview` 启动服务器
3. 查看终端显示的 Network 地址（如 `http://192.168.x.x:4173`）
4. 手机浏览器访问该地址
5. **注意**: 手机上需要 HTTPS，建议直接部署到 Vercel

## ✅ 验证安装成功

安装成功后：
1. 浏览器地址栏不再显示安装图标
2. 调试面板消失（生产环境不显示）
3. 可以在桌面/应用列表找到"NFC 打卡"
4. 打开应用时是独立窗口，没有浏览器地址栏

## 🎯 推荐工作流

**日常开发**: 
```bash
npm run dev  # 快速热更新
```

**测试 PWA 功能**: 
```bash
npm run build && npm run preview  # 完整功能测试
```

**正式部署**: 
```bash
vercel  # 或推送到 GitHub 自动部署
```
