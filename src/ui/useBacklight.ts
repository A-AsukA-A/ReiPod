import { useCallback, useEffect, useRef, useState } from "react";
export function useBacklight(seconds: number, sleeping: boolean) {
  const [dimmed, setDimmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activate = useCallback(() => {
    setDimmed(false);
    if (timer.current !== null) clearTimeout(timer.current);
    if (seconds && !sleeping)
      timer.current = setTimeout(() => setDimmed(true), seconds * 1000);
  }, [seconds, sleeping]);
  useEffect(() => {
    activate();
    return () => {
      if (timer.current !== null) clearTimeout(timer.current);
    };
  }, [activate]);
  return { dimmed, activate };
}
