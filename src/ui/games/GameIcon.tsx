export function GameIcon({ game }: { game: string }) {
  return <svg className={`game-icon game-icon-${game}`} viewBox="0 0 48 48" aria-hidden="true">
    <rect x="1" y="1" width="46" height="46" rx="6" fill={game === "iquiz" ? "#092963" : game === "klondike" ? "#215025" : "#352c13"} />
    {game === "iquiz" ? <>
      <path d="M14 8h20v26H14Z" fill="none" stroke="#68bdf4" strokeWidth="3" />
      <path d="m25 31 11 10" stroke="#68bdf4" strokeWidth="4" />
      <text x="24" y="29" textAnchor="middle" fontSize="23" fill="white">?</text>
    </> : game === "klondike" ? <>
      <rect x="8" y="7" width="25" height="33" rx="2" fill="#faf5e2" transform="rotate(-12 20 24)" />
      <rect x="17" y="9" width="24" height="33" rx="2" fill="#fff" stroke="#c9c6ba" transform="rotate(9 28 24)" />
      <path d="M28 32c-12-7-11-14-6-14 3 0 5 3 6 5 1-2 3-5 6-5 5 0 6 7-6 14" fill="#ac2735" />
    </> : <>
      {[18, 13, 8].map((r, i) => <circle key={r} cx="24" cy="24" r={r} fill="none" stroke={["#d9b254", "#567a24", "#a33a2b"][i]} strokeWidth="4" />)}
      <circle cx="24" cy="24" r="5" fill="#101b24" />
      <path d="M15 41h17" stroke="#b9edfc" strokeWidth="4" />
    </>}
  </svg>;
}
