import { createRuntime } from "./runtime.mjs";
import { allowedURL, restoreResponse } from "./network.mjs";
const native = globalThis.webkit.messageHandlers.reipodServiceHost;
const ready = (async () => {
  const secret = await native.postMessage({ action: "secret" });
  return createRuntime({
    secret,
    storage: {
      load: () => native.postMessage({ action: "load" }),
      save: (state) => native.postMessage({ action: "save", state }),
    },
    fetcher: async (url, options = {}) => {
      if (!allowedURL(String(url))) throw new Error("不允许的音乐接口地址");
      options.signal?.throwIfAborted();
      const reply = await native.postMessage({
        action: "fetch",
        url: String(url),
        method: options.method ?? "GET",
        headers: Array.from(new Headers(options.headers)),
        body: options.body ? String(options.body) : undefined,
      });
      options.signal?.throwIfAborted();
      return restoreResponse(reply);
    },
  });
})();
globalThis.reipodServiceRequest = async (request) => (await ready)(request);
