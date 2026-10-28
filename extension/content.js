(() => {
  if (window !== window.top) return;
  const origin = location.origin;
  window.addEventListener("message", async (event) => {
    if (event.source !== window || event.origin !== origin) return;
    const msg = event.data;
    if (
      !msg ||
      msg.channel !== "reipod-music-request" ||
      typeof msg.id !== "string" ||
      msg.id.length > 100
    )
      return;
    try {
      const reply = await chrome.runtime.sendMessage({
        version: 1,
        ...msg.request,
      });
      window.postMessage(
        { channel: "reipod-music-reply", id: msg.id, reply },
        origin,
      );
    } catch {
      window.postMessage(
        {
          channel: "reipod-music-reply",
          id: msg.id,
          reply: {
            status: 503,
            data: { error: "音乐扩展连接已中断，请刷新页面" },
          },
        },
        origin,
      );
    }
  });
})();
