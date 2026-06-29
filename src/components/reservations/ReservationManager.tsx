import { useState, useEffect, useCallback } from 'react';
import { reservationsAPI, posAPI } from '@/services/api';
import toast from 'react-hot-toast';
import { Calendar, Clock, Users, Phone, CheckCircle, XCircle, Trash2, ChevronDown } from 'lucide-react';

interface Reservation {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  reservationDate: string;
  reservationTime: string;
  partySize: number;
  tableId: string | null;
  tableName: string | null;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  notes: string;
  createdAt: string;
}

type FilterStatus = 'all' | 'pending' | 'confirmed' | 'cancelled' | 'completed';

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending:   { bg: 'bg-amber-50',  text: 'text-amber-700',  label: 'Pending' },
  confirmed: { bg: 'bg-green-50',  text: 'text-green-700',  label: 'Confirmed' },
  cancelled: { bg: 'bg-red-50',    text: 'text-red-700',    label: 'Cancelled' },
  completed: { bg: 'bg-gray-100',  text: 'text-gray-600',   label: 'Completed' },
};

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

function fmtTime(t: string) {
  const [h, m] = t.split(':').map(Number);
  const suffix = h < 12 ? 'AM' : 'PM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export default function ReservationManager() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [filter, setFilter] = useState<FilterStatus>('pending');
  const [loading, setLoading] = useState(true);
  const [approveId, setApproveId] = useState<string | null>(null);
  const [selectedTableId, setSelectedTableId] = useState('');

  const load = useCallback(async () => {
    try {
      const [res, tbls] = await Promise.all([
        reservationsAPI.getAll(),
        posAPI.getTables().catch(() => []),
      ]);
      setReservations(res);
      setTables(tbls);
    } catch {
      toast.error('Failed to load reservations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleConfirm = async (id: string) => {
    try {
      const updated = await reservationsAPI.update(id, {
        status: 'confirmed',
        tableId: selectedTableId || null,
      });
      setReservations(prev => prev.map(r => r.id === id ? updated : r));
      toast.success('Reservation confirmed');
      setApproveId(null);
      setSelectedTableId('');
    } catch {
      toast.error('Failed to confirm reservation');
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const updated = await reservationsAPI.update(id, { status });
      setReservations(prev => prev.map(r => r.id === id ? updated : r));
      toast.success(`Reservation ${status}`);
    } catch {
      toast.error('Failed to update reservation');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this reservation permanently?')) return;
    try {
      await reservationsAPI.delete(id);
      setReservations(prev => prev.filter(r => r.id !== id));
      toast.success('Reservation deleted');
    } catch {
      toast.error('Failed to delete reservation');
    }
  };

  const filtered = filter === 'all' ? reservations : reservations.filter(r => r.status === filter);

  const counts = {
    all: reservations.length,
    pending: reservations.filter(r => r.status === 'pending').length,
    confirmed: reservations.filter(r => r.status === 'confirmed').length,
    cancelled: reservations.filter(r => r.status === 'cancelled').length,
    completed: reservations.filter(r => r.status === 'completed').length,
  };

  const today = new Date().toISOString().slice(0, 10);
  const todayCount = reservations.filter(r => r.reservationDate === today && r.status === 'confirmed').length;
  const weekCount = (() => {
    const from = new Date(); from.setDate(from.getDate() - 6);
    return reservations.filter(r => r.reservationDate >= from.toISOString().slice(0, 10) && r.status !== 'cancelled').length;
  })();

  if (loading) return <div className="text-center py-16 text-gray-500">Loading reservations…</div>;

  return (
    <div>
      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Pending Approval', value: counts.pending, color: 'text-amber-600' },
          { label: "Today's Confirmed", value: todayCount,    color: 'text-green-600' },
          { label: 'This Week',         value: weekCount,     color: 'text-blue-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500 font-medium">{s.label}</p>
            <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {(['pending', 'confirmed', 'all', 'cancelled', 'completed'] as FilterStatus[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors capitalize ${
              filter === f
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
            }`}
          >
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            <span className={`ml-1.5 text-xs font-semibold px-1.5 py-0.5 rounded-full ${
              filter === f ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500'
            }`}>{counts[f]}</span>
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Calendar className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No {filter === 'all' ? '' : filter} reservations</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Customer</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Date & Time</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Party</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Table</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(r => {
                  const st = STATUS_STYLES[r.status];
                  return (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900">{r.customerName}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" />{r.customerPhone}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />{fmtDate(r.reservationDate)}
                        </p>
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />{fmtTime(r.reservationTime)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-gray-700 font-medium">
                          <Users className="w-3.5 h-3.5 text-gray-400" />{r.partySize}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {r.tableName ?? <span className="text-gray-400 italic">Not assigned</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${st.bg} ${st.text}`}>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          {r.status === 'pending' && (
                            <>
                              {approveId === r.id ? (
                                /* Table-assign inline dropdown */
                                <div className="flex items-center gap-2">
                                  <div className="relative">
                                    <select
                                      value={selectedTableId}
                                      onChange={e => setSelectedTableId(e.target.value)}
                                      className="text-xs border border-gray-300 rounded-md px-2 py-1.5 pr-7 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    >
                                      <option value="">No table</option>
                                      {tables.filter(t => t.status === 'available').map(t => (
                                        <option key={t.id} value={t.id}>{t.sectionName} – {t.name} (cap {t.capacity})</option>
                                      ))}
                                    </select>
                                    <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
                                  </div>
                                  <button
                                    onClick={() => handleConfirm(r.id)}
                                    className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-md font-semibold hover:bg-green-700"
                                  >Confirm</button>
                                  <button
                                    onClick={() => { setApproveId(null); setSelectedTableId(''); }}
                                    className="text-xs text-gray-500 hover:text-gray-800 px-2 py-1.5"
                                  >Cancel</button>
                                </div>
                              ) : (
                                <>
                                  <button
                                    onClick={() => setApproveId(r.id)}
                                    className="flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-200 px-2.5 py-1.5 rounded-md font-semibold hover:bg-green-100"
                                  >
                                    <CheckCircle className="w-3.5 h-3.5" />Approve
                                  </button>
                                  <button
                                    onClick={() => handleStatusChange(r.id, 'cancelled')}
                                    className="flex items-center gap-1 text-xs bg-red-50 text-red-600 border border-red-200 px-2.5 py-1.5 rounded-md font-semibold hover:bg-red-100"
                                  >
                                    <XCircle className="w-3.5 h-3.5" />Reject
                                  </button>
                                </>
                              )}
                            </>
                          )}
                          {r.status === 'confirmed' && (
                            <button
                              onClick={() => handleStatusChange(r.id, 'completed')}
                              className="text-xs bg-gray-100 text-gray-700 border border-gray-200 px-2.5 py-1.5 rounded-md font-semibold hover:bg-gray-200"
                            >Mark Complete</button>
                          )}
                          <button
                            onClick={() => handleDelete(r.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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
    </div>
  );
}
