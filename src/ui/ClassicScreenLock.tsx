import { useEffect, useImperativeHandle, useRef, useState } from "react";
import type { Ref } from "react";
import type { WheelCommand } from "../input/ClickWheel";
import { dialDigit, formatDigits, verifyScreenLock } from "../models/classicScreenLock";
import type { ScreenLockDigits, ScreenLockState } from "../models/classicScreenLock";
import "./classic-screen-lock.css";

export type ScreenLockInput = {
  locked: boolean;
  rotate: (steps: number) => void;
  command: (value: WheelCommand) => void;
};

type Mode = "menu" | "set" | "confirm" | "verify-change" | "verify-disable";

function CombinationTumbler({
  title,
  digits,
  cursor,
  error,
  hint,
}: {
  title: string;
  digits: ScreenLockDigits;
  cursor: number;
  error: string;
  hint: string;
}) {
  return (
    <div className="screen-lock-panel">
      <svg className="screen-lock-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M7 10V7a5 5 0 0 1 10 0v3M5 10h14v10H5Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
      <strong className="screen-lock-title">{title}</strong>
      <div className="lock-tumbler" role="group" aria-label={title}>
        {digits.map((digit, index) => (
          <span
            key={index}
            className={`lock-digit ${index === cursor ? "is-active" : ""}`}
            aria-current={index === cursor ? "step" : undefined}
          >
            {digit}
          </span>
        ))}
      </div>
      {error ? (
        <span className="screen-lock-error" role="status">
          {error}
        </span>
      ) : (
        <span className="screen-lock-hint">{hint}</span>
      )}
    </div>
  );
}

export function ClassicScreenLockScreen({
  state,
  input,
  onSaveCode,
  onLockNow,
  exit,
  notice,
}: {
  state: ScreenLockState;
  input: Ref<ScreenLockInput>;
  onSaveCode: (code: string | null) => void;
  onLockNow: () => void;
  exit: () => void;
  notice: (text: string) => void;
}) {
  const [mode, setMode] = useState<Mode>("menu");
  const [index, setIndex] = useState(0);
  const [digits, setDigits] = useState<ScreenLockDigits>([0, 0, 0, 0]);
  const [cursor, setCursor] = useState(0);
  const [pendingCode, setPendingCode] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setMode("menu");
    setIndex(0);
    setDigits([0, 0, 0, 0]);
    setCursor(0);
    setPendingCode("");
    setError("");
  }, [state.code]);

  const enterTumbler = (nextMode: Exclude<Mode, "menu">, message = "") => {
    setMode(nextMode);
    setDigits([0, 0, 0, 0]);
    setCursor(0);
    setError(message);
  };

  const rows =
    state.code === null
      ? [{ key: "set-code", label: "设置组合密码", action: () => enterTumbler("set") }]
      : [
          { key: "lock-now", label: "立即锁定", action: onLockNow },
          { key: "change-code", label: "更改密码", action: () => enterTumbler("verify-change") },
          { key: "disable-code", label: "关闭密码", action: () => enterTumbler("verify-disable") },
        ];

  const live = useRef({ mode, index, digits, cursor, pendingCode, rows, state, onSaveCode, exit, notice });
  live.current = { mode, index, digits, cursor, pendingCode, rows, state, onSaveCode, exit, notice };

  useImperativeHandle(
    input,
    () => ({
      locked: false,
      rotate: (steps) => {
        const cur = live.current;
        if (cur.mode === "menu") {
          setIndex((i) => Math.max(0, Math.min(cur.rows.length - 1, i + steps)));
          return;
        }
        setError("");
        setDigits((d) => dialDigit(d, cur.cursor, steps));
      },
      command: (value) => {
        const cur = live.current;
        if (cur.mode === "menu") {
          if (value === "menu") {
            cur.exit();
            return;
          }
          if (value === "select") {
            cur.rows[cur.index]?.action();
          }
          return;
        }
        if (value === "previous") {
          setCursor((c) => Math.max(0, c - 1));
          return;
        }
        if (value === "next") {
          setCursor((c) => Math.min(3, c + 1));
          return;
        }
        if (value === "menu") {
          if (cur.cursor > 0) {
            setCursor(cur.cursor - 1);
          } else {
            setMode("menu");
            setError("");
          }
          return;
        }
        if (value !== "select") return;
        if (cur.cursor < 3) {
          setCursor(cur.cursor + 1);
          return;
        }
        if (cur.mode === "verify-change" || cur.mode === "verify-disable") {
          if (!verifyScreenLock(cur.state.code, cur.digits)) {
            enterTumbler(cur.mode, "密码错误，请重试");
            return;
          }
          if (cur.mode === "verify-change") {
            enterTumbler("set");
          } else {
            cur.onSaveCode(null);
            setMode("menu");
            setIndex(0);
            cur.notice("组合密码已关闭");
          }
          return;
        }
        if (cur.mode === "set") {
          setPendingCode(formatDigits(cur.digits));
          enterTumbler("confirm");
          return;
        }
        if (cur.mode === "confirm") {
          const entered = formatDigits(cur.digits);
          if (entered !== cur.pendingCode) {
            setPendingCode("");
            enterTumbler("set", "两次密码不一致，请重试");
            return;
          }
          cur.onSaveCode(entered);
          setPendingCode("");
          setMode("menu");
          setIndex(0);
          cur.notice("组合密码已设置");
        }
      },
    }),
    [],
  );

  if (mode === "menu") {
    return (
      <div className="screen-menu">
        {rows.map((row, rowIndex) => (
          <div
            key={row.key}
            className={`screen-row ${rowIndex === index ? "selected" : ""}`}
            aria-current={rowIndex === index ? "true" : undefined}
          >
            <span className="row-title">{row.label}</span>
          </div>
        ))}
      </div>
    );
  }

  const title =
    mode === "set"
      ? "设置 4 位组合密码"
      : mode === "confirm"
        ? "再次输入以确认密码"
        : "输入当前组合密码";

  return (
    <CombinationTumbler
      title={title}
      digits={digits}
      cursor={cursor}
      error={error}
      hint="转轮拨号 · 中心键下一位 · Menu 返回"
    />
  );
}

export function ClassicScreenLockOverlay({
  code,
  input,
  onUnlock,
}: {
  code: string;
  input: Ref<ScreenLockInput>;
  onUnlock: () => void;
}) {
  const [digits, setDigits] = useState<ScreenLockDigits>([0, 0, 0, 0]);
  const [cursor, setCursor] = useState(0);
  const [error, setError] = useState("");

  const live = useRef({ code, digits, cursor, onUnlock });
  live.current = { code, digits, cursor, onUnlock };

  useImperativeHandle(
    input,
    () => ({
      locked: true,
      rotate: (steps) => {
        setError("");
        setDigits((d) => dialDigit(d, live.current.cursor, steps));
      },
      command: (value) => {
        const cur = live.current;
        if (value === "previous") {
          setCursor((c) => Math.max(0, c - 1));
          return;
        }
        if (value === "next") {
          setCursor((c) => Math.min(3, c + 1));
          return;
        }
        if (value === "menu") {
          setCursor((c) => Math.max(0, c - 1));
          return;
        }
        if (value !== "select") return;
        if (cur.cursor < 3) {
          setCursor(cur.cursor + 1);
          return;
        }
        if (verifyScreenLock(cur.code, cur.digits)) {
          cur.onUnlock();
          return;
        }
        setDigits([0, 0, 0, 0]);
        setCursor(0);
        setError("密码错误，请重试");
      },
    }),
    [],
  );

  return (
    <div className="classic-screen-lock-overlay" role="dialog" aria-label="屏幕已锁定">
      <CombinationTumbler
        title="输入组合密码"
        digits={digits}
        cursor={cursor}
        error={error}
        hint="转轮拨号 · 中心键确认解锁"
      />
    </div>
  );
}
