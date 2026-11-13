// Evaluates what people type into the editor's size inputs, such as "1920 / 2"
// or "(640 + 20) * 2": numbers, + - * /, signs and parentheses. A number or
// group right before "(" multiplies it, so "2(3 + 1)" is 8.
// Returns undefined for anything else and for results that aren't finite.

// The inputs hold a few characters; the cap keeps the recursion shallow.
const maxInputLength = 100;

const numberPattern = /^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;
const tokenPattern = /(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|\S/gi;

export const evaluateArithmetic = (text: string): number | undefined => {
  if (text.length > maxInputLength) {
    return undefined;
  }

  const tokens = text.match(tokenPattern) ?? [];
  let position = 0;

  // Invalid input turns into NaN, which carries through every operation.
  const parseFactor = (): number => {
    const token = tokens[position];
    position += 1;

    if (token === '+') {
      return parseFactor();
    }

    if (token === '-') {
      return -parseFactor();
    }

    if (token === '(') {
      const value = parseExpression();
      const closing = tokens[position];
      position += 1;
      return closing === ')' ? value : NaN;
    }

    return token !== undefined && numberPattern.test(token) ? Number(token) : NaN;
  };

  const parseTerm = (): number => {
    let value = parseFactor();

    while (position < tokens.length) {
      const token = tokens[position];

      if (token === '*' || token === '/') {
        position += 1;
        const factor = parseFactor();
        value = token === '*' ? value * factor : value / factor;
      } else if (token === '(') {
        value *= parseFactor();
      } else {
        break;
      }
    }

    return value;
  };

  const parseExpression = (): number => {
    let value = parseTerm();

    while (position < tokens.length) {
      const token = tokens[position];

      if (token !== '+' && token !== '-') {
        break;
      }

      position += 1;
      const term = parseTerm();
      value = token === '+' ? value + term : value - term;
    }

    return value;
  };

  const value = parseExpression();
  return position === tokens.length && Number.isFinite(value) ? value : undefined;
};
