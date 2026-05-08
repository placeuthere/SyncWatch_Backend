/**
 * Content Script: 监听页面 <video> 元素的播放状态
 * 将用户操作转发给 background.js，接收远程命令并应用到视频
 */

console.log('%c [一起看] 间谍脚本已成功加载！', 'color: white; background: green; padding: 5px;');

const remoteActionFlags = new WeakMap();

function getIsRemoteAction(video) {
  return remoteActionFlags.get(video) === true;
}

function setRemoteAction(video, value) {
  remoteActionFlags.set(video, value);
}

function applySyncToVideo(video, payload) {
  if (!video || !payload) return;
  setRemoteAction(video, true);
  try {
    if (payload.event === 'play') {
      video.play().catch(() => {});
    } else if (payload.event === 'pause') {
      video.pause();
    } else if (payload.event === 'seeking' && typeof payload.currentTime === 'number') {
      video.currentTime = payload.currentTime;
    }
  } finally {
    setTimeout(() => setRemoteAction(video, false), 0);
  }
}

function setupVideoListener(video) {
  if (video.dataset.syncWatchBound === 'true') return;
  video.dataset.syncWatchBound = 'true';
  console.log('[一起看] 发现视频元素，设置监听器');

  function sendUserAction(eventType) {
    if (!chrome.runtime?.id) return;
    if (getIsRemoteAction(video)) return;
    try {
      const payload = {
        event: eventType,
        playing: !video.paused,
        currentTime: video.currentTime,
        duration: video.duration,
        src: video.src || video.currentSrc
      };
      chrome.runtime.sendMessage({ type: 'user-action', payload });
      console.log('[一起看] 发送用户操作:', eventType);
    } catch (err) {
      console.log('[一起看] 发送失败:', err);
    }
  }

  video.addEventListener('play', () => {
    console.log('[一起看] 捕获到: play');
    sendUserAction('play');
  });

  video.addEventListener('pause', () => {
    console.log('[一起看] 捕获到: pause');
    sendUserAction('pause');
  });

  video.addEventListener('seeking', () => {
    console.log('[一起看] 捕获到: seeking');
    sendUserAction('seeking');
  });

  video.addEventListener('waiting', () => {
    if (!chrome.runtime?.id) return;
    try {
      chrome.runtime.sendMessage({
        type: 'buffer-status',
        payload: {
          state: 'buffering',
          currentTime: video.currentTime
        }
      });
    } catch (err) {}
  });

  video.addEventListener('playing', () => {
    if (!chrome.runtime?.id) return;
    try {
      chrome.runtime.sendMessage({
        type: 'buffer-status',
        payload: {
          state: 'playing',
          currentTime: video.currentTime
        }
      });
    } catch (err) {}
  });
}

function init() {
  console.log('[一起看] 初始化中...');
  document.querySelectorAll('video').forEach(setupVideoListener);

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((m) => {
      m.addedNodes.forEach((node) => {
        if (node.nodeType !== 1) return;
        if (node.nodeName === 'VIDEO') setupVideoListener(node);
        if (node.querySelectorAll) node.querySelectorAll('video').forEach(setupVideoListener);
      });
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
  console.log('[一起看] 初始化完成，监听 DOM 变化');
}

if (document.body) {
  init();
} else {
  document.addEventListener('DOMContentLoaded', init);
}

// 处理来自 background 的消息
chrome.runtime.onMessage.addListener((message) => {
  if (!chrome.runtime?.id) return;

  if (message?.type === 'REQUEST_PROGRESS') {
    const videos = document.querySelectorAll('video');
    if (!videos.length) return;
    const v = videos[0];
    return {
      currentTime: v.currentTime,
      duration: v.duration,
      paused: v.paused,
      src: v.src || v.currentSrc
    };
  }

  if (message?.type === 'SYNC_VIDEO' && message.payload) {
    const videos = document.querySelectorAll('video');
    if (videos.length) {
      console.log('[一起看] 收到远程同步:', message.payload.event);
      applySyncToVideo(videos[0], message.payload);
    }
    return;
  }

  if (message?.type === 'URL_SHARE_INVITE' && message.payload) {
    showUrlInviteToast(message.payload);
    return;
  }

  if (message?.type === 'CHECK_PROGRESS_DRIFT' && message.payload) {
    const videos = document.querySelectorAll('video');
    if (!videos.length) return;
    const v = videos[0];
    const remoteTime = message.payload.currentTime;
    if (typeof remoteTime !== 'number') return;
    const diff = v.currentTime - remoteTime;
    if (diff > 2) {
      console.log('[一起看] 检测到进度漂移，自动校正');
      applySyncToVideo(v, { event: 'seeking', currentTime: remoteTime });
    }
    return;
  }

  if (message?.type === 'BUFFER_SYNC' && message.payload) {
    const videos = document.querySelectorAll('video');
    if (!videos.length) return;
    const v = videos[0];
    const action = message.payload.action;
    if (action === 'pause') {
      applySyncToVideo(v, { event: 'pause' });
    } else if (action === 'play') {
      applySyncToVideo(v, { event: 'play' });
    }
  }
});

// 显示 URL 邀请 Toast
function showUrlInviteToast(payload) {
  if (!payload || !payload.url) return;
  const url = payload.url;
  const title = payload.title || url;

  let banner = document.getElementById('sync-watch-invite-toast');
  if (banner) {
    const textEl = banner.querySelector('.sync-watch-text');
    if (textEl) textEl.textContent = `朋友邀请你一起看：${title}`;
    banner.dataset.url = url;
    banner.style.display = 'flex';
    return;
  }

  banner = document.createElement('div');
  banner.id = 'sync-watch-invite-toast';
  banner.dataset.url = url;
  banner.style.cssText = [
    'position:fixed',
    'top:16px',
    'left:50%',
    'transform:translateX(-50%)',
    'z-index:999999',
    'background:rgba(15,23,42,0.96)',
    'color:#e5e7eb',
    'padding:10px 14px',
    'border-radius:999px',
    'box-shadow:0 8px 24px rgba(15,23,42,0.35)',
    'display:flex',
    'align-items:center',
    'gap:10px',
    'font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif',
    'font-size:13px',
    'max-width:80%',
    'box-sizing:border-box'
  ].join(';');

  const textSpan = document.createElement('span');
  textSpan.className = 'sync-watch-text';
  textSpan.textContent = `朋友邀请你一起看：${title}`;

  const joinBtn = document.createElement('button');
  joinBtn.textContent = '点击加入';
  joinBtn.style.cssText = [
    'border:none',
    'border-radius:999px',
    'padding:6px 12px',
    'background:#22c55e',
    'color:#0f172a',
    'font-size:12px',
    'font-weight:600',
    'cursor:pointer'
  ].join(';');
  joinBtn.addEventListener('click', () => {
    window.location.href = url;
  });

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '×';
  closeBtn.style.cssText = [
    'border:none',
    'background:transparent',
    'color:#9ca3af',
    'cursor:pointer',
    'font-size:14px',
    'padding:0 2px'
  ].join(';');
  closeBtn.addEventListener('click', () => {
    banner.style.display = 'none';
  });

  banner.appendChild(textSpan);
  banner.appendChild(joinBtn);
  banner.appendChild(closeBtn);
  document.body.appendChild(banner);
}
