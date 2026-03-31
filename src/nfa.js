let stateCounter = 0;

export class State {
  constructor() {
    this.id = stateCounter++;
    this.transitions = {}; // symbol -> array of states
    this.epsilonTransitions = []; // array of states
  }

  addTransition(symbol, state) {
    if (!this.transitions[symbol]) {
      this.transitions[symbol] = [];
    }
    this.transitions[symbol].push(state);
  }

  addEpsilon(state) {
    this.epsilonTransitions.push(state);
  }
}

export class NFA {
  constructor(start, accept) {
    this.start = start;
    this.accept = accept; // Single accept state for sub-NFAs
  }
}

// Tokenize the regex into basic units: characters, escaped chars, character classes, operators
function tokenizeRegex(str) {
  const tokens = [];
  let i = 0;
  while (i < str.length) {
    const char = str[i];
    if (char === '\\') { // Escape sequence
      tokens.push(str.substring(i, i + 2));
      i += 2;
    } else if (char === '[') { // Character class
      let j = i;
      while (j < str.length && str[j] !== ']') j++;
      if (j < str.length) {
        tokens.push(str.substring(i, j + 1));
        i = j + 1;
      } else {
        // Unclosed class -> fallback
        tokens.push('[');
        i++;
      }
    } else {
      tokens.push(char);
      i++;
    }
  }
  return tokens;
}

// Insert explicit concatenation operator '.'
// Concat is needed between T1 and T2 if:
// T1 is literal, class, *, +, ?, )
// T2 is literal, class, (
function insertExplicitConcat(tokens) {
  const output = [];
  for (let i = 0; i < tokens.length; i++) {
    const t1 = tokens[i];
    output.push(t1);
    if (i < tokens.length - 1) {
      const t2 = tokens[i + 1];
      const t1IsOperandOrPostfix = !['|', '(', '.'].includes(t1);
      const t2IsOperandOrPrefix = !['|', '*', '+', '?', ')', '.'].includes(t2);
      
      if (t1IsOperandOrPostfix && t2IsOperandOrPrefix) {
        output.push('.');
      }
    }
  }
  return output;
}

// Convert Infix to Postfix using Shunting Yard
function infixToPostfix(tokens) {
  const precedence = {
    '|': 1,
    '.': 2,
    '*': 3,
    '+': 3,
    '?': 3
  };
  const output = [];
  const stack = [];

  for (const token of tokens) {
    if (token === '(') {
      stack.push(token);
    } else if (token === ')') {
      while (stack.length > 0 && stack[stack.length - 1] !== '(') {
        output.push(stack.pop());
      }
      stack.pop(); // pop '('
    } else if (['*', '+', '?', '|', '.'].includes(token)) {
      while (stack.length > 0 && stack[stack.length - 1] !== '(' && precedence[stack[stack.length - 1]] >= precedence[token]) {
        output.push(stack.pop());
      }
      stack.push(token);
    } else {
      // Literal / Class
      output.push(token);
    }
  }
  while (stack.length > 0) {
    output.push(stack.pop());
  }
  return output;
}

// Build NFA from postfix notation (Thompson Construction)
export function buildNFAFromRegex(regexStr) {
  try {
    const tokens = tokenizeRegex(regexStr);
    const withConcat = insertExplicitConcat(tokens);
    const postfix = infixToPostfix(withConcat);
    
    // empty regex
    if (postfix.length === 0) {
       const start = new State();
       const accept = new State();
       start.addEpsilon(accept);
       return new NFA(start, accept);
    }

    const stack = [];
    
    for (const token of postfix) {
      if (token === '.') {
        const right = stack.pop();
        const left = stack.pop();
        // left accept state transitions to right start state via epsilon
        left.accept.addEpsilon(right.start);
        stack.push(new NFA(left.start, right.accept));
      } else if (token === '|') {
        const right = stack.pop();
        const left = stack.pop();
        const start = new State();
        const accept = new State();
        start.addEpsilon(left.start);
        start.addEpsilon(right.start);
        left.accept.addEpsilon(accept);
        right.accept.addEpsilon(accept);
        stack.push(new NFA(start, accept));
      } else if (token === '*') {
        const nfa = stack.pop();
        const start = new State();
        const accept = new State();
        start.addEpsilon(nfa.start);
        start.addEpsilon(accept);
        nfa.accept.addEpsilon(nfa.start);
        nfa.accept.addEpsilon(accept);
        stack.push(new NFA(start, accept));
      } else if (token === '+') {
        const nfa = stack.pop();
        const start = new State();
        const accept = new State();
        start.addEpsilon(nfa.start);
        nfa.accept.addEpsilon(nfa.start);
        nfa.accept.addEpsilon(accept);
        stack.push(new NFA(start, accept));
      } else if (token === '?') {
        const nfa = stack.pop();
        const start = new State();
        const accept = new State();
        start.addEpsilon(nfa.start);
        start.addEpsilon(accept);
        nfa.accept.addEpsilon(accept);
        stack.push(new NFA(start, accept));
      } else {
        // Literal or Char Class
        const start = new State();
        const accept = new State();
        start.addTransition(token, accept);
        stack.push(new NFA(start, accept));
      }
    }
    return stack.pop();
  } catch (error) {
    console.error("Regex parsing error: ", error);
    // return an empty NFA
    const st = new State();
    return new NFA(st, st);
  }
}

// Build standard Master Lexer NFA that runs all rules
export function buildLexerNFA(rules) {
  stateCounter = 0; // reset
  const masterStart = new State();
  const acceptStatesMap = new Map(); // State -> Rule Type
  const rulePaths = {}; // Rule Type -> { nodes: Array of state IDs }

  const subNFAs = rules.map(rule => {
      const startId = stateCounter;
      const nfa = buildNFAFromRegex(rule.regex);
      const endId = stateCounter - 1;
      
      masterStart.addEpsilon(nfa.start);
      acceptStatesMap.set(nfa.accept.id, rule.type);
      
      const nodes = [];
      for(let i = startId; i <= endId; i++) nodes.push(i);
      
      rulePaths[rule.type] = {
        nodes: nodes,
        startId: nfa.start.id,
        regex: rule.regex
      };
      
      return nfa;
  });

  return {
    start: masterStart,
    acceptStatesMap: acceptStatesMap,
    rulePaths: rulePaths
  };
}

// Find absolute NFA path for a specific token sequence matching
export function findPath(startState, acceptStatesMap, targetType, tokenValue) {
  const visited = new Set();
  
  function dfs(currentState, charIndex, path) {
    if (charIndex === tokenValue.length) {
      if (acceptStatesMap.get(currentState.id) === targetType) {
        return path;
      }
    }

    const stateKey = `${currentState.id}-${charIndex}`;
    if (visited.has(stateKey)) return null;
    visited.add(stateKey);

    // Try epsilon transitions
    for (const nextState of currentState.epsilonTransitions) {
      path.push({ from: currentState.id, label: 'ε', to: nextState.id });
      const res = dfs(nextState, charIndex, path);
      if (res) return res;
      path.pop();
    }

    // Try symbol transitions
    if (charIndex < tokenValue.length) {
      const char = tokenValue[charIndex];
      for (const symbol in currentState.transitions) {
        try {
          const regex = new RegExp(`^${symbol}$`);
          if (regex.test(char)) {
            for (const nextState of currentState.transitions[symbol]) {
              path.push({ from: currentState.id, label: symbol, to: nextState.id });
              const res = dfs(nextState, charIndex + 1, path);
              if (res) return res;
              path.pop();
            }
          }
        } catch(e) { /* ignore invalid regex symbol tests quietly */ }
      }
    }
    
    // Do not delete visited (memoize failures) to prevent exponential explosion/infinite loops
    return null;
  }
  
  // Clone the path array directly out of the DFS
  const result = dfs(startState, 0, []);
  return result ? [...result] : null;
}
