/**
 * Translates chord notation from English (A-G) to Portuguese (Dó, Ré, Mi, Fá, Sol, Lá, Si)
 * Keeps all modifiers: #, b, m, 7, maj, sus, dim, aug, add, etc.
 * Example: Am7 -> Lám7, G#m -> Sol#m, Bb -> Sib
 */

const NOTE_MAP = {
  'C': 'Dó',
  'D': 'Ré',
  'E': 'Mi',
  'F': 'Fá',
  'G': 'Sol',
  'A': 'Lá',
  'B': 'Si',
};

/**
 * Translates a single chord name (e.g. "Am7" -> "Lám7")
 */
export function translateChord(chord) {
  if (!chord) return chord;
  // Match root note (A-G) optionally followed by # or b
  return chord.replace(/^([A-G])(#|b)?/, (match, note, modifier) => {
    const ptNote = NOTE_MAP[note] || note;
    return ptNote + (modifier || '');
  });
}

/**
 * Translates all chords found in a cifra text line.
 * Chords are words that start with A-G followed by typical chord suffixes.
 * Only translates tokens that look like chords (start with a note letter).
 */
export function translateCifraText(text) {
  if (!text) return text;
  // Regex: chord token starts with A-G, optionally #/b, then optional suffix
  // We only translate tokens that are isolated "words" (not inside other words)
  return text.replace(/\b([A-G])(#|b)?([^\s]*)/g, (match, note, modifier, suffix) => {
    // Check if it's likely a chord (letter + modifier + known suffix chars)
    // Avoid translating regular words like "Am" in "Amanhã" - only translate chord-like tokens
    // Heuristic: if the full match looks like a chord token
    const chordPattern = /^[A-G](#|b)?(m|maj|min|sus|dim|aug|add|[0-9]|\/[A-G])*$/;
    if (chordPattern.test(match)) {
      const ptNote = NOTE_MAP[note] || note;
      return ptNote + (modifier || '') + (suffix || '');
    }
    return match;
  });
}

/**
 * Converts cifra text to uppercase while preserving lowercase 'm' in minor chords.
 * Strategy: process line by line, token by token to safely uppercase while keeping minor 'm'.
 */
export function cifraToUpperCase(text) {
  if (!text) return text;

  // Minor chord pattern: note A-G + optional #/b + 'm' not followed by lowercase letter (avoids "maj","min","me","mim" etc)
  const minorChordRe = /^([A-G](?:#|b)?)(m)(?![a-z])/;

  return text.split('\n').map(line => {
    // Process each token (space-separated)
    return line.split(/(\s+)/).map(token => {
      if (/^\s+$/.test(token)) return token; // preserve whitespace as-is

      const match = token.match(minorChordRe);
      if (match) {
        // It's a minor chord: uppercase everything except the 'm'
        const rest = token.slice(match[0].length);
        return match[1].toUpperCase() + 'm' + rest.toUpperCase();
      }
      return token.toUpperCase();
    }).join('');
  }).join('\n');
}