import { useState, useEffect, useCallback, useMemo } from 'react';
import { Lock } from 'lucide-react';
import { inventoryAPI } from '@/services/api';
import { downloadCSV, printReport, type Column } from './exporters';
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

const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');
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

type Tab = 'dashboard' | 'items' | 'movements' | 'orders' | 'suppliers' | 'expenses' | 'finance' | 'notifications' | 'reports' | 'lowstock' | 'categories' | 'settings';

export default function InventoryDashboard() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>('dashboard');
  const [items, setItems] = useState<Item[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [finance, setFinance] = useState<any | null>(null);
  const [financeRange, setFinanceRange] = useState('month');
  const [settings, setSettings] = useState<any>({ autoHide: false, showOutOfStockBadge: true, continueSelling: true });
  const [loading, setLoading] = useState(true);

  // modals
  const [productForm, setProductForm] = useState<any | null>(null); // null = closed
  const [adjustItem, setAdjustItem] = useState<Item | null>(null);
  const [supplierForm, setSupplierForm] = useState<any | null>(null);
  const [showPO, setShowPO] = useState(false);
  const [expenseForm, setExpenseForm] = useState<any | null>(null);

  const load = useCallback(async () => {
    try {
      const s = await inventoryAPI.getSettings();
      setEnabled(!!s.inventoryEnabled);
      setSettings(s);
      if (!s.inventoryEnabled) { setLoading(false); return; }
      const [its, cs, mv, sup, po, exp, fin] = await Promise.all([
        inventoryAPI.getItems(), inventoryAPI.getCategories(), inventoryAPI.getMovements({ limit: 80 }),
        inventoryAPI.getSuppliers().catch(() => []), inventoryAPI.getPurchaseOrders().catch(() => []),
        inventoryAPI.getExpenses().catch(() => []), inventoryAPI.getFinance('month').catch(() => null),
      ]);
      setItems(its); setCats(cs); setMovements(mv); setSuppliers(sup); setOrders(po); setExpenses(exp); setFinance(fin);
    } catch {
      setEnabled(false);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const refresh = async () => {
    const [its, mv, cs, sup, po, exp, fin] = await Promise.all([
      inventoryAPI.getItems(), inventoryAPI.getMovements({ limit: 80 }), inventoryAPI.getCategories(),
      inventoryAPI.getSuppliers().catch(() => []), inventoryAPI.getPurchaseOrders().catch(() => []),
      inventoryAPI.getExpenses().catch(() => []), inventoryAPI.getFinance(financeRange).catch(() => null),
    ]);
    setItems(its); setMovements(mv); setCats(cs); setSuppliers(sup); setOrders(po); setExpenses(exp); setFinance(fin);
  };

  const changeFinanceRange = async (r: string) => {
    setFinanceRange(r);
    try { setFinance(await inventoryAPI.getFinance(r)); } catch { /* ignore */ }
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

  // Derived notification feed (no extra storage) — recomputed from live state.
  const notifications = useMemo(() => {
    const out: { id: string; icon: string; tone: 'red' | 'amber' | 'blue'; text: string; tab: Tab }[] = [];
    items.forEach(i => {
      if (i.status === 'Critical') out.push({ id: 'c' + i.id, icon: '🚨', tone: 'red', text: `${i.name} is critically low (${i.currentStock}${i.unit})`, tab: 'lowstock' });
      else if (i.status === 'Low') out.push({ id: 'l' + i.id, icon: '⚠️', tone: 'amber', text: `${i.name} is low (${i.currentStock}${i.unit}, min ${i.minStock})`, tab: 'lowstock' });
    });
    suppliers.forEach(s => { if (s.outstanding > 0) out.push({ id: 'd' + s.id, icon: '💰', tone: 'amber', text: `${inr(s.outstanding)} payable to ${s.name}`, tab: 'suppliers' }); });
    orders.forEach(o => { if (o.status === 'ordered') out.push({ id: 'o' + o.id, icon: '📦', tone: 'blue', text: `${o.poNumber} awaiting delivery${o.supplierName ? ' from ' + o.supplierName : ''}`, tab: 'orders' }); });
    return out;
  }, [items, suppliers, orders]);

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
    { id: 'movements', label: 'Stock Movements' }, { id: 'orders', label: 'Purchase Orders' },
    { id: 'suppliers', label: 'Suppliers' }, { id: 'expenses', label: 'Expenses' }, { id: 'finance', label: 'Finance' },
    { id: 'notifications', label: 'Notifications', badge: notifications.length },
    { id: 'reports', label: 'Reports' },
    { id: 'lowstock', label: 'Low Stock', badge: kpis.lowCount + kpis.critCount },
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
        {tab === 'suppliers' && <button onClick={() => setSupplierForm({ name: '', contactName: '', phone: '', email: '', address: '', leadTimeDays: '', notes: '' })} style={primaryBtn}>+ Add Supplier</button>}
        {tab === 'orders' && <button onClick={() => setShowPO(true)} style={primaryBtn} title={items.length ? '' : 'Add inventory items first'}>+ New Order</button>}
        {(tab === 'expenses' || tab === 'dashboard') && <button onClick={() => setExpenseForm({ name: '', category: tab === 'dashboard' ? 'Raw Materials' : 'Rent', amount: '', date: new Date().toISOString().slice(0, 10), vendor: '', paymentMethod: 'Cash', recurring: false })} style={primaryBtn}>+ Add Expense</button>}
      </div>

      {tab === 'dashboard' && <DashboardView kpis={kpis} lowItems={lowItems} cats={cats} expenses={expenses} onReorder={(it: Item) => setAdjustItem(it)} />}
      {tab === 'items' && <ItemsView items={items} onEdit={(it: Item) => setProductForm(toForm(it))} onAdjust={setAdjustItem} onDelete={deleteProduct} />}
      {tab === 'movements' && <MovementsView movements={movements} />}
      {tab === 'orders' && <OrdersView orders={orders} onReceive={receivePO} onCancel={cancelPO} />}
      {tab === 'suppliers' && <SuppliersView suppliers={suppliers} onNewOrder={() => setShowPO(true)} onSettle={settleDues} />}
      {tab === 'expenses' && <ExpensesView expenses={expenses} onDelete={deleteExpense} />}
      {tab === 'finance' && <FinanceView finance={finance} range={financeRange} onRange={changeFinanceRange} />}
      {tab === 'notifications' && <NotificationsView notifications={notifications} onGo={(t: Tab) => setTab(t)} />}
      {tab === 'reports' && <ReportsView items={items} suppliers={suppliers} orders={orders} expenses={expenses} finance={finance} />}
      {tab === 'lowstock' && <LowStockView lowItems={lowItems} onReorder={setAdjustItem} />}
      {tab === 'categories' && <CategoriesView cats={cats} />}
      {tab === 'settings' && <SettingsView settings={settings} onSave={async (s: any) => { const r = await inventoryAPI.updateSettings(s); setSettings(r); toast.success('Settings saved'); }} />}

      {productForm && <ProductModal form={productForm} setForm={setProductForm} cats={cats} onClose={() => setProductForm(null)} onSave={saveProduct} />}
      {adjustItem && <AdjustModal item={adjustItem} onClose={() => setAdjustItem(null)} onSaved={async () => { setAdjustItem(null); await refresh(); }} />}
      {supplierForm && <SupplierModal form={supplierForm} setForm={setSupplierForm} onClose={() => setSupplierForm(null)} onSave={saveSupplier} />}
      {showPO && <PurchaseOrderModal items={items} suppliers={suppliers} onClose={() => setShowPO(false)} onSaved={async () => { setShowPO(false); await refresh(); }} />}
      {expenseForm && <ExpenseModal form={expenseForm} setForm={setExpenseForm} onClose={() => setExpenseForm(null)} onSave={saveExpense} />}
    </div>
  );

  async function addCategory() {
    const name = prompt('New inventory category name:');
    if (!name?.trim()) return;
    try { await inventoryAPI.createCategory({ name: name.trim() }); toast.success('Category added'); await refresh(); } catch { toast.error('Failed'); }
  }

  async function saveSupplier() {
    const f = supplierForm;
    if (!f.name.trim()) { toast.error('Supplier name required'); return; }
    try {
      if (f.id) await inventoryAPI.updateSupplier(f.id, f);
      else await inventoryAPI.createSupplier({ ...f, leadTimeDays: Number(f.leadTimeDays) || 0 });
      toast.success(f.id ? 'Supplier updated' : 'Supplier added');
      setSupplierForm(null);
      await refresh();
    } catch { toast.error('Failed to save supplier'); }
  }

  async function receivePO(po: any) {
    if (!confirm(`Receive ${po.poNumber}? This adds all line items to stock.`)) return;
    try { await inventoryAPI.updatePurchaseOrder(po.id, { status: 'received' }); toast.success('Stock received'); await refresh(); } catch { toast.error('Failed to receive'); }
  }
  async function cancelPO(po: any) {
    if (!confirm(`Cancel ${po.poNumber}?`)) return;
    try { await inventoryAPI.updatePurchaseOrder(po.id, { status: 'cancelled' }); toast.success('Order cancelled'); await refresh(); } catch { toast.error('Failed'); }
  }
  async function settleDues(sup: any) {
    if (!sup.outstanding) { toast('No outstanding dues'); return; }
    if (!confirm(`Mark ₹${Math.round(sup.outstanding)} as settled for ${sup.name}?`)) return;
    try { await inventoryAPI.updateSupplier(sup.id, { outstanding: 0 }); toast.success('Dues settled'); await refresh(); } catch { toast.error('Failed'); }
  }

  async function saveExpense() {
    const f = expenseForm;
    if (!(Number(f.amount) > 0)) { toast.error('Enter an amount'); return; }
    try {
      await inventoryAPI.createExpense({ ...f, amount: Number(f.amount), name: f.name || f.category });
      toast.success('Expense added');
      setExpenseForm(null);
      await refresh();
    } catch { toast.error('Failed to save expense'); }
  }
  async function deleteExpense(id: string) {
    if (!confirm('Delete this expense?')) return;
    try { await inventoryAPI.deleteExpense(id); toast.success('Deleted'); await refresh(); } catch { toast.error('Failed'); }
  }
}

/* ───────────────────────── sub-views ───────────────────────── */
const cardBox: React.CSSProperties = { background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, boxShadow: '0 1px 2px rgba(0,0,0,.03)' };
const primaryBtn: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 7, padding: '10px 16px', borderRadius: 11, border: 'none', background: C.primary, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: SANS };
const ghostBtn: React.CSSProperties = { padding: '8px 13px', borderRadius: 10, border: `1px solid #e7e3de`, background: '#fff', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, color: '#3a352f', fontFamily: SANS };
const label: React.CSSProperties = { fontSize: 11.5, fontWeight: 700, color: C.sec, marginBottom: 5, display: 'block' };
const input: React.CSSProperties = { width: '100%', padding: '11px 13px', border: `1px solid #e7e3de`, borderRadius: 11, fontSize: 13, outline: 'none', fontFamily: SANS, boxSizing: 'border-box' };

function DashboardView({ kpis, lowItems, cats, expenses = [], onReorder }: any) {
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const todayExp = expenses.filter((e: any) => (e.date || '').slice(0, 10) === today).reduce((s: number, e: any) => s + e.amount, 0);
  const monthExp = expenses.filter((e: any) => (e.date || '').slice(0, 7) === month).reduce((s: number, e: any) => s + e.amount, 0);
  const recentExp = [...expenses].sort((a: any, b: any) => (b.date || '').localeCompare(a.date || '')).slice(0, 5);

  const kpiCards = [
    { icon: '📦', label: 'Total Products', value: String(kpis.total), tint: '#fcefe9' },
    { icon: '⚠️', label: 'Low Stock Items', value: String(kpis.lowCount), tint: '#fdeeee', vc: C.amber },
    { icon: '🚨', label: 'Critical Items', value: String(kpis.critCount), tint: '#fdeeee', vc: C.red },
    { icon: '💰', label: 'Inventory Value', value: fk(kpis.invValue), tint: '#eef5f0' },
    { icon: '🍽️', label: "Today's Consumption", value: fk(kpis.todaySale), tint: '#eaf0fb' },
    { icon: '🗑️', label: "Today's Wastage", value: fk(kpis.todayWaste), tint: '#fdf4e3', vc: kpis.todayWaste ? C.red : undefined },
    { icon: '📉', label: "Today's Expenses", value: fk(todayExp), tint: '#fdf4e3', vc: todayExp ? C.red : undefined },
    { icon: '🧾', label: 'Monthly Expenses', value: fk(monthExp), tint: '#eaf0fb' },
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

      {recentExp.length > 0 && (
        <div style={{ ...cardBox, borderRadius: 18, padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 15, fontWeight: 800 }}>Recent Expenses</span>
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>This month: {fk(monthExp)}</span>
          </div>
          {recentExp.map((e: any) => (
            <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #f6f3ef' }}>
              <span style={{ width: 32, height: 32, borderRadius: 9, background: '#fdf4e3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>{e.source === 'purchase' ? '📦' : '💸'}</span>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</div><div style={{ fontSize: 11, fontWeight: 600, color: C.muted }}>{e.category} · {e.date}</div></div>
              <span style={{ fontSize: 14, fontWeight: 800, fontFamily: MONO }}>{inr(e.amount)}</span>
            </div>
          ))}
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

const PO_STATUS: Record<string, { bg: string; fg: string }> = {
  draft: { bg: '#f4f1ee', fg: C.sec }, ordered: { bg: '#eaf0fb', fg: C.blue },
  received: { bg: '#eef5f0', fg: C.green }, cancelled: { bg: '#fdeeee', fg: C.red },
};

function OrdersView({ orders, onReceive, onCancel }: any) {
  const [filter, setFilter] = useState('all');
  const shown = filter === 'all' ? orders : orders.filter((o: any) => o.status === filter);
  if (!orders.length) return <div style={{ ...cardBox, borderRadius: 18, padding: 40, textAlign: 'center', color: C.muted }}>No purchase orders yet. Click “New Order”.</div>;
  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {['all', 'draft', 'ordered', 'received', 'cancelled'].map(f => <button key={f} onClick={() => setFilter(f)} style={{ ...ghostBtn, textTransform: 'capitalize', background: filter === f ? C.dark : '#fff', color: filter === f ? '#fff' : '#3a352f', border: filter === f ? 'none' : ghostBtn.border }}>{f}</button>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(330px,1fr))', gap: 16 }}>
        {shown.map((o: any) => {
          const st = PO_STATUS[o.status] || PO_STATUS.draft;
          const open = o.status === 'draft' || o.status === 'ordered';
          return (
            <div key={o.id} style={{ ...cardBox, padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
                <span style={{ width: 38, height: 38, borderRadius: 11, background: '#faf6ef', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🛒</span>
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 14, fontWeight: 800 }}>{o.supplierName || 'No supplier'}</div><div style={{ fontSize: 11.5, fontWeight: 700, color: C.muted, fontFamily: MONO }}>{o.poNumber}</div></div>
                <span style={{ padding: '3px 10px', borderRadius: 20, background: st.bg, color: st.fg, fontSize: 10.5, fontWeight: 800, textTransform: 'capitalize' }}>{o.status}</span>
              </div>
              <div style={{ display: 'flex', gap: 18, padding: '13px 0', borderTop: '1px solid #f4f1ed', borderBottom: '1px solid #f4f1ed' }}>
                <Stat label="Items" value={String(o.itemCount)} />
                <Stat label="Total" value={fk(o.totalAmount)} />
                <span style={{ flex: 1 }} />
                <div style={{ textAlign: 'right' }}><Stat label="Expected" value={o.expectedDate || '—'} color={C.sec} /></div>
              </div>
              {open ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => onReceive(o)} style={{ flex: 1, padding: 9, borderRadius: 10, border: 'none', background: C.green, color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>Receive → stock in</button>
                  <button onClick={() => onCancel(o)} style={ghostBtn}>Cancel</button>
                </div>
              ) : (
                <div style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>{o.status === 'received' ? `Received ${o.receivedAt ? new Date(o.receivedAt).toLocaleDateString('en-IN') : ''}` : 'Cancelled'}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SuppliersView({ suppliers, onNewOrder, onSettle }: any) {
  if (!suppliers.length) return <div style={{ ...cardBox, borderRadius: 18, padding: 40, textAlign: 'center', color: C.muted }}>No suppliers yet. Click “Add Supplier”.</div>;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 16 }}>
      {suppliers.map((s: any) => (
        <div key={s.id} style={{ ...cardBox, padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 42, height: 42, borderRadius: 12, background: C.dark, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800 }}>{(s.name || '?').slice(0, 2).toUpperCase()}</span>
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 15, fontWeight: 800 }}>{s.name}</div><div style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>{s.contactName || '—'}</div></div>
            {s.outstanding > 0 && <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#e9a23b', flex: '0 0 auto' }} />}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 12.5 }}>
            <div style={{ display: 'flex', gap: 9 }}><span style={{ width: 15 }}>📞</span><span style={{ color: '#3a352f', fontWeight: 600, fontFamily: MONO }}>{s.phone || '—'}</span></div>
            <div style={{ display: 'flex', gap: 9 }}><span style={{ width: 15 }}>✉️</span><span style={{ color: '#3a352f', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.email || '—'}</span></div>
          </div>
          <div style={{ display: 'flex', gap: 10, paddingTop: 13, borderTop: '1px solid #f4f1ed' }}>
            <div style={{ flex: 1 }}><Stat label="Payable" value={fk(s.outstanding)} color={s.outstanding > 0 ? C.red : C.dark} /></div>
            <div style={{ flex: 1 }}><Stat label="Total Buys" value={fk(s.totalBuys)} /></div>
            <div style={{ flex: 1 }}><Stat label="Last Buy" value={s.lastBuy ? new Date(s.lastBuy).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'} color={C.sec} /></div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onNewOrder} style={{ flex: 1, padding: 9, borderRadius: 10, border: 'none', background: C.dark, color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>New Order</button>
            <button onClick={() => onSettle(s)} style={{ ...ghostBtn, flex: 1 }}>Settle Dues</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function SupplierModal({ form, setForm, onClose, onSave }: any) {
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));
  return (
    <Overlay onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 22px', borderBottom: `1px solid ${C.border}` }}>
        <span style={{ width: 34, height: 34, borderRadius: 10, background: '#fcefe9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🚚</span>
        <div style={{ flex: 1 }}><div style={{ fontSize: 16, fontWeight: 800 }}>{form.id ? 'Edit Supplier' : 'Add Supplier'}</div></div>
        <button onClick={onClose} style={{ ...iconBtn, width: 32, height: 32 }}>✕</button>
      </div>
      <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div><label style={label}>Company / Supplier Name</label><input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Amul Distributors" style={input} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13 }}>
          <div><label style={label}>Contact Person</label><input value={form.contactName} onChange={e => set('contactName', e.target.value)} style={input} /></div>
          <div><label style={label}>Phone</label><input value={form.phone} onChange={e => set('phone', e.target.value)} style={{ ...input, fontFamily: MONO }} /></div>
          <div><label style={label}>Email</label><input value={form.email} onChange={e => set('email', e.target.value)} style={input} /></div>
          <div><label style={label}>Lead Time (days)</label><input value={form.leadTimeDays} onChange={e => set('leadTimeDays', e.target.value)} placeholder="2" style={{ ...input, fontFamily: MONO }} /></div>
        </div>
        <div><label style={label}>Address</label><input value={form.address} onChange={e => set('address', e.target.value)} style={input} /></div>
        <div><label style={label}>Notes</label><input value={form.notes} onChange={e => set('notes', e.target.value)} style={input} /></div>
      </div>
      <div style={{ display: 'flex', gap: 10, padding: '16px 22px', borderTop: `1px solid ${C.border}` }}><span style={{ flex: 1 }} /><button onClick={onClose} style={ghostBtn}>Cancel</button><button onClick={onSave} style={primaryBtn}>{form.id ? 'Save' : 'Add Supplier'}</button></div>
    </Overlay>
  );
}

function PurchaseOrderModal({ items, suppliers, onClose, onSaved }: any) {
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || '');
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<any[]>(items.length ? [{ inventoryItemId: items[0].id, quantity: '', unit: items[0].unit, unitPrice: String(items[0].purchasePrice || '') }] : []);
  const [saving, setSaving] = useState(false);
  const itemById = Object.fromEntries(items.map((i: any) => [i.id, i]));
  const total = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0);

  const setLine = (i: number, patch: any) => setLines(p => p.map((l, idx) => idx === i ? { ...l, ...patch } : l));
  const addLine = () => setLines(p => [...p, { inventoryItemId: items[0]?.id || '', quantity: '', unit: items[0]?.unit || 'pcs', unitPrice: '' }]);

  const submit = async (status: 'draft' | 'ordered') => {
    const payloadItems = lines.filter(l => l.inventoryItemId && Number(l.quantity) > 0)
      .map(l => ({ inventoryItemId: l.inventoryItemId, name: itemById[l.inventoryItemId]?.name || '', quantity: Number(l.quantity), unit: l.unit, unitPrice: Number(l.unitPrice) || 0 }));
    if (!payloadItems.length) { toast.error('Add at least one line item'); return; }
    setSaving(true);
    try {
      await inventoryAPI.createPurchaseOrder({ supplierId: supplierId || null, expectedDate, notes, status, items: payloadItems });
      toast.success(status === 'ordered' ? 'Purchase order placed' : 'Draft saved');
      onSaved();
    } catch { toast.error('Failed to create order'); } finally { setSaving(false); }
  };

  return (
    <Overlay onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 22px', borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, background: '#fff' }}>
        <span style={{ width: 34, height: 34, borderRadius: 10, background: '#fcefe9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🛒</span>
        <div style={{ flex: 1 }}><div style={{ fontSize: 16, fontWeight: 800 }}>New Purchase Order</div><div style={{ fontSize: 12, color: C.muted }}>Receiving it later will stock in these items</div></div>
        <button onClick={onClose} style={{ ...iconBtn, width: 32, height: 32 }}>✕</button>
      </div>
      <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {items.length === 0 && <div style={{ fontSize: 13, color: C.red }}>Add inventory products first.</div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13 }}>
          <div><label style={label}>Supplier</label><select value={supplierId} onChange={e => setSupplierId(e.target.value)} style={input}><option value="">— None —</option>{suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          <div><label style={label}>Expected Date</label><input type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} style={input} /></div>
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}><label style={{ ...label, marginBottom: 0 }}>Line Items</label><span style={{ flex: 1 }} />{items.length > 0 && <button onClick={addLine} style={{ ...ghostBtn, padding: '5px 10px' }}>+ Add line</button>}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {lines.map((l, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select value={l.inventoryItemId} onChange={e => { const ni = itemById[e.target.value]; setLine(i, { inventoryItemId: e.target.value, unit: ni?.unit || l.unit, unitPrice: l.unitPrice || String(ni?.purchasePrice || '') }); }} style={{ ...input, flex: 1 }}>
                  {items.map((iv: any) => <option key={iv.id} value={iv.id}>{iv.emoji} {iv.name}</option>)}
                </select>
                <input value={l.quantity} onChange={e => setLine(i, { quantity: e.target.value })} placeholder="Qty" style={{ ...input, width: 80, fontFamily: MONO }} />
                <select value={l.unit} onChange={e => setLine(i, { unit: e.target.value })} style={{ ...input, width: 84 }}>{UNITS.map(u => <option key={u} value={u}>{u}</option>)}</select>
                <input value={l.unitPrice} onChange={e => setLine(i, { unitPrice: e.target.value })} placeholder="₹/unit" style={{ ...input, width: 90, fontFamily: MONO }} />
                <button onClick={() => setLines(p => p.filter((_, idx) => idx !== i))} style={{ ...iconBtn, color: C.red }}>✕</button>
              </div>
            ))}
          </div>
        </div>
        <div><label style={label}>Notes</label><input value={notes} onChange={e => setNotes(e.target.value)} style={input} /></div>
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', background: '#fbfaf8', border: `1px solid ${C.border}`, borderRadius: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.sec }}>Order Total</span><span style={{ flex: 1 }} /><span style={{ fontSize: 20, fontWeight: 800, fontFamily: MONO }}>{inr(total)}</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, padding: '16px 22px', borderTop: `1px solid ${C.border}`, position: 'sticky', bottom: 0, background: '#fff' }}>
        <span style={{ flex: 1 }} />
        <button onClick={onClose} style={ghostBtn}>Cancel</button>
        <button onClick={() => submit('draft')} disabled={saving} style={ghostBtn}>Save Draft</button>
        <button onClick={() => submit('ordered')} disabled={saving} style={{ ...primaryBtn, opacity: saving ? .6 : 1 }}>{saving ? 'Saving…' : 'Place Order'}</button>
      </div>
    </Overlay>
  );
}

function NotificationsView({ notifications, onGo }: any) {
  const TONE: Record<string, { bg: string; bd: string; fg: string }> = {
    red: { bg: '#fef6f5', bd: '#f6dcd6', fg: C.red }, amber: { bg: '#fdfaf4', bd: '#f0e6cf', fg: C.amber }, blue: { bg: '#f5f8fd', bd: '#dbe6f7', fg: C.blue },
  };
  if (!notifications.length) return <div style={{ ...cardBox, borderRadius: 18, padding: 40, textAlign: 'center', color: C.muted }}>🔔 All clear — no active alerts.</div>;
  return (
    <div style={{ ...cardBox, borderRadius: 18, padding: '8px 18px' }}>
      {notifications.map((n: any) => {
        const t = TONE[n.tone];
        return (
          <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 0', borderBottom: '1px solid #f6f3ef' }}>
            <span style={{ width: 36, height: 36, borderRadius: 11, background: t.bg, border: `1px solid ${t.bd}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flex: '0 0 auto' }}>{n.icon}</span>
            <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: '#3a352f' }}>{n.text}</span>
            <button onClick={() => onGo(n.tab)} style={{ ...ghostBtn, padding: '6px 12px', color: t.fg, borderColor: t.bd }}>View →</button>
          </div>
        );
      })}
    </div>
  );
}

const REPORT_DEFS = [
  { id: 'inventory', icon: '📦', name: 'Inventory Valuation', desc: 'All products, stock levels & stock value' },
  { id: 'lowstock', icon: '⚠️', name: 'Low Stock', desc: 'Items at or below minimum level' },
  { id: 'consumption', icon: '🍽️', name: 'Stock Consumption', desc: 'Quantity & value consumed by POS sales' },
  { id: 'waste', icon: '🗑️', name: 'Waste & Spoilage', desc: 'Recorded waste, spoilage & losses' },
  { id: 'purchase', icon: '🛒', name: 'Purchase Orders', desc: 'All purchase orders & their status' },
  { id: 'supplier', icon: '🚚', name: 'Suppliers', desc: 'Supplier directory, dues & total buys' },
  { id: 'expense', icon: '💸', name: 'Expenses', desc: 'All recorded expenses' },
  { id: 'profit', icon: '💵', name: 'Profit & Loss', desc: 'Revenue, COGS, expenses & net profit (this month)' },
  { id: 'fast', icon: '🔥', name: 'Fast Moving Items', desc: 'Top consumed items by quantity' },
  { id: 'dead', icon: '🧊', name: 'Slow / Dead Stock', desc: 'Items with little or no consumption' },
];

function ReportsView({ items, suppliers, orders, expenses, finance }: any) {
  const [movements, setMovements] = useState<any[]>([]);
  const [preview, setPreview] = useState<{ title: string; columns: Column[]; rows: any[] } | null>(null);
  useEffect(() => { inventoryAPI.getMovements({ limit: 1000 }).then(setMovements).catch(() => setMovements([])); }, []);

  const itemById: Record<string, any> = Object.fromEntries(items.map((i: any) => [i.id, i]));

  const consumption = useMemo(() => {
    const m: Record<string, any> = {};
    movements.filter(mv => mv.type === 'sale').forEach(mv => {
      const it = itemById[mv.inventoryItemId];
      m[mv.inventoryItemId] = m[mv.inventoryItemId] || { item: mv.itemName, unit: mv.itemUnit || mv.unit || '', qty: 0, value: 0 };
      m[mv.inventoryItemId].qty += Math.abs(mv.changeQty);
      m[mv.inventoryItemId].value += Math.abs(mv.changeQty) * (it?.purchasePrice || 0);
    });
    return m;
  }, [movements, items]);

  const build = (id: string): { columns: Column[]; rows: any[] } => {
    switch (id) {
      case 'inventory': return {
        columns: [{ key: 'name', label: 'Product' }, { key: 'sku', label: 'SKU' }, { key: 'categoryName', label: 'Category' }, { key: 'currentStock', label: 'Stock' }, { key: 'minStock', label: 'Min' }, { key: 'unit', label: 'Unit' }, { key: 'purchasePrice', label: 'Buy ₹' }, { key: 'sellingPrice', label: 'Sell ₹' }, { key: 'value', label: 'Stock Value ₹' }, { key: 'status', label: 'Status' }],
        rows: items.map((i: any) => ({ ...i, value: Math.round(i.currentStock * i.purchasePrice) })),
      };
      case 'lowstock': return {
        columns: [{ key: 'name', label: 'Product' }, { key: 'categoryName', label: 'Category' }, { key: 'currentStock', label: 'Stock' }, { key: 'minStock', label: 'Min' }, { key: 'unit', label: 'Unit' }, { key: 'supplier', label: 'Supplier' }, { key: 'status', label: 'Status' }],
        rows: items.filter((i: any) => i.status !== 'In Stock'),
      };
      case 'consumption': return {
        columns: [{ key: 'item', label: 'Item' }, { key: 'qty', label: 'Qty Consumed' }, { key: 'unit', label: 'Unit' }, { key: 'value', label: 'Cost Value ₹' }],
        rows: Object.values(consumption).map((c: any) => ({ ...c, qty: Math.round(c.qty * 1000) / 1000, value: Math.round(c.value) })).sort((a, b) => b.value - a.value),
      };
      case 'waste': return {
        columns: [{ key: 'item', label: 'Item' }, { key: 'qty', label: 'Qty' }, { key: 'unit', label: 'Unit' }, { key: 'reason', label: 'Reason' }, { key: 'type', label: 'Type' }, { key: 'date', label: 'Date' }],
        rows: movements.filter(m => m.type === 'waste' || m.type === 'spoilage').map(m => ({ item: m.itemName, qty: Math.abs(m.changeQty), unit: m.unit, reason: m.reason, type: m.type, date: new Date(m.createdAt).toLocaleDateString('en-IN') })),
      };
      case 'purchase': return {
        columns: [{ key: 'poNumber', label: 'PO #' }, { key: 'supplierName', label: 'Supplier' }, { key: 'status', label: 'Status' }, { key: 'itemCount', label: 'Items' }, { key: 'totalAmount', label: 'Total ₹' }, { key: 'expectedDate', label: 'Expected' }],
        rows: orders.map((o: any) => ({ ...o, totalAmount: Math.round(o.totalAmount) })),
      };
      case 'supplier': return {
        columns: [{ key: 'name', label: 'Supplier' }, { key: 'contactName', label: 'Contact' }, { key: 'phone', label: 'Phone' }, { key: 'email', label: 'Email' }, { key: 'outstanding', label: 'Payable ₹' }, { key: 'totalBuys', label: 'Total Buys ₹' }],
        rows: suppliers.map((s: any) => ({ ...s, outstanding: Math.round(s.outstanding), totalBuys: Math.round(s.totalBuys) })),
      };
      case 'expense': return {
        columns: [{ key: 'name', label: 'Expense' }, { key: 'category', label: 'Category' }, { key: 'amount', label: 'Amount ₹' }, { key: 'date', label: 'Date' }, { key: 'vendor', label: 'Vendor' }, { key: 'paymentMethod', label: 'Payment' }, { key: 'source', label: 'Source' }],
        rows: expenses.map((e: any) => ({ ...e, amount: Math.round(e.amount) })),
      };
      case 'profit': {
        const f = finance || {};
        return {
          columns: [{ key: 'metric', label: 'Metric' }, { key: 'amount', label: 'Amount ₹' }],
          rows: [
            { metric: 'Revenue', amount: Math.round(f.revenue || 0) },
            { metric: 'Food Cost (COGS)', amount: -Math.round(f.foodCost || 0) },
            { metric: 'Gross Profit', amount: Math.round(f.grossProfit || 0) },
            { metric: 'Operating Expenses', amount: -Math.round(f.operatingExpenses || 0) },
            { metric: 'Payroll', amount: -Math.round(f.payroll || 0) },
            { metric: 'Net Profit', amount: Math.round(f.netProfit || 0) },
          ],
        };
      }
      case 'fast': return {
        columns: [{ key: 'item', label: 'Item' }, { key: 'qty', label: 'Qty Consumed' }, { key: 'unit', label: 'Unit' }, { key: 'value', label: 'Cost Value ₹' }],
        rows: Object.values(consumption).map((c: any) => ({ ...c, qty: Math.round(c.qty * 1000) / 1000, value: Math.round(c.value) })).sort((a, b) => b.qty - a.qty).slice(0, 20),
      };
      case 'dead': {
        const consumed = new Set(Object.keys(consumption).filter(k => consumption[k].qty > 0));
        return {
          columns: [{ key: 'name', label: 'Product' }, { key: 'categoryName', label: 'Category' }, { key: 'currentStock', label: 'Stock' }, { key: 'unit', label: 'Unit' }, { key: 'value', label: 'Stock Value ₹' }],
          rows: items.filter((i: any) => !consumed.has(i.id)).map((i: any) => ({ ...i, value: Math.round(i.currentStock * i.purchasePrice) })),
        };
      }
      default: return { columns: [], rows: [] };
    }
  };

  const open = (def: any) => { const { columns, rows } = build(def.id); setPreview({ title: def.name, columns, rows }); };

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
        {REPORT_DEFS.map(r => (
          <div key={r.id} style={{ ...cardBox, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <span style={{ width: 40, height: 40, borderRadius: 12, background: '#faf6ef', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{r.icon}</span>
            <div><div style={{ fontSize: 15, fontWeight: 800 }}>{r.name}</div><div style={{ fontSize: 12.5, fontWeight: 600, color: C.muted, marginTop: 4 }}>{r.desc}</div></div>
            <button onClick={() => open(r)} style={{ ...ghostBtn, marginTop: 'auto' }}>Generate →</button>
          </div>
        ))}
      </div>
      {preview && (
        <Overlay onClose={() => setPreview(null)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 22px', borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, background: '#fff' }}>
            <div style={{ flex: 1 }}><div style={{ fontSize: 16, fontWeight: 800 }}>{preview.title}</div><div style={{ fontSize: 12, color: C.muted }}>{preview.rows.length} rows</div></div>
            <button onClick={() => downloadCSV(preview.title.replace(/\s+/g, '-').toLowerCase(), preview.columns, preview.rows)} style={ghostBtn}>⬇ CSV / Excel</button>
            <button onClick={() => printReport(preview.title, 'Inventory & Finance report', preview.columns, preview.rows)} style={primaryBtn}>🖨 Print / PDF</button>
            <button onClick={() => setPreview(null)} style={{ ...iconBtn, width: 32, height: 32 }}>✕</button>
          </div>
          <div style={{ padding: '8px 22px 22px', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, minWidth: 520 }}>
              <thead><tr>{preview.columns.map(c => <th key={c.key} style={{ textAlign: 'left', padding: '10px 8px', borderBottom: `2px solid ${C.border}`, fontSize: 10.5, textTransform: 'uppercase', color: C.muted, letterSpacing: .4, whiteSpace: 'nowrap' }}>{c.label}</th>)}</tr></thead>
              <tbody>
                {preview.rows.length === 0 ? <tr><td colSpan={preview.columns.length} style={{ padding: 24, textAlign: 'center', color: C.muted }}>No data</td></tr>
                  : preview.rows.map((row, i) => <tr key={i}>{preview.columns.map(c => <td key={c.key} style={{ padding: '8px', borderBottom: '1px solid #f4f1ed', whiteSpace: 'nowrap' }}>{String(row[c.key] ?? '')}</td>)}</tr>)}
              </tbody>
            </table>
          </div>
        </Overlay>
      )}
    </>
  );
}

const EXPENSE_CATS = ['Rent', 'Utilities', 'Salaries', 'Marketing', 'Inventory Purchase', 'Maintenance', 'Licenses', 'Equipment', 'Other'];
const PAY_METHODS = ['Cash', 'Bank Transfer', 'Card', 'UPI', 'Cheque'];

function ExpensesView({ expenses, onDelete }: any) {
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const todayTotal = expenses.filter((e: any) => (e.date || '').slice(0, 10) === today).reduce((s: number, e: any) => s + e.amount, 0);
  const monthTotal = expenses.filter((e: any) => (e.date || '').slice(0, 7) === month).reduce((s: number, e: any) => s + e.amount, 0);
  const monthOps = expenses.filter((e: any) => (e.date || '').slice(0, 7) === month && e.source !== 'purchase').reduce((s: number, e: any) => s + e.amount, 0);
  const monthPur = monthTotal - monthOps;

  // group by category (this month)
  const byCat: Record<string, number> = {};
  expenses.filter((e: any) => (e.date || '').slice(0, 7) === month).forEach((e: any) => { byCat[e.category] = (byCat[e.category] || 0) + e.amount; });

  const kpiCards = [
    { icon: '📉', label: "Today's Expenses", value: fk(todayTotal), tint: '#fdf4e3' },
    { icon: '🗓️', label: 'This Month', value: fk(monthTotal), tint: '#eaf0fb' },
    { icon: '🧾', label: 'Operating (mo)', value: fk(monthOps), tint: '#fcefe9' },
    { icon: '📦', label: 'Inventory Buys (mo)', value: fk(monthPur), tint: '#eef5f0' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14 }}>
        {kpiCards.map((c, i) => (
          <div key={i} style={{ ...cardBox, padding: '16px 17px' }}>
            <span style={{ width: 36, height: 36, borderRadius: 11, background: c.tint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{c.icon}</span>
            <div style={{ marginTop: 12 }}><span style={{ fontSize: 11.5, fontWeight: 700, color: C.muted, display: 'block' }}>{c.label}</span><span style={{ fontSize: 23, fontWeight: 800, fontFamily: MONO }}>{c.value}</span></div>
          </div>
        ))}
      </div>

      {Object.keys(byCat).length > 0 && (
        <div style={{ ...cardBox, borderRadius: 18, padding: 20 }}>
          <span style={{ fontSize: 15, fontWeight: 800 }}>Spending by Category · this month</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 11, marginTop: 14 }}>
            {Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
              <div key={cat} style={{ display: 'flex', flexDirection: 'column', padding: '12px 13px', background: '#fbfaf8', border: '1px solid #f1ede8', borderRadius: 13 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.sec }}>{cat}</span>
                <span style={{ fontSize: 15, fontWeight: 800, fontFamily: MONO }}>{fk(amt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ ...cardBox, borderRadius: 18, overflow: 'hidden' }}>
        <div style={{ padding: '16px 18px 12px', fontSize: 15, fontWeight: 800 }}>Recent Expenses</div>
        <div style={{ overflowX: 'auto' }}><div style={{ minWidth: 760 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.1fr 1fr 1.1fr 1.1fr 70px', gap: 12, padding: '11px 18px', fontSize: 10.5, fontWeight: 800, color: C.muted, letterSpacing: .5, textTransform: 'uppercase', borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, background: '#fbfaf8' }}>
            <span>Expense</span><span>Category</span><span style={{ textAlign: 'right' }}>Amount</span><span>Date</span><span>Payment</span><span style={{ textAlign: 'right' }}>···</span>
          </div>
          {expenses.length === 0 ? <div style={{ padding: 30, textAlign: 'center', color: C.muted, fontSize: 13 }}>No expenses recorded yet.</div> : expenses.map((x: any) => (
            <div key={x.id} style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.1fr 1fr 1.1fr 1.1fr 70px', gap: 12, alignItems: 'center', padding: '12px 18px', borderBottom: '1px solid #f4f1ed', fontSize: 13 }}>
              <span style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.name}{x.source === 'purchase' && <span style={{ marginLeft: 6, fontSize: 10, color: C.green }}>● auto</span>}</span>
              <span><span style={{ padding: '3px 10px', borderRadius: 20, background: '#f4f1ee', color: C.sec, fontSize: 11, fontWeight: 700 }}>{x.category}</span></span>
              <span style={{ textAlign: 'right', fontWeight: 800, fontFamily: MONO }}>{inr(x.amount)}</span>
              <span style={{ color: C.sec, fontWeight: 600 }}>{x.date}</span>
              <span style={{ color: '#3a352f', fontWeight: 600 }}>{x.paymentMethod || '—'}</span>
              <span style={{ display: 'flex', justifyContent: 'flex-end' }}>{x.source === 'purchase' ? <span style={{ fontSize: 11, color: C.muted }}>PO</span> : <button onClick={() => onDelete(x.id)} style={{ ...iconBtn, color: C.red }}>🗑</button>}</span>
            </div>
          ))}
        </div></div>
      </div>
    </div>
  );
}

function FinanceView({ finance, range, onRange }: any) {
  const RANGES = [['today', 'Today'], ['week', 'This Week'], ['month', 'This Month'], ['year', 'This Year']];
  const f = finance || { revenue: 0, foodCost: 0, operatingExpenses: 0, payroll: 0, inventoryPurchases: 0, grossProfit: 0, netProfit: 0, grossMargin: 0, netMargin: 0 };
  const Line = ({ label: l, value, color, strong, neg }: any) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: strong ? '12px 0' : '8px 0', borderTop: strong ? `1px solid ${C.border}` : 'none' }}>
      <span style={{ fontSize: strong ? 14 : 13, fontWeight: strong ? 800 : 600, color: strong ? C.dark : C.sec }}>{l}</span>
      <span style={{ fontSize: strong ? 20 : 15, fontWeight: 800, fontFamily: MONO, color: color || C.dark }}>{neg && value > 0 ? '−' : ''}{inr(value)}</span>
    </div>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {RANGES.map(([id, lbl]) => (
          <button key={id} onClick={() => onRange(id)} style={{ ...ghostBtn, background: range === id ? C.primary : '#fff', color: range === id ? '#fff' : '#3a352f', border: range === id ? 'none' : ghostBtn.border }}>{lbl}</button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16 }}>
        {/* P&L card */}
        <div style={{ ...cardBox, gridColumn: 'span 2', minWidth: 300, borderRadius: 18, padding: 22 }}>
          <span style={{ fontSize: 15, fontWeight: 800 }}>Profit &amp; Loss</span>
          <div style={{ marginTop: 10 }}>
            <Line label="Revenue (POS sales)" value={f.revenue} color={C.green} />
            <Line label="Food Cost (COGS)" value={f.foodCost} color={C.red} neg />
            <Line label="Gross Profit" value={f.grossProfit} strong />
            <Line label="Operating Expenses" value={f.operatingExpenses} color={C.red} neg />
            <Line label="Payroll" value={f.payroll} color={C.red} neg />
            <Line label="Net Profit (est.)" value={f.netProfit} color={f.netProfit >= 0 ? C.green : C.red} strong />
          </div>
        </div>
        {/* Margins + side metrics */}
        <div style={{ ...cardBox, background: C.dark, borderRadius: 18, padding: 22, color: '#fff', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <span style={{ fontSize: 15, fontWeight: 800 }}>Margins</span>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span style={{ fontSize: 12.5, color: '#a9a29a', fontWeight: 600 }}>Gross Margin</span><span style={{ fontSize: 13, fontWeight: 800, color: '#6fd19b' }}>{f.grossMargin}%</span></div>
            <div style={{ height: 8, borderRadius: 6, background: 'rgba(255,255,255,.12)', overflow: 'hidden' }}><div style={{ height: '100%', width: Math.max(0, Math.min(100, f.grossMargin)) + '%', background: '#6fd19b' }} /></div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span style={{ fontSize: 12.5, color: '#a9a29a', fontWeight: 600 }}>Net Margin</span><span style={{ fontSize: 13, fontWeight: 800, color: f.netMargin >= 0 ? '#6fd19b' : '#e8a08a' }}>{f.netMargin}%</span></div>
            <div style={{ height: 8, borderRadius: 6, background: 'rgba(255,255,255,.12)', overflow: 'hidden' }}><div style={{ height: '100%', width: Math.max(0, Math.min(100, f.netMargin)) + '%', background: f.netMargin >= 0 ? '#6fd19b' : '#e8a08a' }} /></div>
          </div>
          <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: 13, color: '#a9a29a', fontWeight: 600 }}>Inventory Buys</span>
            <span style={{ fontSize: 16, fontWeight: 800, fontFamily: MONO }}>{fk(f.inventoryPurchases)}</span>
          </div>
        </div>
      </div>
      <p style={{ fontSize: 11.5, color: C.muted }}>Food cost is the value of inventory consumed by sales (from recipes). Inventory purchases are tracked separately and excluded from operating expenses to avoid double-counting. Payroll is prorated from monthly records.</p>
    </div>
  );
}

function ExpenseModal({ form, setForm, onClose, onSave }: any) {
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));
  return (
    <Overlay onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 22px', borderBottom: `1px solid ${C.border}` }}>
        <span style={{ width: 34, height: 34, borderRadius: 10, background: '#eef5f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>💸</span>
        <div style={{ flex: 1 }}><div style={{ fontSize: 16, fontWeight: 800 }}>Add Expense</div></div>
        <button onClick={onClose} style={{ ...iconBtn, width: 32, height: 32 }}>✕</button>
      </div>
      <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div><label style={label}>Amount ₹</label><input value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0" style={{ ...input, fontFamily: MONO, fontSize: 18, fontWeight: 800 }} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13 }}>
          <div><label style={label}>Category</label><select value={form.category} onChange={e => set('category', e.target.value)} style={input}>{EXPENSE_CATS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
          <div><label style={label}>Date</label><input type="date" value={form.date} onChange={e => set('date', e.target.value)} style={input} /></div>
          <div><label style={label}>Vendor</label><input value={form.vendor} onChange={e => set('vendor', e.target.value)} placeholder="e.g. BSES" style={input} /></div>
          <div><label style={label}>Payment Method</label><select value={form.paymentMethod} onChange={e => set('paymentMethod', e.target.value)} style={input}>{PAY_METHODS.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
        </div>
        <div><label style={label}>Description</label><input value={form.name} onChange={e => set('name', e.target.value)} placeholder="What was this for?" style={input} /></div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: C.sec, cursor: 'pointer' }}>
          <input type="checkbox" checked={form.recurring} onChange={e => set('recurring', e.target.checked)} /> Recurring monthly expense
        </label>
      </div>
      <div style={{ display: 'flex', gap: 10, padding: '16px 22px', borderTop: `1px solid ${C.border}` }}><span style={{ flex: 1 }} /><button onClick={onClose} style={ghostBtn}>Cancel</button><button onClick={onSave} style={{ ...primaryBtn, background: C.green }}>Save Expense</button></div>
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
