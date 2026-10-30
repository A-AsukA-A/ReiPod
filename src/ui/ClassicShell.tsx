import type { ComponentProps, CSSProperties, ReactNode, RefObject } from "react";
import { classic2007 } from "../models/classic";
import { ClickWheel } from "../input/ClickWheel";
import { HoldSwitch } from "./HoldSwitch";
import { ReadOnlyScreen } from "./ReadOnlyScreen";
import { lcdMotionStyle } from "./motion";
import type { Appearance } from "./appearance";
import type { Page } from "./navigation";
import type { PlayView } from "./nowPlaying";

type Props = {
  appearance: Appearance;
  selectedService: string;
  playbackSource: string;
  page: Page;
  view?: PlayView;
  split: boolean;
  held: boolean;
  sleeping: boolean;
  dimmed: boolean;
  brightness: number;
  notice: string;
  contentRef: RefObject<HTMLDivElement | null>;
  onActivity: () => void;
  onToggleHold: () => void;
  wheel: Omit<ComponentProps<typeof ClickWheel>, "timing" | "disabled">;
  imports: ReactNode;
  header: ReactNode;
  children: ReactNode;
};

/** Current classic renderer: receives UI state/commands, never owns a playback session. */
export function ClassicShell({
  appearance, selectedService, playbackSource, page, view, split,
  held, sleeping, dimmed, brightness, notice, contentRef,
  onActivity, onToggleHold, wheel, imports, header, children,
}: Props) {
  return (
    <main
      className="app-shell"
      data-model={classic2007.id}
      data-input-kind={classic2007.input.kind}
      style={{
        "--lcd-native-width": classic2007.lcd.width,
        "--lcd-aspect": classic2007.lcd.height / classic2007.lcd.width,
      } as CSSProperties}
      aria-label="ReiPod 音乐播放器"
      data-finish={appearance.finish}
      data-background={appearance.background}
      data-music-service={selectedService}
      data-playback-source={playbackSource}
      onPointerDownCapture={event => {
        if (!(event.target as Element).closest(".screen-glass") && !held) onActivity();
      }}
      onKeyDownCapture={() => { if (!held) onActivity(); }}
      onWheelCapture={event => {
        if (!(event.target as Element).closest(".screen-glass") && !held) onActivity();
      }}
    >
      {imports}
      <section className="classic-device" aria-label="classic 播放器">
        <HoldSwitch held={held} onToggle={onToggleHold} />
        <ReadOnlyScreen scene={page}>
          <div
            className="lcd-screen"
            data-page={page}
            data-split={split ? "true" : undefined}
            data-sleeping={sleeping}
            data-view={view}
            style={{ ...lcdMotionStyle, filter: `brightness(${brightness})` }}
          >
            <div className="screen-viewport" inert={held || sleeping}>
              <div className="screen-content" ref={contentRef}>
                {header}
                {children}
              </div>
            </div>
            {dimmed && <div className="lcd-backlight-dim" aria-hidden="true" />}
            {notice && <div className="screen-notice" role="status">{notice}</div>}
          </div>
        </ReadOnlyScreen>
        <ClickWheel timing={classic2007.input.timing} disabled={held} {...wheel} />
      </section>
    </main>
  );
}
