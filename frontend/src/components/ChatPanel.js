// ChatPanel.js
import { useRef, useEffect, useState } from 'react';
import { QUICK_PROMPTS } from '../utils/constants';

function renderMessage(text) {
  if (!text) return null;
  // Bold, then italic, then code
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i} style={{ color: '#e8eaf0', fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*'))
      return <em key={i} style={{ color: '#c4b5fd' }}>{part.slice(1, -1)}</em>;
    if (part.startsWith('`') && part.endsWith('`'))
      return <code key={i} style={{ fontFamily: 'var(--mono)', background: 'rgba(255,255,255,0.08)', padding: '0 4px', borderRadius: 3, fontSize: 12 }}>{part.slice(1, -1)}</code>;
    // Handle newlines
    return part.split('\n').map((line, j, arr) => (
      <span key={`${i}-${j}`}>{line}{j < arr.length - 1 && <br />}</span>
    ));
  });
}

function QueryResultBadge({ queryName }) {
  const labels = {
    products_by_billing_count: '📊 Products by billing',
    trace_billing_document:    '🔍 Document trace',
    broken_flows:              '⚠️ Broken flows',
    unpaid_invoices:           '💳 Unpaid invoices',
    customer_summary:          '👥 Customer summary',
    revenue_by_product:        '💰 Revenue by product',
    revenue_by_month:          '📅 Monthly revenue',
    journal_by_billing:        '📒 Journal entries',
    sales_rep_performance:     '🏆 Sales rep performance',
    open_orders:               '📋 Open orders',
  };
  const label = labels[queryName] || queryName;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 10, padding: '2px 8px', borderRadius: 4,
      background: 'rgba(108,99,255,0.15)', color: '#a78bfa',
      border: '1px solid rgba(108,99,255,0.25)', marginBottom: 6,
      fontWeight: 500, letterSpacing: '0.02em',
    }}>{label}</span>
  );
}

export default function ChatPanel({ messages, isLoading, onSend, disabled }) {
  const [input, setInput] = useState('');
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isLoading || disabled) return;
    setInput('');
    onSend(text);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div style={{
      width: 380, display: 'flex', flexDirection: 'column',
      background: '#161b27',
      borderLeft: '1px solid rgba(255,255,255,0.06)',
      flexShrink: 0,
    }}>
      {/* Header */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
        <div style={{ fontSize: 11, color: '#555e74', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>
          Chat with Graph
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#e8eaf0' }}>Order to Cash</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: 'linear-gradient(135deg, #6c63ff, #a78bfa)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: 'white', flexShrink: 0,
          }}>O</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#e8eaf0' }}>O2C Agent</div>
            <div style={{ fontSize: 11, color: '#555e74' }}>Graph Agent · SQLite + Claude</div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex',
            flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
            gap: 8, alignItems: 'flex-start',
            animation: 'fadeIn 0.2s ease',
          }}>
            {msg.role === 'assistant' && (
              <div style={{
                width: 26, height: 26, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                background: 'linear-gradient(135deg, #6c63ff, #a78bfa)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: 'white',
              }}>O</div>
            )}
            <div style={{ maxWidth: '85%', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {msg.queryName && <QueryResultBadge queryName={msg.queryName} />}
              <div style={{
                padding: '9px 13px',
                borderRadius: msg.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                background: msg.role === 'user'
                  ? 'linear-gradient(135deg, #4e46e5, #6c63ff)'
                  : msg.type === 'restriction'
                    ? '#2d1a1a'
                    : '#1e2535',
                color: '#e8eaf0',
                fontSize: 13, lineHeight: 1.65,
                border: msg.type === 'restriction' ? '1px solid #450a0a' : 'none',
              }}>
                {renderMessage(msg.content)}
              </div>
            </div>
          </div>
        ))}

        {/* Loading dots */}
        {isLoading && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{
              width: 26, height: 26, borderRadius: '50%',
              background: 'linear-gradient(135deg, #6c63ff, #a78bfa)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: 'white', flexShrink: 0,
            }}>O</div>
            <div style={{
              padding: '9px 13px', borderRadius: '12px 12px 12px 4px',
              background: '#1e2535', display: 'flex', gap: 5, alignItems: 'center',
            }}>
              {[0, 1, 2].map(j => (
                <div key={j} style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: '#6c63ff',
                  animation: `pulse 1.2s ease-in-out ${j * 0.2}s infinite`,
                }} />
              ))}
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Status */}
      <div style={{
        padding: '6px 18px',
        borderTop: '1px solid rgba(255,255,255,0.04)',
        display: 'flex', alignItems: 'center', gap: 6,
        flexShrink: 0,
      }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: disabled ? '#ef4444' : isLoading ? '#f59e0b' : '#22c55e',
          boxShadow: `0 0 6px ${disabled ? '#ef4444' : isLoading ? '#f59e0b' : '#22c55e'}`,
        }} />
        <span style={{ fontSize: 11, color: '#555e74' }}>
          {disabled ? 'API key not configured' : isLoading ? 'Querying database…' : 'Agent awaiting instructions'}
        </span>
      </div>

      {/* Quick prompts */}
      <div style={{
        padding: '8px 18px 0',
        display: 'flex', flexWrap: 'wrap', gap: 5, flexShrink: 0,
        maxHeight: 72, overflow: 'hidden',
      }}>
        {QUICK_PROMPTS.slice(0, 4).map(p => (
          <button key={p.label}
            onClick={() => { setInput(p.text); inputRef.current?.focus(); }}
            disabled={disabled}
            style={{
              padding: '3px 10px', fontSize: 11, borderRadius: 12,
              background: 'rgba(108,99,255,0.08)',
              color: '#a78bfa',
              border: '1px solid rgba(108,99,255,0.2)',
              cursor: disabled ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
            }}
          >{p.label}</button>
        ))}
      </div>

      {/* Input */}
      <div style={{ padding: '10px 18px 16px', flexShrink: 0 }}>
        <div style={{
          display: 'flex', gap: 8, alignItems: 'flex-end',
          background: '#1e2535',
          borderRadius: 10,
          border: '1px solid rgba(255,255,255,0.08)',
          padding: '8px 8px 8px 12px',
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={disabled ? 'Set ANTHROPIC_API_KEY in backend .env' : 'Analyze anything…'}
            disabled={disabled}
            rows={2}
            style={{
              flex: 1, resize: 'none', background: 'transparent',
              border: 'none', outline: 'none', color: '#e8eaf0',
              fontSize: 13, lineHeight: 1.5, fontFamily: 'var(--font)',
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading || disabled}
            style={{
              width: 34, height: 34, borderRadius: 8, border: 'none',
              background: input.trim() && !isLoading && !disabled
                ? 'linear-gradient(135deg, #4e46e5, #6c63ff)'
                : 'rgba(255,255,255,0.05)',
              color: input.trim() && !isLoading && !disabled ? 'white' : '#555e74',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: input.trim() && !isLoading && !disabled ? 'pointer' : 'not-allowed',
              flexShrink: 0, transition: 'all 0.15s',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M12 7L1 2L3.5 7L1 12L12 7Z" fill="currentColor" />
            </svg>
          </button>
        </div>
        <div style={{ fontSize: 10, color: '#555e74', marginTop: 5, textAlign: 'right' }}>
          Enter to send · Shift+Enter for newline
        </div>
      </div>
    </div>
  );
}
