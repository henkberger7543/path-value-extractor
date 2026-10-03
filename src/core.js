/**
 * Core path-resolution logic.
 *
 * We deliberately implement our own tiny tokenizer for the bracket
 * segment syntax rather than reaching for a regular expression that
 * simultaneously parses both `.` and `[]` forms. A combined regex is
 * easy to write, hard to read, and very hard to extend when you want
 * to support quoted keys. The character-by-character scan is about
 * the same length and every branch has an obvious meaning.
 */

/**
 * @typedef {{ value: unknown, exists: boolean }} ExtractResult
 */

/**
 * The single characters that may start a quoted bracket key.
 * Kept as a constant so the scanner and any future validation share
 * one source of truth.
 */
const QUOTE_CHARS = new Set(["'", '"']);

/**
 * @param {string} pathStr
 * @returns {string[]}
 */
export function parsePath(pathStr) {
  const segments = [];
  let i = 0;
  const len = pathStr.length;

  while (i < len) {
    const ch = pathStr[i];

    if (ch === '[') {
      i++;
      if (i >= len) {
        throw new SyntaxError('Unterminated bracket at end of path');
      }

      const closer = pathStr[i];

      if (QUOTE_CHARS.has(closer)) {
        // Quoted form: ['key'] or ["key"].
        i++;
        let key = '';
        let escaped = false;
        for (; i < len; i++) {
          const c = pathStr[i];
          if (escaped) {
            key += c;
            escaped = false;
            continue;
          }
          if (c === '\\') {
            escaped = true;
            continue;
          }
          if (c === closer) {
            i++;
            break;
          }
          key += c;
        }
        if (i >= len) {
          throw new SyntaxError('Unterminated quoted bracket');
        }
        if (pathStr[i] !== ']') {
          throw new SyntaxError('Expected ] after quoted bracket key');
        }
        i++;
        segments.push(key);
      } else if (closer === ']') {
        // Empty bracket: []. We treat this as a request for the whole
        // container — e.g. `a[]` returns the array a. There is no key
        // to push, so we emit a sentinel that the walker recognises.
        i++;
        segments.push({ all: true });
      } else {
        // Numeric or bareword form: [0] or [foo].
        let key = '';
        for (; i < len; i++) {
          const c = pathStr[i];
          if (c === ']') {
            i++;
            break;
          }
          key += c;
        }
        if (i > len || pathStr[i - 1] !== ']') {
          throw new SyntaxError('Unterminated bracket');
        }
        if (key.length === 0) {
          throw new SyntaxError('Empty unquoted bracket key');
        }
        segments.push(key);
      }
    } else {
      // Dot segment.
      let dot = false;
      if (ch === '.') {
        dot = true;
        i++;
      }
      let key = '';
      for (; i < len; i++) {
        const c = pathStr[i];
        if (c === '.' || c === '[') {
          break;
        }
        key += c;
      }
      if (dot && key.length === 0) {
        throw new SyntaxError('Empty dot segment');
      }
      if (dot || key.length > 0) {
        segments.push(key);
      }
    }
  }

  return segments;
}

/**
 * @param {string} pathStr
 * @param {unknown} root
 * @returns {ExtractResult}
 */
export function extractValue(pathStr, root) {
  if (typeof pathStr !== 'string') {
    throw new TypeError('path must be a string');
  }

  let segments;
  try {
    segments = parsePath(pathStr);
  } catch (e) {
    if (e instanceof SyntaxError) {
      return { value: undefined, exists: false };
    }
    throw e;
  }

  let current = root;
  for (const seg of segments) {
    if (seg && typeof seg === 'object' && seg.all === true) {
      continue;
    }

    if (current === null || typeof current !== 'object') {
      return { value: undefined, exists: false };
    }

    const key = /** @type {string} */ (seg);
    if (!(key in current)) {
      return { value: undefined, exists: false };
    }

    current = current[key];
  }

  return { value: current, exists: true };
}
