// NodePanel.js — side panel showing selected node metadata
import { NODE_COLORS, NODE_LABELS } from '../utils/constants';

function formatValue(key, value) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number') {
    if (['amount', 'price', 'total_revenue', 'total_billed', 'total_paid', 'outstanding'].includes(key)) {
      return '₹' + value.toLocaleString('en-IN');
    }
    return value.toLocaleString();
  }
  if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
    return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  return String(value);
}

function StatusBadge({ value }) {
  const styles = {
    Complete:            { bg: '#14532d', color: '#86efac' },
    Delivered:           { bg: '#14532d', color: '#86efac' },
    Posted:              { bg: '#1e3a5f', color: '#7dd3fc' },
    Cleared:             { bg: '#14532d', color: '#86efac' },
    Pending:             { bg: '#451a03', color: '#fcd34d' },
    Open:                { bg: '#1e2535', color: '#8b92a8' },
    Delivered_NoBill:    { bg: '#451a03', color: '#fbbf24' },
    Billed_NoDelivery:   { bg: '#450a0a', color: '#fca5a5' },
  };
  const s = styles[value] || { bg: '#1e2535', color: '#8b92a8' };
  return (
    <span style={{
      display: 'inline-block', padding: '1px 8px', borderRadius: 4,
      fontSize: 11, fontWeight: 500, background: s.bg, color: s.color,
    }}>{value}</span>
  );
}

const STATUS_KEYS = ['status', 'payment_status'];

export default function NodePanel({ node, onClose }) {
  if (!node) return null;
  const colors = NODE_COLORS[node.type] || NODE_COLORS.customer;
  const meta = node.meta || {};
  const skipKeys = ['id'];

  return (
    <div style={{
      position: 'absolute', top: 16, left: 16,
      width: 280, maxHeight: 'calc(100% - 32px)',
      background: '#161b27',
      border: `1px solid ${colors.stroke}33`,
      borderRadius: 12,
      boxShadow: `0 0 24px ${colors.glow || '#00000040'}, 0 4px 20px rgba(0,0,0,0.4)`,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      animation: 'fadeIn 0.15s ease',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: `${colors.fill}88`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <span style={{
              fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
              color: colors.text, textTransform: 'uppercase',
              background: `${colors.stroke}22`, padding: '2px 6px', borderRadius: 3,
            }}>
              {NODE_LABELS[node.type] || node.type}
            </span>
            <div style={{ fontWeight: 600, fontSize: 14, marginTop: 6, color: '#e8eaf0' }}>
              {node.label}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 6,
            width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#8b92a8', fontSize: 16, cursor: 'pointer', flexShrink: 0, marginTop: 2,
          }}>×</button>
        </div>
      </div>

      {/* Fields */}
      <div style={{ overflowY: 'auto', padding: '10px 14px' }}>
        {Object.entries(meta)
          .filter(([k]) => !skipKeys.includes(k))
          .map(([k, v]) => (
            <div key={k} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
              gap: 8,
            }}>
              <span style={{ color: '#8b92a8', fontSize: 11, textTransform: 'capitalize', flexShrink: 0 }}>
                {k.replace(/_/g, ' ')}
              </span>
              {STATUS_KEYS.includes(k) && v
                ? <StatusBadge value={v} />
                : <span style={{
                    color: '#c8cad4', fontSize: 12,
                    fontWeight: typeof v === 'number' && v > 10000 ? 600 : 400,
                    color: typeof v === 'number' && v > 10000 ? '#fcd34d' : '#c8cad4',
                    textAlign: 'right',
                  }}>
                    {formatValue(k, v)}
                  </span>
              }
            </div>
          ))
        }
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          padding: '5px 0', marginTop: 2,
        }}>
          <span style={{ color: '#8b92a8', fontSize: 11 }}>Connections</span>
          <span style={{ color: colors.text, fontWeight: 600, fontSize: 12 }}>{node.connections || 0}</span>
        </div>
      </div>

      {/* Node ID footer */}
      <div style={{ padding: '8px 14px', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)' }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#555e74' }}>{node.id}</span>
      </div>
    </div>
  );
}
