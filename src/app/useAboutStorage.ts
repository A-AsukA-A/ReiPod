import { useEffect, useState } from "react";
import { estimateBrowserStorage } from "../services/browserStorage";
import type { BrowserStorage } from "../services/browserStorage";

export function useAboutStorage(enabled: boolean) {
  const [storage, setStorage] = useState<BrowserStorage | null | undefined>();
  useEffect(() => {
    if (!enabled) return;
    let current = true;
    setStorage(undefined);
    void estimateBrowserStorage().then(value => { if (current) setStorage(value); });
    return () => { current = false; };
  }, [enabled]);
  return storage;
}
