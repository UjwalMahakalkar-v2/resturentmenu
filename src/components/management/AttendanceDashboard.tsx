import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Search, Calendar } from 'lucide-react';
import { staffAPI, attendanceAPI } from '@/services/api';
import type { Staff, Attendance, AttendanceStatus } from '@/types';
import toast from 'react-hot-toast';

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; color: string; dot: string; icon: string }> = {
  present:  { label: 'Present',  color: 'bg-green-100 text-green-700 border-green-200',  dot: 'bg-green-500',  icon: '✅' },
  absent:   { label: 'Absent',   color: 'bg-red-100 text-red-700 border-red-200',        dot: 'bg-red-500',    icon: '❌' },
  half_day: { label: 'Half Day', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', dot: 'bg-yellow-500', icon: '🕒' },
  leave:    { label: 'Leave',    color: 'bg-blue-100 text-blue-700 border-blue-200',     dot: 'bg-blue-400',   icon: '📅' },
};

function dateStr(d: Date) {
  return d.toISOString().split('T')[0];
}

export default function AttendanceDashboard() {
  const today = dateStr(new Date());
  const [viewDate, setViewDate] = useState(today);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [calendarMonth, setCalendarMonth] = useState<string | null>(null); // YYYY-MM
  const [calendarData, setCalendarData] = useState<Attendance[]>([]);
  const [calendarStaff, setCalendarStaff] = useState<Staff | null>(null);
  const [marking, setMarking] = useState<string | null>(null); // staffId being marked

  const loadAttendance = useCallback(async (date: string) => {
    setLoading(true);
    try {
      const data = await attendanceAPI.getByDate(date);
      setAttendance(data);
    } catch {
      toast.error('Failed to load attendance');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    staffAPI.getAll().then(d => setStaff(d.filter((s: Staff) => s.active))).catch(() => {});
  }, []);

  useEffect(() => {
    loadAttendance(viewDate);
  }, [viewDate, loadAttendance]);

  const getStatus = (staffId: string): AttendanceStatus | undefined => {
    return attendance.find(a => a.staffId === staffId)?.status as AttendanceStatus | undefined;
  };

  const mark = async (staffId: string, status: AttendanceStatus) => {
    setMarking(staffId);
    try {
      await attendanceAPI.mark({ staffId, date: viewDate, status });
      setAttendance(prev => {
        const existing = prev.findIndex(a => a.staffId === staffId);
        const updated = { ...prev[existing] ?? {}, staffId, date: viewDate, status } as Attendance;
        if (existing >= 0) {
          const copy = [...prev];
          copy[existing] = updated;
          return copy;
        }
        return [...prev, updated];
      });
    } catch {
      toast.error('Failed to mark attendance');
    } finally {
      setMarking(null);
    }
  };

  // Calendar view for a staff member
  const openCalendar = async (s: Staff) => {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    setCalendarStaff(s);
    setCalendarMonth(month);
    await loadCalendar(s.id, month);
  };

  const loadCalendar = async (staffId: string, month: string) => {
    const [y, m] = month.split('-');
    const from = `${month}-01`;
    const last = new Date(Number(y), Number(m), 0).getDate();
    const to = `${month}-${String(last).padStart(2, '0')}`;
    try {
      const data = await attendanceAPI.getByRange(from, to, staffId);
      setCalendarData(data);
    } catch {}
  };

  const changeCalMonth = async (delta: number) => {
    if (!calendarMonth || !calendarStaff) return;
    const [y, m] = calendarMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    const nm = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    setCalendarMonth(nm);
    await loadCalendar(calendarStaff.id, nm);
  };

  const filtered = staff.filter(s => {
    const q = search.toLowerCase();
    return !q || s.name.toLowerCase().includes(q) || s.role.toLowerCase().includes(q);
  });

  // Summary counts for today
  const counts = {
    present: attendance.filter(a => a.status === 'present').length,
    absent: attendance.filter(a => a.status === 'absent').length,
    halfDay: attendance.filter(a => a.status === 'half_day').length,
    leave: attendance.filter(a => a.status === 'leave').length,
    unmarked: staff.length - attendance.length,
  };

  // Render calendar
  const renderCalendar = () => {
    if (!calendarMonth || !calendarStaff) return null;
    const [y, m] = calendarMonth.split('-').map(Number);
    const firstDay = new Date(y, m - 1, 1).getDay();
    const daysInMonth = new Date(y, m, 0).getDate();
    const monthName = new Date(y, m - 1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });

    const statusByDate: Record<string, AttendanceStatus> = {};
    calendarData.forEach(a => {
      statusByDate[a.date] = a.status as AttendanceStatus;
    });

    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    const dayDotColor: Record<AttendanceStatus, string> = {
      present: 'bg-green-500',
      absent: 'bg-red-500',
      half_day: 'bg-yellow-400',
      leave: 'bg-blue-400',
    };

    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
          <div className="flex items-center justify-between p-4 border-b">
            <div>
              <p className="font-semibold text-gray-900">{calendarStaff.name}</p>
              <p className="text-xs text-gray-500">{calendarStaff.role}</p>
            </div>
            <button onClick={() => setCalendarStaff(null)} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => changeCalMonth(-1)} className="p-1 hover:bg-gray-100 rounded">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <p className="font-semibold text-gray-800 text-sm">{monthName}</p>
              <button onClick={() => changeCalMonth(1)} className="p-1 hover:bg-gray-100 rounded">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            {/* Day headers */}
            <div className="grid grid-cols-7 text-center mb-1">
              {['S','M','T','W','T','F','S'].map((d, i) => (
                <div key={i} className="text-xs text-gray-400 py-1">{d}</div>
              ))}
            </div>
            {/* Days */}
            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, i) => {
                if (!day) return <div key={i} />;
                const ds = `${calendarMonth}-${String(day).padStart(2, '0')}`;
                const st = statusByDate[ds];
                const isToday = ds === today;
                return (
                  <div
                    key={i}
                    className={`relative flex flex-col items-center justify-center h-9 rounded-lg text-xs font-medium ${
                      isToday ? 'ring-2 ring-primary-500' : ''
                    } ${st ? '' : 'text-gray-400'}`}
                  >
                    <span className={st ? 'text-gray-800' : ''}>{day}</span>
                    {st && (
                      <span className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${dayDotColor[st]}`} />
                    )}
                  </div>
                );
              })}
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <div key={k} className="flex items-center gap-1 text-xs text-gray-600">
                  <span className={`w-2 h-2 rounded-full ${v.dot}`} />{v.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Present', value: counts.present, color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
          { label: 'Absent', value: counts.absent, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
          { label: 'Half Day / Leave', value: counts.halfDay + counts.leave, color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200' },
          { label: 'Unmarked', value: counts.unmarked, color: 'text-gray-600', bg: 'bg-gray-50 border-gray-200' },
        ].map(c => (
          <div key={c.label} className={`border rounded-xl p-3 ${c.bg}`}>
            <p className="text-xs text-gray-500">{c.label}</p>
            <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Date picker + search */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 bg-white">
          <Calendar className="w-4 h-4 text-gray-400" />
          <input
            type="date"
            value={viewDate}
            max={today}
            onChange={e => setViewDate(e.target.value)}
            className="text-sm outline-none bg-transparent"
          />
        </div>
        {viewDate !== today && (
          <button
            onClick={() => setViewDate(today)}
            className="text-xs text-primary-600 hover:underline"
          >
            Back to Today
          </button>
        )}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search staff…"
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          />
        </div>
      </div>

      {/* Attendance Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading…</div>
      ) : staff.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No active staff found. Add staff members first.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Staff</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Mark</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">History</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(s => {
                  const status = getStatus(s.id);
                  const cfg = status ? STATUS_CONFIG[status] : null;
                  const isMarking = marking === s.id;
                  return (
                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
                            {s.photo ? (
                              <img src={s.photo} alt={s.name} className="w-full h-full rounded-full object-cover" />
                            ) : s.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{s.name}</p>
                            <p className="text-xs text-gray-500">{s.role}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {cfg ? (
                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${cfg.color}`}>
                            {cfg.icon} {cfg.label}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Not marked</span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <div className="flex flex-wrap gap-1.5">
                          {(Object.keys(STATUS_CONFIG) as AttendanceStatus[]).map(st => (
                            <button
                              key={st}
                              disabled={isMarking}
                              onClick={() => mark(s.id, st)}
                              className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-all ${
                                status === st
                                  ? STATUS_CONFIG[st].color
                                  : 'border-gray-200 text-gray-500 hover:border-gray-400'
                              } ${isMarking ? 'opacity-50' : ''}`}
                            >
                              {STATUS_CONFIG[st].icon}
                            </button>
                          ))}
                        </div>
                      </td>
                      {/* Mobile: mark buttons as a full row below */}
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => openCalendar(s)}
                          className="text-xs text-primary-600 hover:underline font-medium"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Mobile mark buttons */}
          <div className="sm:hidden divide-y divide-gray-100">
            {filtered.map(s => (
              <div key={`mob-${s.id}`} className="px-4 py-2">
                <p className="text-xs font-medium text-gray-600 mb-1.5">Mark {s.name}:</p>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(STATUS_CONFIG) as AttendanceStatus[]).map(st => (
                    <button
                      key={st}
                      onClick={() => mark(s.id, st)}
                      className={`text-xs px-2.5 py-1.5 rounded-full border font-medium transition-all ${
                        getStatus(s.id) === st
                          ? STATUS_CONFIG[st].color
                          : 'border-gray-200 text-gray-500 hover:border-gray-400'
                      }`}
                    >
                      {STATUS_CONFIG[st].icon} {STATUS_CONFIG[st].label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Calendar modal */}
      {calendarStaff && renderCalendar()}
    </div>
  );
}
