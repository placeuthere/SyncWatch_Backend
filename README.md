# SyncWatch 异地同步观影工具

> 让你和朋友在异地也能完全同步观看视频。无需复杂配置，只需输入房间 ID 就能开始。

一个轻量级的浏览器扩展，解决远程观看视频时的"手工喊 3-2-1"同步问题。支持 Chrome、Edge 以及所有 Chromium 内核浏览器。

## ✨ 功能特性

- **🎬 实时同步** — 播放、暂停、拖动进度完全同步，毫秒级延迟
- **🔄 自动校正** — 检测到进度漂移（>2秒）自动调整
- **🌐 多浏览器** — Chrome、Edge、Chromium 内核浏览器均完全支持
- **🚀 简单易用** — 无需账号，只需房间 ID（任意字符串）
- **🔗 URL 分享** — 一键分享当前观看链接给房间内其他用户
- **🎯 智能检测** — 自动检测网页上的视频元素，支持 HTML5 视频网站

## 📖 使用指南

### 🔧 安装扩展

#### Chrome 用户

1. **打开扩展管理页面**
   ```
   chrome://extensions/
   ```

2. **启用开发者模式** — 右上角打开"开发者模式"开关

3. **加载扩展** — 点击"加载已解压的扩展"，选择 `extension` 文件夹

4. **确认安装** — 扩展图标应该出现在工具栏中

#### Edge 用户

1. 打开 `edge://extensions/`
2. 启用"开发者模式"
3. 点"加载已解压的扩展"，选择 `extension` 文件夹

### 📺 开始观看

**第一步：加入房间**
1. 点击浏览器工具栏的 SyncWatch 图标
2. 输入房间 ID（如：`room123`、`movie-night` 等）
3. 点"加入房间"

**第二步：邀请朋友**
- 告诉朋友相同的房间 ID
- 或点"分享当前链接"一键邀请

**第三步：开始同步**
- 打开同一个视频网站
- 你的所有操作（播放、暂停、拖动）会实时同步给朋友
- 进度漂移时会自动校正

### 🎬 支持的网站

✅ **支持（使用标准 HTML5 `<video>` 标签）**
- YouTube
- B站（哔哩哔哩）
- Netflix
- Vimeo
- 本地 HTML5 视频
- 大多数视频流媒体平台

❌ **不支持（使用自定义播放器）**
- 某些视频网站的防截屏播放器

## ⚙️ 本地开发

### 项目结构

```
SyncWatch/
├── extension/              # 浏览器扩展（直接加载）
│   ├── manifest.json      # 扩展声明 (Manifest V3)
│   ├── background.js      # Service Worker
│   ├── content.js         # 内容脚本（注入到网页）
│   ├── popup.html/js      # 用户界面
│   └── socket.io.min.js   # Socket.IO 库
│
├── server.js              # Node.js + Express + Socket.io 后端
├── package.json           # 依赖配置
├── CLAUDE.md              # 技术文档
└── README.md              # 本文件
```

### 快速开始（开发模式）

**1. 安装依赖**
```bash
npm install
```

**2. 启动本地服务器**
```bash
npm start
```
服务器运行在 `http://localhost:3000`

**3. 修改扩展配置（可选）**

如果不使用默认服务器，编辑 `extension/background.js` 第 9 行：
```javascript
const SERVER_URL = 'http://localhost:3000';  // 改成你的服务器地址
```

**4. 加载扩展到浏览器**
- Chrome: `chrome://extensions/` → 加载已解压的扩展 → 选择 `extension/` 文件夹
- Edge: `edge://extensions/` → 加载已解压的扩展 → 选择 `extension/` 文件夹

**5. 测试**
- 打开两个浏览器窗口
- 访问同一个有 `<video>` 的网站
- 分别在扩展中输入相同的房间 ID
- 一个窗口点播放/暂停，另一个应该同步响应

## 🚀 远程部署（Vercel）

### 部署后端服务

1. **推送代码到 GitHub**
   ```bash
   git push origin main
   ```

2. **在 Vercel 部署**
   - 访问 [vercel.com](https://vercel.com)
   - 用 GitHub 登录，连接你的仓库
   - 自动部署完成

3. **更新扩展配置**

   编辑 `extension/background.js`，改第 9 行为你的 Vercel URL：
   ```javascript
   const SERVER_URL = 'https://your-vercel-deployment.vercel.app';
   ```

4. **重新加载扩展**
   - 在 `chrome://extensions/` 中点刷新按钮

## ❓ 常见问题

**Q: 为什么看不到扩展图标？**
- 检查是否成功加载（在 `chrome://extensions/` 中确认状态为"已启用"）
- 扩展图标可能在浏览器工具栏的拼图按钮后面，点击并固定到工具栏

**Q: 加入房间后仍显示"未连接"？**
- 检查网络连接
- 确保房间 ID 输入正确
- 检查是否有代理/VPN 阻止了 WebSocket 连接

**Q: 视频不同步怎么办？**
- 检查双方网络延迟
- 手动点击视频进度条同步，或等待自动校正（5秒内）
- 确认网站使用标准 `<video>` 标签

**Q: 支持多少人同时观看？**
- 理论上无限制
- 推荐 2-10 人（超过 10 人可能出现延迟）
- 可以创建多个房间分散用户

**Q: 如何离开房间？**
- 点扩展图标 → 点"离开房间"按钮

**Q: 房间信息会被保存吗？**
- 房间 ID 保存在本地浏览器，不会上传到服务器
- 关闭浏览器后再打开时会自动恢复连接
- 其他人无法看到你的房间 ID

## 🛡️ 隐私和安全

- **无账号注册** — 完全匿名，无需提供任何个人信息
- **无数据存储** — 服务器不保存任何视频历史或用户数据
- **房间隔离** — 不同房间的用户互相独立
- **开源透明** — 代码完全开源，可自行部署

## 📝 自部署服务器

不信任默认服务器？可以自己部署到：

**支持的云平台：**
- Vercel（推荐，免费）
- Railway
- Heroku
- 任何支持 Node.js 的服务器

**本地部署：**
```bash
npm install
npm start
# 服务器运行在 http://localhost:3000
```

然后修改 `extension/background.js` 中的 `SERVER_URL` 指向你的服务器。

## 🔧 技术栈

- **前端** — Chrome Extension Manifest V3，Vanilla JavaScript
- **后端** — Node.js + Express.js
- **通信** — Socket.io (WebSocket)
- **部署** — Vercel、Railway 或自部署

## 📊 项目状态

- ✅ Chrome 和 Edge 扩展完全可用
- ✅ 实时视频同步功能正常
- ✅ Vercel 部署完成
- 🚀 内测阶段中...

## 🐛 报告问题

遇到问题？提交 Issue：
```
https://github.com/placeuthere/SyncWatch_Backend/issues
```

请包含：
1. 浏览器和版本
2. 操作系统
3. 问题描述和复现步骤
4. 浏览器控制台错误（F12）

## 🤝 贡献

欢迎贡献代码、报告问题或提出建议！

## 📄 许可证

MIT License — 可自由使用和修改

---

**版本:** 1.0.0  
**更新时间:** 2026-05-08  
**维护者:** SyncWatch Team

**想了解技术细节？** 查看 [CLAUDE.md](./CLAUDE.md)
