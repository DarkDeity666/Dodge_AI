// App.js — root component
import { useState, useEffect, useCallback, useRef } from 'react';
import GraphCanvas from './components/GraphCanvas';
import ChatPanel from './components/ChatPanel';
import NodePanel from './components/NodePanel';
import StatsBar from './components/StatsBar';
import Legend from './components/Legend';
import { API_BASE } from './utils/constants';

const INITIAL_MESSAGES = [{
  role: 'assistant',
  content: `Hi! I'm your O2C Graph Agent. I can help you analyze the **Order to Cash** process.\n\nTry asking:\n• *Which products appear in the most billing documents?*\n• *Trace the full flow for billing document BD001*\n• *Show me all broken or incomplete flows*\n• *Which invoices are still unpaid?*\n• *How is each sales rep performing?*`,
}];

export default function App() {
  const [graphData, setGraphData]         = useState(null);
  const [stats, setStats]                 = useState(null);
  const [selectedNode, setSelectedNode]   = useState(null);
  const [highlightIds, setHighlightIds]   = useState([]);
  const [activeFilter, setActiveFilter]   = useState(null);
  const [messages, setMessages]           = useState(INITIAL_MESSAGES);
  const [isLoading, setIsLoading]         = useState(false);
  const [apiError, setApiError]           = useState(false);
  const highlightTimerRef                 = useRef(null);

  // Load graph + stats
  useEffect(() => {
    fetch(`${API_BASE}/api/graph`)
      .then(r => r.json())
      .then(data => {
        // Enrich nodes with connection counts
        const connCount = {};
        data.edges.forEach(e => {
          connCount[e.source] = (connCount[e.source] || 0) + 1;
          connCount[e.target] = (connCount[e.target] || 0) + 1;
        });
        data.nodes.forEach(n => { n.connections = connCount[n.id] || 0; });
        setGraphData(data);
      })
      .catch(() => setApiError(true));

    fetch(`${API_BASE}/api/stats`)
      .then(r => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  const handleNodeClick = useCallback((node) => {
    setSelectedNode(node);
  }, []);

  const handleSend = useCallback(async (text) => {
    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // Build message history for API (exclude system messages)
      const history = [...messages, userMsg]
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .slice(-14)
        .map(m => ({ role: m.role, content: m.content }));

      const resp = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();

      const assistantMsg = {
        role: 'assistant',
        content: data.message || data.error || 'Something went wrong.',
        type: data.type,
        queryName: data.queryName,
        queryResult: data.queryResult,
      };

      setMessages(prev => [...prev, assistantMsg]);

      // Highlight graph nodes if present
      if (data.highlightIds?.length) {
        if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
        setHighlightIds(data.highlightIds);
        highlightTimerRef.current = setTimeout(() => setHighlightIds([]), 10000);
      }

    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Error connecting to the backend. Please ensure the backend server is running on port 3001.',
        type: 'error',
      }]);
    }

    setIsLoading(false);
  }, [messages]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Top header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '0 20px', height: 48,
        background: '#0f1117',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{
          width: 28, height: 28, borderRadius: 7,
          background: 'linear-gradient(135deg, #4e46e5, #6c63ff)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <circle cx="3" cy="3" r="2.2" fill="white" />
            <circle cx="12" cy="3" r="2.2" fill="white" />
            <circle cx="7.5" cy="12" r="2.2" fill="white" />
            <line x1="3" y1="3" x2="12" y2="3" stroke="white" strokeWidth="1" />
            <line x1="3" y1="3" x2="7.5" y2="12" stroke="white" strokeWidth="1" />
            <line x1="12" y1="3" x2="7.5" y2="12" stroke="white" strokeWidth="1" />
          </svg>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, color: '#555e74' }}>Mapping</span>
          <span style={{ color: '#333' }}>/</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#e8eaf0' }}>Order to Cash</span>
        </div>

        <div style={{ marginLeft: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          {graphData && (
            <>
              <span style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 4,
                background: 'rgba(108,99,255,0.12)', color: '#a78bfa',
                border: '1px solid rgba(108,99,255,0.2)',
              }}>
                {graphData.nodes.length} nodes
              </span>
              <span style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 4,
                background: 'rgba(20,184,166,0.12)', color: '#5eead4',
                border: '1px solid rgba(20,184,166,0.2)',
              }}>
                {graphData.edges.length} edges
              </span>
            </>
          )}
          {!graphData && !apiError && (
            <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #6c63ff', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
          )}
          {apiError && (
            <span style={{ fontSize: 11, color: '#ef4444' }}>⚠ Backend offline — run: cd backend && npm start</span>
          )}
        </div>

        <div style={{ marginLeft: 'auto', fontSize: 11, color: '#555e74' }}>
          SQLite · Claude claude-opus-4-5 · D3 force graph
        </div>
      </div>

      {/* Stats bar */}
      <StatsBar stats={stats} />

      {/* Main content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Graph area */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#0a0d14' }}>
          {graphData ? (
            <GraphCanvas
              graphData={graphData}
              highlightIds={highlightIds}
              activeFilter={activeFilter}
              onNodeClick={handleNodeClick}
              selectedNodeId={selectedNode?.id}
            />
          ) : (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: '100%', flexDirection: 'column', gap: 12, color: '#555e74',
            }}>
              {!apiError ? (
                <>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid #6c63ff', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
                  <span style={{ fontSize: 13 }}>Loading graph data…</span>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 32 }}>⚠️</div>
                  <span style={{ fontSize: 14, color: '#ef4444' }}>Backend not running</span>
                  <span style={{ fontSize: 12 }}>cd backend && npm install && npm start</span>
                </>
              )}
            </div>
          )}

          {/* Node detail panel */}
          {selectedNode && (
            <NodePanel node={selectedNode} onClose={() => setSelectedNode(null)} />
          )}

          {/* Legend */}
          {graphData && (
            <Legend activeFilter={activeFilter} onFilterChange={setActiveFilter} />
          )}

          {/* Zoom hint */}
          <div style={{
            position: 'absolute', bottom: 16, right: 16,
            fontSize: 10, color: '#555e74',
            background: 'rgba(22,27,39,0.7)',
            padding: '4px 10px', borderRadius: 6,
          }}>
            Scroll to zoom · Drag to pan · Click node to inspect
          </div>
        </div>

        {/* Chat panel */}
        <ChatPanel
          messages={messages}
          isLoading={isLoading}
          onSend={handleSend}
          disabled={apiError}
        />
      </div>
    </div>
  );
}
