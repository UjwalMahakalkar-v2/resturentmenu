import { useState, useEffect } from 'react';
import { X, User } from 'lucide-react';
import type { Staff } from '@/types';

const ROLES = ['Manager', 'Chef', 'Waiter', 'Cashier', 'Delivery Staff', 'Helper'];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Staff, 'id' | 'tenantId' | 'createdAt' | 'updatedAt' | 'active'>) => Promise<void>;
  editStaff?: Staff | null;
}

const EMPTY: {
  name: string; photo: string; phone: string; email: string; role: string;
  joiningDate: string; salaryType: import('@/types').SalaryType; salaryAmount: number; emergencyContact: string;
} = {
  name: '',
  photo: '',
  phone: '',
  email: '',
  role: 'Waiter',
  joiningDate: new Date().toISOString().split('T')[0],
  salaryType: 'monthly',
  salaryAmount: 0,
  emergencyContact: '',
};

export default function StaffForm({ isOpen, onClose, onSave, editStaff }: Props) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editStaff) {
      setForm({
        name: editStaff.name,
        photo: editStaff.photo,
        phone: editStaff.phone,
        email: editStaff.email,
        role: editStaff.role,
        joiningDate: editStaff.joiningDate,
        salaryType: editStaff.salaryType,
        salaryAmount: editStaff.salaryAmount,
        emergencyContact: editStaff.emergencyContact,
      });
    } else {
      setForm(EMPTY);
    }
  }, [editStaff, isOpen]);

  if (!isOpen) return null;

  const set = (field: string, value: any) => setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await onSave({ ...form, salaryAmount: Number(form.salaryAmount) });
      onClose();
    } catch {
      // error already toasted by parent — keep modal open
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {editStaff ? 'Edit Staff Member' : 'Add Staff Member'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Photo preview + name */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
              {form.photo ? (
                <img src={form.photo} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-gray-400" />
              )}
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input
                required
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Profile Photo URL</label>
            <input
              value={form.photo}
              onChange={e => set('photo', e.target.value)}
              placeholder="https://..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="staff@example.com"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
              <select
                required
                value={form.role}
                onChange={e => set('role', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Joining Date *</label>
              <input
                required
                type="date"
                value={form.joiningDate}
                onChange={e => set('joiningDate', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Salary Type *</label>
            <div className="flex gap-4">
              {(['monthly', 'daily', 'hourly'] as const).map(t => (
                <label key={t} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="salaryType"
                    value={t}
                    checked={form.salaryType === t}
                    onChange={() => set('salaryType', t)}
                    className="text-primary-600"
                  />
                  <span className="text-sm capitalize text-gray-700">{t}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Salary Amount (₹) *
              </label>
              <input
                required
                type="number"
                min={0}
                value={form.salaryAmount}
                onChange={e => set('salaryAmount', e.target.value)}
                placeholder="15000"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact</label>
              <input
                value={form.emergencyContact}
                onChange={e => set('emergencyContact', e.target.value)}
                placeholder="+91 99999 00000"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary text-sm"
            >
              {saving ? 'Saving…' : editStaff ? 'Update Staff' : 'Add Staff'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
