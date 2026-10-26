import { useEffect, useState } from "react";

type Sample = {
  title: string;
  artist: string;
  filename: string;
  source: string;
  kind: string;
};

/** Reuse the existing private development clips through the player's own menu. */
export function useTestMusic() {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const abort = new AbortController();
    void fetch("/__test-music/catalog.json", { signal: abort.signal })
      .then(async (response) => {
        if (response.ok) setSamples(await response.json());
      })
      .catch(() => {
        /* Optional files are absent on a clean checkout. */
      });
    return () => abort.abort();
  }, []);
  const load = async () => {
    if (!import.meta.env.DEV) return [];
    setLoading(true);
    try {
      return await Promise.all(
        samples.map(async (sample) => {
          const response = await fetch(`/__test-music/${sample.filename}`);
          if (!response.ok) throw new Error("Test clip unavailable");
          return new File(
            [await response.blob()],
            `${sample.artist} - ${sample.title}（试听片段）.m4a`,
            { type: "audio/mp4", lastModified: 0 },
          );
        }),
      );
    } finally {
      setLoading(false);
    }
  };
  return { samples, loading, load };
}
