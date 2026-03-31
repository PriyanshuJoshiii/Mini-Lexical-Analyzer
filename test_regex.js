import { buildLexerNFA } from './src/nfa.js';
import { Lexer } from './src/lexer.js';

const rules = [
  { type: 'HEADER', regex: '#include\\s*<[^>]+>' },
  { type: 'KEYWORD', regex: 'int|return' },
  { type: 'IDENTIFIER', regex: '[a-zA-Z_][a-zA-Z0-9_]*' },
  { type: 'STRING', regex: '"[^"]*"' },
  { type: 'NUMBER', regex: '\\d+' },
  { type: 'OPERATOR', regex: '[=+]' },
  { type: 'DELIMITER', regex: '[(){};,<>]' }
];

try {
  console.log("Building NFA...");
  const nfaData = buildLexerNFA(rules);
  console.log("Success! Master Start ID:", nfaData.start.id);
  console.log("Total rule paths:", Object.keys(nfaData.rulePaths).length);
} catch (e) {
  console.error("ERROR GENERATING NFA:");
  console.error(e.stack);
}
