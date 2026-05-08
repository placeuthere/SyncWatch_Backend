# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**SyncWatch** 是一个异地同步观影工具。两个用户通过浏览器插件连接到同一个"房间"，实时同步网页视频的播放/暂停/拖动进度。特别是解决打视频通话保证语音实时，但因手工喊"3-2-1"同步视频造成的误差问题。

## Project Structure

```
SyncWatch/
├── server.js           # Express + Socket.io 服务器
├── package.json        # Node.js 依赖
├── extension/          # 浏览器插件（Chrome Extension MV3）
│   ├── manifest.json
│   ├── popup.html
│   ├── popup.js
│   ├── content.js
│   ├── background.js
│   └── lib/
│       └── socket.io.min.js
└── CLAUDE.md          # 本文件
```

## Quick Start

### 启动服务器

```bash
npm start
```

服务器监听 `http://localhost:3000`（或由 `PORT` 环境变量指定）。

### 加载浏览器插件

1. 打开 Chrome → 访问 `chrome://extensions/`
2. 启用"开发者模式"（右上角）
3. 点击"加载已解压的扩展"
4. 选择本项目的 `extension/` 目录

## Architecture

### 服务端（server.js）

Express + Socket.io 实现房间广播服务：

**核心特性：**
- **房间管理**：客户端通过 `join room` 事件加入指定房间（roomId 为字符串）
- **事件广播**：服务器接收来自一个客户端的事件，转发给**同房间的其他客户端**（不包括发送者）
- **无状态**：服务器不保存视频播放状态，只作消息中转

**支持的事件：**

| 事件 | 方向 | 载荷说明 |
|------|------|---------|
| `join room` | 客户端 → 服务器 | `roomId` (string) |
| `video-control` | 双向 | `{ event: 'play'\|'pause'\|'seek', currentTime?: number }` |
| `url-share` | 双向 | `{ url: string }` |
| `progress-heartbeat` | 双向 | `{ currentTime: number }` — 定期心跳保活 |
| `buffer-status` | 双向 | `{ state: 'buffering'\|'ready' }` |

### 浏览器插件（extension/）

**整体流程：**

```
用户A点击插件 → popup输入房间ID
    ↓
popup.js 发送消息给 background.js
    ↓
background.js 连接Socket.io并加入房间
    ↓
content.js 检测页面<video>元素，监听用户交互
    ↓
用户操作视频(play/pause/seek)
    ↓
content.js 捕获事件 → 发送 video-control
    ↓
服务器广播给房间其他成员
    ↓
用户B的content.js接收 → 应用到本地视频
```

**各模块职责：**

- **manifest.json** — 插件声明（权限、脚本注入规则、后台脚本）
- **popup.html/js** — 用户界面，输入服务器地址和房间ID，状态显示
- **background.js** — Service Worker，维护 Socket.io 长连接，管理房间状态
- **content.js** — 内容脚本，注入到网页中，拦截video事件，同步/应用播放状态

**关键实现细节：**

1. **防事件循环** — 当程序应用远程命令到video时，用`isSyncing`标志阻止再次广播
   ```javascript
   // 伪代码
   isSyncing = true;
   video.currentTime = payload.currentTime;
   setTimeout(() => { isSyncing = false; }, 100);
   ```

2. **视频检测** — `document.querySelector('video')` 获取第一个视频元素（支持大多数HTML5视频网站）

3. **连接管理** — Socket.io连接在background.js维护，即使用户切换标签也保持连接

4. **消息通道** — popup ↔ content ↔ background 通过 `chrome.runtime.sendMessage` 通信

## Development

### 本地测试

1. 启动服务：`npm start`
2. 在Chrome中加载 `extension/` 目录
3. 打开两个浏览器窗口，访问同一视频网站（例如Bilibili、YouTube等HTML5视频）
4. 分别点击插件图标，输入相同房间ID加入
5. 在一个窗口操作视频（play/pause/seek） → 观察另一窗口是否同步

### 调试

- **popup调试** — 在 `chrome://extensions/` 中点击"背景页面"查看控制台
- **content脚本调试** — 在网页上右键"检查" → Sources标签中找`content.js`
- **服务器日志** — 终端查看Socket.io连接和事件日志（Chinese注释）

### 常见问题

- **视频不同步** — 检查是否正确选择了`<video>`元素；某些视频平台可能有自定义播放器，需适配
- **连接断开** — 检查服务器是否运行，防火墙是否阻止websocket
- **事件重复** — 检查 `isSyncing` 标志是否正确设置

## Socket.io Events Protocol

### 客户端 → 服务器

**加入房间：**
```javascript
socket.emit('join room', '房间ID');
```

**发送视频控制：**
```javascript
socket.emit('video-control', {
  event: 'play' | 'pause' | 'seek',
  currentTime: 123.45  // 可选，仅seek时需要
});
```

### 服务器 → 客户端

**接收视频控制（来自房间其他成员）：**
```javascript
socket.on('video-control', (payload) => {
  // payload = { event, currentTime }
});
```

**接收进度心跳：**
```javascript
socket.on('progress-heartbeat', (payload) => {
  // payload = { currentTime: number }
});
```

## Server Configuration

**环境变量：**
- `PORT` — 服务器监听端口，默认3000

**Socket.io配置（server.js）：**
- **CORS** — `origin: true`，允许任何来源
- **传输方式** — WebSocket + 长轮询（polling），支持自动升级
- **EIO3** — 启用Engine.IO v3向后兼容

## Important Notes

1. **无认证机制** — 当前实现无用户认证，任何人知道房间ID都可加入；未来可扩展JWT认证
2. **视频元素检测** — 仅支持标准 `<video>` 标签；YouTube/Bilibili等自定义播放器需单独适配
3. **延迟** — 依赖网络延迟，通常百毫秒级，可通过`progress-heartbeat`心跳保持同步
4. **多房间** — 一个客户端可同时加入多个房间；事件会转发到所有房间

---

## 当前进展 (2026-05-08)

### ✅ 已实现
- [x] Socket.io服务器 (server.js) - 房间广播功能正常
- [x] Chrome扩展框架 (Manifest V3) - 精简版，无offscreen
- [x] popup UI - 房间管理、快速分享链接
- [x] content.js - video事件检测 (play/pause/seeking)
- [x] background.js - 直接维持Socket.io连接（Service Worker中）
- [x] 视频同步机制 - WeakMap防止事件循环
- [x] progress heartbeat - 5秒心跳保持同步，自动修正>2s的进度漂移
- [x] 缓冲状态同步 - waiting/playing事件转发
- [x] URL分享邀请 - Toast通知、点击加入链接
- [x] Edge浏览器兼容性 - Manifest V3在Edge上完全可用
- [x] Git版本管理 - 初始化仓库并推送到GitHub
- [x] Vercel部署 - 后端服务成功部署到Vercel（https://sync-watch-backend-zola-s-projects.vercel.app）
- [x] 内测阶段 - 代码可直接分发给朋友内测，无需上线应用商店

### 🎯 为什么之前的版本不工作

**架构问题**：之前版本使用了 offscreen.html 来绕过 Service Worker 的 CSP 限制维持 Socket 连接，导致：
1. **三层通信延迟** - popup → background → offscreen → socket，状态同步复杂
2. **时序问题** - offscreen 连接与 background 状态更新的时序不确定，经常"加入成功但显示未加入"
3. **消息路由混乱** - 多个 onMessage 监听器相互干扰，导致"Unknown action"错误
4. **视频同步失败** - 消息路由链条太长，某些消息在转发中丢失或格式错误

**成功版本的设计**：
- **直接在 background.js 中维持 Socket**：`importScripts('socket.io.min.js')` 绕过 CSP
- **两层通信**：popup ↔ background ↔ socket，简洁清晰
- **无偏差同步**：WeakMap 按视频元素存储标志，100% 避免事件循环
- **自动校正**：progress-heartbeat 心跳每 5s 检查，漂移超过 2s 自动 seek

### 🏗️ 当前架构

```
popup.html/js
    ↓ action: 'join_room'/'leave_room'/'share_url'
background.js (Service Worker)
    ↓ 直接维持 Socket.io 连接
    ↓ socket.emit('video-control') / socket.on('video-control')
    ↓ chrome.tabs.sendMessage 转发给 content.js
content.js
    ↓ 监听 video play/pause/seeking/waiting/playing
    ↓ 检查 remoteActionFlags 防事件循环
    ↓ 应用远程 sync，显示 URL 分享 toast
server.js
    ↓ 房间广播 video-control/url-share/progress-heartbeat/buffer-status
```

### 📝 技术细节

**事件防循环（WeakMap方案）**：
```javascript
const remoteActionFlags = new WeakMap();

function applySyncToVideo(video, payload) {
  setRemoteAction(video, true);  // 标记为远程操作
  try {
    // 应用到video（play/pause/seek）
  } finally {
    setTimeout(() => setRemoteAction(video, false), 0);  // 异步清除，避免同步事件
  }
}

function sendUserAction(eventType) {
  if (getIsRemoteAction(video)) return;  // 远程操作，不回传
  // 本地操作，发送到background
}
```

**自动进度校正**：
- background 每 5s 发送 `progress-heartbeat` 心跳
- content.js 接收后检查本地播放进度 vs 远程进度
- 差值 > 2s 时自动 seek 到远程进度（可能是对方暂停/缓冲导致的延迟）

---

## 最近修复与改进 (Session 2026-05-08 后期)

### 问题排查与修复

1. **content.js 文件污染**
   - 问题：content.js 包含了两个版本的代码（新旧混合），导致脚本加载失败
   - 解决：重写了一个干净、简洁的 content.js 版本，保留所有核心功能，去除冗余代码
   - 结果：视频检测和同步恢复正常

2. **socket.io.min.js 加载失败**
   - 问题：CSP 限制导致 importScripts 无法加载本地文件
   - 解决：从 CDN 下载正确版本（v4.7.5）到 extension 目录
   - 结果：WebSocket 连接成功建立

3. **服务器地址配置**
   - 从 `http://localhost:3000` → `https://sync-watch-backend-zola-s-projects.vercel.app`
   - 支持远程部署和内网测试两种模式

### 部署流程

**本地开发测试**：
```bash
npm start                    # 启动本地服务器
# 在 chrome://extensions 加载 extension 文件夹
```

**远程部署（Vercel）**：
1. 推送代码到 GitHub：https://github.com/placeuthere/SyncWatch_Backend
2. 在 Vercel 中连接 GitHub 仓库，自动部署
3. 修改 `extension/background.js` 中的 `SERVER_URL` 指向 Vercel 实例
4. 打包 `extension/` 文件夹分发给朋友

**朋友使用步骤**：
1. 下载并解压 `extension.zip`
2. 打开 Chrome/Edge，访问 `chrome://extensions/` 或 `edge://extensions/`
3. 启用"开发者模式"，加载已解压的扩展
4. 输入房间 ID，加入房间
5. 打开同一个视频网站，实时同步播放

### 兼容性测试结果

- ✅ Chrome/Chromium - 完全支持
- ✅ Microsoft Edge - 完全支持（Manifest V3 兼容）
- ✅ 本地 HTML5 视频 - 正常
- ✅ YouTube/B站等网站 - 支持标准 `<video>` 标签的网站
- ⚠️ Vercel 部署 - 适合小规模内测（2-10 用户），大规模可考虑 Railway/Heroku
