# PWA 安装说明

## 已修复的问题

1. ✅ 添加了 `beforeinstallprompt` 事件监听
2. ✅ 添加了"安装到桌面"按钮
3. ✅ 替换了真实的 PNG 图标（192x192、512x512）
4. ✅ 优化了 manifest.json 配置

## 如何让 PWA 显示安装提示

Chrome 移动端显示安装提示需要满足以下条件：

### 1. HTTPS 要求
- ✅ 必须通过 HTTPS 访问（Vercel 自动提供）
- ✅ 或在 localhost 开发环境

### 2. Manifest 要求
- ✅ `name` 或 `short_name`
- ✅ `icons` 包含至少 192x192 和 512x512 的 PNG 图标
- ✅ `start_url`
- ✅ `display` 为 `standalone` 或 `fullscreen`

### 3. Service Worker 要求
- ✅ 已注册 Service Worker
- ✅ Service Worker 已激活
- ✅ 包含 `fetch` 事件处理

### 4. 参与度要求（重要！）
Chrome 需要用户与网站有一定的互动才会显示安装提示：
- 访问至少 2 次
- 两次访问间隔至少 5 分钟
- 或用户在页面上有足够的交互行为

## 测试方法

### 方法 1：手动触发（推荐）
1. 访问应用（HTTPS 环境）
2. 页面会自动捕获 `beforeinstallprompt` 事件
3. 点击页面上的"📥 安装到桌面"按钮

### 方法 2：Chrome 菜单
1. 点击 Chrome 右上角 ⋮ 菜单
2. 选择"安装应用"或"添加到主屏幕"

### 方法 3：满足参与度要求
1. 首次访问网站
2. 等待 5 分钟后再次访问
3. Chrome 会自动显示底部安装横幅

## 验证 PWA 配置

在 Chrome DevTools 中检查：
```
1. 打开 Chrome DevTools (F12)
2. 进入 Application 标签
3. 查看 Manifest 部分
4. 查看 Service Workers 部分
5. 运行 Lighthouse 审计
```

## 部署步骤

```bash
# 安装依赖
npm install

# 本地测试（需要 HTTPS 或使用 ngrok）
npm run dev

# 构建
npm run build

# 部署到 Vercel
vercel
```

## 常见问题

**Q: 为什么没有安装提示？**
A: 确保满足上述所有条件，特别是参与度要求（访问2次，间隔5分钟）

**Q: 本地开发如何测试？**
A: 使用 `npm run build && npm run preview`，然后通过 HTTPS 访问

**Q: iOS Safari 支持吗？**
A: iOS Safari 不支持标准的 PWA 安装提示，需要手动"添加到主屏幕"

**Q: 如何强制显示安装提示？**
A: 点击页面上的"📥 安装到桌面"绿色按钮
