import { useEffect, useState } from "react";
export function ClassicClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const update = () => setNow(new Date());
    const timer = setInterval(() => {
      if (!document.hidden) update();
    }, 1000);
    document.addEventListener("visibilitychange", update);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  return (
    <div className="classic-clock">
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle
          cx="60"
          cy="60"
          r="56"
          fill="#f9fafb"
          stroke="#647887"
          strokeWidth="3"
        />
        {Array.from({ length: 12 }, (_, index) => (
          <path
            key={index}
            d="M60 10v6"
            stroke="#3c4a54"
            strokeWidth="2"
            transform={`rotate(${index * 30} 60 60)`}
          />
        ))}
        <path
          d="M60 60V31"
          stroke="#1d2932"
          strokeWidth="4"
          transform={`rotate(${(now.getHours() % 12) * 30 + now.getMinutes() / 2} 60 60)`}
        />
        <path
          d="M60 60V19"
          stroke="#1d2932"
          strokeWidth="3"
          transform={`rotate(${now.getMinutes() * 6 + now.getSeconds() / 10} 60 60)`}
        />
        <path
          d="M60 70V16"
          stroke="#cc3533"
          strokeWidth="1"
          transform={`rotate(${now.getSeconds() * 6} 60 60)`}
        />
        <circle cx="60" cy="60" r="3" fill="#354853" />
      </svg>
      <strong>
        {now.toLocaleTimeString("zh-CN", {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </strong>
      <span>
        {now.toLocaleDateString("zh-CN", {
          month: "long",
          day: "numeric",
          weekday: "long",
        })}
      </span>
    </div>
  );
}
