import { useCallback, useEffect, useRef, useState } from "react";
import { nativePhotoRequest, nativePhotosAvailable } from "../services/nativePhotos";
import type { NativePhotoState } from "../services/nativePhotos";
import type { PhotoItem } from "../media/photos";

const pageSize = 100;
export const nativePhotoKey = (album: string, index: number) => `ios-photo:${encodeURIComponent(album)}:${index}`;
function selectionIndex(album: string | undefined, key?: string) {
  const prefix = album && `ios-photo:${encodeURIComponent(album)}:`;
  const value = prefix && key?.startsWith(prefix) ? Number(key.slice(prefix.length)) : 0;
  return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

/** Session-only, at most three metadata pages. The current page is published before prefetch. */
export function useNativePhotos(enabled: boolean, album?: string, selectedKey?: string) {
  const available = nativePhotosAvailable();
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<NativePhotoState>({ authorization: "notDetermined", albums: [], photos: [], total: 0, loading: false });
  const [windowVersion, setWindowVersion] = useState(0);
  const generation = useRef(0);
  const pages = useRef(new Map<number, PhotoItem[]>());
  const pending = useRef(new Set<number>());
  const index = Math.min(selectionIndex(album, selectedKey), Math.max(0, state.total - 1));
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    if (!available) return;
    const changed = () => {
      if (document.visibilityState !== "visible") return;
      // Clear private content immediately; no late page can restore revoked access.
      generation.current++;
      pages.current.clear(); pending.current.clear();
      setState(value => ({ ...value, albums: [], photos: [], total: 0, loading: false }));
      refresh();
    };
    window.addEventListener("reipod-native-photos", changed);
    document.addEventListener("visibilitychange", changed);
    return () => {
      window.removeEventListener("reipod-native-photos", changed);
      document.removeEventListener("visibilitychange", changed);
    };
  }, [available, refresh]);
  useEffect(() => {
    if (!available) return;
    const token = ++generation.current;
    pages.current.clear(); pending.current.clear();
    const current = () => token === generation.current;
    setState(value => ({ ...value, photos: [], album, total: 0, loading: enabled, error: undefined }));
    void (async () => {
      let status = await nativePhotoRequest("status");
      if (enabled && status.authorization === "notDetermined") status = await nativePhotoRequest("authorize");
      if (!current()) return;
      if (!["authorized", "limited"].includes(status.authorization)) {
        setState({ authorization: status.authorization, albums: [], photos: [], total: 0, loading: false });
        return;
      }
      if (!enabled) { setState(value => ({ ...value, authorization: status.authorization, loading: false })); return; }
      const library = await nativePhotoRequest("albums");
      if (!current()) return;
      setState(value => ({ ...value, authorization: library.authorization, albums: library.albums ?? [],
        total: library.albums?.find(item => item.id === album)?.count ?? 0, loading: !!album }));
      setWindowVersion(value => value + 1);
    })().catch(error => {
      if (current()) setState(value => ({ ...value, loading: false, error: String(error) }));
    });
    return () => { generation.current++; };
  }, [available, enabled, album, revision]);
  const center = Math.floor(index / pageSize) * pageSize;
  const activePage = useRef(center);
  activePage.current = center;
  useEffect(() => {
    if (!enabled || !album || state.album !== album || !["authorized", "limited"].includes(state.authorization)
      || !state.albums.some(item => item.id === album)) return;
    const token = generation.current;
    const publish = () => {
      const target = activePage.current;
      for (const start of pages.current.keys()) if (Math.abs(start - target) > pageSize) pages.current.delete(start);
      const first = pages.current.has(target - pageSize) ? target - pageSize : target;
      const photos = [first, first + pageSize, first + 2 * pageSize]
        .filter(start => Math.abs(start - target) <= pageSize).flatMap(start => pages.current.get(start) ?? []);
      // A previous page must never masquerade as a still-loading selected page.
      setState(value => ({ ...value, photos: pages.current.has(target) ? photos : [], offset: first,
        loading: state.total > 0 && !pages.current.has(target), error: undefined }));
    };
    const read = async (offset: number) => {
      if (offset < 0 || offset >= state.total || pages.current.has(offset) || pending.current.has(offset)) return;
      pending.current.add(offset);
      try {
        const reply = await nativePhotoRequest("photos", { album, offset, limit: pageSize });
        if (token !== generation.current) return;
        if (!["authorized", "limited"].includes(reply.authorization)) throw Error("照片访问权限已改变");
        pages.current.set(offset, (reply.photos ?? []).map((photo, slot) => ({ ...photo,
          id: nativePhotoKey(album, offset + slot), system: true })));
        publish();
      } catch (error) {
        if (token === generation.current) setState(value => ({ ...value, loading: false, error: String(error) }));
      } finally { if (token === generation.current) pending.current.delete(offset); }
    };
    publish();
    void read(center).then(() => {
      if (token !== generation.current) return;
      void read(center + pageSize);
      void read(center - pageSize);
    });
  }, [enabled, album, center, state.album, state.authorization, state.albums, state.total, windowVersion]);
  const manage = async (action: "refresh" | "limited" | "openSettings") => { await nativePhotoRequest(action); refresh(); };
  return { available, ...state, index, refresh, manage };
}
