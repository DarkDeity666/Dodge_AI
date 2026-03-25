// GraphCanvas.js — D3 force-directed graph visualization
import { useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import { NODE_COLORS, NODE_LABELS, NODE_RADIUS } from '../utils/constants';

export default function GraphCanvas({ graphData, highlightIds, activeFilter, onNodeClick, selectedNodeId }) {
  const svgRef = useRef(null);
  const simRef = useRef(null);
  const zoomRef = useRef(null);

  const getFilteredData = useCallback((data, filter) => {
    if (!data?.nodes) return { nodes: [], edges: [] };
    const nodes = filter ? data.nodes.filter(n => filter.includes(n.type)) : data.nodes;
    const nodeIds = new Set(nodes.map(n => n.id));
    const edges = (data.edges || []).filter(e => nodeIds.has(e.source?.id || e.source) && nodeIds.has(e.target?.id || e.target));
    return { nodes, edges };
  }, []);

  useEffect(() => {
    if (!graphData?.nodes?.length || !svgRef.current) return;

    const container = svgRef.current.parentElement;
    const W = container.clientWidth || 900;
    const H = container.clientHeight || 640;

    // Clear previous
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('width', W)
      .attr('height', H);

    // Zoom
    const g = svg.append('g');
    const zoom = d3.zoom()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => g.attr('transform', event.transform));
    svg.call(zoom);
    zoomRef.current = zoom;

    // Arrow markers
    const defs = svg.append('defs');
    Object.entries(NODE_COLORS).forEach(([type, colors]) => {
      defs.append('marker')
        .attr('id', `arrow-${type}`)
        .attr('viewBox', '0 0 10 10')
        .attr('refX', 20).attr('refY', 5)
        .attr('markerWidth', 5).attr('markerHeight', 5)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,0 L10,5 L0,10 Z')
        .attr('fill', colors.stroke)
        .attr('opacity', 0.5);
    });

    const { nodes, edges } = getFilteredData(graphData, activeFilter);

    // Clone nodes/edges for d3
    const simNodes = nodes.map(n => ({ ...n }));
    const nodeById = new Map(simNodes.map(n => [n.id, n]));
    const simEdges = edges
      .map(e => ({
        ...e,
        source: nodeById.get(e.source?.id || e.source),
        target: nodeById.get(e.target?.id || e.target),
      }))
      .filter(e => e.source && e.target);

    // Force simulation
    const sim = d3.forceSimulation(simNodes)
      .force('link', d3.forceLink(simEdges).id(d => d.id).distance(d => {
        const types = [d.source.type, d.target.type];
        if (types.includes('soItem')) return 60;
        if (types.includes('customer') || types.includes('product')) return 140;
        return 110;
      }).strength(0.4))
      .force('charge', d3.forceManyBody().strength(d => {
        const strengths = { customer: -400, product: -350, salesOrder: -300, soItem: -100, delivery: -250, billing: -280, payment: -220, journal: -200 };
        return strengths[d.type] || -200;
      }))
      .force('center', d3.forceCenter(W / 2, H / 2).strength(0.08))
      .force('collision', d3.forceCollide().radius(d => NODE_RADIUS[d.type] + 20).strength(0.8))
      .force('x', d3.forceX(W / 2).strength(0.03))
      .force('y', d3.forceY(H / 2).strength(0.03));

    simRef.current = sim;

    // Edge lines
    const edgeGroup = g.append('g').attr('class', 'edges');
    const edgeLines = edgeGroup.selectAll('line')
      .data(simEdges)
      .join('line')
      .attr('stroke', d => NODE_COLORS[d.source.type]?.stroke || '#555')
      .attr('stroke-width', 0.8)
      .attr('stroke-opacity', 0.3)
      .attr('marker-end', d => `url(#arrow-${d.source.type})`);

    // Node groups
    const nodeGroup = g.append('g').attr('class', 'nodes');
    const nodeGs = nodeGroup.selectAll('g')
      .data(simNodes)
      .join('g')
      .attr('class', 'node-group')
      .style('cursor', 'pointer')
      .call(d3.drag()
        .on('start', (event, d) => {
          if (!event.active) sim.alphaTarget(0.3).restart();
          d.fx = d.x; d.fy = d.y;
        })
        .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
        .on('end', (event, d) => {
          if (!event.active) sim.alphaTarget(0);
          d.fx = null; d.fy = null;
        })
      )
      .on('click', (event, d) => { event.stopPropagation(); onNodeClick(d); });

    // Glow filter per node
    simNodes.forEach(node => {
      const filter = defs.append('filter').attr('id', `glow-${node.id}`);
      filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur');
      const merge = filter.append('feMerge');
      merge.append('feMergeNode').attr('in', 'coloredBlur');
      merge.append('feMergeNode').attr('in', 'SourceGraphic');
    });

    // Node circles
    nodeGs.append('circle')
      .attr('r', d => NODE_RADIUS[d.type] || 10)
      .attr('fill', d => NODE_COLORS[d.type]?.fill || '#1e2535')
      .attr('stroke', d => NODE_COLORS[d.type]?.stroke || '#555')
      .attr('stroke-width', 1.5);

    // Node labels (only for larger nodes)
    nodeGs.append('text')
      .attr('dy', d => (NODE_RADIUS[d.type] || 10) + 13)
      .attr('text-anchor', 'middle')
      .attr('font-size', '9px')
      .attr('fill', d => NODE_COLORS[d.type]?.text || '#888')
      .attr('pointer-events', 'none')
      .text(d => {
        const label = d.label || d.id;
        return label.length > 12 ? label.slice(0, 12) + '…' : label;
      })
      .style('opacity', d => NODE_RADIUS[d.type] >= 12 ? 0.75 : 0);

    // Type icon (first letter)
    nodeGs.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', d => Math.max(8, (NODE_RADIUS[d.type] || 10) * 0.7) + 'px')
      .attr('font-weight', '500')
      .attr('fill', d => NODE_COLORS[d.type]?.text || '#aaa')
      .attr('pointer-events', 'none')
      .text(d => ({
        customer: '👤', product: '📦', salesOrder: 'SO', soItem: '•',
        delivery: 'D', billing: 'B', payment: '₹', journal: 'J'
      }[d.type] || '?'));

    // Simulation tick
    sim.on('tick', () => {
      edgeLines
        .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
      nodeGs.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Click on background deselects
    svg.on('click', () => onNodeClick(null));

    return () => { sim.stop(); };
  }, [graphData, activeFilter]);

  // Update highlights without re-running simulation
  useEffect(() => {
    if (!svgRef.current) return;
    const highlightSet = new Set(highlightIds || []);

    d3.select(svgRef.current).selectAll('.node-group')
      .select('circle')
      .attr('stroke-width', d => {
        if (d.id === selectedNodeId) return 3;
        if (highlightSet.size > 0 && highlightSet.has(d.id)) return 2.5;
        return 1.5;
      })
      .attr('stroke-opacity', d => {
        if (highlightSet.size === 0) return 1;
        return highlightSet.has(d.id) ? 1 : 0.2;
      })
      .attr('fill-opacity', d => {
        if (highlightSet.size === 0) return 1;
        return highlightSet.has(d.id) ? 1 : 0.15;
      })
      .attr('filter', d => highlightSet.has(d.id) ? `url(#glow-${d.id})` : null);

    d3.select(svgRef.current).selectAll('.edges line')
      .attr('stroke-opacity', d => {
        if (highlightSet.size === 0) return 0.3;
        const srcId = d.source?.id || d.source;
        const tgtId = d.target?.id || d.target;
        return highlightSet.has(srcId) && highlightSet.has(tgtId) ? 0.8 : 0.05;
      })
      .attr('stroke-width', d => {
        const srcId = d.source?.id || d.source;
        const tgtId = d.target?.id || d.target;
        return highlightSet.has(srcId) && highlightSet.has(tgtId) ? 2 : 0.8;
      });
  }, [highlightIds, selectedNodeId]);

  return (
    <svg
      ref={svgRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
}
