import { useState, useEffect, useCallback } from 'react';
import { Users, ClipboardList, DollarSign, LayoutDashboard } from 'lucide-react';
import { staffAPI, attendanceAPI, payrollAPI } from '@/services/api';
import type { Staff } from '@/types';
import StaffManagement from './StaffManagement';
import AttendanceDashboard from './AttendanceDashboard';
import PayrollDashboard from './PayrollDashboard';

type ManagementTab = 'overview' | 'attendance' | 'payroll' | 'staff';

const TABS: { id: ManagementTab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview',    label: 'Overview',             icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'attendance',  label: 'Staff Attendance',     icon: <ClipboardList className="w-4 h-4" /> },
  { id: 'payroll',     label: 'Payroll',              icon: <DollarSign className="w-4 h-4" /> },
  { id: 'staff',       label: 'Staff Management',     icon: <Users className="w-4 h-4" /> },
];

interface QuickStats {
  totalStaff: number;
  presentToday: number;
  pendingPayroll: number;
  paidThisMonth: number;
}

export default function ManagementDashboard() {
  const [activeTab, setActiveTab] = useState<ManagementTab>('overview');
  const [stats, setStats] = useState<QuickStats>({ totalStaff: 0, presentToday: 0, pendingPayroll: 0, paidThisMonth: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const month = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

      const [staffData, attendanceData, payrollData] = await Promise.all([
        staffAPI.getAll().catch(() => []),
        attendanceAPI.getByDate(today).catch(() => []),
        payrollAPI.getByMonth(month).catch(() => []),
      ]);

      const activeStaff = (staffData as Staff[]).filter(s => s.active);
      const presentToday = attendanceData.filter((a: any) => a.status === 'present').length;
      const pending = payrollData.filter((p: any) => p.status === 'pending').length;
      const paid = payrollData.filter((p: any) => p.status === 'paid').length;

      setStats({
        totalStaff: activeStaff.length,
        presentToday,
        pendingPayroll: pending,
        paidThisMonth: paid,
      });
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Management</h2>
          <p className="text-sm text-gray-500 mt-0.5">{today}</p>
        </div>
      </div>

      {/* Sub-navigation */}
      <div className="border-b border-gray-200 mb-6 overflow-x-auto">
        <div className="flex min-w-max gap-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── OVERVIEW ── */}
      {activeTab === 'overview' && (
        <div>
          {/* Quick stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[
              {
                label: 'Total Staff',
                value: stats.totalStaff,
                icon: <Users className="w-6 h-6" />,
                color: 'text-blue-600',
                bg: 'bg-blue-50 border-blue-100',
                onClick: () => setActiveTab('staff'),
              },
              {
                label: 'Present Today',
                value: stats.presentToday,
                icon: <ClipboardList className="w-6 h-6" />,
                color: 'text-green-600',
                bg: 'bg-green-50 border-green-100',
                onClick: () => setActiveTab('attendance'),
              },
              {
                label: 'Pending Salaries',
                value: stats.pendingPayroll,
                icon: <DollarSign className="w-6 h-6" />,
                color: 'text-orange-600',
                bg: 'bg-orange-50 border-orange-100',
                onClick: () => setActiveTab('payroll'),
              },
              {
                label: 'Paid This Month',
                value: stats.paidThisMonth,
                icon: <DollarSign className="w-6 h-6" />,
                color: 'text-purple-600',
                bg: 'bg-purple-50 border-purple-100',
                onClick: () => setActiveTab('payroll'),
              },
            ].map(c => (
              <button
                key={c.label}
                onClick={c.onClick}
                className={`border rounded-xl p-4 text-left hover:shadow-md transition-shadow ${c.bg}`}
              >
                <div className={`${c.color} mb-2`}>{c.icon}</div>
                <p className="text-xs text-gray-500">{c.label}</p>
                {loadingStats ? (
                  <div className="w-8 h-6 bg-gray-200 animate-pulse rounded mt-1" />
                ) : (
                  <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
                )}
              </button>
            ))}
          </div>

          {/* Module cards */}
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Modules</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                id: 'attendance' as ManagementTab,
                title: 'Staff Attendance & Payroll',
                desc: 'Mark daily attendance, track working hours, generate salaries and manage payroll records.',
                icon: <ClipboardList className="w-8 h-8" />,
                color: 'text-green-600',
                bg: 'from-green-50 to-emerald-50 border-green-200',
                sub: ['Mark Attendance', 'View Calendar', 'Generate Payroll', 'Payroll History'],
              },
              {
                id: 'staff' as ManagementTab,
                title: 'Staff Management',
                desc: 'Add and manage your staff members, their roles, salary details and contact information.',
                icon: <Users className="w-8 h-8" />,
                color: 'text-blue-600',
                bg: 'from-blue-50 to-sky-50 border-blue-200',
                sub: ['Staff Directory', 'Add New Staff', 'Edit Profiles', 'Deactivate Staff'],
                badge: 'Future ready',
              },
            ].map(mod => (
              <button
                key={mod.id}
                onClick={() => setActiveTab(mod.id)}
                className={`bg-gradient-to-br ${mod.bg} border rounded-xl p-5 text-left hover:shadow-md transition-all`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={mod.color}>{mod.icon}</div>
                  {mod.badge && (
                    <span className="text-xs bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full">
                      {mod.badge}
                    </span>
                  )}
                </div>
                <h4 className="font-semibold text-gray-900 mb-1">{mod.title}</h4>
                <p className="text-sm text-gray-500 mb-3">{mod.desc}</p>
                <div className="flex flex-wrap gap-1.5">
                  {mod.sub.map(s => (
                    <span key={s} className="text-xs bg-white/70 border border-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                      {s}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── ATTENDANCE ── */}
      {activeTab === 'attendance' && <AttendanceDashboard />}

      {/* ── PAYROLL ── */}
      {activeTab === 'payroll' && <PayrollDashboard />}

      {/* ── STAFF ── */}
      {activeTab === 'staff' && <StaffManagement />}
    </div>
  );
}
