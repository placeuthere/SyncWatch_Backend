console.log('[一起看] Background Service Worker 已启动！');

/**
 * Service Worker：直接维持 Socket.io 连接，路由所有消息
 */

importScripts('socket.io.min.js');

const SERVER_URL = 'http://localhost:3000';
let currentRoomId = null;
let socket = null;
let heartbeatTimer = null;

function startHeartbeat() {
  if (heartbeatTimer) return;
  heartbeatTimer = setInterval(() => {
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.id == null) return;
        chrome.tabs.sendMessage(
          tab.id,
          { type: 'REQUEST_PROGRESS' },
          (response) => {
            if (chrome.runtime.lastError || !response) return;
            const payload = {
              currentTime: response.currentTime,
              duration: response.duration,
              paused: response.paused,
              src: response.src
            };
            if (socket?.connected && currentRoomId) {
              socket.emit('progress-heartbeat', payload);
            }
          }
        );
      });
    });
  }, 5000);
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

function connectSocket() {
  if (socket?.connected) return socket;
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  console.log('尝试连接服务器...');
  socket = io(SERVER_URL, {
    transports: ['websocket'],
    upgrade: false
  });
  socket.on('connect', () => {
    console.log('✅ 已成功连接服务器！ID:', socket.id);
    if (currentRoomId) socket.emit('join room', currentRoomId);
  });
  socket.on('connect_error', (err) => {
    console.error('❌ 连接失败原因:', err);
  });
  socket.on('video-control', (payload) => {
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.id == null) return;
        chrome.tabs.sendMessage(tab.id, { type: 'SYNC_VIDEO', payload }).catch(() => {});
      });
    });
  });
  socket.on('url-share', (payload) => {
    if (!payload || !payload.url) return;
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.id == null) return;
        chrome.tabs.sendMessage(tab.id, { type: 'URL_SHARE_INVITE', payload }).catch(() => {});
      });
    });
  });
  socket.on('progress-heartbeat', (payload) => {
    if (!payload || typeof payload.currentTime !== 'number') return;
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.id == null) return;
        chrome.tabs.sendMessage(tab.id, { type: 'CHECK_PROGRESS_DRIFT', payload }).catch(() => {});
      });
    });
  });
  socket.on('buffer-status', (payload) => {
    if (!payload || !payload.state) return;
    const action = payload.state === 'buffering' ? 'pause' : 'play';
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.id == null) return;
        chrome.tabs.sendMessage(tab.id, { type: 'BUFFER_SYNC', payload: { action } }).catch(() => {});
      });
    });
  });
  socket.on('disconnect', () => console.log('[一起看] Socket 已断开'));
  return socket;
}

function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[一起看] background 收到消息:', message?.type ?? message?.action, message);

  if (message?.type === 'user-action') {
    const payload = message.payload;
    if (payload != null) {
      if (socket?.connected) {
        socket.emit('video-control', payload);
        console.log('[一起看] 已转发 user-action 到服务器:', payload?.event);
      }
      // 同浏览器多窗口：服务器只会发给「其他 socket」，本机只有一个 socket，所以同时转发给本机其他标签页（排除发送者）
      const senderTabId = sender.tab?.id;
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
          if (tab.id != null && tab.id !== senderTabId) {
            chrome.tabs.sendMessage(tab.id, { type: 'SYNC_VIDEO', payload }).catch(() => {});
          }
        });
      });
    }
    sendResponse({ ok: true });
    return true;
  }
  if (message?.type === 'VIDEO_STATE') {
    console.log('[一起看] 视频状态:', message.payload);
    sendResponse({ ok: true });
    return true;
  }
  if (message?.action === 'get_connection_state') {
    sendResponse({
      connected: currentRoomId != null,
      roomId: currentRoomId || undefined
    });
    return false;
  }
  if (message?.action === 'join_room') {
    const roomId = (message.roomId || '').trim();
    if (!roomId) {
      sendResponse({ success: false });
      return false;
    }
    currentRoomId = roomId;
    connectSocket();
    if (socket?.connected) {
      socket.emit('join room', roomId);
    }
    startHeartbeat();
    sendResponse({ success: true, roomId });
    return false;
  }
  if (message?.action === 'leave_room') {
    currentRoomId = null;
    disconnectSocket();
    stopHeartbeat();
    sendResponse({ success: true });
    return false;
  }
  if (message?.action === 'share_url') {
    const url = (message.url || '').trim();
    const title = message.title || url;
    const senderTabId = message.tabId;
    if (!url) {
      sendResponse({ ok: false, message: '无效的链接' });
      return false;
    }
    const payload = { url, title };
    if (socket?.connected && currentRoomId) {
      socket.emit('url-share', payload);
      console.log('[一起看] 已通过 Socket 分享链接:', url);
    } else {
      console.log('[一起看] 尚未连接服务器或未加入房间，无法通过 Socket 分享链接');
    }
    // 本机浏览器内也弹出邀请（排除自己当前分享的 tab）
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.id == null) return;
        if (senderTabId != null && tab.id === senderTabId) return;
        chrome.tabs.sendMessage(tab.id, { type: 'URL_SHARE_INVITE', payload }).catch(() => {});
      });
    });
    sendResponse({ ok: true });
    return false;
  }
  if (message?.type === 'buffer-status') {
    const payload = message.payload;
    if (payload && payload.state) {
      if (socket?.connected && currentRoomId) {
        socket.emit('buffer-status', payload);
      }
      const action = payload.state === 'buffering' ? 'pause' : 'play';
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
          if (tab.id == null) return;
          chrome.tabs.sendMessage(tab.id, { type: 'BUFFER_SYNC', payload: { action } }).catch(() => {});
        });
      });
    }
    sendResponse({ ok: true });
    return true;
  }
  return true;
});
