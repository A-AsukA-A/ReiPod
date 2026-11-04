import { useMemo, useState } from "react";
export function useWheelTextEntry(extra: string, mode: "search" | "name" = "name") {
  const [editing, setEditing] = useState(false);
  const [index, setIndex] = useState(0);
  const characters = useMemo(
    () => mode === "search" ? [
      ...new Set([..."ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", ...[...extra].filter(c => /[^\x00-\x7f\s]/.test(c))]),
    ] : [
      ...new Set([
        ..."ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789我的歌单",
        ...extra.replace(/\s/g, ""),
      ]),
      "空格",
      "退格",
      "完成",
    ],
    [extra, mode],
  );
  return {
    editing,
    setEditing,
    index,
    characters,
    begin: () => {
      setIndex(0);
      setEditing(true);
    },
    rotate: (steps: number) =>
      setIndex(
        (value) =>
          (value + (steps % characters.length) + characters.length) %
          characters.length,
      ),
    pick: (text: string) => {
      const key = characters[index];
      return key === "完成"
        ? null
        : key === "退格"
          ? [...text].slice(0, -1).join("")
          : text + (key === "空格" ? " " : mode === "search" && /^[A-Z]$/.test(key) ? key.toLowerCase() : key);
    },
  };
}
export function WheelTextEntry({
  text,
  title,
  characters,
  index,
}: {
  text: string;
  title: string;
  characters: string[];
  index: number;
}) {
  const start = Math.max(0, Math.min(characters.length - 25, index - 12));
  return (
    <div className="wheel-text-entry">
      <label>{title}</label>
      <div className="wheel-text-value">
        {text || " "}
        <i />
      </div>
      <div className="wheel-character-grid">
        {characters.slice(start, start + 25).map((char, i) => (
          <span
            key={char}
            aria-current={start + i === index ? "true" : undefined}
          >
            {char}
          </span>
        ))}
      </div>
      <small>转轮选字 · 中心键输入 · MENU 完成</small>
    </div>
  );
}
