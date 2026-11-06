type Host = { __REIPOD_NATIVE_EXPERIENCE_VERSION__?: number;
  webkit?: { messageHandlers?: { reipodExperience?: { postMessage: (message: unknown) => void } } } };
export const nativeExperienceAvailable = () => typeof window !== "undefined"
  && (window as unknown as Host).__REIPOD_NATIVE_EXPERIENCE_VERSION__ === 1;
let lastFeedback = -Infinity;
/** Haptics are optional and independent of synthesized click audio. */
export function nativeFeedback(kind: "press" | "release" | "step") {
  if (kind === "release" || !nativeExperienceAvailable()) return;
  const now = performance.now();
  if (now - lastFeedback < (kind === "step" ? 40 : 20)) return;
  const bridge = (window as unknown as Host).webkit?.messageHandlers?.reipodExperience;
  if (!bridge) return;
  lastFeedback = now;
  try { bridge.postMessage({ version: 1, action: kind }); } catch { /* Feedback must never block input. */ }
}

export function syncNativeAppearance(background: "transparent" | "warm" | "dark", keepAwake: boolean) {
  if (!nativeExperienceAvailable()) return;
  try { (window as unknown as Host).webkit?.messageHandlers?.reipodExperience?.postMessage({
    version: 1, action: "appearance", background, keepAwake,
  }); } catch { /* Optional host synchronization does not block rendering. */ }
}
