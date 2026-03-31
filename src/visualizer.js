import { Network } from 'vis-network';
import { findPath } from './nfa.js';

export class NFAVisualizer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.network = null;
    this.currentAnimation = 0;
    
    this.options = {
      nodes: {
        shape: 'circle',
        size: 30,
        font: {
          color: '#e4e4e7',
          face: 'monospace'
        },
        borderWidth: 2,
        color: {
          border: '#3f3f46',
          background: '#18181b',
          highlight: { border: '#3b82f6', background: '#27272a' },
          hover: { border: '#3b82f6', background: '#27272a' }
        }
      },
      edges: {
        font: {
          color: '#a1a1aa',
          size: 13,
          align: 'horizontal',
          background: 'transparent',
          strokeWidth: 0
        },
        color: {
          color: '#52525b',
          highlight: '#3b82f6',
          hover: '#3b82f6'
        },
        arrows: {
          to: { enabled: true, scaleFactor: 0.8 }
        },
        smooth: {
          type: 'curvedCW',
          roundness: 0.2
        }
      },
      layout: {
        randomSeed: 42 // Ensures the graph renders the exact same layout every time
      },
      physics: {
        enabled: true,
        barnesHut: {
          gravitationalConstant: -2000,
          centralGravity: 0.3,
          springLength: 95,
          springConstant: 0.04,
          damping: 0.09,
          avoidOverlap: 0.1
        },
        stabilization: {
          iterations: 150
        }
      },
      interaction: {
        hover: true,
        tooltipDelay: 100,
        zoomView: true,
        dragView: true
      }
    };
  }

  draw(nfaData) {
    if (!nfaData || !nfaData.start) return;

    this.nfaData = nfaData;
    const { start, acceptStatesMap } = nfaData;
    
    const nodesMap = new Map();
    const edgesArray = [];
    const visited = new Set();
    const queue = [start];

    // BFS to build graph
    while (queue.length > 0) {
      const state = queue.shift();
      if (visited.has(state.id)) continue;
      visited.add(state.id);

      // Node config
      let nodeColor = { border: '#3f3f46', background: '#18181b' };
      let borderWidth = 2;
      let title = `State ${state.id}`;
      let shadow = false;

      if (state.id === start.id) {
        nodeColor = { border: '#3b82f6', background: '#1e3a8a' }; // Blue Start
        borderWidth = 3;
        shadow = { enabled: true, color: 'rgba(59, 130, 246, 0.6)', size: 10, x: 0, y: 0 };
        title = `Start State`;
      } else if (acceptStatesMap && acceptStatesMap.has(state.id)) {
        nodeColor = { border: '#10b981', background: '#022c22' }; // Emerald Accept
        borderWidth = 4;
        shadow = { enabled: true, color: 'rgba(16, 185, 129, 0.8)', size: 15, x: 0, y: 0 };
        title = `Accept: ${acceptStatesMap.get(state.id)}`;
      }

      const isAccept = title.includes('Accept');
      
      nodesMap.set(state.id, {
        id: state.id,
        label: isAccept ? acceptStatesMap.get(state.id) : `q${state.id}`,
        keyNodeType: title, // use internal property to keep track of type
        color: nodeColor,
        borderWidth: borderWidth,
        shadow: shadow,
        font: isAccept ? { color: '#34d399', size: 14, face: 'JetBrains Mono', bold: true } : { color: '#e4e4e7' }
      });

      // Epsilon transitions
      for (const nextState of state.epsilonTransitions) {
        edgesArray.push({
          id: `e_${state.id}_${nextState.id}_eps`,
          from: state.id,
          to: nextState.id,
          label: 'ε',
          color: { color: '#a855f7' }, // Purple for epsilon
          font: { color: '#c084fc' },
          dashes: true
        });
        if (!visited.has(nextState.id)) queue.push(nextState);
      }

      // Symbol transitions
      for (const symbol in state.transitions) {
        for (const nextState of state.transitions[symbol]) {
          edgesArray.push({
            id: `e_${state.id}_${nextState.id}_${symbol}`,
            from: state.id,
            to: nextState.id,
            label: symbol,
            color: { color: '#0ea5e9' }, // Cyan/Blue for normal transitions
            font: { color: '#7dd3fc' }
          });
          if (!visited.has(nextState.id)) queue.push(nextState);
        }
      }
    }

    // Add floating labels for each rule cluster
    if (nfaData.rulePaths) {
      for (const [type, data] of Object.entries(nfaData.rulePaths)) {
        const labelNodeId = `label_${type}`;
        nodesMap.set(labelNodeId, {
          id: labelNodeId,
          label: `${type} → ${data.regex}`,
          shape: 'text',
          font: { size: 12, color: '#a1a1aa', face: 'JetBrains Mono', background: 'transparent' },
          margin: 10
        });
        
        // Invisible edge to anchor it near the start node of the rule
        edgesArray.push({
          id: `e_label_${type}_${data.startId}`,
          from: labelNodeId,
          to: data.startId,
          color: { color: 'transparent', highlight: 'transparent', hover: 'transparent' },
          length: 40,
          arrows: { to: { enabled: false } }, // no arrow on invisible edge
          physics: true
        });
      }
    }

    const data = {
      nodes: Array.from(nodesMap.values()),
      edges: edgesArray
    };
    
    // Save base copies for restoring later
    this.baseNodes = JSON.parse(JSON.stringify(data.nodes));
    this.baseEdges = JSON.parse(JSON.stringify(data.edges));

    if (this.network) {
      this.network.destroy();
    }
    
    this.network = new Network(this.container, data, this.options);
    
    // Clear any inline styles that were breaking the canvas
    this.container.style.width = '100%';
    this.container.style.height = '100%';
    
    this.network.on("stabilizationIterationsDone", () => {
        this.network.setOptions({ physics: false });
    });
  }

  highlightRule(type) {
    if (!this.nfaData || !this.nfaData.rulePaths || !this.nfaData.rulePaths[type]) return;
    if (!this.baseNodes || !this.baseEdges || !this.network) return;
    
    const path = this.nfaData.rulePaths[type];
    const allowedNodes = new Set(path.nodes);
    allowedNodes.add(this.nfaData.start.id); // Master start
    allowedNodes.add(`label_${type}`);
    
    const positions = this.network.getPositions();
    
    const newNodes = this.baseNodes.map(n => {
      let node = { ...n, x: positions[n.id]?.x, y: positions[n.id]?.y };
      const isAcceptOrStart = n.keyNodeType && (n.keyNodeType.includes('Accept') || n.keyNodeType.includes('Start'));
      
      if (!allowedNodes.has(n.id)) {
        if (typeof n.id === 'string' && n.id.startsWith('label_')) {
          node.font = { color: '#333333' }; // dim the text significantly
        } else {
          node.color = { border: '#333333', background: '#111111' };
          node.font = { color: '#555555' };
          if (isAcceptOrStart) node.shadow = false; // Remove glow when dimmed
        }
      } else if (n.id === `label_${type}`) {
          // Highlight the active label
          node.font = { color: '#ffffff', size: 14 };
      }
      return node;
    });
    
    const newEdges = this.baseEdges.map(e => {
      let edge = { ...e };
      if (!allowedNodes.has(e.to) || !allowedNodes.has(e.from)) {
        edge.color = { color: '#222222' };
        edge.font = { color: '#222222', background: 'transparent' };
      }
      return edge;
    });
    
    this.network.setOptions({ physics: { enabled: false } });
    this.network.setData({ nodes: newNodes, edges: newEdges });
  }

  async animatePath(type, tokenValue) {
    const animId = ++this.currentAnimation;
    if (!this.nfaData || !this.nfaData.start || !this.baseNodes || !this.baseEdges || !this.network) return;
    
    const pathArr = findPath(this.nfaData.start, this.nfaData.acceptStatesMap, type, tokenValue);
    if (!pathArr) {
       console.warn("Could not find NFA traverse path for", tokenValue);
       return;
    }

    // Stop any ongoing physics to prevent layout jumps
    this.network.setOptions({ physics: { enabled: false } });

    // Dim graph using bulk partial updates
    let nodeUpdates = this.baseNodes.map(n => {
      let nodeUpdate = { id: n.id, shadow: false };
      if (typeof n.id === 'string' && n.id.startsWith('label_')) {
          nodeUpdate.font = { ...n.font, color: n.id === `label_${type}` ? '#ffffff' : '#333333' };
      } else {
          nodeUpdate.color = { border: '#333333', background: '#111111' };
          nodeUpdate.font = { color: '#555555' };
      }
      return nodeUpdate;
    });
    let edgeUpdates = this.baseEdges.map(e => ({ id: e.id, color: { color: '#222222' }, font: { color: 'transparent' } }));
    
    // Dataset.update allows modifying precise properties blazingly fast without full redraw
    this.network.body.data.nodes.update(nodeUpdates);
    this.network.body.data.edges.update(edgeUpdates);
    
    const delay = ms => new Promise(res => setTimeout(res, ms));

    // highlight master start node
    const highlightNode = async (id) => {
        if (this.currentAnimation !== animId) return;
        this.network.body.data.nodes.update({
            id: id,
            color: { border: '#eab308', background: '#713f12' }, 
            shadow: { enabled: true, color: 'rgba(234, 179, 8, 0.8)', size: 15 },
            font: { color: '#fef08a', size: 14, bold: true }
        });
        await delay(150);
    };
    
    await highlightNode(this.nfaData.start.id);
    
    for (const step of pathArr) {
        if (this.currentAnimation !== animId) return;
        
        const edgeId = step.label === 'ε' 
             ? `e_${step.from}_${step.to}_eps`
             : `e_${step.from}_${step.to}_${step.label}`;
             
        this.network.body.data.edges.update({
            id: edgeId,
            color: { color: '#fef08a' }, width: 3,
            font: { color: '#fef08a', size: 14, background: '#111111' }
        });
        await delay(100);
        
        await highlightNode(step.to);
    }
  }

  resetHighlight() {
    this.currentAnimation++; // cancel any ongoing animation
    if (!this.baseNodes || !this.baseEdges || !this.network) return;
    
    // Restore exact base values instantly using Dataset.update
    this.network.body.data.nodes.update(this.baseNodes);
    this.network.body.data.edges.update(this.baseEdges);
  }
}
