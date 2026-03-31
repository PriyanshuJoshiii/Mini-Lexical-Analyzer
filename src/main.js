import { Lexer } from './lexer.js';
import { buildLexerNFA } from './nfa.js';
import { NFAVisualizer } from './visualizer.js';

let defaultRules = [
  { type: 'KEYWORD', regex: 'int|float|if|else' },
  { type: 'IDENTIFIER', regex: '[a-zA-Z][a-zA-Z0-9]*' },
  { type: 'NUMBER', regex: '[0-9]+' },
  { type: 'OPERATOR', regex: '\\+|\\-|\\*|\\/|=' },
];

let rules = [...defaultRules];
let visualizer = null;

document.addEventListener('DOMContentLoaded', () => {
  visualizer = new NFAVisualizer('nfa-network');
  setupAntigravityBackground();
  renderRules();
  setupCodeEditor();
  setupResizer();
  
  document.getElementById('btn-add-rule').addEventListener('click', () => {
    rules.push({ type: 'NEW_TOKEN', regex: '...' });
    renderRules();
  });
  
  document.getElementById('btn-generate-tokens').addEventListener('click', generateTokens);
  document.getElementById('btn-generate-nfa').addEventListener('click', generateNFA);
  document.getElementById('btn-reset').addEventListener('click', () => {
    rules = JSON.parse(JSON.stringify(defaultRules)); // deep copy clone
    document.getElementById('code-input').value = 'int x = 10 + y;';
    document.getElementById('code-input').dispatchEvent(new Event('input'));
    document.getElementById('tokens-tbody').innerHTML = '<tr><td colspan="2" class="p-3 text-center text-gray-500 italic">No tokens generated yet.</td></tr>';
    if(visualizer.network) visualizer.network.destroy();
    renderRules();
  });
  
  document.getElementById('btn-fullscreen').addEventListener('click', () => {
    const nfaCard = document.getElementById('nfa-card');
    if (!document.fullscreenElement) {
      if (nfaCard.requestFullscreen) {
        nfaCard.requestFullscreen();
      } else if (nfaCard.webkitRequestFullscreen) {
        nfaCard.webkitRequestFullscreen();
      }
      nfaCard.classList.remove('rounded-2xl');
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  });

  document.addEventListener('fullscreenchange', () => {
    const nfaCard = document.getElementById('nfa-card');
    if (!document.fullscreenElement) {
      nfaCard.classList.add('rounded-2xl');
    }
  });
});

function setupCodeEditor() {
  const input = document.getElementById('code-input');
  const codeHighlight = document.getElementById('code-highlight');
  
  input.addEventListener('input', () => {
    let text = input.value;
    codeHighlight.textContent = text;
    Prism.highlightElement(codeHighlight);
  });
  
  const syncScroll = function (e) {
    const pre = codeHighlight.parentElement;
    pre.scrollTop = this.scrollTop;
    pre.scrollLeft = this.scrollLeft;
  };
  input.addEventListener('scroll', syncScroll);
  
  // trigger initial syntax highlight
  input.dispatchEvent(new Event('input'));
}

function renderRules() {
  const container = document.getElementById('rules-container');
  container.innerHTML = '';
  
  rules.forEach((rule, index) => {
    const ruleRow = document.createElement('div');
    ruleRow.className = 'flex items-center gap-2 md:gap-3 p-2.5 md:p-3 bg-zinc-900/50 border border-borderSubtle rounded-lg group hover:border-zinc-700 transition-colors duration-200';
    
    // Controls Container (Up/Down)
    const orderControls = document.createElement('div');
    orderControls.className = 'flex flex-col items-center gap-0.5 border-r border-zinc-800 pr-2 mr-1';
    
    const upBtn = document.createElement('button');
    upBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" /></svg>';
    upBtn.className = `p-0.5 rounded transition-colors ${index === 0 ? 'text-zinc-700 cursor-not-allowed' : 'text-zinc-500 hover:bg-zinc-700 hover:text-zinc-200'}`;
    upBtn.disabled = index === 0;
    upBtn.addEventListener('click', () => {
      if (index > 0) {
        const temp = rules[index];
        rules[index] = rules[index - 1];
        rules[index - 1] = temp;
        renderRules();
      }
    });
    
    const downBtn = document.createElement('button');
    downBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>';
    downBtn.className = `p-0.5 rounded transition-colors ${index === rules.length - 1 ? 'text-zinc-700 cursor-not-allowed' : 'text-zinc-500 hover:bg-zinc-700 hover:text-zinc-200'}`;
    downBtn.disabled = index === rules.length - 1;
    downBtn.addEventListener('click', () => {
      if (index < rules.length - 1) {
        const temp = rules[index];
        rules[index] = rules[index + 1];
        rules[index + 1] = temp;
        renderRules();
      }
    });

    orderControls.appendChild(upBtn);
    orderControls.appendChild(downBtn);

    // Type Input
    const typeInput = document.createElement('input');
    typeInput.type = 'text';
    typeInput.value = rule.type;
    typeInput.className = 'w-1/4 bg-transparent text-accentPrimary font-mono font-medium outline-none focus:border-b focus:border-accentPrimary text-sm transition-colors';
    typeInput.addEventListener('change', (e) => rule.type = e.target.value);
    
    // Regex Input
    const regexInput = document.createElement('input');
    regexInput.type = 'text';
    regexInput.value = rule.regex;
    regexInput.className = 'flex-1 bg-transparent text-zinc-300 font-mono outline-none border-b border-transparent focus:border-zinc-500 text-sm transition-colors';
    regexInput.addEventListener('change', (e) => rule.regex = e.target.value);
    
    // Remove Btn
    const removeBtn = document.createElement('button');
    removeBtn.innerHTML = '&times;';
    removeBtn.className = 'text-zinc-500 font-light text-xl px-2 hover:bg-red-500/10 hover:text-red-400 rounded transition-colors bg-zinc-800/50 ml-1 border border-zinc-700/50';
    removeBtn.addEventListener('click', () => {
      rules.splice(index, 1);
      renderRules();
    });
    
    ruleRow.appendChild(orderControls);
    ruleRow.appendChild(typeInput);
    ruleRow.appendChild(document.createTextNode('→'));
    ruleRow.appendChild(regexInput);
    ruleRow.appendChild(removeBtn);
    container.appendChild(ruleRow);
  });
}

let isAnimatingTokens = false;

async function generateTokens() {
  if (isAnimatingTokens) return;
  const inputStr = document.getElementById('code-input').value;
  try {
    const lexer = new Lexer(rules);
    const tokens = lexer.tokenize(inputStr);
    
    if (tokens.length > 0) {
      isAnimatingTokens = true;
      try { await playTokenAnimation(tokens); } catch(e) { console.error(e); }
      isAnimatingTokens = false;
    }
    
    const tbody = document.getElementById('tokens-tbody');
    tbody.innerHTML = '';
    
    const badge = document.getElementById('token-count-badge');
    if(badge) {
      badge.textContent = `${tokens.length} token${tokens.length === 1 ? '' : 's'}`;
      badge.classList.remove('hidden');
    }
    
    if(tokens.length === 0) {
      tbody.innerHTML = '<tr><td colspan="2" class="p-4 text-center text-zinc-500 text-sm italic">No output.</td></tr>';
      return;
    }
    
    tokens.forEach(tok => {
      const tr = document.createElement('tr');
      // hover effects on table row
      tr.className = 'hover:bg-zinc-800/50 transition-colors duration-200 cursor-default group';
      
      let colorClass = 'text-zinc-300';
      if(tok.type === 'KEYWORD') colorClass = 'text-pink-400 font-medium';
      else if(tok.type === 'IDENTIFIER') colorClass = 'text-zinc-200';
      else if(tok.type.includes('UNKNOWN')) colorClass = 'text-red-400 font-medium';
      else if(tok.type === 'NUMBER') colorClass = 'text-amber-400';
      else if(tok.type === 'OPERATOR') colorClass = 'text-sky-400';

      tr.innerHTML = `
        <td class="px-4 py-2.5 ${colorClass} whitespace-nowrap text-sm">
          ${tok.type.includes('UNKNOWN') ? `<span class="bg-red-950/40 px-1.5 py-0.5 rounded text-xs border border-red-900/50 mr-1">!</span>${tok.type}` : tok.type}
        </td>
        <td class="px-4 py-2.5 text-zinc-300 font-mono text-sm">
          <span class="bg-zinc-800/80 px-2 py-1.5 rounded-md border border-zinc-700/50 inline-block">${tok.value}</span>
        </td>
      `;
      
      tr.addEventListener('mouseenter', () => {
        if(visualizer && visualizer.network && tok.type !== 'UNKNOWN') {
          visualizer.animatePath(tok.type, tok.value);
        }
      });
      tr.addEventListener('mouseleave', () => {
        if(visualizer && visualizer.network && tok.type !== 'UNKNOWN') {
          visualizer.resetHighlight();
        }
      });

      tbody.appendChild(tr);
    });
  } catch (err) {
    alert("Error Tokenizing! Ensure your Regex Rules are valid Native JS regex (no anchors ^ or $ required).");
    console.error(err);
  }
}

function generateNFA() {
  const loader = document.getElementById('nfa-loading');
  loader.classList.remove('hidden');
  
  // Simulate delay for awesome UI effect
  setTimeout(() => {
    try {
      const nfaData = buildLexerNFA(rules);
      visualizer.draw(nfaData);
    } catch (err) {
      alert("Error building NFA from Regex! Check regex syntax.");
      console.error(err);
    } finally {
      loader.classList.add('hidden');
    }
  }, 500);
}

function setupResizer() {
  const resizer = document.getElementById('resizer');
  const leftPanel = document.getElementById('left-panel');
  const mainContainer = leftPanel.parentElement;
  
  let isResizing = false;
  
  resizer.addEventListener('mousedown', (e) => {
    isResizing = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;

    const containerRect = mainContainer.getBoundingClientRect();
    let newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    
    if (newWidth < 20) newWidth = 20;
    if (newWidth > 80) newWidth = 80;
    
    leftPanel.style.flex = 'none';
    leftPanel.style.width = `calc(${newWidth}% - 12px)`;
  });
  
  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      
      // Allow vis.js to resize its canvas
      if (visualizer && visualizer.network) {
         setTimeout(() => {
           visualizer.network.redraw();
         }, 50);
      }
    }
  });

  // Vertical Resizer Logic
  const resizerV = document.getElementById('resizer-v');
  const nfaCard = document.getElementById('nfa-card');
  const rightPanel = document.getElementById('right-panel');
  
  let isResizingV = false;
  
  if (resizerV) {
    resizerV.addEventListener('mousedown', (e) => {
      e.preventDefault();
      isResizingV = true;
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isResizingV) return;
      
      const rightPanelRect = rightPanel.getBoundingClientRect();
      const newHeight = e.clientY - rightPanelRect.top;
      
      const minHeight = 200;
      const maxHeight = rightPanelRect.height - 150; // Leave space for token output
      
      let finalHeight = newHeight;
      if (finalHeight < minHeight) finalHeight = minHeight;
      if (finalHeight > maxHeight) finalHeight = maxHeight;
      
      nfaCard.style.flex = `0 0 ${finalHeight}px`;
      nfaCard.style.height = `${finalHeight}px`;
    });
    
    document.addEventListener('mouseup', () => {
      if (isResizingV) {
        isResizingV = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        
        if (visualizer && visualizer.network) {
           setTimeout(() => {
             visualizer.network.redraw();
           }, 50);
        }
      }
    });
  }
}

function setupAntigravityBackground() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  let width, height;
  const particles = [];
  const particleCount = 150;
  
  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
  }
  
  window.addEventListener('resize', resize);
  resize();
  
  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.5 + 0.5,
      speedY: -(Math.random() * 0.4 + 0.1), // floating upwards slowly
      speedX: (Math.random() - 0.5) * 0.2, // slight horizontal drift
      opacity: Math.random() * 0.5 + 0.1,
      fadeSpeed: (Math.random() - 0.5) * 0.01,
      color: Math.random() > 0.8 ? '125, 211, 252' : '200, 200, 220' // sky blue or soft white
    });
  }
  
  function render() {
    ctx.clearRect(0, 0, width, height);
    
    particles.forEach(p => {
      p.y += p.speedY;
      p.x += p.speedX;
      
      p.opacity += p.fadeSpeed;
      if (p.opacity <= 0.1 || p.opacity >= 0.8) p.fadeSpeed *= -1;
      
      if (p.y < -10) p.y = height + 10;
      if (p.x < -10) p.x = width + 10;
      if (p.x > width + 10) p.x = -10;
      
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color}, ${Math.max(0, p.opacity)})`;
      ctx.fill();
    });
    
    requestAnimationFrame(render);
  }
  
  render();
}

async function playTokenAnimation(tokens) {
  return new Promise((resolve) => {
    const overlay = document.getElementById('token-anim-overlay');
    const container = document.getElementById('token-anim-container');
    
    const displayTokens = tokens.slice(0, 100); // Increased Max to 100
    container.innerHTML = '';
    
    // Dynamic scaling for large token counts
    const isMany = displayTokens.length > 20;
    const baseDelay = 300; // 0.3 seconds per token recognition
    
    container.className = isMany
      ? 'flex flex-wrap justify-center gap-2 md:gap-3 text-sm md:text-xl font-mono text-zinc-300 max-h-[60vh] overflow-y-auto px-2 w-full custom-scrollbar content-start'
      : 'flex flex-wrap justify-center gap-4 md:gap-6 text-2xl md:text-5xl font-mono text-zinc-300';
    
    displayTokens.forEach(tok => {
      const span = document.createElement('span');
      span.textContent = tok.value;
      span.className = 'transition-all duration-300 transform inline-flex flex-col items-center justify-center mx-0.5 md:mx-1';
      container.appendChild(span);
    });
    
    overlay.classList.remove('hidden');
    requestAnimationFrame(() => {
      overlay.classList.remove('opacity-0');
      overlay.classList.add('opacity-100');
    });
    
    setTimeout(() => {
      const spans = container.children;
      let delay = 0;
      
      for(let i=0; i < displayTokens.length; i++) {
        setTimeout(() => {
          const span = spans[i];
          const tok = displayTokens[i];
          
          let colorClass = 'text-zinc-300 border-zinc-700 bg-zinc-800 shadow-[0_0_15px_rgba(161,161,170,0.2)]';
          let labelColor = 'text-zinc-500';
          
          if(tok.type === 'KEYWORD') {
             colorClass = 'text-pink-400 border-pink-500/50 bg-pink-500/10 shadow-[0_0_20px_rgba(244,114,182,0.4)]';
             labelColor = 'text-pink-400';
          }
          else if(tok.type === 'IDENTIFIER') {
             colorClass = 'text-zinc-100 border-zinc-600 bg-zinc-800/80 shadow-[0_0_15px_rgba(244,244,245,0.2)]';
             labelColor = 'text-zinc-400';
          }
          else if(tok.type === 'NUMBER') {
             colorClass = 'text-amber-400 border-amber-500/50 bg-amber-500/10 shadow-[0_0_20px_rgba(251,191,36,0.4)]';
             labelColor = 'text-amber-400';
          }
          else if(tok.type === 'OPERATOR') {
             colorClass = 'text-sky-400 border-sky-500/50 bg-sky-500/10 shadow-[0_0_20px_rgba(56,189,248,0.4)]';
             labelColor = 'text-sky-400';
          }
          
          const paddingClass = isMany ? 'px-2 py-1 md:px-3 md:py-1.5 rounded-lg' : 'px-3 py-1.5 md:px-5 md:py-3 rounded-xl';
          const titleSize = isMany ? 'text-[8px] md:text-[10px] mb-1.5' : 'text-[10px] md:text-xs mb-3';
          
          span.innerHTML = `
            <span class="${titleSize} font-bold tracking-widest uppercase ${labelColor} opacity-0 animate-fade-in-up">${tok.type}</span>
            <span class="${paddingClass} border ${colorClass} transition-all duration-300 transform scale-110">${tok.value}</span>
          `;
          
          span.classList.add('scale-110');
          setTimeout(()=> span.classList.remove('scale-110'), 250);
          
          // Auto-scroll logic so the newly animated token is visible!
          if (isMany && i % 5 === 0) {
            span.scrollIntoView({ behavior: 'smooth', block: 'end' });
          }
          
        }, delay);
        delay += baseDelay;
      }
      
      setTimeout(() => {
        overlay.classList.remove('opacity-100');
        overlay.classList.add('opacity-0');
        setTimeout(() => {
          overlay.classList.add('hidden');
          resolve();
        }, 500); 
      }, delay + 1000);
      
    }, 400); 
  });
}
