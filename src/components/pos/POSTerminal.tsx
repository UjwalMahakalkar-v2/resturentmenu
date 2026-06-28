import { useState, useEffect, useCallback, useRef } from 'react';
import { posAPI, menuAPI, categoryAPI, restaurantSettingsAPI } from '@/services/api';
import type { POSSettings, POSSection, POSTable } from '@/types';
import type { TenantMenuItem, TenantCategory } from '@/types/tenant';
import toast from 'react-hot-toast';

/* ── Design tokens ─────────────────────────────────────────── */
const C = {
  primary:   '#d9542b',
  dark:      '#1c1a18',
  bg:        '#f4f3f1',
  sidebarBg: '#fbfaf8',
  border:    '#ece8e3',
  muted:     '#9a938b',
  secondary: '#6b645d',
  green:     '#1f8a5b',
  blue:      '#2a6fdb',
  cardBg:    '#fff',
};
const MONO = "'Spline Sans Mono', monospace";
const SANS = "'Plus Jakarta Sans', sans-serif";

/* ── Types ─────────────────────────────────────────────────── */
interface OrderLine {
  key: string;
  menuItemId: string;
  name: string;
  price: number;        // per-unit price (full or half)
  baseFullPrice: number;
  baseHalfPrice: number | null;
  portion: 'full' | 'half';
  spice: string | null;
  mods: string[];
  note: string;
  qty: number;
}

interface Draft {
  item: TenantMenuItem;
  portion: 'full' | 'half';
  spice: string;
  mods: string[];
  note: string;
  qty: number;
}

type Overlay = 'customize' | 'kot' | 'bill' | 'payment' | null;
type View = 'pos' | 'floor';

const SPICES = ['Mild', 'Medium', 'Spicy'];
const MODS   = ['No Onion','No Garlic','Extra Spicy','Less Oil','Extra Gravy','Extra Cheese','Jain'];
const DISCOUNT_OPTS = [0, 5, 10, 15];

function catCode(name: string) {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function fmtINR(n: number) {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

function useClock() {
  const [ts, setTs] = useState('');
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const day = d.toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short' });
      const t = d.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', hour12:true });
      setTs(`${day} · ${t.toUpperCase()}`);
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);
  return ts;
}

/* ── Component ─────────────────────────────────────────────── */
export default function POSTerminal({ onExit }: { onExit?: () => void }) {
  /* data */
  const [settings, setSettings]   = useState<POSSettings | null>(null);
  const [sections, setSections]   = useState<POSSection[]>([]);
  const [tables,   setTables]     = useState<POSTable[]>([]);
  const [menuItems, setMenuItems] = useState<TenantMenuItem[]>([]);
  const [categories, setCategories] = useState<TenantCategory[]>([]);
  const [restName, setRestName]   = useState('Restaurant');
  const [loading, setLoading]     = useState(true);

  /* view state */
  const [view,            setView]           = useState<View>('pos');
  const [sectionId,       setSectionId]      = useState('');
  const [tableId,         setTableId]        = useState('');
  const [categoryId,      setCategoryId]     = useState('');
  const [searchQuery,     setSearchQuery]    = useState('');
  const [orders,          setOrders]         = useState<Record<string, OrderLine[]>>({});
  const [discounts,       setDiscounts]      = useState<Record<string, number>>({});
  const [overlay,         setOverlay]        = useState<Overlay>(null);
  const [draft,           setDraft]          = useState<Draft | null>(null);
  const [payMethod,       setPayMethod]      = useState<'cash'|'card'|'upi'>('cash');
  const [tendered,        setTendered]       = useState(0);
  const [placing,         setPlacing]        = useState(false);
  const [kotNo,           setKotNo]          = useState(1);
  const [billNo,          setBillNo]         = useState(1);
  const [toastMsg,        setToastMsg]       = useState<string|null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>|null>(null);
  const clock = useClock();

  /* ── load ──────────────────────────────────────────────── */
  const load = useCallback(async () => {
    try {
      const [s, sec, tbl, items, cats, rest] = await Promise.all([
        posAPI.getSettings(),
        posAPI.getSections(),
        posAPI.getTables(),
        menuAPI.getAll(),
        categoryAPI.getAll(),
        restaurantSettingsAPI.get().catch(() => ({ name: 'Restaurant' })),
      ]);
      setSettings(s);
      setSections(sec);
      setTables(tbl);
      setMenuItems((items as any[]).filter((i: any) => i.available !== false));
      setCategories(cats as any);
      if ((rest as any)?.name) setRestName((rest as any).name);
      if (sec.length > 0) { setSectionId(sec[0].id); }
      if (cats.length > 0) setCategoryId((cats[0] as any).id);
    } catch {
      toast.error('Failed to load POS data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* Inject POS fonts once */
  useEffect(() => {
    const id = 'pos-fonts';
    if (!document.getElementById(id)) {
      const l = document.createElement('link');
      l.id = id;
      l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Spline+Sans+Mono:wght@400;500;600&display=swap';
      document.head.appendChild(l);
    }
  }, []);

  /* ── helpers ───────────────────────────────────────────── */
  const showToast = (msg: string) => {
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 2500);
  };

  const activeSection = sections.find(s => s.id === sectionId);
  const sectionTables = tables.filter(t => t.sectionId === sectionId);
  const activeTable   = tables.find(t => t.id === tableId);

  /* Per-table helpers */
  const order      = tableId ? (orders[tableId]   ?? []) : [];
  const discountPct = tableId ? (discounts[tableId] ?? 0) : 0;
  const setOrder = (updater: OrderLine[] | ((prev: OrderLine[]) => OrderLine[])) => {
    if (!tableId) return;
    setOrders(prev => ({
      ...prev,
      [tableId]: typeof updater === 'function' ? updater(prev[tableId] ?? []) : updater,
    }));
  };
  const setDiscountPct = (pct: number) => {
    if (!tableId) return;
    setDiscounts(prev => ({ ...prev, [tableId]: pct }));
  };

  const filteredItems = menuItems.filter(item => {
    const matchCat = !categoryId || item.category === categoryId;
    if (!matchCat) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    if (item.name.toLowerCase().includes(q)) return true;
    // Initials search (e.g. "pbm" matches "Paneer Butter Masala")
    const initials = item.name.split(/\s+/).map(w => w[0]?.toLowerCase()).join('');
    return initials.startsWith(q);
  });

  const favItems = menuItems.filter(i => i.popular).slice(0, 8);

  const totalQty = order.reduce((s, l) => s + l.qty, 0);
  const subtotal  = order.reduce((s, l) => s + l.price * l.qty, 0);
  const discAmt   = Math.round(subtotal * discountPct / 100);
  const afterDisc = subtotal - discAmt;
  const gstRate   = settings?.gstEnabled ? (settings.gstRate ?? 5) : 0;
  const halfRate  = gstRate / 2;
  const cgst      = Math.round(afterDisc * halfRate / 100);
  const sgst      = cgst;
  const grand     = afterDisc + cgst + sgst;
  const change    = Math.max(0, tendered - grand);

  const tableStatus  = (t: POSTable) => {
    if ((orders[t.id]?.length ?? 0) > 0) return 'running';
    if (t.status === 'occupied') return 'running';
    if (t.status === 'available') return 'available';
    return 'billed';
  };

  /* ── order mutations ───────────────────────────────────── */
  const lineKey = (d: Draft) =>
    [d.item.id, d.portion, d.spice, [...d.mods].sort().join('+'), d.note].join('|');

  const commitDraft = () => {
    if (!draft) return;
    const key = lineKey(draft);
    setOrder(prev => {
      const idx = prev.findIndex(l => l.key === key);
      if (idx >= 0) {
        return prev.map((l, i) => i === idx ? { ...l, qty: l.qty + draft.qty } : l);
      }
      const halfP = (draft.item as any).halfPrice ?? null;
      const price = draft.portion === 'half' && halfP ? halfP : draft.item.price;
      return [...prev, {
        key, menuItemId: draft.item.id, name: draft.item.name,
        price, baseFullPrice: draft.item.price, baseHalfPrice: halfP,
        portion: draft.portion, spice: draft.spice || null,
        mods: [...draft.mods], note: draft.note, qty: draft.qty,
      }];
    });
    setOverlay(null);
    setDraft(null);
    showToast(`${draft.item.name} added`);
  };

  const tapItem = (item: TenantMenuItem) => {
    setDraft({ item, portion: 'full', spice: 'Medium', mods: [], note: '', qty: 1 });
    setOverlay('customize');
  };

  const addFav = (item: TenantMenuItem) => {
    const key = [item.id,'full','','',' '].join('|');
    setOrder(prev => {
      const idx = prev.findIndex(l => l.key === key);
      if (idx >= 0) return prev.map((l,i) => i===idx ? {...l, qty:l.qty+1} : l);
      return [...prev, { key, menuItemId:item.id, name:item.name, price:item.price,
        baseFullPrice:item.price, baseHalfPrice:null,
        portion:'full', spice:null, mods:[], note:'', qty:1 }];
    });
    showToast(`${item.name} added`);
  };

  const incLine = (key: string) => setOrder(p => p.map(l => l.key===key ? {...l, qty:l.qty+1} : l));
  const decLine = (key: string) => setOrder(p => p.map(l => l.key===key ? {...l, qty:l.qty-1} : l).filter(l => l.qty>0));
  const removeLine = (key: string) => setOrder(p => p.filter(l => l.key!==key));

  /* ── place order ───────────────────────────────────────── */
  const placeOrder = async (kotOnly = false) => {
    if (order.length === 0) { showToast('No items in order'); return; }
    setPlacing(true);
    try {
      await posAPI.createOrder({
        orderType: 'dine-in',
        sectionId: sectionId || null,
        tableId: tableId || null,
        tableName: activeTable?.name || null,
        customerName: '',
        customerPhone: '',
        status: kotOnly ? 'kot' : 'paid',
        subtotal,
        discountAmount: discAmt,
        gstAmount: cgst + sgst,
        totalAmount: grand,
        paymentMethod: kotOnly ? null : payMethod,
        paymentStatus: kotOnly ? 'pending' : 'paid',
        notes: '',
        items: order.map(l => ({
          menuItemId: l.menuItemId, name: l.name,
          price: l.price, quantity: l.qty,
          notes: [l.portion==='half'?'Half':'',l.spice||'',...l.mods, l.note].filter(Boolean).join(', '),
        })),
      });
      const tbl = await posAPI.getTables();
      setTables(tbl);
      if (!kotOnly) {
        setOrder([]); setDiscountPct(0); setTendered(0);
        setOverlay(null);
        setBillNo(n => n + 1);
        showToast('Order paid & table cleared!');
      } else {
        setKotNo(n => n + 1);
        setOverlay(null);
        showToast('KOT sent to kitchen');
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to place order');
    } finally {
      setPlacing(false);
    }
  };

  /* ── close overlay ─────────────────────────────────────── */
  const closeOverlay = () => { setOverlay(null); setDraft(null); };

  if (loading) {
    return (
      <div style={{ position:'fixed', inset:0, zIndex:50, display:'flex', alignItems:'center',
        justifyContent:'center', background:C.bg, fontFamily:SANS }}>
        <div style={{ color:C.muted, fontSize:14 }}>Loading POS…</div>
      </div>
    );
  }

  /* ──────────────────────────────────────────────────────── */
  /* ROOT CONTAINER                                           */
  /* ──────────────────────────────────────────────────────── */
  return (
    <div style={{
      position:'fixed', inset:0, zIndex:50,
      display:'flex', flexDirection:'column',
      background:C.bg, fontFamily:SANS, color:C.dark, overflow:'hidden',
    }}>

      {/* ── TOP BAR ──────────────────────────────────────── */}
      <div style={{
        flex:'0 0 auto', height:62,
        display:'flex', alignItems:'center', gap:18, padding:'0 20px',
        background:'#fff', borderBottom:`1px solid ${C.border}`, zIndex:5,
      }}>
        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:11 }}>
          <div style={{
            width:38, height:38, borderRadius:11, background:C.primary,
            display:'flex', alignItems:'center', justifyContent:'center',
            color:'#fff', fontWeight:800, fontSize:15, letterSpacing:.5,
          }}>
            {restName.slice(0,2).toUpperCase()}
          </div>
          <div style={{ display:'flex', flexDirection:'column', lineHeight:1.1 }}>
            <div style={{ fontWeight:800, fontSize:15 }}>{restName}</div>
            <div style={{ fontSize:11, color:C.muted, fontWeight:600, letterSpacing:.3 }}>POINT OF SALE</div>
          </div>
        </div>

        {/* Order / Floor toggle */}
        <div style={{ display:'flex', background:'#f1efec', borderRadius:11, padding:4, gap:3 }}>
          {(['pos','floor'] as View[]).map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding:'7px 18px', border:'none', borderRadius:8, cursor:'pointer',
              fontFamily:SANS, fontSize:13, fontWeight:700,
              background: view===v ? C.dark : 'transparent',
              color: view===v ? '#fff' : C.secondary,
              transition:'all .15s',
            }}>{v === 'pos' ? 'Order' : 'Floor'}</button>
          ))}
        </div>

        <div style={{ flex:1 }} />
        <div style={{ fontSize:12.5, color:C.secondary, fontWeight:600 }}>{clock}</div>

        {/* User pill */}
        <div style={{
          display:'flex', alignItems:'center', gap:9, padding:'6px 12px 6px 6px',
          background:'#f1efec', borderRadius:30,
        }}>
          <div style={{
            width:28, height:28, borderRadius:'50%', background:C.dark,
            color:'#fff', display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:12, fontWeight:700,
          }}>A</div>
          <div style={{ display:'flex', flexDirection:'column', lineHeight:1.15 }}>
            <span style={{ fontSize:12, fontWeight:700 }}>Admin</span>
            <span style={{ fontSize:10, color:C.muted, fontWeight:600 }}>Cashier</span>
          </div>
        </div>
        {onExit && (
          <button onClick={onExit} title="Exit POS" style={{
            marginLeft:4, width:34, height:34, border:'none', borderRadius:9,
            background:'#f1efec', color:C.secondary, fontSize:18, cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>×</button>
        )}
      </div>

      {/* ══════════════ POS ORDER VIEW ══════════════════════ */}
      {view === 'pos' && (
        <div style={{ flex:1, display:'flex', flexDirection:'column', minHeight:0 }}>

          {/* Section tabs */}
          <div style={{
            flex:'0 0 auto', display:'flex', alignItems:'center', gap:8,
            padding:'11px 20px', background:C.sidebarBg,
            borderBottom:`1px solid ${C.border}`, overflowX:'auto',
          }}>
            <span style={{ fontSize:11, fontWeight:700, color:C.muted, letterSpacing:.6, textTransform:'uppercase', marginRight:4 }}>Section</span>
            {sections.map(sec => {
              const runCount = tables.filter(t => t.sectionId === sec.id && (t.status === 'occupied' || (orders[t.id]?.length ?? 0) > 0)).length;
              const active = sec.id === sectionId;
              return (
                <button key={sec.id} onClick={() => { setSectionId(sec.id); setTableId(''); }} style={{
                  display:'flex', alignItems:'center', gap:7,
                  padding:'8px 16px', border:'none', borderRadius:22, cursor:'pointer',
                  fontFamily:SANS, fontSize:13, fontWeight:700,
                  background: active ? C.dark : '#fff',
                  color: active ? '#fff' : C.dark,
                  boxShadow: active ? 'none' : `0 0 0 1px ${C.border}`,
                  transition:'all .15s',
                }}>
                  <span>{sec.name}</span>
                  {runCount > 0 && (
                    <span style={{
                      minWidth:20, height:20, padding:'0 6px', borderRadius:10,
                      background: active ? 'rgba(255,255,255,.25)' : C.primary,
                      color:'#fff', fontSize:11, fontWeight:700,
                      display:'flex', alignItems:'center', justifyContent:'center',
                    }}>{runCount}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Table chips */}
          <div style={{
            flex:'0 0 auto', display:'flex', alignItems:'center', gap:9,
            padding:'11px 20px', background:'#fff',
            borderBottom:`1px solid ${C.border}`, overflowX:'auto',
          }}>
            <span style={{ fontSize:11, fontWeight:700, color:C.muted, letterSpacing:.6, textTransform:'uppercase', marginRight:4 }}>Tables</span>
            {sectionTables.map(tb => {
              const st = tableStatus(tb);
              const dotColor = st==='available' ? C.green : st==='running' ? C.primary : C.blue;
              const active = tb.id === tableId;
              return (
                <button key={tb.id} onClick={() => setTableId(tb.id)} style={{
                  display:'flex', alignItems:'center', gap:6,
                  padding:'7px 14px', border:'none', borderRadius:22, cursor:'pointer',
                  fontFamily:SANS, fontSize:13, fontWeight:700,
                  background: active ? 'transparent' : 'transparent',
                  color: C.dark,
                  boxShadow: active ? `0 0 0 2px ${C.primary}` : `0 0 0 1px ${C.border}`,
                  transition:'all .15s',
                }}>
                  <span style={{ width:9, height:9, borderRadius:'50%', background:dotColor, flexShrink:0 }} />
                  <span>{tb.name}</span>
                </button>
              );
            })}
            {sectionTables.length === 0 && (
              <span style={{ fontSize:12, color:C.muted }}>No tables in this section</span>
            )}
          </div>

          {/* Main 3-col grid */}
          <div style={{ flex:1, display:'grid', gridTemplateColumns:'1fr 3fr 2fr', minHeight:0 }}>

            {/* ── COL 1: Categories ── */}
            <div style={{
              display:'flex', flexDirection:'column', minHeight:0,
              borderRight:`1px solid ${C.border}`, background:C.sidebarBg,
            }}>
              <div style={{ flex:'0 0 auto', padding:'14px 14px 8px', fontSize:11, fontWeight:700, color:C.muted, letterSpacing:.6, textTransform:'uppercase' }}>Categories</div>
              <div style={{ flex:1, overflowY:'auto', padding:'4px 12px 16px' }}>
                {categories.map(cat => {
                  const active = cat.id === categoryId;
                  const count = menuItems.filter(i => i.category === cat.id).length;
                  return (
                    <button key={cat.id} onClick={() => { setCategoryId(cat.id); setSearchQuery(''); }} style={{
                      display:'flex', alignItems:'center', gap:10,
                      width:'100%', padding:'10px 10px', border:'none', borderRadius:12,
                      cursor:'pointer', marginBottom:4, fontFamily:SANS, textAlign:'left',
                      background: active ? C.primary : 'transparent',
                      color: active ? '#fff' : C.dark,
                      transition:'all .15s',
                    }}>
                      <span style={{
                        width:36, height:36, borderRadius:9, flexShrink:0,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:11, fontWeight:800, letterSpacing:.5,
                        background: active ? 'rgba(255,255,255,.2)' : C.border,
                        color: active ? '#fff' : C.secondary,
                      }}>{catCode(cat.name)}</span>
                      <span style={{ display:'flex', flexDirection:'column', alignItems:'flex-start', lineHeight:1.25 }}>
                        <span style={{ fontSize:13.5, fontWeight:700 }}>{cat.name}</span>
                        <span style={{ fontSize:11, color: active ? 'rgba(255,255,255,.7)' : C.muted, fontWeight:600 }}>{count} item{count!==1?'s':''}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── COL 2: Menu Items ── */}
            <div style={{ display:'flex', flexDirection:'column', minHeight:0, background:C.bg }}>
              <div style={{ flex:'0 0 auto', padding:'13px 18px 9px', display:'flex', flexDirection:'column', gap:11 }}>
                {/* Header + search */}
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:16, fontWeight:800 }}>
                    {categories.find(c => c.id === categoryId)?.name ?? 'Menu'}
                  </span>
                  <span style={{ fontSize:12, fontWeight:600, color:C.muted }}>{filteredItems.length} items</span>
                  <span style={{ flex:1 }} />
                  <div style={{ position:'relative', width:260 }}>
                    <span style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'#bdb6ad', fontSize:15, pointerEvents:'none' }}>⌕</span>
                    <input
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder='Search… try "MC" for Main Course'
                      style={{
                        width:'100%', padding:'9px 30px', borderRadius:11,
                        border:`1px solid ${C.border}`, background:'#fff',
                        fontFamily:SANS, fontSize:12.5, outline:'none', color:C.dark,
                      }}
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery('')} style={{
                        position:'absolute', right:8, top:'50%', transform:'translateY(-50%)',
                        width:20, height:20, border:'none', borderRadius:'50%',
                        background:'#f1efec', color:C.secondary, fontSize:13, cursor:'pointer', lineHeight:1,
                      }}>×</button>
                    )}
                  </div>
                </div>

                {/* Quick/Favorites bar */}
                {!searchQuery && favItems.length > 0 && (
                  <div style={{ display:'flex', alignItems:'center', gap:7, overflowX:'auto', paddingBottom:2 }}>
                    <span style={{ fontSize:10.5, fontWeight:800, color:'#c9a227', letterSpacing:.5, textTransform:'uppercase', flex:'0 0 auto' }}>★ Quick</span>
                    {favItems.map(fv => (
                      <button key={fv.id} onClick={() => addFav(fv)} style={{
                        flex:'0 0 auto', display:'flex', alignItems:'center', gap:7,
                        padding:'7px 13px', borderRadius:20, border:`1px solid #efe6d6`,
                        background:'#fdfaf3', cursor:'pointer', fontSize:12.5, fontWeight:700,
                        color:'#3a352f', whiteSpace:'nowrap',
                      }}>
                        <span>{fv.name}</span>
                        <span style={{ color:C.muted, fontFamily:MONO, fontWeight:600 }}>₹{fv.price}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Item cards grid */}
              <div style={{ flex:1, overflowY:'auto', padding:'4px 18px 18px' }}>
                {filteredItems.length === 0 ? (
                  <div style={{ padding:'48px 24px', textAlign:'center', color:'#bdb6ad' }}>
                    <div style={{ fontSize:14, fontWeight:700, color:C.muted }}>No items match "{searchQuery}"</div>
                    <div style={{ fontSize:12, marginTop:5 }}>Search by dish name or initials (e.g. "PBM" → Paneer Butter Masala)</div>
                  </div>
                ) : (
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(152px,1fr))', gap:12 }}>
                    {filteredItems.map(item => {
                      const inOrder = order.filter(l => l.menuItemId === item.id).reduce((s,l) => s+l.qty, 0);
                      return (
                        <button key={item.id} onClick={() => tapItem(item)} style={{
                          position:'relative', display:'flex', flexDirection:'column',
                          justifyContent:'space-between', gap:12, padding:14,
                          borderRadius:15, border:`1px solid ${C.border}`,
                          background:'#fff', cursor:'pointer', minHeight:96,
                          textAlign:'left', boxShadow:'0 1px 2px rgba(0,0,0,.03)',
                          transition:'transform .08s, box-shadow .12s',
                          fontFamily:SANS,
                        }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLElement).style.border=`1px solid ${C.primary}`;
                            (e.currentTarget as HTMLElement).style.boxShadow=`0 4px 14px rgba(217,84,43,.13)`;
                            (e.currentTarget as HTMLElement).style.transform='translateY(-2px)';
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLElement).style.border=`1px solid ${C.border}`;
                            (e.currentTarget as HTMLElement).style.boxShadow='0 1px 2px rgba(0,0,0,.03)';
                            (e.currentTarget as HTMLElement).style.transform='translateY(0)';
                          }}
                        >
                          {inOrder > 0 && (
                            <span style={{
                              position:'absolute', top:9, right:9,
                              minWidth:22, height:22, padding:'0 6px', borderRadius:11,
                              background:C.primary, color:'#fff', fontSize:11.5, fontWeight:700,
                              display:'flex', alignItems:'center', justifyContent:'center',
                            }}>{inOrder}</span>
                          )}
                          <span style={{ fontSize:13.5, fontWeight:700, lineHeight:1.3, paddingRight:24 }}>{item.name}</span>
                          <span style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between' }}>
                            <span style={{ display:'flex', flexDirection:'column', lineHeight:1.2 }}>
                              <span style={{ fontFamily:MONO, fontSize:13.5, fontWeight:600, color:C.dark }}>₹{item.price}</span>
                            </span>
                            <span style={{
                              width:24, height:24, borderRadius:8, background:'#f4ede9',
                              color:C.primary, fontSize:17, fontWeight:700,
                              display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1,
                            }}>+</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ── COL 3: Order Panel ── */}
            <div style={{ display:'flex', flexDirection:'column', minHeight:0, background:'#fff', borderLeft:`1px solid ${C.border}` }}>
              {/* Header */}
              <div style={{
                flex:'0 0 auto', display:'flex', alignItems:'center', gap:12,
                padding:'15px 18px 13px', borderBottom:`1px solid ${C.border}`,
              }}>
                <div style={{ display:'flex', flexDirection:'column', lineHeight:1.15 }}>
                  <span style={{ fontSize:11, fontWeight:700, color:C.muted, letterSpacing:.5, textTransform:'uppercase' }}>Current Order</span>
                  <span style={{ fontSize:19, fontWeight:800 }}>
                    {activeTable ? `Table ${activeTable.name}` : 'No Table'}
                    {activeSection && <span style={{ fontSize:13, fontWeight:600, color:C.muted }}> · {activeSection.name}</span>}
                  </span>
                </div>
                <span style={{ flex:1 }} />
                <span style={{
                  padding:'5px 12px', borderRadius:20, fontSize:12, fontWeight:700,
                  background: order.length > 0 ? '#fef3ee' : '#f4f3f1',
                  color: order.length > 0 ? C.primary : C.muted,
                }}>
                  {order.length > 0 ? 'Running' : 'Empty'}
                </span>
              </div>

              {/* Order lines */}
              <div style={{ flex:1, overflowY:'auto', overflowX:'hidden', padding:'6px 0' }}>
                {order.length === 0 ? (
                  <div style={{
                    height:'100%', minHeight:220,
                    display:'flex', flexDirection:'column', alignItems:'center',
                    justifyContent:'center', gap:10, color:'#bdb6ad', padding:30, textAlign:'center',
                  }}>
                    <div style={{
                      width:54, height:54, borderRadius:16, border:'2px dashed #ddd6cd',
                      display:'flex', alignItems:'center', justifyContent:'center', fontSize:24,
                    }}>🧾</div>
                    <div style={{ fontSize:13.5, fontWeight:600, color:C.muted }}>No items yet</div>
                    <div style={{ fontSize:12, color:'#bdb6ad' }}>Tap menu items to start the order</div>
                  </div>
                ) : order.map(ln => (
                  <div key={ln.key} style={{
                    display:'flex', alignItems:'center', gap:10,
                    padding:'11px 18px', borderBottom:`1px solid #f4f1ed`,
                  }}>
                    <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', lineHeight:1.3 }}>
                      <span style={{ fontSize:13.5, fontWeight:700, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{ln.name}</span>
                      <span style={{ fontSize:11, color:C.muted, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                        {[ln.portion==='half'?'Half':null, ln.spice, ...ln.mods, ln.note].filter(Boolean).join(', ') || `₹${ln.price} each`}
                      </span>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:0, border:`1px solid ${C.border}`, borderRadius:9, overflow:'hidden' }}>
                      <button onClick={() => decLine(ln.key)} style={{ width:28, height:28, border:'none', background:'#f7f5f2', color:C.dark, fontSize:16, fontWeight:700, cursor:'pointer', lineHeight:1 }}>−</button>
                      <span style={{ minWidth:26, textAlign:'center', fontSize:13.5, fontWeight:700, fontFamily:MONO }}>{ln.qty}</span>
                      <button onClick={() => incLine(ln.key)} style={{ width:28, height:28, border:'none', background:'#f7f5f2', color:C.dark, fontSize:16, fontWeight:700, cursor:'pointer', lineHeight:1 }}>+</button>
                    </div>
                    <span style={{ minWidth:64, textAlign:'right', fontSize:13.5, fontWeight:700, fontFamily:MONO }}>₹{(ln.price * ln.qty).toLocaleString('en-IN')}</span>
                    <button onClick={() => removeLine(ln.key)} style={{ width:24, height:24, border:'none', background:'transparent', color:'#c4bdb5', fontSize:18, cursor:'pointer', lineHeight:1 }}>×</button>
                  </div>
                ))}
              </div>

              {/* Footer: discount + totals + buttons */}
              <div style={{ flex:'0 0 auto', padding:'14px 18px', borderTop:`1px solid ${C.border}`, background:C.sidebarBg }}>
                {/* Discount */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:9 }}>
                  <span style={{ fontSize:12, fontWeight:700, color:C.muted, letterSpacing:.5, textTransform:'uppercase' }}>Discount</span>
                  <div style={{ display:'flex', gap:5 }}>
                    {DISCOUNT_OPTS.map(pct => (
                      <button key={pct} onClick={() => setDiscountPct(pct)} style={{
                        padding:'5px 10px', border:`1px solid ${discountPct===pct ? C.primary : C.border}`,
                        borderRadius:8, background: discountPct===pct ? C.primary : '#fff',
                        color: discountPct===pct ? '#fff' : C.secondary,
                        fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:SANS,
                      }}>{pct}%</button>
                    ))}
                  </div>
                </div>

                {/* Tax summary */}
                <div style={{ fontFamily:MONO, fontSize:12.5, color:C.secondary, display:'flex', flexDirection:'column', gap:5 }}>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <span>Subtotal · {totalQty} item(s)</span>
                    <span style={{ fontWeight:600, color:C.dark }}>{fmtINR(subtotal)}</span>
                  </div>
                  {discountPct > 0 && (
                    <div style={{ display:'flex', justifyContent:'space-between', color:C.green }}>
                      <span>Discount ({discountPct}%)</span><span>−{fmtINR(discAmt)}</span>
                    </div>
                  )}
                  {gstRate > 0 && <>
                    <div style={{ display:'flex', justifyContent:'space-between' }}>
                      <span>CGST {halfRate}%</span><span>{fmtINR(cgst)}</span>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between' }}>
                      <span>SGST {halfRate}%</span><span>{fmtINR(sgst)}</span>
                    </div>
                  </>}
                </div>

                {/* Grand total */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:11, paddingTop:11, borderTop:'1px dashed #ddd6cd' }}>
                  <span style={{ fontSize:14, fontWeight:700 }}>Total Payable</span>
                  <span style={{ fontSize:23, fontWeight:800, fontFamily:MONO }}>{fmtINR(grand)}</span>
                </div>

                {/* Action buttons */}
                <div style={{ display:'flex', gap:9, marginTop:13 }}>
                  {settings?.enableKot !== false && (
                    <button onClick={() => setOverlay('kot')} disabled={order.length===0} style={{
                      flex:1, padding:'12px 0', border:`1.5px solid ${order.length===0?C.border:C.dark}`,
                      borderRadius:13, background:'#fff',
                      color: order.length===0 ? C.muted : C.dark,
                      fontSize:13.5, fontWeight:700, cursor: order.length===0 ? 'default' : 'pointer',
                      fontFamily:SANS,
                    }}>Print KOT</button>
                  )}
                  <button onClick={() => setOverlay('bill')} disabled={order.length===0} style={{
                    flex:2, padding:'12px 0', border:'none', borderRadius:13,
                    background: order.length===0 ? '#f1efec' : C.primary,
                    color: order.length===0 ? C.muted : '#fff',
                    fontSize:13.5, fontWeight:800, cursor: order.length===0 ? 'default' : 'pointer',
                    fontFamily:SANS,
                  }}>Bill &amp; Pay</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ FLOOR VIEW ══════════════════════════ */}
      {view === 'floor' && (
        <div style={{ flex:1, overflowY:'auto', background:C.bg }}>
          <div style={{ padding:'18px 24px', display:'flex', alignItems:'center', gap:18, flexWrap:'wrap' }}>
            <span style={{ fontSize:18, fontWeight:800 }}>Floor Overview</span>
            <span style={{ flex:1 }} />
            {[{c:C.green,l:'Available'},{c:C.primary,l:'Running'},{c:C.blue,l:'Billed'}].map(({c,l}) => (
              <div key={l} style={{ display:'flex', alignItems:'center', gap:7, fontSize:12, fontWeight:600, color:C.secondary }}>
                <span style={{ width:11, height:11, borderRadius:'50%', background:c }} />{l}
              </div>
            ))}
          </div>
          {sections.map(sec => {
            const secTables = tables.filter(t => t.sectionId === sec.id);
            if (secTables.length === 0) return null;
            return (
              <div key={sec.id} style={{ padding:'4px 24px 22px' }}>
                <div style={{ fontSize:12.5, fontWeight:700, color:C.muted, letterSpacing:.5, textTransform:'uppercase', marginBottom:11 }}>{sec.name}</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:13 }}>
                  {secTables.map(ft => {
                    const st = tableStatus(ft);
                    const dotColor = st==='available' ? C.green : st==='running' ? C.primary : C.blue;
                    const label = st==='available' ? 'Available' : st==='running' ? 'Running' : 'Billed';
                    return (
                      <button key={ft.id} onClick={() => { setSectionId(sec.id); setTableId(ft.id); setView('pos'); }} style={{
                        display:'flex', flexDirection:'column', gap:8,
                        padding:'14px 16px', borderRadius:14, border:'none',
                        background:'#fff', cursor:'pointer', textAlign:'left',
                        borderLeft:`4px solid ${dotColor}`,
                        boxShadow:'0 1px 3px rgba(0,0,0,.07)',
                        fontFamily:SANS,
                      }}>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                          <span style={{ fontSize:20, fontWeight:800 }}>{ft.name}</span>
                          <span style={{
                            padding:'3px 9px', borderRadius:20, fontSize:11, fontWeight:700,
                            background: st==='available' ? '#edf7f1' : st==='running' ? '#fef3ee' : '#eef3fc',
                            color: dotColor,
                          }}>{label}</span>
                        </div>
                        <div style={{ fontSize:12, color:C.secondary, fontWeight:600, fontFamily:MONO }}>
                          {st==='available' ? 'Available' : `${ft.capacity ?? 4} seats`}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════════ CUSTOMIZE OVERLAY ═══════════════════ */}
      {overlay === 'customize' && draft && (
        <div style={{ position:'absolute', inset:0, zIndex:42, background:'rgba(28,26,24,.5)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
          <div style={{ width:436, maxHeight:'86vh', overflowY:'auto', background:'#fff', borderRadius:20, boxShadow:'0 24px 60px rgba(0,0,0,.3)' }}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', padding:'20px 22px 14px', borderBottom:`1px solid #f1ede8` }}>
              <div style={{ display:'flex', flexDirection:'column', lineHeight:1.2 }}>
                <span style={{ fontSize:11, fontWeight:700, color:C.muted, letterSpacing:.5, textTransform:'uppercase' }}>Customize</span>
                <span style={{ fontSize:19, fontWeight:800 }}>{draft.item.name}</span>
              </div>
              <button onClick={closeOverlay} style={{ width:30, height:30, border:'none', borderRadius:9, background:'#f1efec', color:C.secondary, fontSize:18, cursor:'pointer' }}>×</button>
            </div>
            <div style={{ padding:'16px 22px', display:'flex', flexDirection:'column', gap:18 }}>
              {/* Spice level */}
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:C.muted, letterSpacing:.5, textTransform:'uppercase', marginBottom:9 }}>Spice level</div>
                <div style={{ display:'flex', gap:9 }}>
                  {SPICES.map(sp => (
                    <button key={sp} onClick={() => setDraft(d => d ? {...d, spice:sp} : d)} style={{
                      flex:1, padding:'10px 0', border:`1.5px solid ${draft.spice===sp ? C.primary : C.border}`,
                      borderRadius:11, background: draft.spice===sp ? '#fef3ee' : '#fff',
                      color: draft.spice===sp ? C.primary : C.secondary,
                      fontSize:13.5, fontWeight:700, cursor:'pointer', fontFamily:SANS,
                    }}>{sp}</button>
                  ))}
                </div>
              </div>
              {/* Modifiers */}
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:C.muted, letterSpacing:.5, textTransform:'uppercase', marginBottom:9 }}>Modifiers</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                  {MODS.map(md => {
                    const on = draft.mods.includes(md);
                    return (
                      <button key={md} onClick={() => setDraft(d => {
                        if (!d) return d;
                        return { ...d, mods: on ? d.mods.filter(m=>m!==md) : [...d.mods, md] };
                      })} style={{
                        padding:'7px 13px', border:`1.5px solid ${on ? C.primary : C.border}`,
                        borderRadius:20, background: on ? '#fef3ee' : '#fff',
                        color: on ? C.primary : C.secondary,
                        fontSize:12.5, fontWeight:700, cursor:'pointer', fontFamily:SANS,
                      }}>{md}</button>
                    );
                  })}
                </div>
              </div>
              {/* Note */}
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:C.muted, letterSpacing:.5, textTransform:'uppercase', marginBottom:9 }}>Note for kitchen</div>
                <input
                  value={draft.note}
                  onChange={e => setDraft(d => d ? {...d, note:e.target.value} : d)}
                  placeholder="e.g. no onion, serve after mains…"
                  style={{ width:'100%', padding:'11px 13px', borderRadius:11, border:`1px solid ${C.border}`, background:C.sidebarBg, fontFamily:SANS, fontSize:13, outline:'none', color:C.dark }}
                />
              </div>
            </div>
            {/* Qty + add */}
            <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 22px 20px', borderTop:`1px solid #f1ede8` }}>
              <div style={{ display:'flex', alignItems:'center', border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden' }}>
                <button onClick={() => setDraft(d => d && d.qty>1 ? {...d,qty:d.qty-1}:d)} style={{ width:40, height:46, border:'none', background:'#f7f5f2', fontSize:19, fontWeight:700, cursor:'pointer' }}>−</button>
                <span style={{ minWidth:42, textAlign:'center', fontSize:16, fontWeight:800, fontFamily:MONO }}>{draft.qty}</span>
                <button onClick={() => setDraft(d => d ? {...d,qty:d.qty+1}:d)} style={{ width:40, height:46, border:'none', background:'#f7f5f2', fontSize:19, fontWeight:700, cursor:'pointer' }}>+</button>
              </div>
              <button onClick={commitDraft} style={{
                flex:1, height:50, border:'none', borderRadius:13,
                background:C.primary, color:'#fff', fontSize:15, fontWeight:800, cursor:'pointer', fontFamily:SANS,
              }}>Add to Order · ₹{draft.item.price * draft.qty}</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ KOT OVERLAY ═════════════════════════ */}
      {overlay === 'kot' && (
        <div style={{ position:'absolute', inset:0, zIndex:40, background:'rgba(28,26,24,.5)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
          <div style={{ display:'flex', flexDirection:'column', gap:14, alignItems:'center' }}>
            <div style={{ width:320, maxHeight:'78vh', overflowY:'auto', background:'#fff', borderRadius:6, padding:'24px 22px', fontFamily:MONO, color:C.dark, boxShadow:'0 24px 60px rgba(0,0,0,.3)' }}>
              <div style={{ textAlign:'center', borderBottom:'2px dashed #cfc8c0', paddingBottom:12, marginBottom:12 }}>
                <div style={{ fontSize:15, fontWeight:600, letterSpacing:1 }}>KITCHEN ORDER TICKET</div>
                <div style={{ fontSize:12, color:C.secondary, marginTop:3 }}>KOT #{kotNo} · {new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</div>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:4 }}>
                <span>Table</span>
                <span style={{ fontSize:20, fontWeight:600 }}>{activeTable?.name ?? '—'}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, borderBottom:'2px dashed #cfc8c0', paddingBottom:12, marginBottom:12 }}>
                <span>{activeSection?.name ?? ''}</span><span>Steward: Admin</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:C.secondary, fontWeight:600, marginBottom:8 }}>
                <span>QTY</span><span>ITEM</span>
              </div>
              {order.map(ln => (
                <div key={ln.key} style={{ display:'flex', gap:12, fontSize:14, fontWeight:600, padding:'6px 0', borderBottom:'1px dotted #e6e0d8' }}>
                  <span style={{ minWidth:32, fontSize:16 }}>{ln.qty}×</span>
                  <div style={{ flex:1, display:'flex', flexDirection:'column', gap:2 }}>
                    <span>{ln.name}</span>
                    {(ln.mods.length>0 || ln.spice || ln.note) && (
                      <span style={{ fontSize:11, fontWeight:600, color:'#b04a22' }}>
                        ↳ {[ln.spice,...ln.mods,ln.note].filter(Boolean).join(', ')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              <div style={{ display:'flex', justifyContent:'space-between', borderTop:'2px dashed #cfc8c0', marginTop:12, paddingTop:12, fontSize:13, fontWeight:600 }}>
                <span>Total items</span><span>{totalQty}</span>
              </div>
              <div style={{ textAlign:'center', fontSize:11, color:C.muted, marginTop:14 }}>— send to kitchen —</div>
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={closeOverlay} style={{ padding:'12px 22px', borderRadius:11, border:'1px solid #fff', background:'transparent', color:'#fff', fontWeight:700, fontSize:13.5, cursor:'pointer', fontFamily:SANS }}>Close</button>
              <button onClick={() => placeOrder(true)} disabled={placing} style={{ padding:'12px 26px', borderRadius:11, border:'none', background:C.primary, color:'#fff', fontWeight:700, fontSize:13.5, cursor:'pointer', fontFamily:SANS }}>
                {placing ? 'Sending…' : 'Send & Print KOT'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ BILL OVERLAY ════════════════════════ */}
      {overlay === 'bill' && (
        <div style={{ position:'absolute', inset:0, zIndex:40, background:'rgba(28,26,24,.5)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
          <div style={{ display:'flex', flexDirection:'column', gap:14, alignItems:'center' }}>
            <div style={{ width:380, maxHeight:'78vh', overflowY:'auto', background:'#fff', borderRadius:6, padding:'26px 26px 22px', fontFamily:MONO, color:C.dark, boxShadow:'0 24px 60px rgba(0,0,0,.3)' }}>
              <div style={{ textAlign:'center', borderBottom:'2px dashed #cfc8c0', paddingBottom:14, marginBottom:13 }}>
                <div style={{ fontFamily:SANS, fontSize:20, fontWeight:800, letterSpacing:.5 }}>{restName.toUpperCase()}</div>
                <div style={{ fontFamily:SANS, fontSize:12, fontWeight:700, letterSpacing:2, marginTop:8, color:C.primary }}>TAX INVOICE</div>
              </div>
              <div style={{ fontSize:11.5, color:C.secondary, display:'flex', flexDirection:'column', gap:3, borderBottom:'2px dashed #cfc8c0', paddingBottom:12, marginBottom:12 }}>
                <div style={{ display:'flex', justifyContent:'space-between' }}><span>Bill No</span><span style={{ color:C.dark, fontWeight:600 }}>#{billNo}</span></div>
                <div style={{ display:'flex', justifyContent:'space-between' }}><span>Table</span><span style={{ color:C.dark, fontWeight:600 }}>{activeTable?.name ?? '—'} · {activeSection?.name ?? ''}</span></div>
                <div style={{ display:'flex', justifyContent:'space-between' }}><span>Date</span><span style={{ color:C.dark, fontWeight:600 }}>{new Date().toLocaleDateString('en-IN')}</span></div>
              </div>
              <div style={{ display:'flex', fontSize:10.5, color:C.secondary, fontWeight:600, paddingBottom:6, borderBottom:`1px solid ${C.border}` }}>
                <span style={{ flex:1 }}>ITEM</span><span style={{ width:34, textAlign:'center' }}>QTY</span><span style={{ width:56, textAlign:'right' }}>RATE</span><span style={{ width:64, textAlign:'right' }}>AMOUNT</span>
              </div>
              {order.map(ln => (
                <div key={ln.key} style={{ display:'flex', fontSize:12, padding:'7px 0', borderBottom:'1px dotted #e6e0d8' }}>
                  <div style={{ flex:1, paddingRight:6, display:'flex', flexDirection:'column', gap:2 }}>
                    <span>{ln.name}{ln.portion==='half'?' (Half)':''}</span>
                    {(ln.mods.length>0||ln.note) && <span style={{ fontSize:10, color:C.muted }}>{[...ln.mods,ln.note].filter(Boolean).join(', ')}</span>}
                  </div>
                  <span style={{ width:34, textAlign:'center' }}>{ln.qty}</span>
                  <span style={{ width:56, textAlign:'right' }}>₹{ln.price}</span>
                  <span style={{ width:64, textAlign:'right', fontWeight:600 }}>₹{(ln.price*ln.qty).toLocaleString('en-IN')}</span>
                </div>
              ))}
              <div style={{ fontSize:12.5, display:'flex', flexDirection:'column', gap:5, marginTop:12 }}>
                <div style={{ display:'flex', justifyContent:'space-between', color:C.secondary }}><span>Subtotal</span><span style={{ color:C.dark }}>{fmtINR(subtotal)}</span></div>
                {discountPct>0 && <div style={{ display:'flex', justifyContent:'space-between', color:C.green }}><span>Discount ({discountPct}%)</span><span>−{fmtINR(discAmt)}</span></div>}
                {gstRate>0 && <>
                  <div style={{ display:'flex', justifyContent:'space-between', color:C.secondary }}><span>CGST {halfRate}%</span><span style={{ color:C.dark }}>{fmtINR(cgst)}</span></div>
                  <div style={{ display:'flex', justifyContent:'space-between', color:C.secondary }}><span>SGST {halfRate}%</span><span style={{ color:C.dark }}>{fmtINR(sgst)}</span></div>
                </>}
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', borderTop:'2px dashed #cfc8c0', marginTop:12, paddingTop:12 }}>
                <span style={{ fontFamily:SANS, fontSize:15, fontWeight:800 }}>GRAND TOTAL</span>
                <span style={{ fontSize:21, fontWeight:600 }}>{fmtINR(grand)}</span>
              </div>
              <div style={{ textAlign:'center', fontSize:11, color:C.muted, marginTop:16, lineHeight:1.6 }}>Thank you for dining with us!<br/>Please visit again 🙏</div>
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={closeOverlay} style={{ padding:'12px 18px', borderRadius:11, border:'1px solid #fff', background:'transparent', color:'#fff', fontWeight:700, fontSize:13.5, cursor:'pointer', fontFamily:SANS }}>Close</button>
              <button onClick={() => setOverlay('payment')} style={{ padding:'12px 26px', borderRadius:11, border:'none', background:C.primary, color:'#fff', fontWeight:700, fontSize:13.5, cursor:'pointer', fontFamily:SANS }}>Proceed to Payment</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ PAYMENT OVERLAY ═════════════════════ */}
      {overlay === 'payment' && (
        <div style={{ position:'absolute', inset:0, zIndex:40, background:'rgba(28,26,24,.5)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
          <div style={{ width:400, background:'#fff', borderRadius:20, padding:24, boxShadow:'0 24px 60px rgba(0,0,0,.3)', fontFamily:SANS }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
              <span style={{ fontSize:17, fontWeight:800 }}>Payment · {activeTable ? `Table ${activeTable.name}` : 'Order'}</span>
              <button onClick={closeOverlay} style={{ width:30, height:30, border:'none', borderRadius:9, background:'#f1efec', color:C.secondary, fontSize:18, cursor:'pointer' }}>×</button>
            </div>
            {/* Amount box */}
            <div style={{ background:C.dark, borderRadius:15, padding:'18px 20px', color:'#fff', marginBottom:18 }}>
              <div style={{ fontSize:12, color:'#a9a29a', fontWeight:600, letterSpacing:.5, textTransform:'uppercase' }}>Amount Payable</div>
              <div style={{ fontSize:34, fontWeight:800, fontFamily:MONO, marginTop:2 }}>{fmtINR(grand)}</div>
            </div>
            {/* Payment method */}
            <div style={{ fontSize:12, fontWeight:700, color:C.muted, letterSpacing:.5, textTransform:'uppercase', marginBottom:9 }}>Payment Method</div>
            <div style={{ display:'flex', gap:9, marginBottom:18 }}>
              {(['cash','card','upi'] as const).map(m => (
                <button key={m} onClick={() => setPayMethod(m)} style={{
                  flex:1, padding:'11px 0', border:`1.5px solid ${payMethod===m ? C.primary : C.border}`,
                  borderRadius:11, background: payMethod===m ? '#fef3ee' : '#fff',
                  color: payMethod===m ? C.primary : C.secondary,
                  fontSize:13.5, fontWeight:700, cursor:'pointer', fontFamily:SANS,
                  textTransform:'uppercase',
                }}>{m}</button>
              ))}
            </div>
            {/* Cash tendering */}
            {payMethod === 'cash' && (
              <>
                <div style={{ fontSize:12, fontWeight:700, color:C.muted, letterSpacing:.5, textTransform:'uppercase', marginBottom:9 }}>Cash Tendered</div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'#f7f5f2', borderRadius:13, padding:'14px 16px', marginBottom:11 }}>
                  <span style={{ fontSize:13, color:C.secondary, fontWeight:600 }}>Received</span>
                  <span style={{ fontSize:22, fontWeight:800, fontFamily:MONO }}>₹{tendered.toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:11 }}>
                  {[100,200,500,1000].map(amt => (
                    <button key={amt} onClick={() => setTendered(t => t+amt)} style={{ flex:1, minWidth:64, padding:'11px 0', borderRadius:11, border:`1px solid ${C.border}`, background:'#fff', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:MONO }}>+{amt}</button>
                  ))}
                  <button onClick={() => setTendered(grand)} style={{ flex:1, minWidth:64, padding:'11px 0', borderRadius:11, border:`1px solid ${C.dark}`, background:C.dark, color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer' }}>Exact</button>
                  <button onClick={() => setTendered(0)} style={{ flex:1, minWidth:64, padding:'11px 0', borderRadius:11, border:`1px solid ${C.border}`, background:'#fff', color:'#c0392b', fontWeight:700, fontSize:13, cursor:'pointer' }}>Clear</button>
                </div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 2px', marginBottom:6 }}>
                  <span style={{ fontSize:14, fontWeight:700 }}>Change Due</span>
                  <span style={{ fontSize:20, fontWeight:800, fontFamily:MONO, color: change>0 ? C.green : C.dark }}>{fmtINR(change)}</span>
                </div>
              </>
            )}
            <button onClick={() => placeOrder(false)} disabled={placing || (payMethod==='cash' && tendered < grand)} style={{
              width:'100%', padding:'15px 0', border:'none', borderRadius:13,
              background: (placing || (payMethod==='cash' && tendered<grand)) ? '#f1efec' : C.primary,
              color: (placing || (payMethod==='cash' && tendered<grand)) ? C.muted : '#fff',
              fontSize:15, fontWeight:800, cursor: placing ? 'default':'pointer', fontFamily:SANS,
              marginTop:8,
            }}>
              {placing ? 'Processing…' : `Complete Payment · ${fmtINR(grand)}`}
            </button>
          </div>
        </div>
      )}

      {/* ══════════════ TOAST ═══════════════════════════════ */}
      {toastMsg && (
        <div style={{
          position:'absolute', bottom:26, left:'50%', transform:'translateX(-50%)', zIndex:60,
          background:C.dark, color:'#fff', padding:'13px 22px', borderRadius:13,
          fontSize:13.5, fontWeight:600, boxShadow:'0 12px 34px rgba(0,0,0,.3)',
          display:'flex', alignItems:'center', gap:10, whiteSpace:'nowrap',
        }}>
          <span style={{ width:8, height:8, borderRadius:'50%', background:'#34c759' }} />
          {toastMsg}
        </div>
      )}
    </div>
  );
}
