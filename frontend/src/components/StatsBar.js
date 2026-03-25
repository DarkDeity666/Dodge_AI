// StatsBar.js — top stats row
export default function StatsBar({ stats }) {
  if (!stats) return null;
  const fmt = (n) => n >= 10000000
    ? '₹' + (n / 10000000).toFixed(1) + 'Cr'
    : n >= 100000
      ? '₹' + (n / 100000).toFixed(1) + 'L'
      : '₹' + (n || 0).toLocaleString('en-IN');

  const items = [
    { label: 'Total Billed',   value: fmt(stats.totalRevenue),   color: '#fcd34d' },
    { label: 'Collected',      value: fmt(stats.totalCollected),  color: '#86efac' },
    { label: 'Open Orders',    value: stats.openOrders,           color: '#7dd3fc' },
    { label: 'Broken Flows',   value: stats.brokenFlows,          color: stats.brokenFlows > 0 ? '#fca5a5' : '#86efac' },
    { label: 'Customers',      value: stats.customerCount,        color: '#c4b5fd' },
    { label: 'Invoices',       value: stats.invoiceCount,         color: '#5eead4' },
  ];

  return (
    <div style={{
      display: 'flex', gap: 1,
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      background: '#0f1117', flexShrink: 0,
    }}>
      {items.map(item => (
        <div key={item.label} style={{
          flex: 1, padding: '8px 14px',
          borderRight: '1px solid rgba(255,255,255,0.04)',
        }}>
          <div style={{ fontSize: 10, color: '#555e74', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 2 }}>
            {item.label}
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: item.color, fontVariantNumeric: 'tabular-nums' }}>
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}
