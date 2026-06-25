import { useState, useRef } from 'react';
import { ChevronDown, ChevronRight, Edit, Trash2, GripVertical, Plus } from 'lucide-react';
import type { TenantMenuItem, TenantCategory } from '@/types/tenant';

interface Props {
  items: TenantMenuItem[];
  categories: TenantCategory[];
  dragMode: boolean;
  onEdit: (item: TenantMenuItem) => void;
  onDelete: (id: string, name: string) => void;
  onAddToCategory: (categoryId: string) => void;
  onReorderItems: (categoryId: string, reordered: TenantMenuItem[]) => Promise<void>;
}

export default function MenuByCategory({
  items, categories, dragMode, onEdit, onDelete, onAddToCategory, onReorderItems,
}: Props) {
  const sorted = [...categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  // localOrder per category for optimistic DnD
  const [localOrder, setLocalOrder] = useState<Record<string, TenantMenuItem[]>>({});

  const dragIndex = useRef<number | null>(null);
  const dragCat = useRef<string | null>(null);
  const saving = useRef<Record<string, boolean>>({});

  const getItems = (catId: string) => {
    if (localOrder[catId]) return localOrder[catId];
    return items.filter(i => i.category === catId).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  };

  const uncategorized = items.filter(i => !i.category || !categories.find(c => c.id === i.category));

  const toggleCollapse = (id: string) =>
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));

  const handleDragStart = (e: React.DragEvent, catId: string, index: number) => {
    dragIndex.current = index;
    dragCat.current = catId;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, catId: string, index: number) => {
    e.preventDefault();
    if (dragCat.current !== catId) return; // No cross-category drag
    if (dragIndex.current === null || dragIndex.current === index) return;
    const list = [...getItems(catId)];
    const [moved] = list.splice(dragIndex.current, 1);
    list.splice(index, 0, moved);
    dragIndex.current = index;
    setLocalOrder(prev => ({ ...prev, [catId]: list }));
  };

  const handleDrop = async (catId: string) => {
    if (!localOrder[catId] || saving.current[catId]) return;
    saving.current[catId] = true;
    try {
      const updated = localOrder[catId].map((item, i) => ({ ...item, sortOrder: i }));
      setLocalOrder(prev => ({ ...prev, [catId]: updated }));
      await onReorderItems(catId, updated);
    } finally {
      saving.current[catId] = false;
      dragIndex.current = null;
      dragCat.current = null;
    }
  };

  const renderItems = (catId: string) => {
    const catItems = getItems(catId);
    if (catItems.length === 0) {
      return (
        <div className="px-4 py-6 text-center text-sm text-gray-400">
          No items in this category.
          <button onClick={() => onAddToCategory(catId)} className="ml-2 text-blue-500 hover:underline">Add one</button>
        </div>
      );
    }
    return (
      <div className="divide-y divide-gray-100">
        {catItems.map((item, index) => (
          <div
            key={item.id}
            draggable={dragMode}
            onDragStart={dragMode ? (e) => handleDragStart(e, catId, index) : undefined}
            onDragOver={dragMode ? (e) => handleDragOver(e, catId, index) : undefined}
            onDrop={dragMode ? () => handleDrop(catId) : undefined}
            onDragEnd={dragMode ? () => handleDrop(catId) : undefined}
            className={`flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 transition-colors ${dragMode ? 'cursor-grab active:cursor-grabbing' : ''}`}
          >
            {dragMode && <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />}

            {/* Thumbnail */}
            {item.image ? (
              <img src={item.image} alt={item.name} className="w-11 h-11 rounded-lg object-cover flex-shrink-0" />
            ) : (
              <div className="w-11 h-11 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                <span className="text-gray-400 text-xs">No img</span>
              </div>
            )}

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-gray-900 truncate">{item.name}</span>
                {item.popular && <span className="text-xs text-amber-600 font-medium">★ Popular</span>}
              </div>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-sm font-semibold text-gray-700">₹{item.price}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${item.type === 'veg' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {item.type}
                </span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${item.available ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                  {item.available ? 'Available' : 'Unavailable'}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={() => onEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Edit">
                <Edit className="w-4 h-4" />
              </button>
              <button onClick={() => onDelete(item.id, item.name)} className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="Delete">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        {/* Add to category button */}
        <div className="px-4 py-2">
          <button
            onClick={() => onAddToCategory(catId)}
            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800"
          >
            <Plus className="w-3.5 h-3.5" />
            Add item to this category
          </button>
        </div>
      </div>
    );
  };

  if (sorted.length === 0 && items.length === 0) {
    return <p className="text-center py-8 text-gray-500">No items yet. Click "Add Item" to get started.</p>;
  }

  return (
    <div className="space-y-3">
      {sorted.map((cat) => {
        const count = getItems(cat.id).length;
        const isCollapsed = collapsed[cat.id];
        return (
          <div key={cat.id} className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Category header */}
            <button
              onClick={() => toggleCollapse(cat.id)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{cat.icon || '🍽️'}</span>
                <span className="font-semibold text-gray-800">{cat.name}</span>
                <span className="text-xs text-gray-500 bg-white border border-gray-200 rounded-full px-2 py-0.5">
                  {count} {count === 1 ? 'item' : 'items'}
                </span>
              </div>
              {isCollapsed ? <ChevronRight className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>
            {/* Items list */}
            {!isCollapsed && renderItems(cat.id)}
          </div>
        );
      })}

      {/* Uncategorized items */}
      {uncategorized.length > 0 && (
        <div className="border border-dashed border-gray-300 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleCollapse('__uncategorized')}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 text-left"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">📦</span>
              <span className="font-semibold text-gray-500">Uncategorized</span>
              <span className="text-xs text-gray-400 bg-white border border-gray-200 rounded-full px-2 py-0.5">
                {uncategorized.length}
              </span>
            </div>
            {collapsed['__uncategorized'] ? <ChevronRight className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          {!collapsed['__uncategorized'] && (
            <div className="divide-y divide-gray-100">
              {uncategorized.map((item) => (
                <div key={item.id} className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-11 h-11 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-11 h-11 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-gray-400 text-xs">No img</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-gray-900">{item.name}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-sm font-semibold text-gray-700">₹{item.price}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${item.type === 'veg' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{item.type}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => onEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => onDelete(item.id, item.name)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
