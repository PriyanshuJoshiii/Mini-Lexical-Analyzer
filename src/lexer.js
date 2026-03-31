class Token {
  constructor(type, value, start, end) {
    this.type = type;
    this.value = value;
    this.start = start;
    this.end = end;
  }
}

export class Lexer {
  constructor(rules) {
    // rules is an array of { type: string, regex: string }
    this.rules = rules.map(rule => {
      // Create native RegExp for each rule.
      // Must enforce matching from the beginning of the remaining string.
      return {
        type: rule.type,
        // Wrap in ^ to ensure we only match at current index, and capture the whole match
        regex: new RegExp(`^(${rule.regex})`)
      };
    });
  }

  tokenize(input) {
    const tokens = [];
    let currentIdx = 0;

    while (currentIdx < input.length) {
      // Skip whitespace
      const wsMatch = /^\s+/.exec(input.slice(currentIdx));
      if (wsMatch) {
        currentIdx += wsMatch[0].length;
        continue;
      }

      if (currentIdx >= input.length) break;

      let matched = false;

      // Try rules in order
      for (const rule of this.rules) {
        const match = rule.regex.exec(input.slice(currentIdx));
        if (match) {
          const value = match[0];
          tokens.push(new Token(rule.type, value, currentIdx, currentIdx + value.length));
          currentIdx += value.length;
          matched = true;
          break;
        }
      }

      if (!matched) {
        // Unrecognized token
        tokens.push(new Token('UNKNOWN', input[currentIdx], currentIdx, currentIdx + 1));
        currentIdx++;
      }
    }

    return tokens;
  }
}
