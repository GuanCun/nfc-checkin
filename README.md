# NFC 打卡 PWA

一个极简的 NFC 打卡工具，用于在使用公司门禁卡时自动记录上下班时间。

## 功能特性

- ✅ 自动检测 NFC 设备支持
- ✅ 刷卡自动判断上下班（12点前为上班，之后为下班）
- ✅ 本地存储打卡记录（localStorage）
- ✅ 查看最近 7 天打卡历史
- ✅ 震动反馈
- ✅ PWA 支持，可安装到桌面
- ✅ 完全响应式，适配移动端

## 技术栈

- Vue 3 (Composition API + `<script setup>`)
- Web NFC API (NDEFReader)
- Service Worker
- localStorage

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## 部署到 Vercel

1. 将项目推送到 GitHub
2. 在 Vercel 导入项目
3. Vercel 会自动识别配置并部署

或使用 Vercel CLI:

```bash
npm i -g vercel
vercel
```

## 使用说明

1. 使用支持 NFC 的 Android 设备访问应用
2. 授权 NFC 权限
3. 将门禁卡靠近设备背面
4. 自动记录打卡时间
5. 点击"查看记录"查看历史

## 注意事项

- 需要 HTTPS 环境（本地开发 localhost 除外）
- 目前仅 Android Chrome 支持 Web NFC API
- iOS 暂不支持 Web NFC API

## 许可证

MIT
