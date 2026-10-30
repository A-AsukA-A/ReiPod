/** Implemented ReiPod baseline, not a claim that a specific Apple firmware is running. */
export const classic2007 = {
  id: "classic-2007",
  family: "ipod-classic",
  generation: 6,
  hardwareRevision: "2007",
  // The existing shell does not distinguish 80/160GB thickness; do not invent a variant.
  capacity: null,
  firmware: null,
  lcd: {
    width: 320,
    height: 240,
    evidence: "documented",
    source: "https://support.apple.com/en-us/112478",
  },
  input: {
    kind: "click-wheel",
    displayOnly: true,
    // Existing ReiPod input thresholds, not recovered hardware timing constants.
    timing: { seek: 350, options: 600, sleep: 800, repeat: 120 },
    timingEvidence: "adaptation",
  },
  menus: {
    // Unsupported Videos omitted; Cover Flow is an optional home shortcut.
    homeOrder: ["music", "coverflow", "photos", "podcasts", "extras", "settings", "shuffle-all", "playing"],
  },
  playback: {
    // ReiPod's implemented sequence; Genius omitted until supported; lyrics conditional.
    views: ["art", "seek", "shuffle", "rating", "lyrics"],
    evidence: "adaptation",
  },
} as const;
