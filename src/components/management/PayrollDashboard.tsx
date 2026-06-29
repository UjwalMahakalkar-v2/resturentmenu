import { useState, useEffect, useCallback } from 'react';
import { DollarSign, CheckCircle, Clock, RefreshCw, ChevronDown, ChevronUp, Users, FileText } from 'lucide-react';
import { staffAPI, payrollAPI, attendanceAPI } from '@/services/api';
import type { Staff, Payroll } from '@/types';
import toast from 'react-hot-toast';

function monthLabel(m: string) {
  const [y, mo] = m.split('-');
  return new Date(Number(y), Number(mo) - 1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
}

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

interface GenerateModalProps {
  staff: Staff;
  month: string;
  existing?: Payroll;
  onClose: () => void;
  onDone: () => void;
}

function GenerateModal({ staff, month, existing, onClose, onDone }: GenerateModalProps) {
  const [form, setForm] = useState({
    baseSalary: existing?.baseSalary ?? staff.salaryAmount,
    overtimeAmount: existing?.overtimeAmount ?? 0,
    advanceDeduction: existing?.advanceDeduction ?? 0,
    notes: existing?.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [att, setAtt] = useState({ present: 0, absent: 0, half_day: 0, leave: 0, loading: true });

  // Load this staff's attendance for the selected month to show a present/absent breakdown
  useEffect(() => {
    const [y, mo] = month.split('-').map(Number);
    const days = new Date(y, mo, 0).getDate();
    const from = `${month}-01`;
    const to = `${month}-${String(days).padStart(2, '0')}`;
    attendanceAPI.getByRange(from, to, staff.id)
      .then((rows: any[]) => {
        const c = { present: 0, absent: 0, half_day: 0, leave: 0 };
        rows.forEach(r => { if (r.status in c) c[r.status as keyof typeof c]++; });
        setAtt({ ...c, loading: false });
      })
      .catch(() => setAtt(a => ({ ...a, loading: false })));
  }, [month, staff.id]);

  const absentDed = existing?.absentDeduction ?? 0;
  const final = Math.max(0, Number(form.baseSalary) + Number(form.overtimeAmount) - absentDed - Number(form.advanceDeduction));

  const handleSave = async () => {
    setSaving(true);
    try {
      await payrollAPI.generate({
        staffId: staff.id,
        month,
        baseSalary: Number(form.baseSalary),
        overtimeAmount: Number(form.overtimeAmount),
        advanceDeduction: Number(form.advanceDeduction),
        notes: form.notes,
      });
      toast.success('Payroll generated');
      onDone();
    } catch {
      toast.error('Failed to generate payroll');
    } finally {
      setSaving(false);
    }
  };

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <p className="font-semibold text-gray-900">{staff.name}</p>
            <p className="text-xs text-gray-500">{monthLabel(month)}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
        </div>
        <div className="p-4 space-y-3">
          {/* Attendance breakdown for the month */}
          <div>
            <p className="text-xs font-medium text-gray-600 mb-1.5">Attendance — {monthLabel(month)}</p>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Present',  value: att.present,  cls: 'bg-green-50 text-green-700' },
                { label: 'Absent',   value: att.absent,   cls: 'bg-red-50 text-red-700' },
                { label: 'Half-day', value: att.half_day, cls: 'bg-amber-50 text-amber-700' },
                { label: 'Leave',    value: att.leave,    cls: 'bg-blue-50 text-blue-700' },
              ].map(x => (
                <div key={x.label} className={`rounded-lg py-2 text-center ${x.cls}`}>
                  <p className="text-lg font-bold leading-none">{att.loading ? '–' : x.value}</p>
                  <p className="text-[10px] font-medium mt-1">{x.label}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Base Salary (₹)</label>
            <input
              type="number"
              min={0}
              value={form.baseSalary}
              onChange={e => set('baseSalary', e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Overtime (₹)</label>
            <input
              type="number"
              min={0}
              value={form.overtimeAmount}
              onChange={e => set('overtimeAmount', e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Advance Deduction (₹)</label>
            <input
              type="number"
              min={0}
              value={form.advanceDeduction}
              onChange={e => set('advanceDeduction', e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          {absentDed > 0 && (
            <div className="text-xs text-red-600 bg-red-50 rounded p-2">
              Absent deduction (auto): ₹{absentDed.toFixed(2)}
            </div>
          )}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Final Salary</span>
            <span className="text-lg font-bold text-green-700">₹{final.toLocaleString('en-IN')}</span>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Notes</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 btn-primary text-sm">
              {saving ? 'Saving…' : 'Generate'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PayrollDashboard() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [month, setMonth] = useState(currentMonth());
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<Staff | null>(null);
  const [expandedHistory, setExpandedHistory] = useState(false);
  const [allPayrolls, setAllPayrolls] = useState<Payroll[]>([]);

  const load = useCallback(async (m: string) => {
    setLoading(true);
    try {
      const [staffData, payrollData] = await Promise.all([
        staffAPI.getAll(),
        payrollAPI.getByMonth(m),
      ]);
      setStaff(staffData.filter((s: Staff) => s.active));
      setPayrolls(payrollData);
    } catch {
      toast.error('Failed to load payroll');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(month); }, [month, load]);

  const loadAllHistory = async () => {
    if (allPayrolls.length > 0) { setExpandedHistory(h => !h); return; }
    try {
      const data = await payrollAPI.getAll();
      setAllPayrolls(data);
      setExpandedHistory(true);
    } catch {}
  };

  const getPayroll = (staffId: string) => payrolls.find(p => p.staffId === staffId);

  const handleMarkPaid = async (p: Payroll) => {
    if (!window.confirm(`Mark ${p.staffName}'s salary as paid?`)) return;
    const today = new Date().toISOString().split('T')[0];
    try {
      await payrollAPI.markPaid(p.staffId, p.month, today);
      toast.success('Marked as paid');
      await load(month);
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleGenerateAll = async () => {
    if (!window.confirm(`Generate payroll for all ${staff.length} staff for ${monthLabel(month)}?`)) return;
    let ok = 0;
    for (const s of staff) {
      try {
        await payrollAPI.generate({ staffId: s.id, month });
        ok++;
      } catch {}
    }
    toast.success(`Generated ${ok} payrolls`);
    await load(month);
  };

  const summary = {
    total: staff.length,
    generated: payrolls.length,
    paid: payrolls.filter(p => p.status === 'paid').length,
    pending: payrolls.filter(p => p.status === 'pending').length,
    totalAmount: payrolls.reduce((s, p) => s + p.finalAmount, 0),
    paidAmount: payrolls.filter(p => p.status === 'paid').reduce((s, p) => s + p.finalAmount, 0),
  };

  // Available months (current + 11 previous)
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  return (
    <div>
      {/* Month selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Payroll — {monthLabel(month)}</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {summary.generated}/{summary.total} generated · {summary.paid} paid
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={month}
            onChange={e => setMonth(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {months.map(m => (
              <option key={m} value={m}>{monthLabel(m)}</option>
            ))}
          </select>
          <button
            onClick={handleGenerateAll}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <RefreshCw className="w-4 h-4" /> Generate All
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Staff', value: summary.total, icon: <Users className="w-5 h-5" />, color: 'text-gray-600', bg: 'bg-gray-50' },
          { label: 'Generated', value: summary.generated, icon: <FileText className="w-5 h-5" />, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Paid', value: summary.paid, icon: <CheckCircle className="w-5 h-5" />, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Pending', value: summary.pending, icon: <Clock className="w-5 h-5" />, color: 'text-orange-600', bg: 'bg-orange-50' },
        ].map(c => (
          <div key={c.label} className={`${c.bg} rounded-xl p-3 flex items-center gap-3`}>
            <div className={c.color}>{c.icon}</div>
            <div>
              <p className="text-xs text-gray-500">{c.label}</p>
              <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Total payout */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-4 mb-6 flex items-center justify-between">
        <div>
          <p className="text-primary-100 text-sm">Total Payout — {monthLabel(month)}</p>
          <p className="text-white text-2xl font-bold mt-0.5">₹{summary.totalAmount.toLocaleString('en-IN')}</p>
          <p className="text-primary-200 text-xs mt-0.5">Paid: ₹{summary.paidAmount.toLocaleString('en-IN')}</p>
        </div>
        <DollarSign className="w-10 h-10 text-primary-300 opacity-50" />
      </div>

      {/* Payroll table */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading…</div>
      ) : staff.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No active staff. Add staff members first.</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Staff</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Base</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">OT</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Deductions</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Final</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {staff.map(s => {
                  const p = getPayroll(s.id);
                  return (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{s.name}</p>
                        <p className="text-xs text-gray-500">{s.role}</p>
                      </td>
                      <td className="px-4 py-3 text-right hidden sm:table-cell">
                        {p ? <span className="text-gray-700">₹{p.baseSalary.toLocaleString('en-IN')}</span> : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right hidden sm:table-cell">
                        {p && p.overtimeAmount > 0
                          ? <span className="text-green-600">+₹{p.overtimeAmount.toLocaleString('en-IN')}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right hidden sm:table-cell">
                        {p && (p.absentDeduction + p.advanceDeduction) > 0
                          ? <span className="text-red-600">-₹{(p.absentDeduction + p.advanceDeduction).toLocaleString('en-IN')}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-bold">
                        {p ? <span className="text-gray-900">₹{p.finalAmount.toLocaleString('en-IN')}</span> : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {p ? (
                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
                            p.status === 'paid'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-orange-100 text-orange-700'
                          }`}>
                            {p.status === 'paid' ? '✅ Paid' : '⏳ Pending'}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Not generated</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setGenerating(s)}
                            className="text-xs text-primary-600 hover:underline font-medium px-2 py-1"
                          >
                            {p ? 'Edit' : 'Generate'}
                          </button>
                          {p && p.status === 'pending' && (
                            <button
                              onClick={() => handleMarkPaid(p)}
                              className="text-xs text-green-600 hover:underline font-medium px-2 py-1"
                            >
                              Mark Paid
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payroll history */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={loadAllHistory}
          className="w-full flex items-center justify-between px-5 py-4 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700"
        >
          <span>Full Payroll History</span>
          {expandedHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {expandedHistory && allPayrolls.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-t border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">Month</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">Staff</th>
                  <th className="text-right px-4 py-2.5 font-medium text-gray-600">Amount</th>
                  <th className="text-center px-4 py-2.5 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600 hidden sm:table-cell">Paid On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {allPayrolls.map(p => (
                  <tr key={`${p.staffId}-${p.month}`} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-700">{monthLabel(p.month)}</td>
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-gray-800">{p.staffName}</p>
                      <p className="text-xs text-gray-500">{p.staffRole}</p>
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-gray-900">
                      ₹{p.finalAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        p.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {p.status === 'paid' ? '✅ Paid' : '⏳ Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs hidden sm:table-cell">
                      {p.paidDate || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {expandedHistory && allPayrolls.length === 0 && (
          <p className="text-center py-6 text-gray-500 text-sm">No payroll history yet.</p>
        )}
      </div>

      {/* Generate modal */}
      {generating && (
        <GenerateModal
          staff={generating}
          month={month}
          existing={getPayroll(generating.id)}
          onClose={() => setGenerating(null)}
          onDone={async () => { setGenerating(null); await load(month); }}
        />
      )}
    </div>
  );
}
