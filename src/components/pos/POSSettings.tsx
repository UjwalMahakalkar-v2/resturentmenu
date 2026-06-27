import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Edit2, Check, X, ChevronDown } from 'lucide-react';
import { posAPI } from '@/services/api';
import type { POSSettings, POSSection, POSTable } from '@/types';
import toast from 'react-hot-toast';

type SettingsTab = 'general' | 'sections' | 'tables';

export default function POSSettings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [settings, setSettings] = useState<POSSettings | null>(null);
  const [sections, setSections] = useState<POSSection[]>([]);
  const [tables, setTables] = useState<POSTable[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Inline edit state
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionName, setEditingSectionName] = useState('');
  const [newSectionName, setNewSectionName] = useState('');
  const [addingSectionDesc, setAddingSectionDesc] = useState('');
  const [showAddSection, setShowAddSection] = useState(false);

  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [editingTableName, setEditingTableName] = useState('');
  const [editingTableCap, setEditingTableCap] = useState(4);
  const [newTableName, setNewTableName] = useState('');
  const [newTableCap, setNewTableCap] = useState(4);
  const [showAddTable, setShowAddTable] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, sec, tbl] = await Promise.all([
        posAPI.getSettings(),
        posAPI.getSections(),
        posAPI.getTables(),
      ]);
      setSettings(s);
      setSections(sec);
      setTables(tbl);
      if (sec.length > 0 && !selectedSectionId) setSelectedSectionId(sec[0].id);
    } catch {
      toast.error('Failed to load POS settings');
    } finally {
      setLoading(false);
    }
  }, [selectedSectionId]);

  useEffect(() => { load(); }, []);

  const saveGeneralSettings = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const updated = await posAPI.updateSettings(settings);
      setSettings(updated);
      toast.success('Settings saved');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const addSection = async () => {
    if (!newSectionName.trim()) return;
    try {
      const sec = await posAPI.createSection({ name: newSectionName.trim(), description: addingSectionDesc.trim() });
      setSections(prev => [...prev, sec]);
      if (!selectedSectionId) setSelectedSectionId(sec.id);
      setNewSectionName('');
      setAddingSectionDesc('');
      setShowAddSection(false);
      toast.success('Section added');
    } catch {
      toast.error('Failed to add section');
    }
  };

  const saveSection = async (id: string) => {
    if (!editingSectionName.trim()) return;
    try {
      await posAPI.updateSection(id, { name: editingSectionName.trim() });
      setSections(prev => prev.map(s => s.id === id ? { ...s, name: editingSectionName.trim() } : s));
      setEditingSectionId(null);
      toast.success('Section updated');
    } catch {
      toast.error('Failed to update section');
    }
  };

  const deleteSection = async (id: string, name: string) => {
    if (!confirm(`Delete section "${name}"? All tables in this section will also be deleted.`)) return;
    try {
      await posAPI.deleteSection(id);
      setSections(prev => prev.filter(s => s.id !== id));
      setTables(prev => prev.filter(t => t.sectionId !== id));
      if (selectedSectionId === id) setSelectedSectionId(sections.find(s => s.id !== id)?.id || '');
      toast.success('Section deleted');
    } catch {
      toast.error('Failed to delete section');
    }
  };

  const addTable = async () => {
    if (!newTableName.trim() || !selectedSectionId) return;
    try {
      const tbl = await posAPI.createTable({ name: newTableName.trim(), sectionId: selectedSectionId, capacity: newTableCap });
      setTables(prev => [...prev, tbl]);
      setNewTableName('');
      setNewTableCap(4);
      setShowAddTable(false);
      toast.success('Table added');
    } catch {
      toast.error('Failed to add table');
    }
  };

  const saveTable = async (id: string) => {
    if (!editingTableName.trim()) return;
    try {
      await posAPI.updateTable(id, { name: editingTableName.trim(), capacity: editingTableCap });
      setTables(prev => prev.map(t => t.id === id ? { ...t, name: editingTableName.trim(), capacity: editingTableCap } : t));
      setEditingTableId(null);
      toast.success('Table updated');
    } catch {
      toast.error('Failed to update table');
    }
  };

  const deleteTable = async (id: string, name: string) => {
    if (!confirm(`Delete table "${name}"?`)) return;
    try {
      await posAPI.deleteTable(id);
      setTables(prev => prev.filter(t => t.id !== id));
      toast.success('Table deleted');
    } catch {
      toast.error('Failed to delete table');
    }
  };

  const filteredTables = tables.filter(t => t.sectionId === selectedSectionId);

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;
  if (!settings) return null;

  return (
    <div>
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-1">
          {(['general', 'sections', 'tables'] as SettingsTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium capitalize border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ── GENERAL ── */}
      {activeTab === 'general' && (
        <div className="max-w-lg space-y-5">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border">
            <div>
              <p className="font-medium text-gray-900">GST Enabled</p>
              <p className="text-sm text-gray-500">Apply GST on all orders</p>
            </div>
            <button
              onClick={() => setSettings(s => s ? { ...s, gstEnabled: !s.gstEnabled } : s)}
              className={`relative w-12 h-6 rounded-full transition-colors ${settings.gstEnabled ? 'bg-primary-600' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${settings.gstEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
          </div>

          {settings.gstEnabled && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total GST %</label>
                <input type="number" min={0} max={100} value={settings.gstRate}
                  onChange={e => setSettings(s => s ? { ...s, gstRate: Number(e.target.value) } : s)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CGST %</label>
                <input type="number" min={0} max={50} value={settings.cgstRate}
                  onChange={e => setSettings(s => s ? { ...s, cgstRate: Number(e.target.value) } : s)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SGST %</label>
                <input type="number" min={0} max={50} value={settings.sgstRate}
                  onChange={e => setSettings(s => s ? { ...s, sgstRate: Number(e.target.value) } : s)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bill Prefix</label>
              <input value={settings.billPrefix}
                onChange={e => setSettings(s => s ? { ...s, billPrefix: e.target.value.toUpperCase().slice(0, 6) } : s)}
                placeholder="INV"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency Symbol</label>
              <input value={settings.currencySymbol}
                onChange={e => setSettings(s => s ? { ...s, currencySymbol: e.target.value.slice(0, 3) } : s)}
                placeholder="₹"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border">
            <div>
              <p className="font-medium text-gray-900">Enable KOT</p>
              <p className="text-sm text-gray-500">Kitchen Order Ticket for each order</p>
            </div>
            <button
              onClick={() => setSettings(s => s ? { ...s, enableKot: !s.enableKot } : s)}
              className={`relative w-12 h-6 rounded-full transition-colors ${settings.enableKot ? 'bg-primary-600' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${settings.enableKot ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
          </div>

          <button onClick={saveGeneralSettings} disabled={saving} className="btn-primary text-sm">
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      )}

      {/* ── SECTIONS ── */}
      {activeTab === 'sections' && (
        <div className="max-w-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Sections</h3>
            <button onClick={() => setShowAddSection(true)} className="btn-primary text-sm flex items-center gap-1">
              <Plus className="w-4 h-4" /> Add Section
            </button>
          </div>

          {showAddSection && (
            <div className="mb-4 p-4 border border-primary-200 bg-primary-50 rounded-xl space-y-2">
              <input value={newSectionName} onChange={e => setNewSectionName(e.target.value)}
                placeholder="Section name (e.g. Dine-In, Terrace)"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              <input value={addingSectionDesc} onChange={e => setAddingSectionDesc(e.target.value)}
                placeholder="Description (optional)"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              <div className="flex gap-2">
                <button onClick={addSection} className="btn-primary text-sm">Add</button>
                <button onClick={() => { setShowAddSection(false); setNewSectionName(''); setAddingSectionDesc(''); }} className="btn-secondary text-sm">Cancel</button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {sections.length === 0 && <p className="text-gray-400 text-sm text-center py-8">No sections yet. Add one to get started.</p>}
            {sections.map(sec => (
              <div key={sec.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl bg-white">
                {editingSectionId === sec.id ? (
                  <>
                    <input value={editingSectionName} onChange={e => setEditingSectionName(e.target.value)}
                      autoFocus onKeyDown={e => { if (e.key === 'Enter') saveSection(sec.id); if (e.key === 'Escape') setEditingSectionId(null); }}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                    <button onClick={() => saveSection(sec.id)} className="text-green-600 hover:text-green-700"><Check className="w-4 h-4" /></button>
                    <button onClick={() => setEditingSectionId(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                  </>
                ) : (
                  <>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm">{sec.name}</p>
                      {sec.description && <p className="text-xs text-gray-500">{sec.description}</p>}
                    </div>
                    <button onClick={() => { setEditingSectionId(sec.id); setEditingSectionName(sec.name); }} className="text-gray-400 hover:text-primary-600"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => deleteSection(sec.id, sec.name)} className="text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TABLES ── */}
      {activeTab === 'tables' && (
        <div className="max-w-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-gray-900">Tables</h3>
              {sections.length > 0 && (
                <div className="relative">
                  <select value={selectedSectionId} onChange={e => setSelectedSectionId(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none appearance-none pr-7">
                    {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                </div>
              )}
            </div>
            {sections.length > 0 && (
              <button onClick={() => setShowAddTable(true)} className="btn-primary text-sm flex items-center gap-1">
                <Plus className="w-4 h-4" /> Add Table
              </button>
            )}
          </div>

          {sections.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-8">Create sections first before adding tables.</p>
          )}

          {sections.length > 0 && showAddTable && (
            <div className="mb-4 p-4 border border-primary-200 bg-primary-50 rounded-xl space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input value={newTableName} onChange={e => setNewTableName(e.target.value)}
                  placeholder="Table name (e.g. T1)"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                <input type="number" min={1} max={20} value={newTableCap} onChange={e => setNewTableCap(Number(e.target.value))}
                  placeholder="Capacity"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div className="flex gap-2">
                <button onClick={addTable} className="btn-primary text-sm">Add</button>
                <button onClick={() => { setShowAddTable(false); setNewTableName(''); setNewTableCap(4); }} className="btn-secondary text-sm">Cancel</button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredTables.length === 0 && selectedSectionId && (
              <p className="col-span-full text-gray-400 text-sm text-center py-8">No tables in this section yet.</p>
            )}
            {filteredTables.map(tbl => (
              <div key={tbl.id} className="border border-gray-200 rounded-xl p-3 bg-white">
                {editingTableId === tbl.id ? (
                  <div className="space-y-1.5">
                    <input value={editingTableName} onChange={e => setEditingTableName(e.target.value)}
                      autoFocus className="w-full border border-gray-300 rounded px-2 py-1 text-sm" />
                    <input type="number" min={1} max={20} value={editingTableCap} onChange={e => setEditingTableCap(Number(e.target.value))}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-sm" />
                    <div className="flex gap-1">
                      <button onClick={() => saveTable(tbl.id)} className="flex-1 bg-green-100 text-green-700 rounded py-1 text-xs"><Check className="w-3 h-3 mx-auto" /></button>
                      <button onClick={() => setEditingTableId(null)} className="flex-1 bg-gray-100 text-gray-600 rounded py-1 text-xs"><X className="w-3 h-3 mx-auto" /></button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{tbl.name}</p>
                        <p className="text-xs text-gray-500">Cap: {tbl.capacity}</p>
                      </div>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                        tbl.status === 'available' ? 'bg-green-100 text-green-700' :
                        tbl.status === 'occupied' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>{tbl.status}</span>
                    </div>
                    <div className="flex gap-1 mt-2">
                      <button onClick={() => { setEditingTableId(tbl.id); setEditingTableName(tbl.name); setEditingTableCap(tbl.capacity); }}
                        className="flex-1 text-xs text-gray-500 hover:text-primary-600 flex items-center justify-center gap-0.5">
                        <Edit2 className="w-3 h-3" /> Edit
                      </button>
                      <button onClick={() => deleteTable(tbl.id, tbl.name)}
                        className="flex-1 text-xs text-gray-500 hover:text-red-600 flex items-center justify-center gap-0.5">
                        <Trash2 className="w-3 h-3" /> Del
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
