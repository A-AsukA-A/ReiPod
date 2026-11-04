import { useLayoutEffect, useRef } from "react";
import type { ReactNode } from "react";
import "./classic-search.css";

type Props = {
  query: string;
  editing: boolean;
  characters: readonly string[];
  index: number;
  count: number;
  pending?: boolean;
  error?: string;
  children: ReactNode;
};
/** Display-only results remain visible behind the wheel-operated alphabet strip. */
export function ClassicSearchScreen({ query, editing, characters, index, count, pending, error, children }: Props) {
  const field = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (field.current) field.current.scrollLeft = field.current.scrollWidth;
    if (editing && list.current) list.current.scrollTop = 0;
  }, [query, editing]);
  const first = Math.max(0, index - 2);
  return (
    <div className="classic-search-screen" data-editing={editing}>
      <nav className="classic-search-results screen-song-list" aria-label="搜索结果" ref={list}>
        {children}
        {!count && <p className="classic-search-message">{pending ? "正在搜索…" : error || (query ? "没有匹配的项目" : "转动转轮输入文字")}</p>}
      </nav>
      {editing && (
        <div className="classic-search-keyboard" aria-label="搜索文字输入">
          <div className="classic-search-value" ref={field} aria-label={`搜索文字：${query}`}>
            {query || " "}<i aria-hidden="true" />
          </div>
          <div className="classic-search-letters" aria-label="可选字符">
            {characters.slice(first, first + 14).map((character, i) => (
              <span key={character} data-text-index={first + i} aria-current={first + i === index ? "true" : undefined}>{character}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
