import { useState, useEffect, useCallback, useMemo } from 'react';
import { Lock } from 'lucide-react';
import { inventoryAPI } from '@/services/api';
import toast from 'react-hot-toast';

/* ── Design tokens (warm-neutral ERP theme) ─────────────────── */
const C = {
  primary: '#d9542b', dark: '#1c1a18', bg: '#f4f3f1', card: '#ffffff',
  border: '#ece8e3', muted: '#9a938b', sec: '#6b645d', text: '#1c1a18',
  green: '#1f8a5b', amber: '#c9851f', red: '#c0392b', blue: '#2a6fdb',
};
const MONO = "'Spline Sans Mono', monospace";
const SANS = "'Plus Jakarta Sans', sans-serif";
const UNITS = ['pcs', 'kg', 'g', 'L', 'ml', 'packet', 'box', 'crate'];
const MOVE_TYPES = ['purchase', 'adjustment', 'waste', 'spoilage', 'return', 'transfer', 'correction', 'production'];

const fk = (n: number) => n >= 100000 ? '₹' + (n / 100000).toFixed(2).replace(/\.?0+$/, '') + 'L'
  : n >= 1000 ? '₹' + (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'K' : '₹' + Math.round(n);

interface Item {
  id: string; categoryId: string | null; categoryName: string; name: string; sku: string; emoji: string;
  unit: string; currentStock: number; minStock: number; maxStock: number; purchasePrice: number;
  sellingPrice: number; gstRate: number; supplier: string; notes: string; status: 'In Stock' | 'Low' | 'Critical';
}

const STATUS_STYLE: Record<string, { bg: string; fg: string }> = {
  'In Stock': { bg: '#eef5f0', fg: C.green }, Low: { bg: '#fdf4e3', fg: C.amber }, Critical: { bg: '#fdeeee', fg: C.red },
};

const EMPTY_ITEM = {
  id: '', name: '', sku: '', emoji: '📦', categoryId: '', unit: 'pcs',
  currentStock: '0', minStock: '0', maxStock: '0', purchasePrice: '0', sellingPrice: '0', gstRate: '0', supplier: '', notes: '',
};

type Tab = 'dashboard' | 'items' | 'movements' | 'lowstock' | 'categories' | 'settings';

export default function InventoryDashboard() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>('dashboard');
  const [items, setItems] = useState<Item[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({ autoHide: false, showOutOfStockBadge: true, continueSelling: true });
  const [loading, setLoading] = useState(true);

  // modals
  const [productForm, setProductForm] = useState<any | null>(null); // null = closed
  const [adjustItem, setAdjustItem] = useState<Item | null>(null);

  const load = useCallback(async () => {
    try {
      const s = await inventoryAPI.getSettings();
      setEnabled(!!s.inventoryEnabled);
      setSettings(s);
      if (!s.inventoryEnabled) { setLoading(false); return; }
      const [its, cs, mv] = await Promise.all([
        inventoryAPI.getItems(), inventoryAPI.getCategories(), inventoryAPI.getMovements({ limit: 80 }),
      ]);
      setItems(its); setCats(cs); setMovements(mv);
    } catch {
      setEnabled(false);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const refresh = async () => {
    const [its, mv, cs] = await Promise.all([inventoryAPI.getItems(), inventoryAPI.getMovements({ limit: 80 }), inventoryAPI.getCategories()]);
    setItems(its); setMovements(mv); setCats(cs);
  };

  /* ── derived KPIs ── */
  const kpis = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const isToday = (d: string) => (d || '').slice(0, 10) === today;
    const lowCount = items.filter(i => i.status === 'Low').length;
    const critCount = items.filter(i => i.status === 'Critical').length;
    const invValue = items.reduce((s, i) => s + i.currentStock * i.purchasePrice, 0);
    let todaySale = 0, todayWaste = 0, todayPurchase = 0;
    for (const m of movements) {
      if (!isToday(m.createdAt)) continue;
      const it = items.find(i => i.id === m.inventoryItemId);
      const val = Math.abs(m.changeQty) * (it?.purchasePrice || 0);
      if (m.type === 'sale') todaySale += val;
      else if (m.type === 'waste' || m.type === 'spoilage') todayWaste += val;
      else if (m.type === 'purchase') todayPurchase += val;
    }
    return { total: items.length, lowCount, critCount, invValue, todaySale, todayWaste, todayPurchase };
  }, [items, movements]);

  const lowItems = useMemo(() => items.filter(i => i.status !== 'In Stock')
    .sort((a, b) => (a.minStock ? a.currentStock / a.minStock : 1) - (b.minStock ? b.currentStock / b.minStock : 1)), [items]);

  /* ── product save ── */
  const saveProduct = async () => {
    const f = productForm;
    if (!f.name.trim()) { toast.error('Product name required'); return; }
    const payload = {
      name: f.name.trim(), sku: f.sku, emoji: f.emoji, categoryId: f.categoryId || null, unit: f.unit,
      minStock: Number(f.minStock) || 0, maxStock: Number(f.maxStock) || 0,
      purchasePrice: Number(f.purchasePrice) || 0, sellingPrice: Number(f.sellingPrice) || 0,
      gstRate: Number(f.gstRate) || 0, supplier: f.supplier, notes: f.notes,
    };
    try {
      if (f.id) await inventoryAPI.updateItem(f.id, payload);
      else await inventoryAPI.createItem({ ...payload, currentStock: Number(f.currentStock) || 0 });
      toast.success(f.id ? 'Product updated' : 'Product added');
      setProductForm(null);
      await refresh();
    } catch { toast.error('Failed to save product'); }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Delete this product? Its recipe links will also be removed.')) return;
    try { await inventoryAPI.deleteItem(id); toast.success('Deleted'); await refresh(); } catch { toast.error('Failed to delete'); }
  };

  /* ── render ── */
  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: C.muted, fontFamily: SANS }}>Loading inventory…</div>;

  if (!enabled) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4"><Lock className="w-8 h-8 text-gray-400" /></div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Inventory Not Enabled</h3>
        <p className="text-gray-500 text-sm max-w-xs">The Inventory &amp; Finance module is not enabled for your account. Contact your super admin to enable it.</p>
      </div>
    );
  }

  const TABS: { id: Tab; label: string; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard' }, { id: 'items', label: 'Inventory' },
    { id: 'movements', label: 'Stock Movements' }, { id: 'lowstock', label: 'Low Stock', badge: kpis.lowCount + kpis.critCount },
    { id: 'categories', label: 'Categories' }, { id: 'settings', label: 'Settings' },
  ];

  return (
    <div style={{ fontFamily: SANS, color: C.text }}>
      {/* sub-tabs */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 18 }}>
        {TABS.map(t => {
          const a = t.id === tab;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 700, fontFamily: SANS, background: a ? C.dark : '#fff', color: a ? '#fff' : C.sec,
              boxShadow: a ? 'none' : `inset 0 0 0 1px ${C.border}`,
            }}>
              {t.label}
              {!!t.badge && <span style={{ padding: '1px 7px', borderRadius: 20, background: a ? 'rgba(255,255,255,.2)' : '#fdeeee', color: a ? '#fff' : C.red, fontSize: 10.5, fontWeight: 800, fontFamily: MONO }}>{t.badge}</span>}
            </button>
          );
        })}
        <span style={{ flex: 1 }} />
        {tab === 'items' && <button onClick={() => setProductForm({ ...EMPTY_ITEM })} style={primaryBtn}>+ Add Product</button>}
        {tab === 'categories' && <button onClick={addCategory} style={primaryBtn}>+ New Category</button>}
      </div>

      {tab === 'dashboard' && <DashboardView kpis={kpis} lowItems={lowItems} cats={cats} onReorder={(it: Item) => setAdjustItem(it)} />}
      {tab === 'items' && <ItemsView items={items} onEdit={(it: Item) => setProductForm(toForm(it))} onAdjust={setAdjustItem} onDelete={deleteProduct} />}
      {tab === 'movements' && <MovementsView movements={movements} />}
      {tab === 'lowstock' && <LowStockView lowItems={lowItems} onReorder={setAdjustItem} />}
      {tab === 'categories' && <CategoriesView cats={cats} />}
      {tab === 'settings' && <SettingsView settings={settings} onSave={async (s: any) => { const r = await inventoryAPI.updateSettings(s); setSettings(r); toast.success('Settings saved'); }} />}

      {productForm && <ProductModal form={productForm} setForm={setProductForm} cats={cats} onClose={() => setProductForm(null)} onSave={saveProduct} />}
      {adjustItem && <AdjustModal item={adjustItem} onClose={() => setAdjustItem(null)} onSaved={async () => { setAdjustItem(null); await refresh(); }} />}
    </div>
  );

  async function addCategory() {
    const name = prompt('New inventory category name:');
    if (!name?.trim()) return;
    try { await inventoryAPI.createCategory({ name: name.trim() }); toast.success('Category added'); await refresh(); } catch { toast.error('Failed'); }
  }
}

/* ───────────────────────── sub-views ───────────────────────── */
const cardBox: React.CSSProperties = { background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, boxShadow: '0 1px 2px rgba(0,0,0,.03)' };
const primaryBtn: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 7, padding: '10px 16px', borderRadius: 11, border: 'none', background: C.primary, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: SANS };
const ghostBtn: React.CSSProperties = { padding: '8px 13px', borderRadius: 10, border: `1px solid #e7e3de`, background: '#fff', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, color: '#3a352f', fontFamily: SANS };
const label: React.CSSProperties = { fontSize: 11.5, fontWeight: 700, color: C.sec, marginBottom: 5, display: 'block' };
const input: React.CSSProperties = { width: '100%', padding: '11px 13px', border: `1px solid #e7e3de`, borderRadius: 11, fontSize: 13, outline: 'none', fontFamily: SANS, boxSizing: 'border-box' };

function DashboardView({ kpis, lowItems, cats, onReorder }: any) {
  const kpiCards = [
    { icon: '📦', label: 'Total Products', value: String(kpis.total), tint: '#fcefe9' },
    { icon: '⚠️', label: 'Low Stock Items', value: String(kpis.lowCount), tint: '#fdeeee', vc: C.amber },
    { icon: '🚨', label: 'Critical Items', value: String(kpis.critCount), tint: '#fdeeee', vc: C.red },
    { icon: '💰', label: 'Inventory Value', value: fk(kpis.invValue), tint: '#eef5f0' },
    { icon: '🍽️', label: "Today's Consumption", value: fk(kpis.todaySale), tint: '#eaf0fb' },
    { icon: '🗑️', label: "Today's Wastage", value: fk(kpis.todayWaste), tint: '#fdf4e3', vc: kpis.todayWaste ? C.red : undefined },
    { icon: '🛒', label: "Today's Purchases", value: fk(kpis.todayPurchase), tint: '#fcefe9' },
    { icon: '💵', label: 'Stock at Cost', value: fk(kpis.invValue), tint: '#eef5f0', vc: C.green },
  ];
  const catData = cats.filter((c: any) => c.stockValue > 0);
  const catTotal = catData.reduce((s: number, c: any) => s + c.stockValue, 0) || 1;
  const COLORS = [C.primary, C.blue, '#c9a227', C.green, '#9a59c5', C.amber];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 14 }}>
        {kpiCards.map((c, i) => (
          <div key={i} style={{ ...cardBox, padding: '16px 17px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <span style={{ width: 36, height: 36, borderRadius: 11, background: c.tint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{c.icon}</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: C.muted }}>{c.label}</span>
              <span style={{ fontSize: 23, fontWeight: 800, fontFamily: MONO, letterSpacing: -.5, color: c.vc || C.dark }}>{c.value}</span>
            </div>
          </div>
        ))}
      </div>

      {lowItems.length > 0 && (
        <div style={{ ...cardBox, borderRadius: 18, padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{ width: 30, height: 30, borderRadius: 9, background: '#fdeeee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⚠️</span>
            <span style={{ fontSize: 15, fontWeight: 800 }}>Low Stock Alerts</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>· {lowItems.length} need attention</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 12 }}>
            {lowItems.slice(0, 6).map((l: Item) => {
              const crit = l.status === 'Critical';
              const pct = l.minStock ? Math.min(100, Math.round(l.currentStock / l.minStock * 100)) : 100;
              return (
                <div key={l.id} style={{ background: crit ? '#fef6f5' : '#fdfaf4', border: `1px solid ${crit ? '#f6dcd6' : '#f0e6cf'}`, borderRadius: 14, padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                    <span style={{ width: 38, height: 38, borderRadius: 11, background: '#fff', border: '1px solid #f0e8df', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19 }}>{l.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13.5, fontWeight: 800 }}>{l.name}</div><div style={{ fontSize: 11, fontWeight: 600, color: C.muted }}>{l.categoryName || '—'}</div></div>
                    <span style={{ padding: '3px 10px', borderRadius: 20, background: crit ? '#fdeeee' : '#fdf4e3', color: crit ? C.red : C.amber, fontSize: 10.5, fontWeight: 800 }}>{l.status}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, marginTop: 11 }}>
                    <Stat label="Remaining" value={`${l.currentStock} ${l.unit}`} color={crit ? C.red : C.amber} />
                    <Stat label="Minimum" value={`${l.minStock} ${l.unit}`} color={C.sec} />
                    <span style={{ flex: 1 }} />
                    <button onClick={() => onReorder(l)} style={{ padding: '7px 12px', borderRadius: 9, border: 'none', background: C.dark, color: '#fff', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>Restock</button>
                  </div>
                  <div style={{ height: 6, borderRadius: 5, background: '#f1ede8', overflow: 'hidden', marginTop: 11 }}><div style={{ height: '100%', width: pct + '%', borderRadius: 5, background: crit ? C.red : C.amber }} /></div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {catData.length > 0 && (
        <div style={{ ...cardBox, borderRadius: 18, padding: 20 }}>
          <span style={{ fontSize: 15, fontWeight: 800 }}>Category Distribution</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
            {catData.map((c: any, i: number) => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 11, height: 11, borderRadius: 4, background: COLORS[i % COLORS.length] }} />
                <span style={{ flex: 1, fontSize: 12.5, fontWeight: 700 }}>{c.icon} {c.name}</span>
                <span style={{ fontSize: 12, fontWeight: 700, fontFamily: MONO, color: C.sec }}>{fk(c.stockValue)}</span>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: C.muted, minWidth: 38, textAlign: 'right' }}>{Math.round(c.stockValue / catTotal * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label: l, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: .4 }}>{l}</span>
      <span style={{ fontSize: 16, fontWeight: 800, fontFamily: MONO, color: color || C.dark }}>{value}</span>
    </div>
  );
}

function ItemsView({ items, onEdit, onAdjust, onDelete }: any) {
  const [filter, setFilter] = useState('all');
  const shown = filter === 'all' ? items : items.filter((i: Item) => (filter === 'low' ? i.status !== 'In Stock' : i.categoryName === filter));
  const catNames = Array.from(new Set(items.map((i: Item) => i.categoryName).filter(Boolean)));
  return (
    <div style={{ ...cardBox, borderRadius: 18, overflow: 'hidden' }}>
      <div style={{ display: 'flex', gap: 6, padding: 12, flexWrap: 'wrap', borderBottom: `1px solid ${C.border}` }}>
        {['all', 'low', ...catNames].map((f: any) => (
          <button key={f} onClick={() => setFilter(f)} style={{ ...ghostBtn, background: filter === f ? C.dark : '#fff', color: filter === f ? '#fff' : '#3a352f', border: filter === f ? 'none' : ghostBtn.border, textTransform: 'capitalize' }}>{f === 'low' ? 'Low / Critical' : f}</button>
        ))}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 880 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.1fr 0.8fr 1fr 1fr 1.2fr 1fr 110px', gap: 12, padding: '13px 18px', fontSize: 10.5, fontWeight: 800, color: C.muted, letterSpacing: .5, textTransform: 'uppercase', background: '#fbfaf8', borderBottom: `1px solid ${C.border}` }}>
            <span>Product</span><span>Category</span><span style={{ textAlign: 'right' }}>Stock / Min</span><span>Unit</span><span style={{ textAlign: 'right' }}>Buy ₹</span><span style={{ textAlign: 'right' }}>Sell ₹</span><span>Supplier</span><span>Status</span><span style={{ textAlign: 'right' }}>Actions</span>
          </div>
          {shown.length === 0 ? <div style={{ padding: 30, textAlign: 'center', color: C.muted, fontSize: 13 }}>No products. Click “Add Product”.</div> : shown.map((p: Item) => {
            const st = STATUS_STYLE[p.status];
            return (
              <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.1fr 0.8fr 1fr 1fr 1.2fr 1fr 110px', gap: 12, alignItems: 'center', padding: '12px 18px', borderBottom: '1px solid #f4f1ed', fontSize: 13 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}><span style={{ fontSize: 18 }}>{p.emoji}</span><div style={{ minWidth: 0 }}><div style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div><div style={{ fontSize: 11, color: C.muted, fontFamily: MONO }}>{p.sku || '—'}</div></div></div>
                <span style={{ fontWeight: 600, color: '#3a352f' }}>{p.categoryName || '—'}</span>
                <span style={{ textAlign: 'right', fontWeight: 700, fontFamily: MONO, color: st.fg }}>{p.currentStock}<span style={{ color: '#bcb4ab', fontWeight: 600 }}> / {p.minStock}</span></span>
                <span style={{ color: C.sec, fontWeight: 600 }}>{p.unit}</span>
                <span style={{ textAlign: 'right', fontFamily: MONO, color: C.sec }}>{p.purchasePrice}</span>
                <span style={{ textAlign: 'right', fontFamily: MONO, fontWeight: 700 }}>{p.sellingPrice}</span>
                <span style={{ fontWeight: 600, color: '#3a352f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.supplier || '—'}</span>
                <span><span style={{ padding: '3px 10px', borderRadius: 20, background: st.bg, color: st.fg, fontSize: 11, fontWeight: 700 }}>{p.status}</span></span>
                <span style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                  <button title="Adjust stock" onClick={() => onAdjust(p)} style={iconBtn}>±</button>
                  <button title="Edit" onClick={() => onEdit(p)} style={iconBtn}>✎</button>
                  <button title="Delete" onClick={() => onDelete(p.id)} style={{ ...iconBtn, color: C.red }}>🗑</button>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
const iconBtn: React.CSSProperties = { width: 28, height: 28, borderRadius: 8, border: `1px solid ${C.border}`, background: '#fff', cursor: 'pointer', fontSize: 13 };

function MovementsView({ movements }: any) {
  const [filter, setFilter] = useState('all');
  const types = ['all', 'sale', 'purchase', 'waste', 'adjustment'];
  const shown = filter === 'all' ? movements : movements.filter((m: any) => m.type === filter);
  return (
    <div style={{ ...cardBox, borderRadius: 18, padding: '8px 20px 20px' }}>
      <div style={{ display: 'flex', gap: 6, padding: '12px 0', flexWrap: 'wrap' }}>
        {types.map(t => <button key={t} onClick={() => setFilter(t)} style={{ ...ghostBtn, textTransform: 'capitalize', background: filter === t ? C.dark : '#fff', color: filter === t ? '#fff' : '#3a352f', border: filter === t ? 'none' : ghostBtn.border }}>{t}</button>)}
      </div>
      {shown.length === 0 ? <div style={{ padding: 30, textAlign: 'center', color: C.muted, fontSize: 13 }}>No stock movements yet.</div> : shown.map((m: any) => {
        const neg = m.changeQty < 0;
        return (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid #f6f3ef' }}>
            <span style={{ width: 30, height: 30, borderRadius: 9, background: neg ? '#fdeeee' : '#eef5f0', color: neg ? C.red : C.green, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flex: '0 0 auto' }}>{neg ? '↓' : '↑'}</span>
            <span style={{ fontSize: 18 }}>{m.emoji}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 15, fontWeight: 800, fontFamily: MONO, color: neg ? C.red : C.green }}>{neg ? '' : '+'}{m.changeQty} {m.unit}</span>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{m.itemName}</span>
                <span style={{ padding: '2px 9px', borderRadius: 20, background: '#f4f1ee', color: C.sec, fontSize: 10.5, fontWeight: 700, textTransform: 'capitalize' }}>{m.type}</span>
              </div>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: C.muted, marginTop: 3 }}>{m.reason || '—'}{m.referenceId ? ` · ${m.referenceId}` : ''} · {m.previousStock} → {m.newStock} {m.unit}</div>
            </div>
            <div style={{ textAlign: 'right', flex: '0 0 auto' }}><div style={{ fontSize: 12, fontWeight: 700, color: '#3a352f' }}>{new Date(m.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div><div style={{ fontSize: 11, fontWeight: 600, color: C.muted }}>{m.userName}</div></div>
          </div>
        );
      })}
    </div>
  );
}

function LowStockView({ lowItems, onReorder }: any) {
  if (!lowItems.length) return <div style={{ ...cardBox, borderRadius: 18, padding: 40, textAlign: 'center', color: C.muted }}>✅ Everything is well stocked.</div>;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
      {lowItems.map((l: Item) => {
        const crit = l.status === 'Critical';
        const pct = l.minStock ? Math.min(100, Math.round(l.currentStock / l.minStock * 100)) : 100;
        return (
          <div key={l.id} style={{ ...cardBox, background: crit ? '#fef6f5' : '#fff', border: `1px solid ${crit ? '#f6dcd6' : C.border}`, padding: 18, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 42, height: 42, borderRadius: 12, background: crit ? '#fdeeee' : '#faf6ef', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 21 }}>{l.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 15, fontWeight: 800 }}>{l.name}</div><div style={{ fontSize: 11.5, fontWeight: 600, color: C.muted }}>{l.categoryName || '—'} · {l.supplier || 'No supplier'}</div></div>
              <span style={{ padding: '3px 10px', borderRadius: 20, background: crit ? '#fdeeee' : '#fdf4e3', color: crit ? C.red : C.amber, fontSize: 10.5, fontWeight: 800 }}>{l.status}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18, marginTop: 14 }}>
              <Stat label="Remaining" value={`${l.currentStock} ${l.unit}`} color={crit ? C.red : C.amber} />
              <Stat label="Minimum" value={`${l.minStock} ${l.unit}`} color={C.sec} />
            </div>
            <div style={{ height: 7, borderRadius: 6, background: '#f1ede8', overflow: 'hidden', margin: '14px 0' }}><div style={{ height: '100%', width: pct + '%', borderRadius: 6, background: crit ? C.red : C.amber }} /></div>
            <button onClick={() => onReorder(l)} style={{ padding: 10, borderRadius: 11, border: 'none', background: C.dark, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Restock →</button>
          </div>
        );
      })}
    </div>
  );
}

function CategoriesView({ cats }: any) {
  if (!cats.length) return <div style={{ ...cardBox, borderRadius: 18, padding: 40, textAlign: 'center', color: C.muted }}>No inventory categories yet. Click “New Category”.</div>;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(250px,1fr))', gap: 16 }}>
      {cats.map((c: any) => (
        <div key={c.id} style={{ ...cardBox, padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 42, height: 42, borderRadius: 12, background: '#faf6ef', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 21 }}>{c.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 15, fontWeight: 800 }}>{c.name}</div><div style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>{c.productCount} products</div></div>
          </div>
          <div style={{ display: 'flex', gap: 12, paddingTop: 13, borderTop: '1px solid #f4f1ed' }}>
            <div style={{ flex: 1 }}><Stat label="Stock Value" value={fk(c.stockValue)} /></div>
            <div style={{ flex: 1 }}><Stat label="Low Stock" value={String(c.lowCount)} color={c.lowCount ? C.amber : C.dark} /></div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SettingsView({ settings, onSave }: any) {
  const [s, setS] = useState(settings);
  useEffect(() => setS(settings), [settings]);
  const Row = ({ k, title, desc }: { k: string; title: string; desc: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid #f4f1ed' }}>
      <div><div style={{ fontSize: 13.5, fontWeight: 700 }}>{title}</div><div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{desc}</div></div>
      <button onClick={() => setS((p: any) => ({ ...p, [k]: !p[k] }))} style={{ position: 'relative', width: 46, height: 26, borderRadius: 20, border: 'none', cursor: 'pointer', background: s[k] ? C.green : '#d8d2cb', flex: '0 0 auto' }}>
        <span style={{ position: 'absolute', top: 3, left: s[k] ? 23 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left .15s' }} />
      </button>
    </div>
  );
  return (
    <div style={{ ...cardBox, borderRadius: 18, padding: 22, maxWidth: 640 }}>
      <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>Out of Stock Behaviour</div>
      <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 8 }}>How the customer menu reacts when an item's ingredients run out.</div>
      <Row k="autoHide" title="Auto-hide out-of-stock dishes" desc="Hide menu items whose ingredients are depleted." />
      <Row k="showOutOfStockBadge" title="Show “Out of Stock” badge" desc="Mark depleted dishes instead of hiding them." />
      <Row k="continueSelling" title="Continue selling when out of stock" desc="Allow billing even if stock is zero (no block)." />
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}><button onClick={() => onSave(s)} style={primaryBtn}>Save Settings</button></div>
    </div>
  );
}

/* ───────────────────────── modals ───────────────────────── */
function Overlay({ children, onClose }: any) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(28,26,24,.42)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 640, maxWidth: '100%', maxHeight: '90%', overflowY: 'auto', background: '#fff', borderRadius: 20, boxShadow: '0 30px 80px rgba(0,0,0,.32)' }}>{children}</div>
    </div>
  );
}

function ProductModal({ form, setForm, cats, onClose, onSave }: any) {
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));
  const F = ({ k, label: l, ph, mono }: any) => (
    <div><label style={label}>{l}</label><input value={form[k]} onChange={e => set(k, e.target.value)} placeholder={ph} style={{ ...input, fontFamily: mono ? MONO : SANS }} /></div>
  );
  return (
    <Overlay onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 22px', borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, background: '#fff' }}>
        <span style={{ width: 34, height: 34, borderRadius: 10, background: '#fcefe9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>📦</span>
        <div style={{ flex: 1 }}><div style={{ fontSize: 16, fontWeight: 800 }}>{form.id ? 'Edit Product' : 'Add Product'}</div><div style={{ fontSize: 12, color: C.muted }}>Inventory item</div></div>
        <button onClick={onClose} style={{ ...iconBtn, width: 32, height: 32 }}>✕</button>
      </div>
      <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr', gap: 13 }}>
          <div><label style={label}>Emoji</label><input value={form.emoji} onChange={e => set('emoji', e.target.value)} style={{ ...input, textAlign: 'center', fontSize: 20 }} /></div>
          {F({ k: 'name', label: 'Product Name', ph: 'e.g. Mozzarella Cheese' })}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13 }}>
          {F({ k: 'sku', label: 'SKU', ph: 'SKU-0249', mono: true })}
          <div><label style={label}>Category</label>
            <select value={form.categoryId} onChange={e => set('categoryId', e.target.value)} style={input}>
              <option value="">— None —</option>
              {cats.map((c: any) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
          <div><label style={label}>Unit</label><select value={form.unit} onChange={e => set('unit', e.target.value)} style={input}>{UNITS.map(u => <option key={u} value={u}>{u}</option>)}</select></div>
          {F({ k: 'supplier', label: 'Supplier', ph: 'e.g. Amul Distributors' })}
          {F({ k: 'purchasePrice', label: 'Purchase Price ₹ (per unit)', ph: '320', mono: true })}
          {F({ k: 'sellingPrice', label: 'Selling Price ₹', ph: '0', mono: true })}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 13 }}>
          {!form.id ? F({ k: 'currentStock', label: 'Opening Stock', ph: '0', mono: true }) : <div><label style={label}>Current</label><input value={form.currentStock} disabled style={{ ...input, fontFamily: MONO, background: '#f4f1ee', color: C.muted }} title="Change stock via Adjust" /></div>}
          {F({ k: 'minStock', label: 'Minimum', ph: '5', mono: true })}
          {F({ k: 'maxStock', label: 'Maximum', ph: '50', mono: true })}
          {F({ k: 'gstRate', label: 'GST %', ph: '5', mono: true })}
        </div>
        {F({ k: 'notes', label: 'Notes', ph: 'Storage / handling notes' })}
      </div>
      <div style={{ display: 'flex', gap: 10, padding: '16px 22px', borderTop: `1px solid ${C.border}`, position: 'sticky', bottom: 0, background: '#fff' }}>
        <span style={{ flex: 1 }} /><button onClick={onClose} style={ghostBtn}>Cancel</button><button onClick={onSave} style={primaryBtn}>{form.id ? 'Save' : 'Add Product'}</button>
      </div>
    </Overlay>
  );
}

function AdjustModal({ item, onClose, onSaved }: { item: Item; onClose: () => void; onSaved: () => void }) {
  const [type, setType] = useState('purchase');
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  // purchase/return/production/correction(+) add; waste/spoilage/transfer remove
  const adds = ['purchase', 'return', 'production'].includes(type);
  const submit = async () => {
    const q = Number(qty);
    if (!q || q <= 0) { toast.error('Enter a quantity'); return; }
    setSaving(true);
    try {
      await inventoryAPI.recordMovement({ inventoryItemId: item.id, type, changeQty: adds ? q : -q, reason });
      toast.success('Stock updated');
      onSaved();
    } catch { toast.error('Failed to update stock'); } finally { setSaving(false); }
  };
  return (
    <Overlay onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 22px', borderBottom: `1px solid ${C.border}` }}>
        <span style={{ fontSize: 22 }}>{item.emoji}</span>
        <div style={{ flex: 1 }}><div style={{ fontSize: 16, fontWeight: 800 }}>Adjust Stock — {item.name}</div><div style={{ fontSize: 12, color: C.muted, fontFamily: MONO }}>Current: {item.currentStock} {item.unit}</div></div>
        <button onClick={onClose} style={{ ...iconBtn, width: 32, height: 32 }}>✕</button>
      </div>
      <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div><label style={label}>Movement Type</label>
          <select value={type} onChange={e => setType(e.target.value)} style={input}>
            {MOVE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}{['purchase', 'return', 'production'].includes(t) ? ' (+)' : ' (−)'}</option>)}
          </select>
        </div>
        <div><label style={label}>Quantity ({item.unit}) — will {adds ? 'add to' : 'remove from'} stock</label><input value={qty} onChange={e => setQty(e.target.value)} placeholder="0" style={{ ...input, fontFamily: MONO }} /></div>
        <div><label style={label}>Reason / Note</label><input value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Expired, received PO, stocktake correction" style={input} /></div>
      </div>
      <div style={{ display: 'flex', gap: 10, padding: '16px 22px', borderTop: `1px solid ${C.border}` }}>
        <span style={{ flex: 1 }} /><button onClick={onClose} style={ghostBtn}>Cancel</button><button onClick={submit} disabled={saving} style={{ ...primaryBtn, opacity: saving ? .6 : 1 }}>{saving ? 'Saving…' : 'Record Movement'}</button>
      </div>
    </Overlay>
  );
}

function toForm(it: Item) {
  return {
    id: it.id, name: it.name, sku: it.sku, emoji: it.emoji, categoryId: it.categoryId || '', unit: it.unit,
    currentStock: String(it.currentStock), minStock: String(it.minStock), maxStock: String(it.maxStock),
    purchasePrice: String(it.purchasePrice), sellingPrice: String(it.sellingPrice), gstRate: String(it.gstRate),
    supplier: it.supplier, notes: it.notes,
  };
}
