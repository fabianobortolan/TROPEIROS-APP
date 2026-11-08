/**
 * Sistema único e robusto de transposição de tonalidade.
 *
 * Corrige o bug do "sustenidos dobrados": o regex antigo usava `\b` no final,
 * que NÃO casa com `#`/`b` (caracteres não-word). Assim, num acorde como "F#",
 * ele casava apenas "F", transpunha para "F#" e deixava o "#" original → "F##".
 * Aqui o acidente (#/b) é parte da raiz e nunca sobra.
 *
 * Conceitos:
 *  - originalKey: tom original da música (apenas informativo).
 *  - currentKey:  tom em que a cifra está realmente armazenada (main_key).
 *                 É a BASE da transposição — os semitons são calculados a partir daqui.
 */

const SHARP_SCALE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_SCALE = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const FLAT_TO_SHARP = { Db: 'C#', Eb: 'D#', Fb: 'E', Gb: 'F#', Ab: 'G#', Bb: 'A#', Cb: 'B' };

// Teclas que convencionamente usam bemóis (para exibição).
export const FLAT_KEYS = ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'];

export const ALL_KEYS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

// Tonalidades menores com a grafia usual (G#m em vez de Abm, etc.).
export const ALL_MINOR_KEYS = ['Am', 'Bbm', 'Bm', 'Cm', 'C#m', 'Dm', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'G#m'];

const FLAT_KEY_INDEXES = FLAT_KEYS.map((k) => SHARP_SCALE.indexOf(FLAT_TO_SHARP[k] || k));

// Graus (semitons a partir da tônica) e tríades próprias de cada modo.
const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11];
const MINOR_STEPS = [0, 2, 3, 5, 7, 8, 10];
const MAJOR_TRIADS = ['', 'm', 'm', '', '', 'm', 'dim'];
const MINOR_TRIADS = ['m', 'dim', '', 'm', 'm', '', ''];

/**
 * Separa a tonalidade em fundamental e modo.
 * "Am" / "A menor" -> { root: 'A', mode: 'minor' };  "C" / "C maior" -> { root: 'C', mode: 'major' }.
 */
export function parseKey(key) {
  if (!key) return { root: 'C', mode: 'major' };
  const m = String(key).trim().match(/^([A-Ga-g][#b]?)\s*(.*)$/);
  if (!m) return { root: 'C', mode: 'major' };
  const root = m[1].charAt(0).toUpperCase() + m[1].slice(1);
  const rest = (m[2] || '').trim().toLowerCase();
  // "m", "min", "menor" = menor; "maj", "maior" e vazio = maior.
  const mode = /^m(?!aj)/.test(rest) ? 'minor' : 'major';
  return { root, mode };
}

/**
 * Regex ESTRICTO para validar um token inteiro como acorde.
 * Usado para detectar linhas de acorde com segurança (mesmo com letras em MAIÚSCULAS).
 * Aceita: C, C#, Db, Am, Cm7, C#7M, Cmaj7, G7sus4, C/E, Bb/F, Cm7(b5), C°, C+, Cadd9, etc.
 */
export const CHORD_TOKEN_RE =
  /^[A-G][#b]?(?:m(?:aj)?|M7?|dim|aug|sus[24]?|add\d+|°|º|\+)?(?:\d+(?:M)?)?(?:(?:sus[24]?|add\d+|°|º|\+|b\d+|#\d+))*(?:\([^)]*\))*(?:\/[A-G][#b]?)?$/;

/**
 * Regex GLOBAL para encontrar acordes dentro de uma linha (já confirmada como linha de acordes).
 * Grupos: 1=raiz, 2=qualidade, 3=tensão, 4=alterações, 5=parênteses, 6=baixo (/X).
 * Sem `\b` no final (o bug dos sustenidos) — a raiz consome o acidente.
 */
const CHORD_INLINE_RE =
  /\b([A-G][#b]?)(m(?:aj)?|M7?|dim|aug|sus[24]?|add\d+|°|º|\+)?(\d+(?:M)?)?((?:sus[24]?|add\d+|°|º|\+|b\d+|#\d+)*)(\([^)]*\))*(\/[A-G][#b]?)?(?=$|[\s)\]|,.;:!\-–/])/g;

function noteIndex(key) {
  const { root } = parseKey(key);
  const i = SHARP_SCALE.indexOf(FLAT_TO_SHARP[root] || root);
  return i === -1 ? 0 : i;
}

function displayNote(idx, useFlats) {
  const i = ((idx % 12) + 12) % 12;
  return (useFlats ? FLAT_SCALE : SHARP_SCALE)[i];
}

/** Semitons (0-11) entre duas tonalidades, de fromKey até toKey. */
export function semitonesBetween(fromKey, toKey) {
  if (!fromKey || !toKey) return 0;
  return (((noteIndex(toKey) - noteIndex(fromKey)) % 12) + 12) % 12;
}

/** Decide se exibe bemóis para uma tonalidade destino (convenção musical). */
export function preferFlatsForKey(key) {
  const { root, mode } = parseKey(key);
  // Em menor a armação vem do relativo maior (Am -> C, Dm -> F, Gm -> Bb...).
  const majorIdx = mode === 'minor' ? (noteIndex(root) + 3) % 12 : noteIndex(root);
  return FLAT_KEY_INDEXES.includes(majorIdx);
}

/** Transpõe uma tonalidade (mantém maior/menor). */
export function transposeKey(key, semitones, useFlats = false) {
  if (!key || semitones === 0) return key;
  const { root, mode } = parseKey(key);
  return displayNote(noteIndex(root) + semitones, useFlats) + (mode === 'minor' ? 'm' : '');
}

/**
 * Transpõe um acorde (raiz + baixo). O sufixo (m, 7, maj7, sus4, /...) é preservado.
 * Lida corretamente com acordes invertidos (C/E, F#/A#) transpondo ambos.
 */
export function transposeChord(chord, semitones, useFlats = false) {
  if (!chord || semitones === 0) return chord;
  const slashIdx = chord.indexOf('/');
  const main = slashIdx >= 0 ? chord.slice(0, slashIdx) : chord;
  const bass = slashIdx >= 0 ? chord.slice(slashIdx + 1) : null;

  const m = main.match(/^([A-G][#b]?)(.*)$/);
  if (!m) return chord;
  const newMain = displayNote(noteIndex(m[1]) + semitones, useFlats) + m[2];

  if (bass) {
    const bm = bass.match(/^([A-G][#b]?)(.*)$/);
    if (bm) {
      return newMain + '/' + displayNote(noteIndex(bm[1]) + semitones, useFlats) + bm[2];
    }
    return newMain + '/' + bass;
  }
  return newMain;
}

/** Transpõe um array de acordes (útil para progressões). */
export function transposeChords(chords, semitones, useFlats = false) {
  if (!Array.isArray(chords) || semitones === 0) return chords;
  return chords.map((c) => transposeChord(c, semitones, useFlats));
}

/**
 * Índice (dentro da linha) onde os acordes começam, desconsiderando um
 * possível prefixo de seção `[TAG]` e espaços seguintes. 0 se não houver tag.
 * Ex.: "[INTRO] A % E" -> 8 (logo após "[INTRO] ").
 */
export function chordStartIndex(line) {
  if (!line) return 0;
  const m = line.match(/^\s*\[[^\]]*\]\s*/);
  return m ? m[0].length : 0;
}

/**
 * Verifica se uma linha é de acordes (não de letra).
 * Heurística: ≥60% dos tokens são acordes válidos (ou `%` = repetição).
 * Aceita prefixo `[SEÇÃO]` seguido de acordes na mesma linha.
 * Funciona mesmo com letras em MAIÚSCULAS (a app usa "Caixa Alta").
 */
// Aceita também a escrita brasileira: E7/9, Cm7/9, C#m5-/7, A7+ …
function ehAcorde(t) {
  if (!t) return false;
  if (CHORD_TOKEN_RE.test(t)) return true;
  const br = t.replace(/(\d)[-+](?=\/|$)/g, '$1').replace(/\/\d+[-+]?/g, '');
  return br !== t && CHORD_TOKEN_RE.test(br);
}

// 'acorde' | 'neutro' (repetição, setas, barras) | 'outro'
function classificarToken(tok) {
  if (ehAcorde(tok)) return 'acorde';
  if (/^\(?[x×]?\d+[x×]\)?[:.]?$/i.test(tok) || /^[-–>|/!:.()\[\]]+$/.test(tok)) return 'neutro'; // 2x, (3x), x2, ---, |, ->
  // "D-2X", "Am-4x": acorde seguido de repetição
  const rep = tok.match(/^(.+?)-+\(?\d+[x×]\)?$/i);
  if (rep && ehAcorde(rep[1])) return 'acorde';
  // "Em---D", "G--A": sequência de acordes ligada por traços
  if (/-{2,}/.test(tok)) {
    const partes = tok.split(/-{2,}/).filter(Boolean);
    if (partes.length && partes.every(ehAcorde)) return 'acorde';
  }
  const t = tok.replace(/^[([{<]+|[)\]}>,.;:!]+$/g, '');
  if (!t) return 'neutro';
  if (t === '%') return 'acorde'; // repetição do acorde anterior
  return ehAcorde(t) ? 'acorde' : 'outro';
}

export function isChordLine(line) {
  if (!line) return false;
  const trimmed = line.trim();
  if (!trimmed) return false;
  const startIdx = chordStartIndex(line);
  const rest = startIdx > 0 ? line.slice(startIdx).trim() : trimmed;
  if (!rest) return false; // só havia a tag de seção
  const tokens = rest.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;
  let chordCount = 0, neutros = 0;
  for (const tok of tokens) {
    const r = classificarToken(tok);
    if (r === 'neutro') { neutros++; continue; }
    if (r === 'acorde') chordCount++;
  }
  if (chordCount === 0) return false;
  return chordCount / Math.max(1, tokens.length - neutros) >= 0.6;
}

/**
 * Extrai acordes de uma linha, com posições (para realce clicável).
 * Retorna [{ chord, index, length }, ...].
 */
export function extractChords(line) {
  if (!isChordLine(line)) return [];
  const startIdx = chordStartIndex(line);
  const target = startIdx > 0 ? line.slice(startIdx) : line;
  const matches = [];
  let match;
  CHORD_INLINE_RE.lastIndex = 0;
  while ((match = CHORD_INLINE_RE.exec(target)) !== null) {
    const chord = match[0];
    if (!chord || chord.length === 0) continue;
    // Evita match vazio no final de string
    if (match.index === target.length) break;
    matches.push({ chord, index: match.index + startIdx, length: chord.length });
  }
  return matches;
}

/**
 * Transpõe o texto completo de uma cifra, linha a linha.
 * Só transpõe linhas detectadas como de acordes; preserva letras e marcações [SEÇÃO].
 */
export function transposeCifraText(text, semitones, useFlats = false) {
  if (!text || semitones === 0) return text;
  const transposeRest = (segment) => {
    CHORD_INLINE_RE.lastIndex = 0;
    return segment.replace(CHORD_INLINE_RE, (full, root, q, tens, alt, parens, bass) => {
      const newRoot = displayNote(noteIndex(root) + semitones, useFlats);
      let res = newRoot + (q || '') + (tens || '') + (alt || '') + (parens || '');
      if (bass) {
        const b = bass.slice(1);
        const bm = b.match(/^([A-G][#b]?)(.*)$/);
        res += bm
          ? '/' + displayNote(noteIndex(bm[1]) + semitones, useFlats) + bm[2]
          : bass;
      }
      return res;
    });
  };
  return text
    .split('\n')
    .map((line) => {
      if (!isChordLine(line)) return line;
      const startIdx = chordStartIndex(line);
      if (startIdx === 0) return transposeRest(line);
      return line.slice(0, startIdx) + transposeRest(line.slice(startIdx));
    })
    .join('\n');
}

/**
 * Converte um acorde de uma tonalidade para outra, ajustando o MODO quando ele muda
 * (maior -> menor ou menor -> maior). O acorde é reescrito pelo GRAU que ocupa na escala:
 * a tônica continua tônica, o IV continua IV etc. Assim "C - Am - F - G" em C maior vira
 * "Cm - Ab - Fm - Gm" em C menor, como se espera ao passar a música para o modo menor.
 * Acordes com sétima, sus, alterações etc. mantêm a formação e só mudam de fundamental.
 */
export function transposeChordToKey(chord, fromKey, toKey, useFlats = false) {
  if (!chord || !fromKey || !toKey) return chord;
  const from = parseKey(fromKey), to = parseKey(toKey);
  const shift = (((noteIndex(to.root) - noteIndex(from.root)) % 12) + 12) % 12;
  if (from.mode === to.mode) return shift === 0 ? chord : transposeChord(chord, shift, useFlats);

  const srcSteps = from.mode === 'minor' ? MINOR_STEPS : MAJOR_STEPS;
  const tgtSteps = to.mode === 'minor' ? MINOR_STEPS : MAJOR_STEPS;
  const tgtTriads = to.mode === 'minor' ? MINOR_TRIADS : MAJOR_TRIADS;
  const fromTonic = noteIndex(from.root), toTonic = noteIndex(to.root);
  const degreeOf = (note) => srcSteps.indexOf((((noteIndex(note) - fromTonic) % 12) + 12) % 12);
  const mapNote = (note) => {
    const deg = degreeOf(note);
    return deg === -1
      ? displayNote(noteIndex(note) + shift, useFlats)
      : displayNote(toTonic + tgtSteps[deg], useFlats);
  };

  const slashIdx = chord.indexOf('/');
  const main = slashIdx >= 0 ? chord.slice(0, slashIdx) : chord;
  const bass = slashIdx >= 0 ? chord.slice(slashIdx + 1) : null;
  const m = main.match(/^([A-G][#b]?)(.*)$/);
  if (!m) return chord;
  const deg = degreeOf(m[1]);
  // Tríades simples seguem a harmonia do modo destino.
  const plain = /^(|m|dim|°|º)$/.test(m[2]);
  const newMain = mapNote(m[1]) + (plain && deg !== -1 ? tgtTriads[deg] : m[2]);
  if (!bass) return newMain;
  const bm = bass.match(/^([A-G][#b]?)(.*)$/);
  return bm ? newMain + '/' + mapNote(bm[1]) + bm[2] : newMain + '/' + bass;
}

/**
 * Transpõe o texto completo de uma cifra de uma tonalidade para outra,
 * trocando o modo (maior/menor) quando a tonalidade de destino pedir.
 */
export function transposeCifraToKey(text, fromKey, toKey, useFlats = false) {
  if (!text || !fromKey || !toKey) return text;
  const from = parseKey(fromKey), to = parseKey(toKey);
  if (from.root === to.root && from.mode === to.mode) return text;
  if (from.mode === to.mode) return transposeCifraText(text, semitonesBetween(fromKey, toKey), useFlats);

  const convert = (segment) => {
    CHORD_INLINE_RE.lastIndex = 0;
    return segment.replace(CHORD_INLINE_RE, (full) => transposeChordToKey(full, fromKey, toKey, useFlats));
  };
  return text
    .split('\n')
    .map((line) => {
      if (!isChordLine(line)) return line;
      const startIdx = chordStartIndex(line);
      if (startIdx === 0) return convert(line);
      return line.slice(0, startIdx) + convert(line.slice(startIdx));
    })
    .join('\n');
}