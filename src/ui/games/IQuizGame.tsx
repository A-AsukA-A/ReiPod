import { useEffect, useRef, useState } from "react";
import type { Ref } from "react";
import { advanceQuiz, answerQuiz, chooseQuizBonus, newQuiz, startQuizBonus, validQuiz } from "../../models/iQuiz";
import type { QuizCategory, QuizState, QuizTrack } from "../../models/iQuiz";
import { readGame, saveGame } from "../../services/gameStorage";
import type { GameInput } from "../gameInput";
import { useGameControls } from "./gameControls";
import { MarqueeText } from "../MarqueeText";

const categories: { id: QuizCategory; label: string }[] = [
  { id: "library", label: "Music Quiz 2" }, { id: "music", label: "音乐" },
  { id: "movies", label: "电影" }, { id: "tv", label: "电视" },
];
type SavedQuiz = { scope: string; state: QuizState | null };
const validSaved = (value: unknown): value is SavedQuiz => !!value && typeof value === "object" &&
  typeof (value as SavedQuiz).scope === "string" && ((value as SavedQuiz).state === null || validQuiz((value as SavedQuiz).state));

export function IQuizGame({ input, running, fresh, tracks, scope, onSaveError }: {
  input: Ref<GameInput>; running: boolean; fresh: boolean; tracks: readonly QuizTrack[]; scope: string; onSaveError: () => void;
}) {
  const [state, setState] = useState<QuizState | null>(() => {
    const saved = !fresh && readGame("iquiz", validSaved);
    return saved && saved.scope === scope ? saved.state : null;
  });
  const live = useRef(state); live.current = state;
  const [selection, setSelection] = useState(0);
  const persist = () => {
    if (!saveGame("iquiz", { scope, state: live.current })) onSaveError();
  };
  const update = (next: QuizState | null) => { live.current = next; setState(next); setSelection(0); };
  useEffect(() => {
    persist();
  }, [state?.phase, state?.index, state?.round, scope]);
  useEffect(() => () => persist(), [scope]);
  useEffect(() => {
    if (!running || !state || state.phase !== "question" || !state.questions.length) { persist(); return; }
    let previous = performance.now();
    const timer = setInterval(() => {
      const current = live.current;
      if (!current || current.phase !== "question") return;
      const now = performance.now(), remaining = Math.max(0, current.remaining - (now - previous) / 1000);
      previous = now;
      const next = remaining ? { ...current, remaining } : answerQuiz({ ...current, remaining: 0 }, -1);
      live.current = next; setState(next);
    }, 100);
    return () => { clearInterval(timer); persist(); };
  }, [running, state?.phase, state?.index]);
  const question = state?.questions[state.index];
  const lightning = !!state?.bonus && state.bonusKind !== "match";
  const bonusLabel = state?.bonusKind === "match" ? "WHO / WHAT / WHEN" : "LIGHTNING ROUND";
  const count = !state ? categories.length : state.phase === "bonus" ? 2 : state.phase === "wager" ? 3 : state.phase === "question" ? lightning ? 1 : question?.answers.length ?? 1 : 1;
  useGameControls(input, {
    rotate: steps => setSelection(value => Math.max(0, Math.min(count - 1, value + steps))),
    command: value => {
      if (value !== "select") return;
      const current = live.current;
      if (!current) { update(newQuiz(categories[selection].id, tracks, Date.now())); return; }
      if (!current.questions.length || current.phase === "result") { update(null); return; }
      if (current.phase === "question") update(answerQuiz(current, current.bonus && current.bonusKind !== "match" ? 0 : selection));
      else if (current.phase === "answer") update(advanceQuiz(current, tracks));
      else if (current.phase === "bonus") update(chooseQuizBonus(current, selection === 0 ? "lightning" : "match"));
      else if (current.phase === "wager") update(startQuizBonus(current, tracks, [10, 25, 50][selection]));
    },
  });
  const skipped = !!state && lightning && state.chosen === -1 && question?.correct === 1;
  const correct = state?.phase === "answer" && question?.correct === state.chosen;
  return <div className={`iquiz-game ${state ? state.bonus ? lightning ? "iquiz-lightning" : "iquiz-match" : "" : "iquiz-categories"}`} data-game="iquiz" data-phase={state?.phase ?? "categories"}>
    <div className="quiz-stage-lights" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /></div>
    <header className="quiz-game-header"><strong>iQuiz</strong><span>{state ? `$${state.score}` : ""}</span></header>
    {!state ? <>
      <div className="quiz-emblem" aria-hidden="true">?</div>
      <div className="quiz-category-list">
        {categories.map((category, index) => <div key={category.id} className={index === selection ? "selected" : ""} aria-current={index === selection ? "true" : undefined}>{category.label}</div>)}
      </div>
    </> : !state.questions.length ? <div className="quiz-result"><strong>Music Quiz 2</strong><p>音乐库中还没有足够的艺人或歌曲信息。</p></div>
    : state.phase === "result" ? <div className="quiz-result"><span>FINAL SCORE</span><strong>${state.score}</strong><p>{state.strikes >= 3 ? "GAME OVER" : "游戏结束"}</p></div>
    : state.phase === "bonus" ? <div className="quiz-bonus">
      <strong>WHEEL OF CHANCE</strong>
      <div className="quiz-bonus-modes">{["LIGHTNING ROUND", "WHO / WHAT / WHEN"].map((label, index) =>
        <div key={label} className={selection === index ? "selected" : ""} aria-current={selection === index ? "true" : undefined}>{label}</div>)}</div>
    </div> : state.phase === "wager" ? <div className="quiz-bonus">
      <strong>{bonusLabel}</strong><span>每题押注 · 押注越高，题目越少</span>
      <div className="quiz-wagers">{[10, 25, 50].map((amount, index) => <span key={amount} className={selection === index ? "selected" : ""}>${amount}</span>)}</div>
    </div> : <>
      <div className="quiz-round"><span>{state.bonus ? bonusLabel : `ROUND ${state.round}`}</span>
        <span>{state.index + 1} / {state.questions.length}</span><span aria-label={`${state.strikes}次错误`}>{"×".repeat(state.strikes)}</span></div>
      <div className="quiz-timer" role="meter" aria-label="答题剩余时间" aria-valuemin={0} aria-valuemax={state.bonus ? 10 : 20} aria-valuenow={Math.ceil(state.remaining)}>
        <i style={{ width: `${state.remaining / (state.bonus ? 10 : 20) * 100}%` }} /></div>
      <div className={`quiz-question ${question?.artwork ? "has-art" : ""}`}>
        {question?.artwork && <img src={question.artwork} alt="" />}
        <p>{question?.prompt}</p>
      </div>
      <div className="quiz-answers">
        {lightning && state.phase === "question" ? <div className="selected quiz-lightning-action" aria-current="true">正确时按中心键；错误时等待</div> : question?.answers.map((answer, index) => <div key={index}
          className={`${index === selection && state.phase === "question" ? "selected" : ""} ${state.phase === "answer" && index === question.correct ? "correct" : ""} ${state.phase === "answer" && index === state.chosen && !correct ? "incorrect" : ""}`}
          aria-current={state.phase === "question" && index === selection ? "true" : undefined}>
          <b>{String.fromCharCode(65 + index)}</b><MarqueeText text={answer} active={selection === index} />
        </div>)}
      </div>
      {state.phase === "answer" && <div className={`quiz-feedback ${correct ? "correct" : skipped ? "skipped" : "incorrect"}`} role="status">{correct ? "CORRECT" : skipped ? "SKIPPED" : state.chosen === -1 ? "TIME UP" : "INCORRECT"}</div>}
    </>}
  </div>;
}
