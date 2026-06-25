import { useState, useRef } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import type { TenantCategory } from '@/types/tenant';

interface Props {
  categories: TenantCategory[];
  loading: boolean;
  onAdd: (cat: Omit<TenantCategory, 'id' | 'tenantId'>) => Promise<void>;
  onDelete: (id: string, name: string) => Promise<void>;
  onReorder: (reordered: TenantCategory[]) => Promise<void>;
}

export default function CategoryManager({ categories, loading, onAdd, onDelete, onReorder }: Props) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🍽️');
  const [adding, setAdding] = useState(false);
  const [dragMode, setDragMode] = useState(false);

  // Local ordered list for optimistic DnD
  const [localCats, setLocalCats] = useState<TenantCategory[]>([]);
  const sorted = localCats.length ? localCats : [...categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const dragIndex = useRef<number | null>(null);
  const saving = useRef(false);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setAdding(true);
    try {
      const maxOrder = sorted.reduce((m, c) => Math.max(m, c.order ?? 0), 0);
      await onAdd({ name: name.trim(), icon, description: '', order: maxOrder + 1 });
      setName('');
      setIcon('🍽️');
      setLocalCats([]);
    } finally {
      setAdding(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    dragIndex.current = index;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex.current === null || dragIndex.current === index) return;
    const newList = [...sorted];
    const [moved] = newList.splice(dragIndex.current, 1);
    newList.splice(index, 0, moved);
    dragIndex.current = index;
    setLocalCats(newList);
  };

  const handleDrop = async () => {
    if (!localCats.length || saving.current) return;
    saving.current = true;
    try {
      const updated = localCats.map((c, i) => ({ ...c, order: i + 1 }));
      setLocalCats(updated);
      await onReorder(updated);
    } finally {
      saving.current = false;
      dragIndex.current = null;
    }
  };

  return (
    <div>
      {/* Add category form */}
      <form onSubmit={handleAddCategory} className="flex gap-3 mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
        <input
          type="text"
          value={icon}
          onChange={e => setIcon(e.target.value)}
          className="input-field w-16 text-center text-xl"
          placeholder="🍽️"
          title="Emoji icon"
        />
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          className="input-field flex-1"
          placeholder="New category name (e.g. Desserts)"
          required
        />
        <button type="submit" disabled={adding} className="btn-primary flex items-center gap-2 whitespace-nowrap">
          <Plus className="w-4 h-4" />
          {adding ? 'Adding...' : 'Add'}
        </button>
      </form>

      {/* Drag mode toggle */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {sorted.length} {sorted.length === 1 ? 'category' : 'categories'}
        </p>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <span className="text-sm font-medium text-gray-700">Reorder Mode</span>
          <div className="relative">
            <input type="checkbox" checked={dragMode} onChange={e => setDragMode(e.target.checked)} className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
          </div>
        </label>
      </div>

      {dragMode && (
        <p className="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded px-3 py-2 mb-4">
          Drag categories to reorder. Order is saved automatically when you drop.
        </p>
      )}

      {loading ? (
        <p className="text-center py-8 text-gray-500">Loading...</p>
      ) : sorted.length === 0 ? (
        <p className="text-center py-8 text-gray-500">No categories yet. Add one above.</p>
      ) : (
        <div className="space-y-2">
          {sorted.map((cat, index) => (
            <div
              key={cat.id}
              draggable={dragMode}
              onDragStart={dragMode ? (e) => handleDragStart(e, index) : undefined}
              onDragOver={dragMode ? (e) => handleDragOver(e, index) : undefined}
              onDrop={dragMode ? handleDrop : undefined}
              onDragEnd={dragMode ? handleDrop : undefined}
              className={`flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-gray-200 transition-shadow ${dragMode ? 'cursor-grab active:cursor-grabbing hover:shadow-md' : ''}`}
            >
              <div className="flex items-center gap-3">
                {dragMode && <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                <span className="text-xl">{cat.icon || '🍽️'}</span>
                <div>
                  <h3 className="font-semibold text-gray-900">{cat.name}</h3>
                  <p className="text-xs text-gray-400">Position {index + 1}</p>
                </div>
              </div>
              <button
                onClick={() => onDelete(cat.id, cat.name)}
                className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                title="Delete category"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
