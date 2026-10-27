import {
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { Ref } from "react";
import { readingPosition, saveReadingPosition } from "../media/textDocuments";
import type { TextSource } from "../media/textDocuments";
import "./text-reader.css";

export type TextReaderHandle = {
  scroll: (steps: number, page?: boolean) => void;
  edge: (end: boolean) => void;
  retry: () => boolean;
};
const loaded = new Map<string, string>();

/** Uses the physical wheel; URLs and imported markup remain inert text. */
export function TextReader({
  source,
  ref,
}: {
  source: TextSource;
  ref: Ref<TextReaderHandle>;
}) {
  const [text, setText] = useState(source.text ?? loaded.get(source.id));
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [progress, setProgress] = useState(0);
  const viewport = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLPreElement>(null);
  const ratio = useRef(readingPosition(source.id));
  useEffect(() => {
    if (text !== undefined || !source.path) return;
    const controller = new AbortController();
    setError(false);
    void fetch(`${import.meta.env.BASE_URL}${source.path}`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.text();
      })
      .then((value) => {
        if (controller.signal.aborted) return;
        loaded.set(source.id, value);
        setText(value);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [source.id, source.path, text, attempt]);
  const update = () => {
    const el = viewport.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    ratio.current = max > 0 ? el.scrollTop / max : 0;
    setProgress(max > 0 ? Math.round(ratio.current * 100) : 100);
    saveReadingPosition(source.id, ratio.current);
  };
  useLayoutEffect(() => {
    const el = viewport.current;
    if (!el || text === undefined) return;
    const restore = () => {
      const max = Math.max(0, el.scrollHeight - el.clientHeight);
      el.scrollTop = ratio.current * max;
      setProgress(max > 0 ? Math.round(ratio.current * 100) : 100);
    };
    restore();
    const observer = new ResizeObserver(restore);
    observer.observe(el);
    if (body.current) observer.observe(body.current);
    return () => observer.disconnect();
  }, [source.id, text]);
  useImperativeHandle(ref, () => ({
    scroll(steps, page = false) {
      const el = viewport.current;
      if (!el || text === undefined) return;
      const line = parseFloat(getComputedStyle(el).lineHeight);
      el.scrollTop +=
        steps * (page ? Math.max(line, el.clientHeight - line) : line);
      update();
    },
    edge(end) {
      const el = viewport.current;
      if (!el || text === undefined) return;
      el.scrollTop = end ? el.scrollHeight : 0;
      update();
    },
    retry() {
      if (!error) return false;
      setAttempt((value) => value + 1);
      return true;
    },
  }));
  return (
    <section className="text-reader" aria-label={`${source.title}正文`}>
      {text !== undefined ? (
        <div className="text-reader-viewport" ref={viewport} onScroll={update}>
          <pre ref={body}>{text || "（空文本）"}</pre>
        </div>
      ) : (
        <div className="text-reader-message" role="status">
          {error ? (
            <>
              文本未能载入<small>中心键重试 · MENU 返回</small>
            </>
          ) : (
            "正在载入…"
          )}
        </div>
      )}
      <div className="text-reader-footer">
        <span>转轮滚动 · ◀▶ 翻页</span>
        {text !== undefined && <span aria-label="阅读进度">{progress}%</span>}
      </div>
    </section>
  );
}
