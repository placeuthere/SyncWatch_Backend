# 🎬 SyncWatch - 异地实时同步观影浏览器插件

实时同步网页视频播放，解决远程观看时的"手工喊3-2-1"同步问题。

## 📁 项目结构

```
SyncWatch/
├── src/                        # 插件源代码
│   ├── background.js          # Service Worker - Socket 连接和消息路由
│   ├── content.js             # 内容脚本 - 视频事件监听和同步
│   ├── popup.html             # 弹窗界面
│   ├── popup.js               # 弹窗逻辑
│   ├── manifest.json          # 插件声明（Manifest V3）
│   └── socket.io.min.js       # Socket.IO 库
│
├── build/                      # 构建输出目录
│   ├── chrome/                # Chrome 版本
│   └── edge/                  # Edge 版本
│
├── server.js                  # Express + Socket.io 后端服务器
├── package.json               # 依赖配置
├── build.js                   # 构建脚本
├── CLAUDE.md                  # 项目文档
└── README.md                  # 本文件
```

## 🚀 快速开始

### 本地测试

```bash
# 1. 安装依赖
npm install

# 2. 启动服务器
npm start
# 服务器运行在 http://localhost:3000

# 3. 在 Chrome 中加载插件
# - 打开 chrome://extensions/
# - 启用"开发者模式"
# - 点击"加载已解压的扩展程序"
# - 选择 src/ 目录

# 4. 测试
# - 打开两个浏览器窗口，访问同一个有 <video> 的网站
# - 分别加入房间（如 "test123"）
# - 一个窗口点播放/暂停，另一个应该同步响应
```

## 🔨 构建发布版本

```bash
# 开发版本（本地服务器）
node build.js development

# 生产版本（需要先修改 build.js 中的 SERVER_URL）
node build.js production
```

构建完成后，会生成：
- `build/chrome/` - Chrome 版本（可直接加载或打包上架）
- `build/edge/` - Edge 版本（可直接加载或打包上架）

## 📦 打包为 .zip

```bash
# Windows - 使用 7-Zip 或其他压缩工具
# 或者用 PowerShell
cd build/chrome
Compress-Archive -Path . -DestinationPath ../SyncWatch-Chrome.zip
cd ../edge
Compress-Archive -Path . -DestinationPath ../SyncWatch-Edge.zip
```

## 🌐 上架流程

### Chrome Web Store
1. 创建 [Google 开发者账号](https://chrome.google.com/webstore/devconsole) （$5）
2. 上传 `build/chrome/` 的 .zip 文件
3. 填写应用信息、截图、隐私政策
4. 提交审核（1-3 天）

### Microsoft Edge Add-ons
1. 创建 [Microsoft 开发者账号](https://partner.microsoft.com/en-us/dashboard) （$19）
2. 上传 `build/edge/` 的 .zip 文件
3. 填写应用信息
4. 提交审核（1-3 天）

## 🔑 关键配置

### 修改服务器地址

编辑 `build.js` 中的服务器地址：

```javascript
const SERVER_URL = mode === 'production'
  ? 'https://your-server-url.com'  // ← 改这里
  : 'http://localhost:3000';
```

然后重新构建：
```bash
node build.js production
```

## ✨ 功能特性

- ✅ 实时视频同步（play/pause/seek）
- ✅ 自动进度校正（5秒心跳检测）
- ✅ 缓冲状态同步
- ✅ 链接分享邀请
- ✅ 支持标准 HTML5 `<video>` 标签
- ✅ Manifest V3 安全架构

## ⚙️ 技术栈

- **后端**: Express.js + Socket.io
- **前端**: Vanilla JavaScript
- **插件**: Chrome Extension Manifest V3
- **通信**: WebSocket (Socket.io)

## 📋 支持的视频网站

支持任何使用标准 HTML5 `<video>` 标签的网站：
- ✅ 自建网站
- ✅ W3Schools / MDN 示例
- ✅ HTML5 视频教程网站

不支持（使用自定义播放器）：
- ❌ YouTube（自定义播放器）
- ❌ Bilibili（自定义播放器）
- ❌ Netflix（DRM 限制）

## 🐛 常见问题

### "连接失败"
- 检查后端服务器是否运行：`npm start`
- 检查服务器地址配置是否正确
- 检查防火墙是否阻止 WebSocket

### "没有捕获到视频"
- 确认网站使用的是标准 `<video>` 标签（右键检查）
- 刷新页面并检查 Console 中是否有 `[一起看] 间谍脚本已成功加载！`

### "只能同步本浏览器内的标签页"
- 这是正常行为，一个浏览器只有一个 Socket 连接
- 要跨设备同步，需要打开不同的浏览器窗口或在不同设备上运行

## 📝 隐私政策（参考模板）

```
SyncWatch 插件隐私政策

本插件仅：
1. 监听网页中的 <video> 元素事件
2. 通过 WebSocket 将播放控制事件发送到服务器
3. 接收来自服务器的同步命令并应用到本地视频

本插件不会：
- 收集用户浏览历史
- 上传视频内容
- 保存用户数据
- 访问其他个人信息

您可以随时在浏览器扩展设置中禁用或卸载本插件。
```

## 📞 联系方式

如有问题或建议，请在 GitHub issues 中反馈。

---

**当前版本**: 1.0.0  
**最后更新**: 2026-05-08  
**许可证**: MIT
