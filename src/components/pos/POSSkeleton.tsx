/**
 * Loading skeleton for the POS dashboard — mirrors the real layout (KPI cards,
 * charts, table) so the page keeps its shape while data loads instead of showing
 * a bare "Loading…" line. Uses the shared `.loading-skeleton` shimmer.
 */
const CARD: React.CSSProperties = { background: '#fff', border: '1px solid #ece8e3', borderRadius: 16, boxShadow: '0 1px 2px rgba(0,0,0,.03)' };

function Bar({ w = '100%', h = 12, r = 8, mt = 0 }: { w?: number | string; h?: number; r?: number; mt?: number }) {
  return <div className="loading-skeleton" style={{ width: w, height: h, borderRadius: r, marginTop: mt }} />;
}

export default function POSSkeleton({ tabs = false }: { tabs?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }} aria-busy="true" aria-label="Loading">
      {tabs && (
        <div style={{ display: 'flex', gap: 20, borderBottom: '1px solid #ece8e3', paddingBottom: 12 }}>
          {[80, 96, 92, 88].map((w, i) => <Bar key={i} w={w} h={16} />)}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <Bar w={120} h={10} />
          <Bar w={180} h={24} r={9} mt={8} />
        </div>
        <Bar w={230} h={40} r={11} />
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(184px,1fr))', gap: 14 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ ...CARD, padding: '17px 18px', display: 'flex', flexDirection: 'column', gap: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Bar w={36} h={36} r={11} />
              <Bar w={44} h={12} />
            </div>
            <div><Bar w={80} h={11} /><Bar w={110} h={22} r={6} mt={8} /></div>
          </div>
        ))}
      </div>

      {/* Chart row: wide line chart + donut */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 18 }}>
        <div style={{ ...CARD, gridColumn: 'span 2', minWidth: 300, borderRadius: 18, padding: 20 }}>
          <Bar w={160} h={16} /><Bar w={90} h={11} mt={8} />
          <Bar w="100%" h={180} r={12} mt={16} />
        </div>
        <div style={{ ...CARD, borderRadius: 18, padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Bar w={140} h={16} r={6} />
          <div className="loading-skeleton" style={{ width: 150, height: 150, borderRadius: '50%', marginTop: 18 }} />
          <Bar w="80%" h={12} mt={18} /><Bar w="70%" h={12} mt={8} />
        </div>
      </div>

      {/* Table block */}
      <div style={{ ...CARD, borderRadius: 18, padding: 20 }}>
        <Bar w={180} h={16} />
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Array.from({ length: 5 }).map((_, i) => <Bar key={i} w="100%" h={40} r={10} />)}
        </div>
      </div>
    </div>
  );
}
