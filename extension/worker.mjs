import { createRuntime } from "../bridge/runtime.mjs";
import { allowedURL } from "../bridge/network.mjs";
import { validateOperation } from "../bridge/service.mjs";
const nativeFetch = globalThis.fetch.bind(globalThis);
export function allowedPage(value) {
  try {
    const u = new URL(value);
    return (
      (u.origin === "https://a-asuka-a.github.io" &&
        u.pathname.startsWith("/ReiPod/")) ||
      (u.protocol === "http:" &&
        ["127.0.0.1", "localhost"].includes(u.hostname))
    );
  } catch {
    return false;
  }
}
let networkQueue = Promise.resolve();
function fetcher(url, options = {}) {
  const work = networkQueue.then(async () => {
    url = String(url);
    if (!allowedURL(url)) throw new Error("不允许的音乐接口地址");
    const headers = new Headers(options.headers);
    const requestHeaders = [];
    for (const name of ["cookie", "referer", "origin", "user-agent"]) {
      if (headers.has(name)) {
        requestHeaders.push({
          header: name,
          operation: "set",
          value: headers.get(name),
        });
        headers.delete(name);
      }
    }
    // Never inherit the browser's other accounts or write cookies into their jar.
    if (!requestHeaders.some((h) => h.header === "cookie"))
      requestHeaders.push({ header: "cookie", operation: "remove" });
    let observed;
    const receive = (details) => {
      if (
        details.url === url &&
        details.initiator === `chrome-extension://${chrome.runtime.id}`
      )
        observed = details;
    };
    chrome.webRequest.onHeadersReceived.addListener(
      receive,
      { urls: [`${new URL(url).origin}/*`] },
      ["responseHeaders", "extraHeaders"],
    );
    try {
      await chrome.declarativeNetRequest.updateSessionRules({
        removeRuleIds: [1],
        addRules: [
          {
            id: 1,
            priority: 1,
            action: { type: "modifyHeaders", requestHeaders },
            condition: {
              regexFilter:
                "^" + url.replace(/[.*+?^${}()|[\]\\]/g, "\\$") + "$",
              initiatorDomains: [chrome.runtime.id],
              resourceTypes: ["xmlhttprequest"],
            },
          },
        ],
      });
      const response = await nativeFetch(url, {
        ...options,
        headers,
        credentials: "omit",
        redirect: "manual",
        signal: AbortSignal.any([
          ...(options.signal ? [options.signal] : []),
          AbortSignal.timeout(20000),
        ]),
      });
      const status = observed?.statusCode ?? response.status;
      const responseHeaders =
        observed?.responseHeaders
          ?.filter((h) => h.value !== undefined)
          .map((h) => [h.name, h.value]) ?? Array.from(response.headers);
      if (status < 200 || status > 599) throw new Error("平台响应不可用");
      const result = new Response(
        [204, 205, 304].includes(status) || response.type === "opaqueredirect"
          ? null
          : await response.arrayBuffer(),
        { status, headers: responseHeaders },
      );
      Object.defineProperty(result.headers, "getSetCookie", {
        value: () =>
          responseHeaders
            .filter(([key]) => key.toLowerCase() === "set-cookie")
            .map(([, value]) => value),
      });
      return result;
    } finally {
      chrome.webRequest.onHeadersReceived.removeListener(receive);
      await chrome.declarativeNetRequest.updateSessionRules({
        removeRuleIds: [1],
      });
    }
  });
  networkQueue = work.catch(() => {});
  return work;
}
const ready = (async () => {
  await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [1] });
  await chrome.storage.local.setAccessLevel({
    accessLevel: "TRUSTED_CONTEXTS",
  });
  let { secret } = await chrome.storage.local.get("secret");
  if (!secret) {
    secret = crypto.randomUUID() + crypto.randomUUID();
    await chrome.storage.local.set({ secret });
  }
  return createRuntime({
    fetcher,
    secret,
    storage: {
      load: async () => (await chrome.storage.local.get("state")).state,
      save: (state) => chrome.storage.local.set({ state }),
    },
  });
})();
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (
    sender.id !== chrome.runtime.id ||
    sender.frameId !== 0 ||
    !allowedPage(sender.url)
  )
    return false;
  if (request?.action === "bridge-status" && request.version === 1) {
    sendResponse({
      status: 200,
      data: {
        version: 1,
        transport: "extension",
        extensionVersion: chrome.runtime.getManifest().version,
      },
    });
    return false;
  }
  try {
    validateOperation(request);
  } catch {
    sendResponse({ status: 400, data: { error: "无效音乐请求" } });
    return false;
  }
  ready
    .then((handle) => handle(request))
    .then(sendResponse, () =>
      sendResponse({ status: 503, data: { error: "音乐扩展暂不可用" } }),
    );
  return true;
});
