// Legend.js
import { NODE_COLORS, NODE_LABELS, FILTERS } from '../utils/constants';

export default function Legend({ activeFilter, onFilterChange }) {
  return (
    <div style={{
      position: 'absolute', bottom: 16, left: 16,
      background: 'rgba(22,27,39,0.92)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 10, padding: '10px 14px',
      backdropFilter: 'blur(8px)',
      minWidth: 190,
    }}>
      <div style={{ fontSize: 10, color: '#555e74', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
        Node Types
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
        {Object.entries(NODE_LABELS).map(([type, label]) => (
          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 9, height: 9, borderRadius: '50%', flexShrink: 0,
              background: NODE_COLORS[type].fill,
              border: `1.5px solid ${NODE_COLORS[type].stroke}`,
            }} />
            <span style={{ fontSize: 11, color: '#8b92a8' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Filter buttons */}
      <div style={{ marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8 }}>
        <div style={{ fontSize: 10, color: '#555e74', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
          View Filter
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {FILTERS.map(f => (
            <button key={f.id}
              onClick={() => onFilterChange(f.types)}
              style={{
                padding: '2px 8px', fontSize: 10, borderRadius: 4,
                background: activeFilter === f.types ? '#6c63ff22' : 'transparent',
                color: activeFilter === f.types ? '#a78bfa' : '#555e74',
                border: `1px solid ${activeFilter === f.types ? '#6c63ff44' : 'rgba(255,255,255,0.06)'}`,
                cursor: 'pointer', fontWeight: 500,
              }}
            >{f.label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
