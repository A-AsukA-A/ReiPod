import { useEffect, useRef, useState } from "react";
import type { Ref } from "react";
import { classicGames, isClassicGame } from "../models/classicGames";
import type { QuizTrack } from "../models/iQuiz";
import { hasGameProgress, readVortexOptions, saveVortexOptions } from "../services/gameStorage";
import { vortexDifficulties } from "../models/vortex";
import type { VortexOptions } from "../models/vortex";
import type { GameInput } from "./gameInput";
import { useGameControls } from "./games/gameControls";
import { GameIcon } from "./games/GameIcon";
import { KlondikeGame } from "./games/KlondikeGame";
import { VortexGame } from "./games/VortexGame";
import { IQuizGame } from "./games/IQuizGame";
import "./classic-games.css";

const help = {
  iquiz: ["转动转轮选择答案，按中心键确认。", "每轮三次答错后结束；Music Quiz 2使用当前音乐库的问题。", "奖励回合先选Lightning或Who/What/When，再押分。Lightning只在正确时按中心键。", "Menu或播放键暂停，继续时计时恢复。"],
  klondike: ["转轮选择牌堆，中心键拿起或放下牌。", "前后键选择同一列中更深或更浅的明牌；长按中心键撤销一步。", "收牌区同花色从A到K；牌列红黑交替递减，空列只放K。", "中心键点击牌堆发牌；Menu或播放键暂停。"],
  vortex: ["选项可切换轮盘旋转或手指位置；手指位置让挡板跟随你触摸的转轮方向，键盘和滚轮继续相对移动。", "新游戏难度可从不同关卡开始，继续游戏保留原关卡。", "中心键发球；获得激光后按中心键射击。", "道具：+加宽、−缩小、3多球、L激光、S黏球、上下箭头变速、T三挡板、P强力球。", "黏住球后中心键释放；爆炸砖连锁破坏，金属砖不能打碎。", "Menu或播放键暂停；清空砖块后中心键进入下一关。"],
};
type Mode = "menu" | "play" | "pause" | "help" | "options" | "difficulty" | "confirm";
export function ClassicGamesScreen({ id, input, active, tracks, scope, openGame, exit, notice }: {
  id?: string; input: Ref<GameInput>; active: boolean; tracks: readonly QuizTrack[]; scope: string;
  openGame: (id: string) => void; exit: () => void; notice: (message: string) => void;
}) {
  const game = isClassicGame(id) ? id : null;
  const [mode, setMode] = useState<Mode>("menu");
  const [selected, setSelected] = useState(0);
  const [librarySelection, setLibrarySelection] = useState(0);
  const [draws, setDraws] = useState<1 | 3>(1);
  const [vortexOptions, setVortexOptions] = useState(readVortexOptions);
  const [fresh, setFresh] = useState(false);
  const [session, setSession] = useState(0);
  const controls = useRef<GameInput>(null);
  const helpText = useRef<HTMLDivElement>(null);
  const [hasSession, setHasSession] = useState(false);
  useEffect(() => { setMode("menu"); setSelected(0); setHasSession(false); }, [game]);
  useEffect(() => {
    if (!active) setMode(value => value === "play" ? "pause" : value);
  }, [active]);
  useEffect(() => {
    const suspend = () => { if (document.visibilityState !== "visible") setMode(value => value === "play" ? "pause" : value); };
    document.addEventListener("visibilitychange", suspend);
    return () => document.removeEventListener("visibilitychange", suspend);
  }, []);
  const changeMode = (value: Mode) => { setSelected(0); setMode(value); };
  const setVortex = (patch: Partial<VortexOptions>) => {
    const next = { ...vortexOptions, ...patch }; setVortexOptions(next);
    if (!saveVortexOptions(next)) notice("游戏选项未能保存，本次仍生效");
  };
  const start = (restart: boolean) => {
    setFresh(restart); setSession(value => value + 1); setHasSession(true); changeMode("play");
  };
  const canResume = game !== null && (hasSession || hasGameProgress(game));
  const items: { label: string; action: () => void }[] = mode === "help" ? [{ label: "返回", action: () => changeMode(hasSession ? "pause" : "menu") }]
    : mode === "confirm" ? [
      { label: "取消", action: () => changeMode(hasSession ? "pause" : "menu") },
      { label: "新游戏", action: () => start(true) },
    ] : mode === "difficulty" ? vortexDifficulties.map(difficulty => ({ label: `${difficulty}${vortexOptions.difficulty === difficulty ? " ✓" : ""}`,
      action: () => { setVortex({ difficulty }); changeMode("options"); } }))
    : mode === "options" && game === "vortex" ? [
      { label: `控制：${vortexOptions.control === "position" ? "手指位置" : "轮盘旋转"}`, action: () => setVortex({ control: vortexOptions.control === "rotation" ? "position" : "rotation" }) },
      { label: `新游戏难度：${vortexOptions.difficulty}`, action: () => changeMode("difficulty") },
      { label: "返回", action: () => changeMode(hasSession ? "pause" : "menu") },
    ] : mode === "options" ? [
      { label: `每次发牌：${draws === 1 ? "一张" : "三张"}`, action: () => setDraws(value => value === 1 ? 3 : 1) },
      { label: "返回", action: () => changeMode(hasSession ? "pause" : "menu") },
    ] : [
      ...(canResume ? [{ label: "继续游戏", action: () => hasSession ? changeMode("play") : start(false) }] : []),
      { label: "新游戏", action: () => canResume ? changeMode("confirm") : start(true) },
      ...(game === "klondike" || game === "vortex" ? [{ label: "选项", action: () => changeMode("options") }] : []),
      { label: "帮助", action: () => changeMode("help") },
      { label: "退出", action: exit },
    ];
  useGameControls(input, {
    position: radians => game === "vortex" && mode === "play" && active ? controls.current?.position?.(radians) ?? false : false,
    rotate: steps => {
      if (!game) setLibrarySelection(value => Math.max(0, Math.min(2, value + steps)));
      else if (mode === "help" && helpText.current) {
        const text = helpText.current, line = Number.parseFloat(getComputedStyle(text.firstElementChild || text).lineHeight);
        text.scrollTop += steps * (Number.isFinite(line) ? line : 18);
      }
      else if (mode === "play") controls.current?.rotate(steps);
      else setSelected(value => Math.max(0, Math.min(items.length - 1, value + steps)));
    },
    command: value => {
      if (!game) { if (value === "select") openGame(classicGames[librarySelection].id); else if (value === "menu") exit(); return; }
      if (value === "menu" || value === "play") {
        if (mode === "play") changeMode("pause");
        else if (mode === "pause") changeMode("play");
        else if (mode === "difficulty") changeMode("options");
        else if (mode === "help" || mode === "options" || mode === "confirm") changeMode(hasSession ? "pause" : "menu");
        else if (value === "menu") exit();
        return;
      }
      if (mode === "help" && (value === "previous" || value === "next") && helpText.current)
        helpText.current.scrollTop += helpText.current.clientHeight * (value === "next" ? 0.8 : -0.8);
      else if (mode === "play") controls.current?.command(value);
      else if (value === "select") items[selected]?.action();
    },
  });
  const saveError = () => notice("游戏进度未能保存，本次仍可继续");
  // Keep the running board mounted beneath pause/help/confirmation menus.
  const running = mode === "play" && active;
  if (!game) return <div className="classic-game-library" data-games="library">
    {classicGames.map((item, index) => <div key={item.id} className={`game-library-row ${index === librarySelection ? "selected" : ""}`}
      aria-current={index === librarySelection ? "true" : undefined} data-game-id={item.id}>
      <GameIcon game={item.id} /><div><strong>{item.name}</strong><span>{hasGameProgress(item.id) ? "已玩过" : "从未玩过"}</span></div><i aria-hidden="true">›</i>
    </div>)}
  </div>;
  return <div className={`classic-game-host game-${game}`} data-game-title={game} data-game-mode={mode}>
    {hasSession && <div className="game-board" aria-hidden={mode !== "play"} key={`${game}:${session}:${game === "iquiz" ? scope : ""}`}>
      {game === "klondike" ? <KlondikeGame input={controls} running={running} fresh={fresh} draws={draws} onSaveError={saveError} />
        : game === "vortex" ? <VortexGame input={controls} running={running} fresh={fresh} options={vortexOptions} onSaveError={saveError} />
        : <IQuizGame input={controls} running={running} fresh={fresh} tracks={tracks} scope={scope} onSaveError={saveError} />}
    </div>}
    {mode !== "play" && <div className={`game-menu-panel ${hasSession ? "game-is-paused" : ""}`}>
      <div className="game-menu-heading"><GameIcon game={game} /><strong>{classicGames.find(item => item.id === game)?.name}</strong></div>
      {mode === "help" ? <div className="game-help" ref={helpText}>{help[game].map(line => <p key={line}>{line}</p>)}</div>
        : mode === "confirm" ? <p className="game-confirm">开始新游戏？</p> : null}
      <div className="game-menu-rows">{items.map((item, index) => <div key={item.label} className={selected === index ? "selected" : ""} aria-current={selected === index ? "true" : undefined}>{item.label}</div>)}</div>
    </div>}
  </div>;
}
