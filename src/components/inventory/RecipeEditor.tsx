import { useState, useEffect, useMemo, useRef } from 'react';
import { inventoryAPI } from '@/services/api';

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

export interface RecipeLine { inventoryItemId: string; quantity: string; unit: string; }

/**
 * Recipe / BOM editor. Controlled: it reports its current lines + whether the
 * inventory module is enabled via `onChange`, so the parent menu-item form can
 * persist the recipe on its own Save button (works for new AND existing items).
 */
export default function RecipeEditor({
  menuItemId, dishPrice, onChange,
}: { menuItemId?: string; dishPrice: number; onChange: (lines: RecipeLine[], enabled: boolean) => void }) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [invItems, setInvItems] = useState<any[]>([]);
  const [lines, setLines] = useState<RecipeLine[]>([]);
  const [loading, setLoading] = useState(true);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    let off = false;
    (async () => {
      try {
        const s = await inventoryAPI.getSettings();
        if (off) return;
        if (!s.inventoryEnabled) { setEnabled(false); onChangeRef.current([], false); setLoading(false); return; }
        setEnabled(true);
        const [its, rec] = await Promise.all([
          inventoryAPI.getItems(),
          menuItemId ? inventoryAPI.getRecipe(menuItemId) : Promise.resolve({ lines: [] }),
        ]);
        if (off) return;
        setInvItems(its);
        const initial: RecipeLine[] = (rec.lines || []).map((l: any) => ({ inventoryItemId: l.inventoryItemId, quantity: String(l.quantity), unit: l.unit }));
        setLines(initial);
        onChangeRef.current(initial, true);
      } catch {
        setEnabled(false);
        onChangeRef.current([], false);
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
    return s + conv(Number(l.quantity) || 0, l.unit, it.unit) * (it.purchasePrice || 0);
  }, 0), [lines, itemById]);

  const update = (next: RecipeLine[]) => { setLines(next); onChangeRef.current(next, true); };

  if (enabled === false) return null;           // module off → hide entirely
  if (loading) return <div className="border-t border-gray-200 pt-4 text-sm text-gray-400">Loading recipe…</div>;

  const addLine = () => update([...lines, { inventoryItemId: invItems[0]?.id || '', quantity: '', unit: invItems[0]?.unit || 'pcs' }]);
  const setLine = (i: number, patch: Partial<RecipeLine>) => update(lines.map((l, idx) => idx === i ? { ...l, ...patch } : l));
  const removeLine = (i: number) => update(lines.filter((_, idx) => idx !== i));
  const margin = dishPrice > 0 ? Math.round((dishPrice - foodCost) / dishPrice * 100) : 0;

  return (
    <div className="border-t border-gray-200 pt-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-sm font-semibold text-gray-700">Recipe / Bill of Materials</span>
          <p className="text-xs text-gray-500">Ingredients consumed per dish. Stock auto-deducts on each POS sale. Saved with the item.</p>
        </div>
        {invItems.length > 0 && <button type="button" onClick={addLine} className="text-xs font-semibold text-primary-600 hover:underline">+ Add ingredient</button>}
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
                  <span className="text-xs text-gray-400 w-16 text-right">{it ? `stk: ${it.currentStock}${it.unit}` : ''}</span>
                  <button type="button" onClick={() => removeLine(i)} className="text-red-500 text-sm px-2" title="Remove">✕</button>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm">
            <div><span className="text-xs text-gray-500 block">Food Cost</span><span className="font-bold text-gray-900">₹{foodCost.toFixed(2)}</span></div>
            <div><span className="text-xs text-gray-500 block">Dish Price</span><span className="font-bold text-gray-900">₹{dishPrice}</span></div>
            <div><span className="text-xs text-gray-500 block">Gross Margin</span><span className={`font-bold ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>{margin}%</span></div>
          </div>
        </>
      )}
    </div>
  );
}
