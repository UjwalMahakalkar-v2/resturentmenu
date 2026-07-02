import { useState, useEffect, useCallback, useRef } from 'react';
import { posAPI, staffAPI } from '@/services/api';
import POSSkeleton from './POSSkeleton';
import toast from 'react-hot-toast';


/* ── Design tokens ─────────────────────────────────────────── */
const C = {
  primary: '#d9542b',
  dark:    '#1c1a18',
  bg:      '#f4f3f1',
  border:  '#ece8e3',
  muted:   '#9a938b',
  sec:     '#6b645d',
  green:   '#1f8a5b',
  blue:    '#2a6fdb',
  gold:    '#c9a227',
};
const MONO = "'Spline Sans Mono', monospace";
const SANS = "'Plus Jakarta Sans', sans-serif";

type Range = 'today' | '7d' | '30d' | 'year';

/* ── Helpers ────────────────────────────────────────────────── */
function fmtINR(n: number) {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}
function fmtK(n: number) {
  if (n >= 100000) return '₹' + (n / 100000).toFixed(2).replace(/\.00$/, '') + 'L';
  if (n >= 1000)   return '₹' + (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'K';
  return '₹' + n;
}

function getDateBounds(range: Range): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date();
  if (range === 'today')  { from.setHours(0,0,0,0); }
  else if (range === '7d')  { from.setDate(from.getDate() - 6); from.setHours(0,0,0,0); }
  else if (range === '30d') { from.setDate(from.getDate() - 29); from.setHours(0,0,0,0); }
  else { from.setMonth(0,1); from.setHours(0,0,0,0); }
  return { from, to };
}

/* ── SVG Charts ─────────────────────────────────────────────── */
function LineChart({ series, color, width = 560, height = 190 }: {
  series: { x: string; v: number }[];
  color: string;
  width?: number;
  height?: number;
}) {
  const pad = { l:6, r:6, t:14, b:26 };
  const max = Math.max(...series.map(p => p.v)) * 1.15 || 1;
  const iw = width - pad.l - pad.r;
  const ih = height - pad.t - pad.b;
  const n = series.length;
  const pts = series.map((p, i) => {
    const x = pad.l + (n <= 1 ? iw / 2 : i / (n - 1) * iw);
    const y = pad.t + ih - (p.v / max) * ih;
    return [x, y] as [number, number];
  });
  const lineD = 'M' + pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' L');
  const areaD = `M${pts[0][0].toFixed(1)},${(pad.t+ih).toFixed(1)} ` +
    pts.map(p => 'L'+p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ') +
    ` L${pts[n-1][0].toFixed(1)},${(pad.t+ih).toFixed(1)} Z`;
  const gid = 'grad_' + color.replace('#','');
  const gridYs = [0, 0.5, 1];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ display:'block', height:'auto' }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.22} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {gridYs.map((f, i) => (
        <line key={i} x1={pad.l} x2={width-pad.r}
          y1={pad.t + ih*f} y2={pad.t + ih*f}
          stroke="#f1ede8" strokeWidth={1} />
      ))}
      <path d={areaD} fill={`url(#${gid})`} />
      <path d={lineD} fill="none" stroke={color} strokeWidth={2.6}
        strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={i === n-1 ? 4.5 : 3}
          fill="#fff" stroke={color} strokeWidth={2.2} />
      ))}
      {series.map((s, i) => {
        if (n > 8 && i % 2 !== 0 && i !== n-1) return null;
        return (
          <text key={i} x={pts[i][0]} y={height-7} textAnchor="middle"
            fill={C.muted} fontSize={10} fontFamily={MONO} fontWeight={600}>
            {s.x}
          </text>
        );
      })}
    </svg>
  );
}

function DonutChart({ segs, size, thickness }: {
  segs: { color: string; frac: number }[];
  size: number;
  thickness: number;
}) {
  const r = (size - thickness) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  let off = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={c} cy={c} r={r} fill="none" stroke="#f1ede8" strokeWidth={thickness} />
      {segs.map((s, i) => {
        const len = s.frac * circ;
        const el = (
          <circle key={i} cx={c} cy={c} r={r} fill="none"
            stroke={s.color} strokeWidth={thickness}
            strokeDasharray={`${len.toFixed(2)} ${(circ-len).toFixed(2)}`}
            strokeDashoffset={`${(-off).toFixed(2)}`}
            strokeLinecap="butt" />
        );
        off += len;
        return el;
      })}
    </svg>
  );
}

/* ── Data aggregation ───────────────────────────────────────── */
interface OrderRow {
  id: string;
  orderNumber: string;
  status: string;
  paymentMethod: string | null;
  paymentStatus: string;
  totalAmount: number;
  subtotal: number;
  discountAmount: number;
  gstAmount: number;
  tableName: string | null;
  tableId: string | null;
  items: { menuItemId: string; name: string; price: number; quantity: number }[];
  createdAt: string;
}

function buildSeries(orders: OrderRow[], range: Range) {
  const now = new Date();

  if (range === 'today') {
    // 12 two-hour buckets covering full 24h: 0-1→"12a", 2-3→"2a", ..., 22-23→"10p"
    const labels = ['12a','2a','4a','6a','8a','10a','12p','2p','4p','6p','8p','10p'];
    const rev   = new Array(12).fill(0);
    const bills = new Array(12).fill(0);
    orders.forEach(o => {
      const h = new Date(o.createdAt).getHours();
      const idx = Math.floor(h / 2); // 0-1→0, 2-3→1, …, 22-23→11
      rev[idx]   += o.totalAmount;
      bills[idx] += 1;
    });
    return { labels, rev, bills };
  }

  if (range === '7d') {
    // Last 7 calendar days as ordered slots: oldest first, today last
    const today = new Date(now); today.setHours(0,0,0,0);
    const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const labels: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      labels.push(DAY_NAMES[d.getDay()]);
    }
    const rev   = new Array(7).fill(0);
    const bills = new Array(7).fill(0);
    orders.forEach(o => {
      const d = new Date(o.createdAt); d.setHours(0,0,0,0);
      const diffDays = Math.round((today.getTime() - d.getTime()) / 86400000);
      if (diffDays >= 0 && diffDays <= 6) {
        const idx = 6 - diffDays; // today → idx 6
        rev[idx]   += o.totalAmount;
        bills[idx] += 1;
      }
    });
    return { labels, rev, bills };
  }

  if (range === '30d') {
    // Last 30 days split into 6 blocks of 5 days: oldest first
    const labels = ['1-5','6-10','11-15','16-20','21-25','26-30'];
    const rev   = new Array(6).fill(0);
    const bills = new Array(6).fill(0);
    const today = new Date(now); today.setHours(0,0,0,0);
    orders.forEach(o => {
      const d = new Date(o.createdAt); d.setHours(0,0,0,0);
      const diffDays = Math.round((today.getTime() - d.getTime()) / 86400000);
      if (diffDays >= 0 && diffDays < 30) {
        const idx = 5 - Math.floor(diffDays / 5); // most recent → idx 5
        rev[idx]   += o.totalAmount;
        bills[idx] += 1;
      }
    });
    return { labels, rev, bills };
  }

  // year: 12 months
  const mos = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const rev   = new Array(12).fill(0);
  const bills = new Array(12).fill(0);
  orders.forEach(o => {
    const m = new Date(o.createdAt).getMonth();
    rev[m]   += o.totalAmount;
    bills[m] += 1;
  });
  return { labels: mos, rev, bills };
}

/* ── Main component ─────────────────────────────────────────── */
export default function POSAnalyticsDashboard() {
  const [range, setRange] = useState<Range>('today');
  const [allOrders, setAllOrders]   = useState<OrderRow[]>([]);
  const [staffList, setStaffList]   = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);

  // toast
  const [toastMsg, setToastMsg] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout>|null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(''), 2400);
  };

  const load = useCallback(async () => {
    try {
      const [orders, staff, settings] = await Promise.all([
        posAPI.getOrders({ limit: 1000 }),
        staffAPI.getAll().catch(() => []),
        posAPI.getSettings().catch(() => ({})),
      ]);
      setAllOrders(orders as OrderRow[]);
      setStaffList(staff as any[]);
      if ((settings as any)?.currencySymbol) { /* ok */ }
    } catch {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── Derive metrics for current range ──────────────────── */
  const { from, to } = getDateBounds(range);

  const rangeOrders = allOrders.filter(o => {
    const d = new Date(o.createdAt);
    return d >= from && d <= to && (o.paymentStatus === 'paid' || o.status === 'paid');
  });

  const todayOrders = allOrders.filter(o => {
    const d = new Date(o.createdAt);
    const today = new Date(); today.setHours(0,0,0,0);
    return d >= today && (o.paymentStatus === 'paid' || o.status === 'paid');
  });

  const weekOrders = allOrders.filter(o => {
    const d = new Date(o.createdAt);
    const w = new Date(); w.setDate(w.getDate()-6); w.setHours(0,0,0,0);
    return d >= w && (o.paymentStatus === 'paid' || o.status === 'paid');
  });

  const monthOrders = allOrders.filter(o => {
    const d = new Date(o.createdAt);
    const m = new Date(); m.setDate(1); m.setHours(0,0,0,0);
    return d >= m && (o.paymentStatus === 'paid' || o.status === 'paid');
  });

  const todayRev   = todayOrders.reduce((s, o) => s + o.totalAmount, 0);
  const weekRev    = weekOrders.reduce((s, o) => s + o.totalAmount, 0);
  const monthRev   = monthOrders.reduce((s, o) => s + o.totalAmount, 0);
  const todayBills = todayOrders.length;
  const todayItems = todayOrders.reduce((s, o) => s + o.items.reduce((ss, i) => ss + i.quantity, 0), 0);

  const rangeRev   = rangeOrders.reduce((s, o) => s + o.totalAmount, 0);
  const rangeBills = rangeOrders.length;
  const avgBill    = rangeBills > 0 ? Math.round(rangeRev / rangeBills) : 0;

  /* Range label */
  const rangeLabel = { today:'Today', '7d':'Last 7 Days', '30d':'Last 30 Days', year:'This Year' }[range];

  /* Series for charts */
  const { labels, rev: revSeries, bills: billSeries } = buildSeries(rangeOrders, range);

  /* Payment breakdown */
  const payMap: Record<string, number> = {};
  rangeOrders.forEach(o => {
    const m = o.paymentMethod ?? 'cash';
    payMap[m] = (payMap[m] ?? 0) + o.totalAmount;
  });
  const payTotal = Object.values(payMap).reduce((a, b) => a + b, 0) || 1;
  const PAY_COLORS: Record<string, string> = { cash:C.primary, card:C.blue, upi:C.green };
  const paySegments = Object.entries(payMap).map(([k, v]) => ({
    name: k.charAt(0).toUpperCase() + k.slice(1),
    value: v, color: PAY_COLORS[k] ?? C.muted,
    frac: v / payTotal,
  }));

  /* Category breakdown by menu item category from order items */
  const catMap: Record<string, { name: string; value: number }> = {};
  rangeOrders.forEach(o => {
    o.items.forEach(i => {
      const k = i.menuItemId;
      catMap[k] = catMap[k] ?? { name: i.name, value: 0 };
      catMap[k].value += i.price * i.quantity;
    });
  });
  // Group top 4 by value (use item name as proxy for category)
  const catTotal = Object.values(catMap).reduce((s, c) => s + c.value, 0) || 1;
  const CAT_COLORS = [C.primary, C.blue, C.gold, C.green, C.muted];
  // aggregate top items for category donut
  const sortedCat = Object.values(catMap).sort((a,b) => b.value - a.value).slice(0,4);
  const catDonutSegs = sortedCat.map((c, i) => ({ frac: c.value/catTotal, color: CAT_COLORS[i] }));
  const catLegend = sortedCat.map((c, i) => ({
    name: c.name.length > 18 ? c.name.slice(0,16)+'…' : c.name,
    value: fmtK(c.value),
    pct: Math.round(c.value/catTotal*100) + '%',
    color: CAT_COLORS[i],
  }));

  /* Top selling items */
  const itemMap: Record<string, { name: string; qty: number; rev: number }> = {};
  rangeOrders.forEach(o => {
    o.items.forEach(i => {
      const k = i.name;
      itemMap[k] = itemMap[k] ?? { name: i.name, qty: 0, rev: 0 };
      itemMap[k].qty += i.quantity;
      itemMap[k].rev += i.price * i.quantity;
    });
  });
  const topItems = Object.values(itemMap).sort((a,b) => b.rev - a.rev).slice(0, 5);
  const tiMaxRev = topItems[0]?.rev || 1;
  const tiTotRev = topItems.reduce((s,t) => s+t.rev, 0) || 1;
  const RANK_COLORS = [C.primary, C.gold, C.blue, C.green, C.muted];

  /* Peak hour */
  const hourMap: Record<number, number> = {};
  rangeOrders.forEach(o => {
    const h = new Date(o.createdAt).getHours();
    hourMap[h] = (hourMap[h] ?? 0) + 1;
  });
  let peakHour = -1, peakCount = 0;
  Object.entries(hourMap).forEach(([h, c]) => { if (c > peakCount) { peakCount = c; peakHour = +h; } });
  const peakLabel = peakHour < 0 ? '—' : `${peakHour % 12 || 12}–${(peakHour+2) % 12 || 12} ${peakHour < 12 ? 'AM' : 'PM'}`;

  /* Recent transactions */
  const recentTxns = [...allOrders]
    .filter(o => o.paymentStatus === 'paid' || o.status === 'paid')
    .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  /* Staff performance (by name, static allocation of sales) */
  const activeStaff = staffList.filter(s => s.active).slice(0, 4);

  /* Profit estimates (30% cost assumption) */
  const pRevenue = rangeRev;
  const pExpenses = Math.round(rangeRev * 0.62);
  const pProfit = pRevenue - pExpenses;
  const pMargin = pRevenue > 0 ? Math.round(pProfit / pRevenue * 100) : 0;

  /* Bills bar max */
  const billMax = Math.max(...billSeries, 1);

  /* ── Cards ──────────────────────────────────────────────── */
  const cards = [
    { icon:'💰', label:"Today's Sales",    value: fmtINR(todayRev),       tint:'#fcefe9', fg:C.primary, trend:`+${todayBills} bills`, up:true },
    { icon:'📅', label:'Weekly Sales',     value: fmtK(weekRev),           tint:'#eaf0fb', fg:C.blue,    trend:`${weekOrders.length} orders`, up:true },
    { icon:'📈', label:'Monthly Sales',    value: fmtK(monthRev),          tint:'#eef5f0', fg:C.green,   trend:`${monthOrders.length} orders`, up:true },
    { icon:'🧾', label:'Bills Today',      value: String(todayBills),      tint:'#fdf6e3', fg:C.gold,    trend:'settled', up:true },
    { icon:'👥', label:'Customers Served', value: String(todayOrders.length), tint:'#fcefe9', fg:C.primary, trend:'today', up:true },
    { icon:'🍽️', label:'Items Sold',       value: String(todayItems),      tint:'#eaf0fb', fg:C.blue,    trend:'today', up:true },
  ];

  /* ── Status color helper ─────────────────────────────────── */
  const statusStyle = (s: string) => {
    if (s === 'paid') return { bg:'#eef5f0', fg:C.green, label:'Paid' };
    if (s === 'refunded') return { bg:'#fdeeee', fg:'#c0392b', label:'Refunded' };
    return { bg:'#fdf6e3', fg:C.gold, label:'Pending' };
  };
  const payDotColor: Record<string, string> = { cash:C.primary, card:C.blue, upi:C.green };

  if (loading) {
    return <POSSkeleton />;
  }

  /* ────────────────────────────────────────────────────────── */
  return (
    <div style={{ position:'relative', fontFamily:SANS, color:C.dark, background:C.bg, minHeight:'100%' }}>

      {/* Scroll body */}
      <div style={{ maxWidth:1320, margin:'0 auto', padding:'22px 0 40px', display:'flex', flexDirection:'column', gap:18 }}>

        {/* ── Header ── */}
        <div style={{ display:'flex', alignItems:'flex-end', gap:16, flexWrap:'wrap' }}>
          <div style={{ display:'flex', flexDirection:'column', lineHeight:1.15 }}>
            <span style={{ fontSize:11, fontWeight:700, color:C.muted, letterSpacing:.6, textTransform:'uppercase' }}>Business Overview</span>
            <span style={{ fontSize:26, fontWeight:800 }}>Dashboard</span>
          </div>
          <span style={{ flex:1, minWidth:8 }} />
          {/* Range selector */}
          <div style={{ display:'flex', background:'#fff', border:`1px solid ${C.border}`, borderRadius:11, padding:4, gap:2 }}>
            {(['today','7d','30d','year'] as Range[]).map((r, i) => {
              const labels = ['Today','Last 7 Days','Last 30 Days','This Year'];
              const active = r === range;
              return (
                <button key={r} onClick={() => setRange(r)} style={{
                  padding:'8px 14px', borderRadius:8, border:'none', cursor:'pointer',
                  fontSize:12.5, fontWeight:700, whiteSpace:'nowrap',
                  background: active ? C.primary : 'transparent',
                  color: active ? '#fff' : C.sec,
                  fontFamily:SANS,
                }}>{labels[i]}</button>
              );
            })}
          </div>
          {/* Export buttons */}
          <div style={{ display:'flex', gap:8 }}>
            {[['PDF',C.primary],['Excel',C.green],['CSV',C.blue]].map(([label, col]) => (
              <button key={label} onClick={() => showToast(`${rangeLabel} report exported as ${label}`)} style={{
                display:'flex', alignItems:'center', gap:7, padding:'9px 14px',
                borderRadius:11, border:`1px solid ${C.border}`, background:'#fff',
                cursor:'pointer', fontSize:12.5, fontWeight:700, color:'#3a352f',
                fontFamily:SANS,
              }}>
                <span style={{ width:8, height:8, borderRadius:2, background:col, flexShrink:0 }} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Overview Cards ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(184px,1fr))', gap:14 }}>
          {cards.map((c, i) => (
            <div key={i} style={{
              background:'#fff', border:`1px solid ${C.border}`, borderRadius:16,
              padding:'17px 18px', display:'flex', flexDirection:'column', gap:13,
              boxShadow:'0 1px 2px rgba(0,0,0,.03)',
            }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ width:36, height:36, borderRadius:11, background:c.tint, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>{c.icon}</span>
                <span style={{ fontSize:11.5, fontWeight:700, color: c.up ? C.green : '#c0392b' }}>
                  {c.up ? '▲ ' : '▼ '}{c.trend}
                </span>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                <span style={{ fontSize:12, fontWeight:700, color:C.muted }}>{c.label}</span>
                <span style={{ fontSize:24, fontWeight:800, fontFamily:MONO, letterSpacing:-.5 }}>{c.value}</span>
              </div>
            </div>
          ))}
        </div>

        {/* ── Row: Revenue trend + Category donut ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))', gap:18 }}>
          {/* Revenue line — spans 2 */}
          <div style={{ gridColumn:'span 2', minWidth:320, background:'#fff', border:`1px solid ${C.border}`, borderRadius:18, padding:20, boxShadow:'0 1px 2px rgba(0,0,0,.03)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:6, flexWrap:'wrap' }}>
              <div style={{ display:'flex', flexDirection:'column', lineHeight:1.2 }}>
                <span style={{ fontSize:15, fontWeight:800 }}>Revenue Trend</span>
                <span style={{ fontSize:12, fontWeight:600, color:C.muted }}>{rangeLabel}</span>
              </div>
              <span style={{ flex:1 }} />
              <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
                <span style={{ fontSize:22, fontWeight:800, fontFamily:MONO }}>{fmtK(rangeRev)}</span>
                <span style={{ fontSize:12, fontWeight:700, color:C.green }}>▲ {rangeBills} bills</span>
              </div>
            </div>
            <LineChart
              series={labels.map((x, i) => ({ x, v: revSeries[i] ?? 0 }))}
              color={C.primary}
            />
          </div>

          {/* Category donut */}
          <div style={{ background:'#fff', border:`1px solid ${C.border}`, borderRadius:18, padding:20, boxShadow:'0 1px 2px rgba(0,0,0,.03)', display:'flex', flexDirection:'column' }}>
            <span style={{ fontSize:15, fontWeight:800, marginBottom:2 }}>Category Sales</span>
            <span style={{ fontSize:12, fontWeight:600, color:C.muted, marginBottom:14 }}>Revenue by menu group</span>
            {catLegend.length === 0 ? (
              <div style={{ color:C.muted, fontSize:13, textAlign:'center', padding:'40px 0' }}>No data for this period</div>
            ) : (
              <div style={{ display:'flex', alignItems:'center', gap:18, flexWrap:'wrap' }}>
                <div style={{ position:'relative', flexShrink:0 }}>
                  <DonutChart segs={catDonutSegs} size={140} thickness={24} />
                  <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
                    <span style={{ fontSize:10, fontWeight:700, color:C.muted, letterSpacing:.4, textTransform:'uppercase' }}>Total</span>
                    <span style={{ fontSize:16, fontWeight:800, fontFamily:MONO }}>{fmtK(catTotal)}</span>
                  </div>
                </div>
                <div style={{ flex:1, minWidth:120, display:'flex', flexDirection:'column', gap:9 }}>
                  {catLegend.map((g, i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:9 }}>
                      <span style={{ width:11, height:11, borderRadius:4, background:g.color, flexShrink:0 }} />
                      <span style={{ flex:1, fontSize:12.5, fontWeight:700 }}>{g.name}</span>
                      <span style={{ fontSize:12, fontWeight:700, color:C.sec, fontFamily:MONO }}>{g.value}</span>
                      <span style={{ fontSize:11, fontWeight:700, color:C.muted, minWidth:34, textAlign:'right' }}>{g.pct}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Row: Bills bar + Payment donut + Order insights ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:18 }}>

          {/* Bills Settled bar */}
          <div style={{ background:'#fff', border:`1px solid ${C.border}`, borderRadius:18, padding:20, boxShadow:'0 1px 2px rgba(0,0,0,.03)' }}>
            <div style={{ display:'flex', alignItems:'center', marginBottom:18 }}>
              <div style={{ display:'flex', flexDirection:'column', lineHeight:1.2 }}>
                <span style={{ fontSize:15, fontWeight:800 }}>Bills Settled</span>
                <span style={{ fontSize:12, fontWeight:600, color:C.muted }}>{rangeLabel}</span>
              </div>
              <span style={{ flex:1 }} />
              <span style={{ fontSize:22, fontWeight:800, fontFamily:MONO }}>{rangeBills.toLocaleString('en-IN')}</span>
            </div>
            <div style={{ display:'flex', alignItems:'flex-end', gap:7, height:148, paddingTop:8 }}>
              {labels.map((lbl, i) => {
                const pct = Math.round((billSeries[i] ?? 0) / billMax * 100);
                const isLast = i === labels.length - 1;
                return (
                  <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:7, height:'100%', justifyContent:'flex-end' }}>
                    <span style={{ fontSize:10, fontWeight:700, color:C.sec, fontFamily:MONO }}>{billSeries[i] ?? 0}</span>
                    <div style={{
                      width:'100%', maxWidth:34,
                      height: pct + '%', minHeight:4,
                      borderRadius:'6px 6px 3px 3px',
                      background: isLast ? C.dark : C.primary,
                      opacity: isLast ? 1 : .82,
                    }} />
                    <span style={{ fontSize:10, fontWeight:600, color:C.muted }}>{lbl}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Payment donut */}
          <div style={{ background:'#fff', border:`1px solid ${C.border}`, borderRadius:18, padding:20, boxShadow:'0 1px 2px rgba(0,0,0,.03)', display:'flex', flexDirection:'column' }}>
            <span style={{ fontSize:15, fontWeight:800, marginBottom:2 }}>Payment Methods</span>
            <span style={{ fontSize:12, fontWeight:600, color:C.muted, marginBottom:14 }}>How customers paid</span>
            {paySegments.length === 0 ? (
              <div style={{ color:C.muted, fontSize:13, textAlign:'center', padding:'40px 0' }}>No data for this period</div>
            ) : (
              <div style={{ display:'flex', alignItems:'center', gap:18, flexWrap:'wrap' }}>
                <div style={{ position:'relative', flexShrink:0 }}>
                  <DonutChart segs={paySegments} size={140} thickness={24} />
                  <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
                    <span style={{ fontSize:10, fontWeight:700, color:C.muted, letterSpacing:.4, textTransform:'uppercase' }}>Collected</span>
                    <span style={{ fontSize:16, fontWeight:800, fontFamily:MONO }}>{fmtK(payTotal === 1 ? 0 : payTotal)}</span>
                  </div>
                </div>
                <div style={{ flex:1, minWidth:120, display:'flex', flexDirection:'column', gap:11 }}>
                  {paySegments.map((p, i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:9 }}>
                      <span style={{ width:11, height:11, borderRadius:'50%', background:p.color, flexShrink:0 }} />
                      <span style={{ flex:1, fontSize:12.5, fontWeight:700 }}>{p.name}</span>
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', lineHeight:1.25 }}>
                        <span style={{ fontSize:12, fontWeight:700, fontFamily:MONO }}>{fmtK(p.value)}</span>
                        <span style={{ fontSize:11, fontWeight:700, color:C.muted }}>{Math.round(p.frac*100)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Order insights */}
          <div style={{ background:'#fff', border:`1px solid ${C.border}`, borderRadius:18, padding:20, boxShadow:'0 1px 2px rgba(0,0,0,.03)', display:'flex', flexDirection:'column', gap:14 }}>
            <span style={{ fontSize:15, fontWeight:800 }}>Order Insights</span>
            {[
              { icon:'🧾', label:'Total Orders',      value: String(rangeBills),   tint:'#fcefe9' },
              { icon:'💵', label:'Average Bill Value', value: fmtINR(avgBill),      tint:'#eef5f0' },
              { icon:'🕒', label:'Peak Sales Hours',   value: peakLabel,             tint:'#fdf6e3' },
            ].map((o, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:13, padding:'13px 14px', background:'#fbfaf8', border:`1px solid #f1ede8`, borderRadius:13 }}>
                <span style={{ width:42, height:42, flexShrink:0, borderRadius:12, background:o.tint, display:'flex', alignItems:'center', justifyContent:'center', fontSize:19 }}>{o.icon}</span>
                <div style={{ display:'flex', flexDirection:'column', lineHeight:1.25 }}>
                  <span style={{ fontSize:11.5, fontWeight:700, color:C.muted }}>{o.label}</span>
                  <span style={{ fontSize:18, fontWeight:800, fontFamily:MONO }}>{o.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Row: Top items + Profit ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))', gap:18 }}>

          {/* Top selling — span 2 */}
          <div style={{ gridColumn:'span 2', minWidth:320, background:'#fff', border:`1px solid ${C.border}`, borderRadius:18, padding:20, boxShadow:'0 1px 2px rgba(0,0,0,.03)' }}>
            <div style={{ display:'flex', alignItems:'center', marginBottom:16 }}>
              <span style={{ fontSize:15, fontWeight:800 }}>🔥 Top Selling Items</span>
              <span style={{ flex:1 }} />
              <span style={{ fontSize:12, fontWeight:600, color:C.muted }}>{rangeLabel}</span>
            </div>
            {topItems.length === 0 ? (
              <div style={{ color:C.muted, fontSize:13, textAlign:'center', padding:'32px 0' }}>No orders in this period</div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:11 }}>
                {topItems.map((ti, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:13 }}>
                    <span style={{
                      width:30, height:30, flexShrink:0, borderRadius:9,
                      background: i === 0 ? C.primary : '#f4ede9',
                      color: i === 0 ? '#fff' : C.primary,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:13, fontWeight:800,
                    }}>{i+1}</span>
                    <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', gap:6 }}>
                      <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
                        <span style={{ fontSize:13.5, fontWeight:700 }}>{ti.name}</span>
                        <span style={{ fontSize:11.5, fontWeight:600, color:C.muted }}>{ti.qty} sold</span>
                        <span style={{ flex:1 }} />
                        <span style={{ fontSize:13, fontWeight:700, fontFamily:MONO }}>{fmtINR(ti.rev)}</span>
                        <span style={{ fontSize:11.5, fontWeight:700, color:C.muted, minWidth:40, textAlign:'right' }}>{Math.round(ti.rev/tiTotRev*100)}%</span>
                      </div>
                      <div style={{ height:7, borderRadius:6, background:'#f1ede8', overflow:'hidden' }}>
                        <div style={{ height:'100%', width: Math.round(ti.rev/tiMaxRev*100)+'%', borderRadius:6, background:RANK_COLORS[i]??C.muted }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Profit Analytics — dark card */}
          <div style={{ background:C.dark, borderRadius:18, padding:22, boxShadow:'0 1px 2px rgba(0,0,0,.03)', display:'flex', flexDirection:'column', gap:18, color:'#fff' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:15, fontWeight:800 }}>Profit Analytics</span>
              <span style={{ padding:'3px 9px', borderRadius:20, background:'rgba(255,255,255,.12)', color:'#e9d9a8', fontSize:10, fontWeight:700, letterSpacing:.4 }}>{rangeLabel}</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:13 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ fontSize:13, fontWeight:600, color:'#a9a29a' }}>Revenue</span>
                <span style={{ fontSize:17, fontWeight:800, fontFamily:MONO }}>{fmtINR(pRevenue)}</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ fontSize:13, fontWeight:600, color:'#a9a29a' }}>Expenses (est.)</span>
                <span style={{ fontSize:17, fontWeight:800, fontFamily:MONO, color:'#e8a08a' }}>−{fmtINR(pExpenses)}</span>
              </div>
              <div style={{ height:1, background:'rgba(255,255,255,.12)' }} />
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ fontSize:14, fontWeight:700 }}>Net Profit</span>
                <span style={{ fontSize:24, fontWeight:800, fontFamily:MONO, color:'#6fd19b' }}>{fmtINR(pProfit)}</span>
              </div>
            </div>
            <div style={{ marginTop:'auto' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:7 }}>
                <span style={{ fontSize:11.5, fontWeight:700, color:'#a9a29a' }}>Profit Margin</span>
                <span style={{ fontSize:12.5, fontWeight:800, color:'#6fd19b' }}>{pMargin}%</span>
              </div>
              <div style={{ height:9, borderRadius:6, background:'rgba(255,255,255,.12)', overflow:'hidden' }}>
                <div style={{ height:'100%', width: pMargin+'%', borderRadius:6, background:'linear-gradient(90deg,#6fd19b,#1f8a5b)' }} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Row: Transactions + Staff ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))', gap:18 }}>

          {/* Recent transactions — span 2 */}
          <div style={{ gridColumn:'span 2', minWidth:320, background:'#fff', border:`1px solid ${C.border}`, borderRadius:18, padding:20, boxShadow:'0 1px 2px rgba(0,0,0,.03)' }}>
            <div style={{ display:'flex', alignItems:'center', marginBottom:14 }}>
              <span style={{ fontSize:15, fontWeight:800 }}>Recent Transactions</span>
              <span style={{ flex:1 }} />
              <button onClick={() => showToast('Opening full transaction ledger…')} style={{
                fontSize:12, fontWeight:700, color:C.primary, background:'none', border:'none', cursor:'pointer', fontFamily:SANS,
              }}>View all →</button>
            </div>
            <div style={{ overflowX:'auto' }}>
              <div style={{ minWidth:540 }}>
                <div style={{ display:'grid', gridTemplateColumns:'0.9fr 1.3fr 0.7fr 1fr 1.1fr 0.9fr', gap:10, padding:'0 6px 10px', fontSize:10.5, fontWeight:700, color:C.muted, letterSpacing:.5, textTransform:'uppercase', borderBottom:`1px solid ${C.border}` }}>
                  <span>Bill No</span><span>Date</span><span>Table</span><span style={{ textAlign:'right' }}>Amount</span><span>Payment</span><span style={{ textAlign:'right' }}>Status</span>
                </div>
                {recentTxns.length === 0 ? (
                  <div style={{ padding:'32px 0', textAlign:'center', color:C.muted, fontSize:13 }}>No transactions yet</div>
                ) : recentTxns.map((x, i) => {
                  const st = statusStyle(x.paymentStatus === 'paid' || x.status === 'paid' ? 'paid' : x.status);
                  const pm = x.paymentMethod ?? 'cash';
                  const dc = payDotColor[pm] ?? C.muted;
                  const dateStr = new Date(x.createdAt).toLocaleString('en-IN', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
                  const tableLabel = x.tableName ?? (x.tableId ? x.tableId : '—');
                  return (
                    <div key={i} style={{ display:'grid', gridTemplateColumns:'0.9fr 1.3fr 0.7fr 1fr 1.1fr 0.9fr', gap:10, alignItems:'center', padding:'11px 6px', borderBottom:`1px solid #f4f1ed`, fontSize:12.5 }}>
                      <span style={{ fontWeight:700, fontFamily:MONO }}>{x.orderNumber}</span>
                      <span style={{ color:C.sec, fontWeight:600 }}>{dateStr}</span>
                      <span style={{ fontWeight:700, color:C.dark }}>{tableLabel}</span>
                      <span style={{ textAlign:'right', fontWeight:700, fontFamily:MONO }}>{fmtINR(x.totalAmount)}</span>
                      <span style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <span style={{ width:8, height:8, borderRadius:'50%', background:dc, flexShrink:0 }} />
                        <span style={{ fontWeight:600, color:'#3a352f' }}>{pm.charAt(0).toUpperCase()+pm.slice(1)}</span>
                      </span>
                      <span style={{ display:'flex', justifyContent:'flex-end' }}>
                        <span style={{ padding:'3px 11px', borderRadius:20, background:st.bg, color:st.fg, fontSize:11, fontWeight:700 }}>{st.label}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Staff performance */}
          {activeStaff.length > 0 && (
            <div style={{ background:'#fff', border:`1px solid ${C.border}`, borderRadius:18, padding:20, boxShadow:'0 1px 2px rgba(0,0,0,.03)', display:'flex', flexDirection:'column' }}>
              <span style={{ fontSize:15, fontWeight:800, marginBottom:2 }}>👨‍🍳 Staff Performance</span>
              <span style={{ fontSize:12, fontWeight:600, color:C.muted, marginBottom:16 }}>Active staff members</span>
              <div style={{ display:'flex', flexDirection:'column', gap:15 }}>
                {activeStaff.map((s, i) => {
                  const AV_COLS = [C.primary, C.blue, C.green, C.gold];
                  const col = AV_COLS[i % 4];
                  // Distribute a mock sales allocation proportionally (real data would need a staff_id on orders)
                  const allocation = [38, 28, 22, 12];
                  const pct = allocation[i] ?? 10;
                  return (
                    <div key={s.id} style={{ display:'flex', flexDirection:'column', gap:7 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <span style={{ width:28, height:28, flexShrink:0, borderRadius:'50%', background:col, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700 }}>
                          {s.name.charAt(0).toUpperCase()}
                        </span>
                        <span style={{ flex:1, fontSize:13, fontWeight:700 }}>{s.name}</span>
                        <span style={{ fontSize:13, fontWeight:700, fontFamily:MONO, color:C.sec }}>{s.role}</span>
                      </div>
                      <div style={{ height:7, borderRadius:6, background:'#f1ede8', overflow:'hidden' }}>
                        <div style={{ height:'100%', width: pct+'%', borderRadius:6, background:col }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Toast */}
      {toastMsg && (
        <div style={{
          position:'fixed', bottom:26, left:'50%', transform:'translateX(-50%)', zIndex:60,
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
