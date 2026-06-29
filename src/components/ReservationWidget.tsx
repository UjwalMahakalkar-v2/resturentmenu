import { useState } from 'react';
import { CalendarCheck, X } from 'lucide-react';
import { publicReservationsAPI } from '@/services/api';

interface Props {
  tenantId: string;
  /** Accent color for the modal + default trigger button. Accepts hex or a CSS var like 'var(--color-primary)'. */
  accent?: string;
  /** Classes for the trigger button. When omitted, a default pill button styled with `accent` is rendered. */
  triggerClassName?: string;
  /** Inline styles for the trigger button (e.g. background using the template accent). */
  triggerStyle?: React.CSSProperties;
  label?: string;
  showIcon?: boolean;
}

const EMPTY = {
  customerName: '', customerPhone: '', customerEmail: '',
  reservationDate: '', reservationTime: '', partySize: 2, notes: '',
};

export default function ReservationWidget({
  tenantId,
  accent = 'var(--color-primary)',
  triggerClassName,
  triggerStyle,
  label = 'Reserve a Table',
  showIcon = true,
}: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const close = () => { setOpen(false); setSuccess(null); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;
    setSubmitting(true);
    try {
      const res = await publicReservationsAPI.create({
        tenantId,
        ...form,
        customerEmail: form.customerEmail || undefined,
        notes: form.notes || undefined,
      });
      setSuccess(res.id);
      setForm(EMPTY);
    } catch {
      alert('Failed to submit booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Default trigger styling when the template doesn't supply its own classes
  const defaultTrigger = !triggerClassName;

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); setSuccess(null); }}
        className={triggerClassName ?? 'inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold text-sm text-white shadow-md transition-transform hover:scale-105 active:scale-95'}
        style={triggerStyle ?? (defaultTrigger ? { background: accent } : undefined)}
      >
        {showIcon && <CalendarCheck className="w-4 h-4" />}
        {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.55)' }}
          onClick={e => { if (e.target === e.currentTarget) close(); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-5 h-5" style={{ color: accent }} />
                <h2 className="text-lg font-bold text-gray-900">Reserve a Table</h2>
              </div>
              <button
                onClick={close}
                className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              ><X className="w-5 h-5" /></button>
            </div>

            <div className="px-6 py-5">
              {success ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <CalendarCheck className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Booking Received!</h3>
                  <p className="text-gray-500 text-sm mb-1">We'll confirm your reservation shortly.</p>
                  <p className="text-xs text-gray-400 font-mono">Ref: {success}</p>
                  <button
                    onClick={close}
                    className="mt-5 px-6 py-2.5 rounded-full text-sm font-semibold text-white transition-colors"
                    style={{ background: accent }}
                  >Done</button>
                </div>
              ) : (
                <form onSubmit={submit} className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Your Name *</label>
                      <input required value={form.customerName} onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))}
                        placeholder="Full name" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2" style={{ '--tw-ring-color': accent } as any} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Phone *</label>
                      <input required type="tel" value={form.customerPhone} onChange={e => setForm(f => ({ ...f, customerPhone: e.target.value }))}
                        placeholder="+91 98765..." className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2" style={{ '--tw-ring-color': accent } as any} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
                      <input type="email" value={form.customerEmail} onChange={e => setForm(f => ({ ...f, customerEmail: e.target.value }))}
                        placeholder="optional" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2" style={{ '--tw-ring-color': accent } as any} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Date *</label>
                      <input required type="date" value={form.reservationDate}
                        min={new Date().toISOString().slice(0, 10)}
                        onChange={e => setForm(f => ({ ...f, reservationDate: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2" style={{ '--tw-ring-color': accent } as any} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Time *</label>
                      <select required value={form.reservationTime} onChange={e => setForm(f => ({ ...f, reservationTime: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 bg-white" style={{ '--tw-ring-color': accent } as any}>
                        <option value="">Select time</option>
                        {Array.from({ length: 25 }, (_, i) => {
                          const h = Math.floor(i / 2) + 10;
                          const m = i % 2 === 0 ? '00' : '30';
                          if (h > 22) return null;
                          const suffix = h < 12 ? 'AM' : 'PM';
                          const lbl = `${h % 12 || 12}:${m} ${suffix}`;
                          return <option key={`${h}:${m}`} value={`${String(h).padStart(2, '0')}:${m}`}>{lbl}</option>;
                        })}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Party Size *</label>
                      <div className="flex items-center gap-3 border border-gray-300 rounded-lg px-3 py-2.5">
                        <button type="button" onClick={() => setForm(f => ({ ...f, partySize: Math.max(1, f.partySize - 1) }))}
                          className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm flex items-center justify-center">−</button>
                        <span className="flex-1 text-center text-sm font-semibold">{form.partySize}</span>
                        <button type="button" onClick={() => setForm(f => ({ ...f, partySize: Math.min(20, f.partySize + 1) }))}
                          className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm flex items-center justify-center">+</button>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Special Requests</label>
                      <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                        placeholder="Allergies, celebrations, seating preference…" rows={2}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 resize-none" style={{ '--tw-ring-color': accent } as any} />
                    </div>
                  </div>
                  <button type="submit" disabled={submitting}
                    className="w-full py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-60 transition-opacity"
                    style={{ background: accent }}>
                    {submitting ? 'Submitting…' : 'Request Reservation'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
