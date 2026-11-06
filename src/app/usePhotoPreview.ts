import { useEffect, useState } from "react";
import { nativePhotoRequest, nativePhotosAvailable } from "../services/nativePhotos";
import type { PhotoItem } from "../media/photos";

/** A small read-only sample; highlighting never requests authorization or the entire library. */
export function usePhotoPreview(enabled: boolean, localPhotos: PhotoItem[]) {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [offset, setOffset] = useState(0);
  const [next, setNext] = useState<number>();
  const [reduced, setReduced] = useState(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const changed = () => { setPhotos([]); setOffset(0); setNext(undefined); setRevision(value => value + 1); };
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const motion = () => setReduced(media.matches);
    media.addEventListener("change", motion);
    window.addEventListener("reipod-native-photos", changed);
    document.addEventListener("visibilitychange", changed);
    return () => {
      media.removeEventListener("change", motion);
      window.removeEventListener("reipod-native-photos", changed);
      document.removeEventListener("visibilitychange", changed);
    };
  }, []);
  useEffect(() => {
    let current = true;
    if (!enabled || document.hidden) { setPhotos([]); setOffset(0); setNext(undefined); return; }
    if (!nativePhotosAvailable()) {
      setPhotos(localPhotos.slice(offset, offset + 8));
      setNext(offset + 8 < localPhotos.length ? offset + 8 : undefined);
      return;
    }
    void (async () => {
      const status = await nativePhotoRequest("status");
      if (!current || !["authorized", "limited"].includes(status.authorization)) return;
      const reply = await nativePhotoRequest("preview", { offset });
      if (current && ["authorized", "limited"].includes(reply.authorization)) {
        setPhotos((reply.photos ?? []).slice(0, 8)); setNext(reply.nextOffset);
      }
    })().catch(() => { if (current) setPhotos([]); });
    return () => { current = false; };
  }, [enabled, revision, offset, localPhotos]);
  useEffect(() => {
    if (!enabled || next === undefined || document.hidden || reduced) return;
    const timer = setTimeout(() => setOffset(next), 10000);
    return () => clearTimeout(timer);
  }, [enabled, next, revision, reduced]);
  return photos;
}
