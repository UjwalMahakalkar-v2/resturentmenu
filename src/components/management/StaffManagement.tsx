import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, UserX, UserCheck, Phone, Mail, Search } from 'lucide-react';
import { staffAPI } from '@/services/api';
import type { Staff } from '@/types';
import StaffForm from './StaffForm';
import toast from 'react-hot-toast';

const ROLE_COLORS: Record<string, string> = {
  Manager: 'bg-purple-100 text-purple-700',
  Chef: 'bg-orange-100 text-orange-700',
  Waiter: 'bg-blue-100 text-blue-700',
  Cashier: 'bg-green-100 text-green-700',
  'Delivery Staff': 'bg-yellow-100 text-yellow-700',
  Helper: 'bg-gray-100 text-gray-700',
};

export default function StaffManagement() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await staffAPI.getAll();
      setStaff(data);
    } catch {
      toast.error('Failed to load staff');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (data: Omit<Staff, 'id' | 'tenantId' | 'createdAt' | 'updatedAt' | 'active'>) => {
    try {
      if (editing) {
        await staffAPI.update(editing.id, data);
        toast.success('Staff updated');
      } else {
        await staffAPI.create(data);
        toast.success('Staff added');
      }
      await load();
      setEditing(null);
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || 'Failed to save staff';
      toast.error(msg);
      throw e; // re-throw so StaffForm keeps modal open
    }
  };

  const handleToggleActive = async (s: Staff) => {
    const msg = s.active ? `Deactivate ${s.name}?` : `Reactivate ${s.name}?`;
    if (!window.confirm(msg)) return;
    try {
      if (s.active) {
        await staffAPI.deactivate(s.id);
      } else {
        await staffAPI.update(s.id, { active: true });
      }
      toast.success(s.active ? 'Staff deactivated' : 'Staff reactivated');
      await load();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const filtered = staff.filter(s => {
    if (!showInactive && !s.active) return false;
    const q = search.toLowerCase();
    return !q || s.name.toLowerCase().includes(q) || s.role.toLowerCase().includes(q) || s.phone.includes(q);
  });

  const activeCount = staff.filter(s => s.active).length;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Staff Directory</h3>
          <p className="text-sm text-gray-500 mt-0.5">{activeCount} active staff member{activeCount !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => { setEditing(null); setFormOpen(true); }}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" /> Add Staff
        </button>
      </div>

      {/* Search + filter */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, role, phone…"
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={e => setShowInactive(e.target.checked)}
            className="rounded text-primary-600"
          />
          Show inactive
        </label>
      </div>

      {/* Staff cards */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading staff…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">
            {staff.length === 0 ? 'No staff added yet.' : 'No staff match your search.'}
          </p>
          {staff.length === 0 && (
            <button
              onClick={() => setFormOpen(true)}
              className="btn-primary text-sm"
            >
              Add your first staff member
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(s => (
            <div
              key={s.id}
              className={`bg-white border rounded-xl p-4 transition-all ${
                s.active ? 'border-gray-200 shadow-sm' : 'border-dashed border-gray-300 opacity-60'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {s.photo ? (
                    <img src={s.photo} alt={s.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg font-bold text-gray-400">
                      {s.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className="font-semibold text-gray-900 text-sm truncate">{s.name}</p>
                    {!s.active && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">Inactive</span>
                    )}
                  </div>
                  <span className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_COLORS[s.role] ?? 'bg-gray-100 text-gray-700'}`}>
                    {s.role}
                  </span>
                </div>
              </div>

              <div className="mt-3 space-y-1.5">
                {s.phone && (
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Phone className="w-3.5 h-3.5 text-gray-400" /> {s.phone}
                  </div>
                )}
                {s.email && (
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    <span className="truncate">{s.email}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                  <span>
                    ₹{s.salaryAmount.toLocaleString('en-IN')}/{s.salaryType === 'monthly' ? 'mo' : s.salaryType === 'daily' ? 'day' : 'hr'}
                  </span>
                  <span>Since {new Date(s.joiningDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                <button
                  onClick={() => { setEditing(s); setFormOpen(true); }}
                  className="flex-1 flex items-center justify-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  onClick={() => handleToggleActive(s)}
                  className={`flex-1 flex items-center justify-center gap-1 text-xs font-medium py-1.5 rounded-lg transition-colors ${
                    s.active
                      ? 'text-red-600 hover:bg-red-50'
                      : 'text-green-600 hover:bg-green-50'
                  }`}
                >
                  {s.active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                  {s.active ? 'Deactivate' : 'Reactivate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <StaffForm
        isOpen={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSave={handleSave}
        editStaff={editing}
      />
    </div>
  );
}
