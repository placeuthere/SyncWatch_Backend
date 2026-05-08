const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: true,
    methods: ['GET', 'POST'],
    credentials: false
  },
  allowEIO3: true,
  transports: ['polling', 'websocket'],
  allowUpgrade: true
});

io.on('connection', (socket) => {
  console.log(`[连接] 客户端已连接: ${socket.id}`);

  // 加入房间
  socket.on('join room', (roomId) => {
    const id = String(roomId ?? '').trim();
    if (!id) return;
    socket.join(id);
    console.log(`用户 ${socket.id} 加入了房间 ${id}`);
  });

  // 收到 video-control 时，转发给同房间其他人（不包含发送者）
  socket.on('video-control', (payload) => {
    if (payload == null) return;
    console.log(`[video-control] 来自 ${socket.id}:`, payload.event, payload.currentTime != null ? `t=${payload.currentTime.toFixed(1)}s` : '');
    const rooms = [...socket.rooms].filter((r) => r !== socket.id);
    rooms.forEach((roomId) => {
      socket.to(roomId).emit('video-control', payload);
    });
  });

  // 收到 url-share 时，转发给同房间其他人（不包含发送者）
  socket.on('url-share', (payload) => {
    if (!payload || !payload.url) return;
    console.log(`[url-share] 来自 ${socket.id}:`, payload.url);
    const rooms = [...socket.rooms].filter((r) => r !== socket.id);
    rooms.forEach((roomId) => {
      socket.to(roomId).emit('url-share', payload);
    });
  });

  // 收到进度心跳，转发给同房间其他人
  socket.on('progress-heartbeat', (payload) => {
    if (!payload || typeof payload.currentTime !== 'number') return;
    console.log(`[progress] 来自 ${socket.id}: t=${payload.currentTime.toFixed(1)}s`);
    const rooms = [...socket.rooms].filter((r) => r !== socket.id);
    rooms.forEach((roomId) => {
      socket.to(roomId).emit('progress-heartbeat', payload);
    });
  });

  // 收到缓冲状态，同步给同房间其他人
  socket.on('buffer-status', (payload) => {
    if (!payload || !payload.state) return;
    console.log(`[buffer] 来自 ${socket.id}:`, payload.state);
    const rooms = [...socket.rooms].filter((r) => r !== socket.id);
    rooms.forEach((roomId) => {
      socket.to(roomId).emit('buffer-status', payload);
    });
  });

  socket.on('disconnect', () => {
    console.log(`[断开] ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Socket.io 服务器运行在 http://localhost:${PORT}`);
});
