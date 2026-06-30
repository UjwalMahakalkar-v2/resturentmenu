import { Share2 } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * "Share Menu" button — works on every template (styling is passed in).
 * Uses the native share sheet on mobile; falls back to copying the link on desktop.
 */
export default function ShareMenuButton({
  title,
  triggerClassName,
  triggerStyle,
  accent = 'var(--color-primary)',
  label = 'Share Menu',
  showIcon = true,
}: {
  title: string;
  triggerClassName?: string;
  triggerStyle?: React.CSSProperties;
  accent?: string;
  label?: string;
  showIcon?: boolean;
}) {
  const share = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const shareTitle = `${title} — Menu`;
    const nav: any = typeof navigator !== 'undefined' ? navigator : null;
    if (nav?.share) {
      try { await nav.share({ title: shareTitle, text: `Check out the menu at ${title}`, url }); return; } catch { /* user cancelled */ return; }
    }
    try {
      await nav?.clipboard?.writeText(url);
      toast.success('Menu link copied!');
    } catch {
      // Last-resort fallback: open a WhatsApp share with the link
      window.open(`https://wa.me/?text=${encodeURIComponent(`${shareTitle} ${url}`)}`, '_blank');
    }
  };

  return (
    <button
      type="button"
      onClick={share}
      aria-label="Share menu"
      className={triggerClassName ?? 'inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold text-sm text-white shadow-md transition-transform hover:scale-105 active:scale-95'}
      style={triggerStyle ?? (triggerClassName ? undefined : { background: accent })}
    >
      {showIcon && <Share2 className="w-4 h-4" />}
      {label}
    </button>
  );
}
