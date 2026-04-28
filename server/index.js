const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 8080;
const wss = new WebSocketServer({ port: PORT });

// rooms: Map<roomId, [hostWs, joinerWs|null]>
const rooms = new Map();

function genId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function relay(from, msg) {
  const room = rooms.get(from._roomId);
  if (!room) return;
  const other = room.find(ws => ws && ws !== from);
  if (other && other.readyState === 1) {
    other.send(typeof msg === 'string' ? msg : JSON.stringify(msg));
  }
}

wss.on('connection', (ws) => {
  ws._roomId = null;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === 'create-room') {
      let id;
      do { id = genId(); } while (rooms.has(id));
      rooms.set(id, [ws, null]);
      ws._roomId = id;
      ws.send(JSON.stringify({ type: 'room-created', roomId: id }));
      return;
    }

    if (msg.type === 'join-room') {
      const room = rooms.get(msg.roomId);
      if (!room) {
        ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
        return;
      }
      if (room[1] !== null) {
        ws.send(JSON.stringify({ type: 'error', message: 'Room full' }));
        return;
      }
      room[1] = ws;
      ws._roomId = msg.roomId;
      ws.send(JSON.stringify({ type: 'room-joined' }));
      // Tell host a peer arrived
      if (room[0].readyState === 1) {
        room[0].send(JSON.stringify({ type: 'peer-joined' }));
      }
      return;
    }

    // Relay: offer, answer, ice-candidate
    relay(ws, raw.toString());
  });

  ws.on('close', () => {
    if (!ws._roomId) return;
    const room = rooms.get(ws._roomId);
    if (!room) return;
    const other = room.find(p => p && p !== ws);
    if (other && other.readyState === 1) {
      other.send(JSON.stringify({ type: 'peer-left' }));
    }
    rooms.delete(ws._roomId);
    console.log(`Room ${ws._roomId} closed`);
  });
});

console.log(`Signaling server listening on :${PORT}`);
