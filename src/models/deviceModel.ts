export type EvidenceLabel = "documented" | "measured" | "provisional" | "adaptation";

export type DeviceModelSpec = {
  id: string;
  family: string;
  generation: number;
  hardwareRevision: string;
  capacity: string | null;
  firmware: string | null;
  body: {
    height: number;
    width: number;
    evidence: EvidenceLabel;
    source: string;
  };
  lcd: {
    width: number;
    height: number;
    evidence: EvidenceLabel;
    source: string;
  };
  input: {
    kind: "click-wheel" | "touch-wheel" | "scroll-wheel" | "multi-touch";
    displayOnly: boolean;
    timing: Record<string, number>;
    timingEvidence: EvidenceLabel;
    quickScroll?: {
      minimumItems: number;
      enterDegrees: number;
      streakGap: number;
      idle: number;
    };
    quickScrollEvidence?: {
      minimumItems: EvidenceLabel;
      recognition: EvidenceLabel;
    };
  };
  menus: {
    homeOrder: readonly string[];
    settingsOrder: readonly string[];
    settingsSource: string;
  };
  playback: {
    views: readonly string[];
    evidence: EvidenceLabel;
  };
};
