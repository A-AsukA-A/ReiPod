import { useEffect, useRef, useState } from "react";
import type { Ref } from "react";
import { cardName, cardRank, cardRed, cardSuit, dealKlondike, drawKlondike, klondikePile,
  moveKlondike, validKlondike, wonKlondike } from "../../models/klondike";
import type { Card, CardSource } from "../../models/klondike";
import { readGame, saveGame } from "../../services/gameStorage";
import type { GameInput } from "../gameInput";
import { useGameControls } from "./gameControls";

function Suit({ suit, x = 0, y = 0, size = 12 }: { suit: number; x?: number; y?: number; size?: number }) {
  const paths = ["M12 1C8 6 2 9 2 14c0 6 7 7 10 1 3 6 10 5 10-1 0-5-6-8-10-13M12 14 7 23h10Z",
    "M12 23C-4 12 1-3 9 3l3 4 3-4c8-6 13 9-3 20Z", "m12 0 11 12-11 12L1 12Z",
    "M12 0c-6 0-8 8-3 11C0 5-5 20 5 21c3 0 5-2 7-5 2 3 4 5 7 5 10-1 5-16-4-10 5-3 3-11-3-11M12 14 7 24h10Z"];
  return <svg x={x} y={y} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"><path d={paths[suit]} fill="currentColor" /></svg>;
}
function PlayingCard({ card, x, y, selected, picked }: { card: Card; x: number; y: number; selected: boolean; picked: boolean }) {
  return <g transform={`translate(${x} ${y})`} aria-label={card.up ? cardName(card.id) : "背面牌"}>
    <rect width="36" height="49" rx="2" fill={card.up ? "#fffdf7" : "#e4d7b7"} stroke={picked ? "#ffde55" : selected ? "#f3f4c1" : "#142914"} strokeWidth={selected || picked ? 2 : 0.75} />
    {card.up ? <g color={cardRed(card.id) ? "#c11d32" : "#17202a"}>
      <text x="3" y="13" fontSize="12" fontWeight="700" fill="currentColor">{["", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"][cardRank(card.id)]}</text>
      <Suit suit={cardSuit(card.id)} x={22} y={3} size={11} />
      <Suit suit={cardSuit(card.id)} x={9} y={22} size={19} />
    </g> : <>
      <rect x="3" y="3" width="30" height="43" fill="#923e2a" stroke="#e8c98c" />
      {[7, 14, 21, 28, 35].map(y => <path key={y} d={`M5 ${y}h26m-26 4h26`} stroke="#d89857" strokeWidth="0.5" />)}
      <path d="m18 9 9 16-9 16-9-16Z" fill="#c7a25b" stroke="#f0d59c" />
      <path d="m18 16 5 9-5 9-5-9Z" fill="#6a3629" />
    </>}
  </g>;
}

export function KlondikeGame({ input, running, fresh, draws, onSaveError }: {
  input: Ref<GameInput>; running: boolean; fresh: boolean; draws: 1 | 3; onSaveError: () => void;
}) {
  const [state, setState] = useState(() => !fresh && readGame("klondike", validKlondike) || dealKlondike(Date.now(), draws));
  const live = useRef(state); live.current = state;
  const [cursor, setCursor] = useState(0);
  const [picked, setPicked] = useState<CardSource | null>(null);
  const [depth, setDepth] = useState(0);
  const [invalid, setInvalid] = useState(false);
  const [time, setTime] = useState(() => new Date());
  const [undo, setUndo] = useState<typeof state[]>([]);
  useEffect(() => {
    if (!saveGame("klondike", state)) onSaveError();
  }, [state]);
  useEffect(() => {
    if (!running) return;
    setTime(new Date());
    const timer = setInterval(() => setTime(new Date()), 30_000);
    return () => clearInterval(timer);
  }, [running]);
  const commit = (next: typeof state) => {
    if (next === live.current) { setInvalid(true); return; }
    const previous = live.current;
    setUndo(history => [...history.slice(-29), previous]);
    live.current = next; setState(next); setPicked(null); setDepth(0); setInvalid(false);
  };
  useGameControls(input, {
    rotate: steps => { setCursor(value => (value + steps % 13 + 13) % 13); setDepth(0); setInvalid(false); },
    command: value => {
      if (value === "previous" || value === "next") {
        if (picked) { setPicked(null); setDepth(0); return; }
        const pile = klondikePile(live.current, cursor), count = cursor >= 6 ? pile.filter(card => card.up).length : 1;
        setDepth(current => Math.max(0, Math.min(count - 1, current + (value === "previous" ? 1 : -1))));
      }
      if (value === "options") {
        const previous = undo.at(-1);
        if (previous) { live.current = previous; setState(previous); setUndo(history => history.slice(0, -1)); setPicked(null); setDepth(0); }
      }
      if (value !== "select" || wonKlondike(live.current)) return;
      if (cursor === 0) { commit(drawKlondike(live.current)); return; }
      if (picked) {
        if (picked.pile === cursor) { setPicked(null); setDepth(0); }
        else commit(moveKlondike(live.current, picked, cursor));
      } else {
        const pile = klondikePile(live.current, cursor), index = pile.length - 1 - depth;
        if (pile[index]?.up) { setPicked({ pile: cursor, index }); setInvalid(false); }
      }
    },
  });
  const tableY = 87;
  const at = (pile: number) => pile < 2 ? { x: 10 + pile * 46, y: 29 }
    : pile < 6 ? { x: 142 + (pile - 2) * 43, y: 29 } : { x: 7 + (pile - 6) * 44, y: tableY };
  return <div className="klondike-game" data-game="klondike" data-moves={state.moves} data-picked={picked?.pile}>
    <svg viewBox="0 0 320 240" className="klondike-table" role="img" aria-label={`Klondike，${state.moves}步，${picked ? "移动" : "选择"}${cursor === 0 ? "牌堆" : cursor === 1 ? "弃牌堆" : cursor < 6 ? "收牌区" : `第${cursor - 5}列`}${invalid ? "，此处不能放牌" : ""}`}>
      <defs><pattern id="felt-grain" width="24" height="24" patternUnits="userSpaceOnUse">
        <rect width="24" height="24" fill="#234e25" /><path d="M0 3q12 20 24 0M-12 15q12 20 24 0m0 0q12 20 24 0" fill="none" stroke="#496c34" strokeWidth="0.6" opacity="0.42" />
      </pattern><radialGradient id="felt-light"><stop stopColor="#5c803b" stopOpacity="0.35" /><stop offset="1" stopColor="#122b18" stopOpacity="0.5" /></radialGradient></defs>
      <rect width="320" height="240" fill="url(#felt-grain)" /><rect width="320" height="240" fill="url(#felt-light)" />
      <g fill="#dbedcc" fontSize="10" fontWeight="600"><text x="10" y="16">{time.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</text><text x="307" y="16" textAnchor="end">${state.bank}</text></g>
      {Array.from({ length: 13 }, (_, pile) => {
        const point = at(pile), cards = klondikePile(state, pile);
        const step = pile >= 6 ? Math.min(17, 99 / Math.max(1, cards.length - 1)) : 0;
        const shown = pile >= 6 ? cards : cards.slice(-1);
        return <g key={pile}>
          <rect x={point.x} y={point.y} width="36" height="49" rx="3" fill="#28482c" fillOpacity="0.25"
            stroke={cursor === pile ? invalid ? "#e6a18a" : "#d9e8ad" : "#7d9663"} strokeWidth={cursor === pile ? 1.7 : 0.7} />
          {pile >= 2 && pile < 6 && !cards.length && <g color="#183b21" opacity="0.8"><Suit suit={pile - 2} x={point.x + 9} y={point.y + 15} size={18} /></g>}
          {pile === 0 && !cards.length && state.waste.length > 0 && <path d={`M${point.x + 11} ${point.y + 18}a10 10 0 1 1 0 14m-3-16 4-5 4 5`} fill="none" stroke="#bed0a1" strokeWidth="2" />}
          {shown.map((card, index) => <PlayingCard key={card.id} card={card} x={point.x} y={point.y + index * step}
            selected={cursor === pile && index === shown.length - 1 - depth} picked={picked?.pile === pile && index >= picked.index} />)}
        </g>;
      })}
      {wonKlondike(state) && <g><rect x="46" y="94" width="228" height="66" rx="5" fill="#153b21" stroke="#ddcf84" /><text x="160" y="122" textAnchor="middle" fill="#ffeb9d" fontSize="21">获胜</text><text x="160" y="145" textAnchor="middle" fill="white" fontSize="12">${state.bank}</text></g>}
    </svg>
  </div>;
}
