import { createMqttListenOver } from "@yakult-green-tea/qq-music-api/mqtt";

// Lives inside the server/native isolated runtime, never in the UI page.
export function createQQRelay(Socket = globalThis.WebSocket, listenFactory = createMqttListenOver) {
  const sessions = new Map();
  const listen = listenFactory((raw, protocol, handlers) => new Promise((resolve, reject) => {
    const url = new URL(raw);
    if (url.protocol !== "wss:" || url.hostname !== "mu.y.qq.com" || url.port || url.username || url.password) { reject(new Error("Invalid QQ relay destination")); return; }
    const socket = new Socket(raw, protocol);
    socket.binaryType = "arraybuffer";
    const timer = setTimeout(() => { socket.close(); reject(new Error("QQ 音乐授权连接超时")); }, 15000);
    socket.addEventListener("open", () => {
      clearTimeout(timer);
      resolve({ send: data => socket.send(data), close: () => socket.close() });
    }, { once: true });
    socket.addEventListener("message", event => handlers.message(event.data));
    socket.addEventListener("close", () => { clearTimeout(timer); reject(new Error("QQ 音乐授权连接已关闭")); handlers.close(); });
    socket.addEventListener("error", () => { clearTimeout(timer); const error = new Error("QQ 音乐授权连接失败"); reject(error); handlers.error(error); });
  }));
  const close = async id => {
    const item = sessions.get(id);
    if (item) { clearTimeout(item.timer); item.listener.close(); sessions.delete(id); }
  };
  return {
    async open(id, image, ttl) {
      if (sessions.has(id)) return;
      if (sessions.size >= 20) throw new Error("QQ 音乐登录请求过多");
      const item = { image, events: [], error: undefined };
      item.listener = listen(id, event => { if (item.events.length < 20) item.events.push(event); }, Math.min(ttl || 180000, 180000));
      item.timer = setTimeout(() => { void close(id); }, Math.min(ttl || 180000, 180000));
      sessions.set(id, item);
      item.listener.done.catch(error => { item.error = error; });
      try { await item.listener.ready; } catch (error) { await close(id); throw error; }
    },
    async image(id) { const item = sessions.get(id); if (!item) throw new Error("登录已过期"); return item.image; },
    async poll(id) { const item = sessions.get(id); if (!item) throw new Error("登录已过期"); if (item.events.length) return item.events.splice(0); if (item.error) throw item.error; return []; },
    close,
  };
}
