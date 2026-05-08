const roomInput = document.getElementById('roomInput');
const joinBtn = document.getElementById('joinBtn');
const leaveBtn = document.getElementById('leaveBtn');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const shareLinkBtn = document.getElementById('shareLinkBtn');

function showConnected(roomId) {
  joinBtn.classList.add('hidden');
  leaveBtn.classList.remove('hidden');
  statusDot.classList.add('active');
  statusText.textContent = roomId ? `已连接：${roomId}` : '已连接';
}

function showDisconnected() {
  joinBtn.classList.remove('hidden');
  leaveBtn.classList.add('hidden');
  statusDot.classList.remove('active');
  statusText.textContent = '未连接';
}

// 打开弹窗时询问当前连接状态
chrome.runtime.sendMessage({ action: 'get_connection_state' }, (response) => {
  if (chrome.runtime.lastError) {
    showDisconnected();
    return;
  }
  if (response && response.connected) {
    showConnected(response.roomId);
  } else {
    showDisconnected();
  }
});

joinBtn.addEventListener('click', () => {
  const roomValue = roomInput.value.trim();
  if (!roomValue) return;

  chrome.runtime.sendMessage(
    { action: 'join_room', roomId: roomValue },
    (response) => {
      if (chrome.runtime.lastError) {
        statusText.textContent = '连接失败';
        return;
      }
      if (response && response.success) {
        showConnected(response.roomId);
      } else {
        statusText.textContent = '连接失败';
      }
    }
  );
});

leaveBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'leave_room' }, (response) => {
    if (chrome.runtime.lastError) return;
    if (response && response.success) {
      showDisconnected();
    }
  });
});

shareLinkBtn.addEventListener('click', () => {
  // 获取当前活动标签页的 URL 和标题
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs && tabs[0];
    if (!tab || !tab.url) {
      statusText.textContent = '无法获取当前链接';
      return;
    }
    const payload = {
      url: tab.url,
      title: tab.title || tab.url,
      tabId: tab.id
    };
    chrome.runtime.sendMessage(
      { action: 'share_url', ...payload },
      (response) => {
        if (chrome.runtime.lastError) {
          statusText.textContent = '分享失败';
          return;
        }
        if (response && response.ok) {
          statusText.textContent = '已分享当前链接';
        } else {
          statusText.textContent = response?.message || '分享失败';
        }
      }
    );
  });
});
