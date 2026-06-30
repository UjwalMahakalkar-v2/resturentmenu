import { useState, useEffect, useMemo } from 'react';
import { inventoryAPI } from '@/services/api';
import toast from 'react-hot-toast';

/* Minimal client-side unit conversion mirror (same dimensions as the server util)
   — used only for the live food-cost preview; the server is authoritative on save. */
const FACTOR: Record<string, { d: string; f: number }> = {
  mg: { d: 'm', f: .001 }, g: { d: 'm', f: 1 }, kg: { d: 'm', f: 1000 },
  ml: { d: 'v', f: 1 }, l: { d: 'v', f: 1000 },
};
function conv(qty: number, from: string, to: string) {
  const a = FACTOR[(from || '').toLowerCase()], b = FACTOR[(to || '').toLowerCase()];
  if (!a || !b || a.d !== b.d) return qty;
  return qty * a.f / b.f;
}

interface Line { inventoryItemId: string; quantity: string; unit: string; }

export default function RecipeEditor({ menuItemId, dishPrice }: { menuItemId: string; dishPrice: number }) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [invItems, setInvItems] = useState<any[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let off = false;
    (async () => {
      try {
        const s = await inventoryAPI.getSettings();
        if (off) return;
        if (!s.inventoryEnabled) { setEnabled(false); setLoading(false); return; }
        setEnabled(true);
        const [its, rec] = await Promise.all([inventoryAPI.getItems(), inventoryAPI.getRecipe(menuItemId)]);
        if (off) return;
        setInvItems(its);
        setLines((rec.lines || []).map((l: any) => ({ inventoryItemId: l.inventoryItemId, quantity: String(l.quantity), unit: l.unit })));
      } catch {
        setEnabled(false);
      } finally {
        if (!off) setLoading(false);
      }
    })();
    return () => { off = true; };
  }, [menuItemId]);

  const itemById = useMemo(() => Object.fromEntries(invItems.map(i => [i.id, i])), [invItems]);

  const foodCost = useMemo(() => lines.reduce((s, l) => {
    const it = itemById[l.inventoryItemId];
    if (!it) return s;
    const inBase = conv(Number(l.quantity) || 0, l.unit, it.unit);
    return s + inBase * (it.purchasePrice || 0);
  }, 0), [lines, itemById]);

  if (enabled === false || loading && enabled === null) {
    // Hidden entirely when inventory module is off (or still resolving for a disabled tenant)
    if (enabled === false) return null;
  }
  if (loading) return <div className="text-sm text-gray-400">Loading recipe…</div>;

  const addLine = () => setLines(p => [...p, { inventoryItemId: invItems[0]?.id || '', quantity: '', unit: invItems[0]?.unit || 'pcs' }]);
  const setLine = (i: number, patch: Partial<Line>) => setLines(p => p.map((l, idx) => idx === i ? { ...l, ...patch } : l));
  const removeLine = (i: number) => setLines(p => p.filter((_, idx) => idx !== i));

  const save = async () => {
    setSaving(true);
    try {
      const payload = lines.filter(l => l.inventoryItemId && Number(l.quantity) > 0)
        .map(l => ({ inventoryItemId: l.inventoryItemId, quantity: Number(l.quantity), unit: l.unit }));
      await inventoryAPI.saveRecipe(menuItemId, payload);
      toast.success('Recipe saved');
    } catch { toast.error('Failed to save recipe'); } finally { setSaving(false); }
  };

  const margin = dishPrice > 0 ? Math.round((dishPrice - foodCost) / dishPrice * 100) : 0;

  return (
    <div className="border-t border-gray-200 pt-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-sm font-semibold text-gray-700">Recipe / Bill of Materials</span>
          <p className="text-xs text-gray-500">Ingredients consumed per dish. Stock auto-deducts on each POS sale.</p>
        </div>
        {invItems.length > 0 && (
          <button type="button" onClick={addLine} className="text-xs font-semibold text-primary-600 hover:underline">+ Add ingredient</button>
        )}
      </div>

      {invItems.length === 0 ? (
        <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">No inventory items yet. Add products in the Inventory tab first, then build the recipe here.</p>
      ) : (
        <>
          <div className="space-y-2">
            {lines.length === 0 && <p className="text-xs text-gray-400">No ingredients yet — add one to enable automatic stock deduction.</p>}
            {lines.map((l, i) => {
              const it = itemById[l.inventoryItemId];
              return (
                <div key={i} className="flex gap-2 items-center">
                  <select value={l.inventoryItemId} onChange={e => { const ni = itemById[e.target.value]; setLine(i, { inventoryItemId: e.target.value, unit: ni?.unit || l.unit }); }} className="input-field flex-1 text-sm py-2">
                    {invItems.map(iv => <option key={iv.id} value={iv.id}>{iv.emoji} {iv.name}</option>)}
                  </select>
                  <input type="number" min="0" step="any" value={l.quantity} onChange={e => setLine(i, { quantity: e.target.value })} placeholder="Qty" className="input-field w-24 text-sm py-2" />
                  <select value={l.unit} onChange={e => setLine(i, { unit: e.target.value })} className="input-field w-24 text-sm py-2">
                    {['pcs', 'g', 'kg', 'ml', 'L', 'packet', 'box'].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <span className="text-xs text-gray-400 w-16 text-right">{it ? `stock: ${it.currentStock}${it.unit}` : ''}</span>
                  <button type="button" onClick={() => removeLine(i)} className="text-red-500 text-sm px-2" title="Remove">✕</button>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-4 mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm">
            <div><span className="text-xs text-gray-500 block">Food Cost</span><span className="font-bold text-gray-900">₹{foodCost.toFixed(2)}</span></div>
            <div><span className="text-xs text-gray-500 block">Dish Price</span><span className="font-bold text-gray-900">₹{dishPrice}</span></div>
            <div><span className="text-xs text-gray-500 block">Gross Margin</span><span className={`font-bold ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>{margin}%</span></div>
            <span className="flex-1" />
            <button type="button" onClick={save} disabled={saving} className="btn-primary text-sm py-2 px-4">{saving ? 'Saving…' : 'Save Recipe'}</button>
          </div>
        </>
      )}
    </div>
  );
}
