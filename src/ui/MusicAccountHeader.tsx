import { useState } from "react";
import type { MusicAccountProfile } from "../services/thirdPartyMusic";
import { MarqueeText } from "./MarqueeText";

export function MusicAccountHeader({
  profile,
  serviceName,
  authorized,
  syncing,
  status,
  detail,
  error,
  qr,
}: {
  profile?: MusicAccountProfile;
  serviceName: string;
  authorized: boolean;
  syncing: boolean;
  status: string;
  detail: string;
  error: string;
  qr: boolean;
}) {
  const [failedAvatar, setFailedAvatar] = useState<string>();
  return (
    <section
      className={`music-account-header ${qr ? "is-scanning" : ""}`}
      aria-label="账户信息"
    >
      {!qr && (
        <div className="music-account-identity">
          <div className="music-account-avatar">
            {profile?.avatar && failedAvatar !== profile.avatar ? (
              <img
                src={profile.avatar}
                alt="账户头像"
                referrerPolicy="no-referrer"
                draggable={false}
                onError={() => setFailedAvatar(profile.avatar)}
              />
            ) : (
              <svg viewBox="0 0 32 32" role="img" aria-label="默认账户头像">
                <circle cx="16" cy="11" r="5" />
                <path d="M6 28v-3c0-5 4-8 10-8s10 3 10 8v3" />
              </svg>
            )}
          </div>
          <div className="music-account-name">
            <strong>
              <MarqueeText text={profile?.name || serviceName} active />
            </strong>
            <span
              className="music-account-id"
              title={profile?.id ? `ID ${profile.id}` : undefined}
            >
              {profile?.id
                ? `ID ${profile.id}`
                : authorized
                  ? "账户 ID 未提供"
                  : "音乐服务账户"}
            </span>
          </div>
        </div>
      )}
      <div className="music-account-summary" role="status" aria-live="polite">
        <div
          className="music-account-connection"
          data-connected={authorized}
          data-busy={syncing}
        >
          <i aria-hidden="true" />
          <span>{status}</span>
        </div>
        {!qr && (
          <p className={error ? "music-account-error" : "music-account-detail"}>
            {error || detail}
          </p>
        )}
      </div>
    </section>
  );
}
