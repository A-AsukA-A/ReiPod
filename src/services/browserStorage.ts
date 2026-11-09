export type BrowserStorage = { usage: number; quota: number };

/** Origin storage estimates are not the host disk's physical capacity. */
export async function estimateBrowserStorage(): Promise<BrowserStorage | null> {
  try {
    const estimate = await navigator.storage?.estimate?.();
    if (!estimate || !Number.isFinite(estimate.quota) || !estimate.quota || estimate.quota <= 0 ||
      !Number.isFinite(estimate.usage) || estimate.usage! < 0) return null;
    return { quota: estimate.quota, usage: Math.min(estimate.usage!, estimate.quota) };
  } catch { return null; }
}
