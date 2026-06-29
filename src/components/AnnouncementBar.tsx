import type { AnnouncementBar as AnnouncementConfig, AnnouncementType, AnnouncementSpeed } from '@/types';

/** Default background per announcement type — overridden by custom backgroundColor when set. */
const TYPE_BG: Record<AnnouncementType, string> = {
  offer:       '#DC2626', // red
  information: '#2563EB', // blue
  warning:     '#EA580C', // orange
  event:       '#7C3AED', // purple
};

/** Marquee duration (seconds) per speed. Slower = larger number. */
const SPEED_DURATION: Record<AnnouncementSpeed, number> = {
  slow:   34,
  medium: 22,
  fast:   13,
};

/** True when the announcement should be visible right now (enabled, has text, within date window). */
export function isAnnouncementActive(a?: AnnouncementConfig | null): boolean {
  if (!a || !a.enabled) return false;
  if (!a.text?.trim()) return false;
  // Date window is inclusive; YYYY-MM-DD compares lexicographically against today's local date.
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  if (a.startDate && todayStr < a.startDate) return false;
  if (a.endDate && todayStr > a.endDate) return false;
  return true;
}

export default function AnnouncementBar({ announcement }: { announcement?: AnnouncementConfig | null }) {
  if (!isAnnouncementActive(announcement)) return null;
  const a = announcement!;

  const bg = a.backgroundColor || TYPE_BG[a.type ?? 'offer'];
  const fg = a.textColor || '#FFFFFF';
  const duration = SPEED_DURATION[a.speed ?? 'medium'];
  const text = a.text!.trim();
  const hasButton = !!(a.link && a.buttonText?.trim());

  // Repeat the message inside each half so it fills wide screens; two identical halves
  // animated to -50% create a seamless infinite loop.
  const half = (
    <div className="ab-group" aria-hidden="false">
      {Array.from({ length: 4 }).map((_, i) => (
        <span key={i} className="ab-item">{text}</span>
      ))}
    </div>
  );

  const marquee = (
    <div className="ab-viewport">
      <div className="ab-track" style={{ animationDuration: `${duration}s` }}>
        {half}
        {/* duplicate for seamless wrap */}
        <div className="ab-group" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <span key={i} className="ab-item">{text}</span>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div
      className="ab-bar"
      style={{ background: bg, color: fg }}
      role="region"
      aria-label="Announcement"
    >
      {/* When there is no separate button but a link is set, the whole marquee is clickable */}
      {a.link && !hasButton ? (
        <a href={a.link} target="_blank" rel="noopener noreferrer" className="ab-link" style={{ color: fg }}>
          {marquee}
        </a>
      ) : (
        marquee
      )}

      {hasButton && (
        <a
          href={a.link}
          target="_blank"
          rel="noopener noreferrer"
          className="ab-button"
          style={{ color: bg, background: fg }}
        >
          {a.buttonText!.trim()}
        </a>
      )}

      <style>{`
        .ab-bar {
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 38px;
          padding: 0 12px;
          overflow: hidden;
          width: 100%;
          font-size: 13.5px;
          font-weight: 600;
          line-height: 1;
        }
        @media (min-width: 640px) {
          .ab-bar { min-height: 42px; font-size: 14px; padding: 0 16px; }
        }
        .ab-link { display: block; flex: 1 1 auto; min-width: 0; text-decoration: none; }
        .ab-viewport { flex: 1 1 auto; min-width: 0; overflow: hidden; }
        .ab-track {
          display: inline-flex;
          width: max-content;
          white-space: nowrap;
          animation-name: ab-marquee;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          will-change: transform;
        }
        /* Pause on hover (desktop only — hover devices) */
        @media (hover: hover) {
          .ab-bar:hover .ab-track { animation-play-state: paused; }
        }
        .ab-group { display: inline-flex; }
        .ab-item { padding: 0 28px; display: inline-block; }
        .ab-button {
          flex: 0 0 auto;
          white-space: nowrap;
          font-size: 12px;
          font-weight: 700;
          padding: 5px 12px;
          border-radius: 9999px;
          text-decoration: none;
          box-shadow: 0 1px 2px rgba(0,0,0,.15);
        }
        @keyframes ab-marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ab-track { animation: none; }
        }
      `}</style>
    </div>
  );
}
