import { clockCities, clockRegions, formatStopwatch } from "../models/classicExtras";
import type { ExtrasAction, ExtrasState } from "../models/classicExtras";
import type { MenuItem } from "./MenuRows";
import type { Page } from "./navigation";
type Context = { state: ExtrasState; groupKey?: string; history: readonly Page[];
  dispatch: (action: ExtrasAction) => void; open: (page: Page, selected?: string, group?: string) => void;
  back: (levels?: number) => void; select: (key: string) => void };
export function createExtrasMenus({ state, groupKey, history, dispatch, open, back, select }: Context): Partial<Record<Page, MenuItem[]>> {
  const timer = state.current, running = timer.started !== null;
  const action = (type: "toggle" | "lap" | "new") => () => {
    dispatch({ type, now: Date.now() }); select(type === "lap" ? "lap" : type === "new" ? "start" : running ? "resume" : "lap");
  };
  return {
    clock: state.clocks.length ? state.clocks.map(id => ({ key: id, label: id, action: () => open("clock-options", "add", id) }))
      : [{ key: "add", label: "添加时钟", action: () => open("clock-regions") }],
    "clock-options": [
      { key: "add", label: "添加时钟", action: () => open("clock-regions") },
      { key: "delete", label: "删除此时钟", leaf: true, action: () => { if (groupKey) dispatch({ type: "remove-clock", id: groupKey }); back(); } },
      { key: "cancel", label: "取消", leaf: true, action: () => back() },
    ],
    "clock-regions": clockRegions.map(region => ({ key: region.id, label: region.name, action: () => open("clock-cities", undefined, region.id) })),
    "clock-cities": clockCities.filter(city => city.region === groupKey).map(city => ({ key: city.id, label: city.name,
      value: state.clocks.includes(city.id) ? "✓" : undefined, leaf: true, action: () => {
        dispatch({ type: "add-clock", id: city.id });
        const index = history.lastIndexOf("clock");
        if (index >= 0) back(history.length - index); else open("clock");
        select(city.id);
      } })),
    stopwatch: [
      { key: "timer", label: "计时器", action: () => open("stopwatch-timer", running ? "lap" : timer.elapsed ? "resume" : "start") },
      ...state.logs.map(log => ({ key: log.id, label: new Date(log.date).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }),
        value: formatStopwatch(log.elapsed), action: () => open("stopwatch-log", "options", log.id) })),
    ],
    "stopwatch-timer": running ? [{ key: "lap", label: "分段", leaf: true, disabled: timer.laps.length >= 1000, action: action("lap") }] : [
      { key: timer.elapsed ? "resume" : "start", label: timer.elapsed ? "继续" : "开始", leaf: true, action: action("toggle") },
      { key: "new", label: "新计时", leaf: true, disabled: timer.elapsed <= 0, action: action("new") },
    ],
    "stopwatch-log": [{ key: "options", label: "选项", action: () => open("stopwatch-log-options", "cancel", groupKey) }],
    "stopwatch-log-options": [
      { key: "cancel", label: "取消", leaf: true, action: () => back() },
      { key: "delete", label: "删除记录", leaf: true, action: () => { if (groupKey) dispatch({ type: "delete-log", id: groupKey }); back(2); } },
      { key: "clear", label: "清空记录…", action: () => open("confirm-clear-stopwatch", "cancel") },
    ],
    "confirm-clear-stopwatch": [
      { key: "cancel", label: "取消", leaf: true, action: () => back() },
      { key: "clear", label: "清空", leaf: true, action: () => { dispatch({ type: "clear-logs" }); const i = history.lastIndexOf("stopwatch"); back(i >= 0 ? history.length - i : 1); } },
    ],
  };
}
