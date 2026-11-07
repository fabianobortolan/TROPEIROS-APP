// src/utils/cifraValidator.js
// Auditoria automática de cifra. Regras mestras (com tolerâncias para não gerar
// falsos positivos) + critérios extras de robustez:
//
// REGRAS BASE:
// 1) Seções repetidas (mesmo nome) devem ter, em regra, a mesma estrutura.
//    - Compara o Padrão em GRAUS (função harmônica), não os nomes dos acordes —
//      assim um verso que repete transposto (modulação) NÃO é sinalizado.
// 2) Os acordes devem respeitar o campo harmônico da tonalidade, SALVO:
//    - Modulação registrada/detectada.
//    - Empréstimo modal (acordes da tonalidade paralela).
//
// CRITÉRIOS EXTRAS:
// 3) Tônica ausente — se o I/i da tonalidade nunca aparece, o tom declarado
//    é suspeito.
// 4) Tom global provavelmente errado — se o conjunto inteiro da música encaixa
//    muito melhor em outra tonalidade, sugere a correção.
// 5) Acorde inválido — acordes que não casam com nenhum padrão reconhecido
//    (provável erro de digitação na transcrição).
//
// VERIFICAÇÕES AVANÇADAS (v2):
// 6) Grafia inválida/não reconhecida ("Hm", "C#b", espaço dentro do acorde).
// 7) Enarmônicos misturados na mesma música (A# com Bb, G# com Ab...).
// 8) Tom informado vs. tom detectado pela cifra; original_key incoerente.
// 9) Campo harmônico inteligente — empréstimos comuns (dominantes secundárias,
//    iv/iv menor, bVII, bVI, bIII, diminutos de passagem) NÃO são alertas.
// 10) Seções repetidas com acordes diferentes (com as duas versões no detail).
// 11) Acordes desalinhados da letra / acordes colados na letra.
// 12) Seções sem marcação ou intro ausente.
// 13) chord_count desatualizado em relação à cifra atual.
// 14) Metadados faltando (ritmo, BPM, compasso, autor, ano, gênero).
// 15) customCifra da apostila desatualizada em relação à cifra original.
// 16) Duplicatas possíveis (mesmo título + artista) — via findDuplicateSongs.

const SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const NOTE_INDEX = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, Fb: 4, 'E#': 5,
  F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10,
  B: 11, Cb: 11, 'B#': 0
};

const MAJOR_OFFS = [0, 2, 4, 5, 7, 9, 11];
const MINOR_OFFS = [0, 2, 3, 5, 7, 8, 10];

// Parâmetros padrão (ajustáveis pela UI de auditoria)
const DEFAULTS = {
  degreeOverlapThreshold: 0.5,   // abaixo disso, seções repetidas divergem
  chordOverlapThreshold: 0.5,     // exige também divergência de acordes
  modulationMinLen: 4,             // mínimo de acordes para sugerir modulação
  modulationSecFitMax: 0.35,      // encaixe no tom principal deve ser fraco
  modulationBestMin: 0.9,          // encaixe no outro tom deve ser excelente
  modulationGap: 0.45,             // diferença mínima entre os dois encaixes
  globalKeyBestMin: 0.85,          // encaixe do tom sugerido no conjunto todo
  globalKeyGap: 0.3,               // diferença mínima vs tom declarado
  foreignSuspeito: 0.35,
  foreignAtencao: 0.2,
  detectedKeyGap: 0.2,             // tom detectado vs informado (evidência média)
};

// Pesos da nota de auditoria (0-100)
const SEVERITY_PENALTY = { alto: 15, medio: 8, baixo: 4, info: 0 };

function noteIndex(note) {
  if (!note) return -1;
  return NOTE_INDEX[String(note).trim()] ?? -1;
}

function scaleDegrees(tonicIdx, isMinor) {
  const offs = isMinor ? MINOR_OFFS : MAJOR_OFFS;
  return new Set(offs.map((o) => (tonicIdx + o) % 12));
}

// Analisa a tonalidade: "C" -> maior, "Am" -> menor
export function parseKey(keyStr) {
  if (!keyStr) return null;
  const m = String(keyStr).trim().match(/^([A-G][#b]?)\s*(m|min|minor)?/i);
  if (!m) return null;
  const tonicIdx = noteIndex(m[1]);
  if (tonicIdx < 0) return null;
  const isMinor = !!(m[2] && /m/i.test(m[2]));
  return { tonicIdx, isMinor, label: SHARP[tonicIdx] + (isMinor ? 'm' : '') };
}

// Analisa um acorde -> { rootIdx, family, token } | null
export function parseChord(chord) {
  if (!chord) return null;
  const m = String(chord).trim().match(/^([A-G][#b]?)([^/]*)(?:\/([A-G][#b]?))?/);
  if (!m) return null;
  const rootIdx = noteIndex(m[1]);
  if (rootIdx < 0) return null;
  const rest = (m[2] || '').trim();
  let family = 'major';
  if (/dim|°|º|ø/i.test(rest) || /m7b5|m7-5/i.test(rest)) family = 'dim';
  else if (/aug|\+/i.test(rest)) family = 'aug';
  else if (/^m(?!aj)/i.test(rest) || /^min/i.test(rest)) family = 'minor';
  return { rootIdx, family, token: SHARP[rootIdx] + family };
}

// % de acordes cuja tônica pertence ao campo harmônico da tonalidade dada
function fitScore(chords, tonicIdx, isMinor) {
  const deg = scaleDegrees(tonicIdx, isMinor);
  let total = 0, inScale = 0;
  for (const c of chords) {
    const p = parseChord(c);
    if (!p) continue;
    total++;
    if (deg.has(p.rootIdx)) inScale++;
  }
  return total ? inScale / total : 0;
}

// Melhor tonalidade (entre as 24) que encaixa o conjunto de acordes
function bestKey(chords) {
  let best = { score: -1, tonicIdx: 0, isMinor: false };
  for (let i = 0; i < 12; i++) {
    for (const isMinor of [false, true]) {
      const s = fitScore(chords, i, isMinor);
      if (s > best.score) best = { score: s, tonicIdx: i, isMinor };
    }
  }
  best.label = SHARP[best.tonicIdx] + (best.isMinor ? 'm' : '');
  return best;
}

// Token de GRAU (função harmônica) relativo a uma tonalidade.
function degreeToken(chord, tonicIdx, isMinor) {
  const p = parseChord(chord);
  if (!p) return null;
  const semis = (p.rootIdx - tonicIdx + 12) % 12;
  const offs = isMinor ? MINOR_OFFS : MAJOR_OFFS;
  const idx = offs.indexOf(semis);
  if (idx >= 0) {
    const romansMaj = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
    const romansMin = ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'];
    return (isMinor ? romansMin : romansMaj)[idx];
  }
  return 'x' + semis;
}

function degreeTokenSet(chords, tonicIdx, isMinor) {
  const s = new Set();
  for (const c of chords) {
    const t = degreeToken(c, tonicIdx, isMinor);
    if (t) s.add(t);
  }
  return s;
}

function chordTokenSet(chords) {
  const s = new Set();
  for (const c of chords) {
    const p = parseChord(c);
    if (p) s.add(p.token);
  }
  return s;
}

function setOverlap(a, b) {
  if (!a.size && !b.size) return 1;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union ? inter / union : 0;
}

function normalizeSection(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '')
    .replace(/[0-9]/g, '');
}

// ---------------------------------------------------------------------------
// Verificações de transcrição (linha a linha na cifra)
// ---------------------------------------------------------------------------

// Encontra substrings que se parecem com acordes dentro de uma linha
const CHORD_SUB_RE = /[A-G][#b]?(?:(?:m|maj|min|dim|aug|sus|add)(?:[0-9b#]|5|7|9|11|13)*|\+|-|[0-9](?:[0-9])?)(?:sus[24])?(?:b5|#5|add[0-9])?(?:\/[A-G][#b]?)?/g;

export function findChordSubstrings(line) {
  if (!line) return [];
  return Array.from(String(line).matchAll(CHORD_SUB_RE))
    .map((m) => ({ chord: m[0], index: m.index, length: m[0].length }))
    .filter((x) => x.index >= 0);
}

// Um token é um acorde válido (grafia reconhecida)?
// Formato: raiz (A-G com #/b) + sufixo livre (m, maj, min, dim, aug, sus, add,
// números, b5/#5, 7M, 9, 11, 13...) + baixo opcional após "/" (nota ou número,
// como em E7/9).
export function isValidChordToken(token) {
  if (!token) return false;
  const t = String(token).trim();
  const m = t.match(/^([A-G][#b]?)([^/]*)(?:\/([^/]+))?$/);
  if (!m) return false;
  const cleanSuffix = (part) => String(part || '')
    .replace(/maj|min|dim|aug|sus|add/gi, '')
    .replace(/[0-9]/g, '');
  const suffix = cleanSuffix(m[2]);
  if (!/^[mM°ø+()#b\-]*$/.test(suffix)) return false;
  if (m[3] != null) {
    const bass = cleanSuffix(m[3]);
    const isNoteBass = /^[A-G][#b]?[mM°ø+()#b\-]*$/.test(m[3]);
    const isNumericBass = /^[0-9]+/.test(m[3]) && /^[mM°ø+()#b\-0-9]*$/.test(bass);
    if (!isNoteBass && !isNumericBass) return false;
  }
  return true;
}

// % de tokens da linha que parecem acordes (linhas de letra têm quase nenhum)
function lineChordRatio(l) {
  const tokens = String(l || '').split(/\s+/).filter(Boolean);
  if (!tokens.length) return 0;
  const chordTokens = tokens.filter((t) => isValidChordToken(t) || /^(x{1,3}|\.|\/|\|)/.test(t));
  return chordTokens.length / tokens.length;
}

// Verifica a grafia de acordes: retorna lista de { token, line, problem, suggestion }
// APENAS nas linhas de acordes — palavras da letra (FUI, CASA, AMOR...) nunca
// são alertas de grafia.
export function checkChordSpelling(cifraText) {
  const problems = [];
  if (!cifraText) return problems;
  const lines = String(cifraText).split('\n');
  for (let li = 0; li < lines.length; li++) {
    // Linha de letra (linhas com erro de grafia têm poucos acordes válidos,
    // então o limite aqui é mais baixo que o do alinhamento)
    if (!/^\s*\[/.test(lines[li]) && lineChordRatio(lines[li]) < 0.4) continue; // linha de letra
    const tokens = lines[li].split(/\s+/).filter(Boolean);
    for (let ti = 0; ti < tokens.length; ti++) {
      const tok = tokens[ti];
      if (!/^[A-HG][#b]?/.test(tok)) continue;
      // Notação alemã: H = B (ex: "Hm" é um erro comum de "Bm")
      if (/^H/.test(tok)) {
        if (/^H[#b]?(m|min|dim|aug|sus|M)?[0-9]*(b5|#5)?$/.test(tok)) {
          problems.push({
            token: tok, line: li + 1,
            problem: 'notação alemã',
            suggestion: { kind: 'replace_token', line: li + 1, from: tok, to: tok.replace(/^H/, 'B') }
          });
        }
        continue; // "H..." não é acorde A-G — nada mais a checar
      }
      // Espaço dentro do acorde: token seguinte é um sufixo solto (ex: "F m7",
      // "B 7"). Só alerta quando o acorde unido é uma grafia canônica — evita
      // sugerir junções sem sentido (ex: "F# Mm" → "F#Mm").
      const next = tokens[ti + 1];
      const joined = next ? tok + next : null;
      const CANONICAL = /^(?:[A-G][#b]?)(?:m|maj|min|dim|aug|sus|add|°|º|ø|\+|M)?[0-9]*(?:b5|#5)?(?:M)?(?:sus[24])?(?:add[0-9])?(?:\/(?:[A-G][#b]?|[0-9]+))?$/;
      if (next && joined && isValidChordToken(joined) && CANONICAL.test(joined) && /^(m|maj|min|dim|aug|sus|add|°|º|ø|\+|M|[0-9b#])/.test(next)) {
        problems.push({
          token: tok, line: li + 1, problem: 'espaço dentro do acorde',
          suggestion: { kind: 'replace_token', line: li + 1, from: `${tok} ${next}`, to: joined }
        });
        continue;
      }
      if (isValidChordToken(tok)) continue;
      // C#b: bemol e sustenido juntos (fora de um baixo /x)
      if (tok.includes('#') && tok.includes('b') && !tok.includes('/')) {
        problems.push({
          token: tok, line: li + 1, problem: 'sustenido + bemol juntos',
          suggestion: null
        });
        continue;
      }
      // Caracteres inválidos dentro do token (só quando o token TEM cara de
      // acorde: raiz + sufixo de acorde — evita pegar palavras da letra)
      // Só tem cara de acorde se, depois da raiz, sobrarem apenas caracteres
      // de sufixo de acorde — palavras como "EMBORA" ou "AmQuer" ficam de fora
      // (coladas na letra são papel da checagem de alinhamento).
      const looksLikeChord = /^[A-G][#b]?[mM°ø+()#b\-0-9]{1,7}$/.test(tok);
      if (looksLikeChord && /[A-Za-z]{3,}/.test(tok) && !isValidChordToken(tok) && !/^(maj|min|dim|aug|sus|add)/.test(tok)) {
        problems.push({
          token: tok, line: li + 1, problem: 'grafia não reconhecida',
          suggestion: null
        });
      }
    }
  }
  return problems;
}

// Acordes colados na letra (ex: "AmQuer") e desalinhados (acorde além do fim da linha)
export function checkChordAlignment(cifraText) {
  const problems = [];
  if (!cifraText) return problems;
  const lines = String(cifraText).split('\n');
  const isMarkerLine = (l) => /^\s*\[/.test(l);

  const lineChordRatio = (l) => {
    const tokens = l.split(/\s+/).filter(Boolean);
    if (!tokens.length) return 0;
    const chordTokens = tokens.filter((t) => isValidChordToken(t) || /^(x{1,3}|\.|\/|\|)/.test(t));
    return chordTokens.length / tokens.length;
  };

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    if (!line.trim() || isMarkerLine(line)) continue;
    const matches = findChordSubstrings(line);
    if (!matches.length) continue;
    const tokens = line.split(/\s+/).filter(Boolean);
    const chordRatio = lineChordRatio(line);

    if (chordRatio < 0.6) {
      // Linha com letra + acordes na mesma linha → acordes colados
      // (linhas de acorde puro têm só tokens de acorde; linhas de letra têm palavras)
      const wordTokens = tokens.filter((t) => t.length >= 3 && /^[a-záàâãéêíóôõúç]{3,}/i.test(t) && !isValidChordToken(t));
      if (wordTokens.length >= 2) {
        problems.push({
          line: li + 1, kind: 'colados',
          sample: line.trim().slice(0, 40)
        });
      }
      continue;
    }

    // Linha de acordes: confere alinhamento com a linha de letra seguinte
    let lyric = null, lyricIdx = -1;
    for (let j = li + 1; j < lines.length && j <= li + 3; j++) {
      const nl = lines[j];
      if (!nl.trim() || isMarkerLine(nl) || lineChordRatio(nl) >= 0.6) {
        if (nl.trim() && !isMarkerLine(nl) && lineChordRatio(nl) < 0.6) { lyric = nl; lyricIdx = j; break; }
        if (isMarkerLine(nl)) break;
        continue;
      }
      lyric = nl; lyricIdx = j; break;
    }
    if (lyric == null) continue;
    const lyricLen = lyric.trimEnd().length;
    const beyond = matches.filter((m) => m.index >= lyricLen);
    if (beyond.length) {
      problems.push({
        line: li + 1, kind: 'além_do_fim',
        chords: beyond.map((b) => b.chord),
        sample: beyond[0].chord
      });
    }
  }
  return problems;
}

// Seções da cifra: marcações, intro, seções nomeadas
export function checkSectionMarkers(cifraText) {
  const problems = [];
  if (!cifraText || !String(cifraText).trim()) return problems;
  const lines = String(cifraText).split('\n');
  const markerLines = lines
    .map((line, i) => ({ line, i }))
    .filter(({ line }) => /^\s*\[/.test(line));

  if (markerLines.length === 0) {
    problems.push({
      type: 'secao_nao_marcada', severity: 'medio', line: null,
      message: 'Nenhuma seção está marcada na cifra ([Intro], [Verso], [Refrão]...), o que dificulta o estudo por partes.',
      detail: {}, section: '(cifra)'
    });
    return problems;
  }

  const names = markerLines.map(({ line }) => normalizeSection(line.match(/\[([^\]]*)/)?.[1] || ''));
  if (!names.some((n) => n.startsWith('intro') || n.startsWith('base'))) {
    problems.push({
      type: 'intro_ausente', severity: 'baixo', line: null,
      message: 'A cifra não tem a seção [Intro] marcada.',
      detail: {}, section: '(cifra)'
    });
  }
  return problems;
}

// Acordes únicos da cifra fora da intro — para conferir chord_count
export function uniqueChordsFromCifra(cifraText) {
  if (!cifraText) return [];
  const lines = String(cifraText).split('\n');
  const seen = new Set();
  let inIntro = false;
  for (const line of lines) {
    const marker = line.match(/^\s*\[([^\]]*)\]/);
    if (marker) {
      const n = normalizeSection(marker[1]);
      inIntro = n.startsWith('intro') || n.startsWith('base');
      continue;
    }
    if (inIntro) continue;
    const tokens = line.split(/\s+/).filter(Boolean);
    if (tokens.length && tokens.filter((t) => isValidChordToken(t)).length / tokens.length < 0.6) continue;
    for (const m of findChordSubstrings(line)) {
      const p = parseChord(m.chord.split('/')[0]);
      if (p) seen.add(p.token);
    }
  }
  return Array.from(seen);
}

// Empréstimos comuns — NÃO devem ser tratados como acordes fora do campo
export function classifyCommonBorrowing(rootIdx, family, tonicIdx, isMinor) {
  const rel = (rootIdx - tonicIdx + 12) % 12;
  if (isMinor) {
    if (rel === 7 && family === 'major') return 'dominante maior do modo harmônico (V)';
    if (rel === 5 && family === 'major') return 'IV maior (dórico)';
    if (rel === 10 && family === 'major') return 'bVII';
    if (rel === 0 && family === 'major') return 'I maior (picardia)';
    if (family === 'dim') return 'diminuto de passagem';
    const target = (rel + 5) % 12;
    if (family === 'major' && MAJOR_OFFS.includes(target)) return 'dominante secundária';
    return null;
  }
  // Maior
  if (rel === 10 && family === 'major') return 'bVII';
  if (rel === 5 && family === 'minor') return 'iv menor';
  if (rel === 8 && family === 'major') return 'bVI';
  if (rel === 3 && family === 'major') return 'bIII';
  if (rel === 1 && family === 'major') return 'bII (napolitana)';
  if (family === 'dim') return 'diminuto de passagem';
  const target = (rel + 5) % 12;
  if (family === 'major' && [0, 2, 4, 5, 7, 9].includes(target)) return 'dominante secundária';
  return null;
}

// Nota de auditoria 0-100 a partir da lista de alertas visíveis
export function computeValidationScore(issues) {
  if (!issues || !issues.length) return 100;
  let score = 100;
  for (const iss of issues) {
    score -= SEVERITY_PENALTY[iss.severity] ?? 4;
  }
  return Math.max(0, Math.round(score));
}

// Duplicatas possíveis (mesmo título + artista) em todo o acervo
export function normalizeTitleArtist(title, artist) {
  const norm = (s) => String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
  return norm(title) + '||' + norm(artist);
}

export function findDuplicateSongs(songs) {
  const groups = {};
  for (const s of songs || []) {
    const k = normalizeTitleArtist(s.title, s.artist);
    if (!k.replace(/\|/g, '')) continue;
    (groups[k] = groups[k] || []).push(s);
  }
  return Object.values(groups).filter((g) => g.length >= 2);
}

// ---------------------------------------------------------------------------
// Função principal. Aceita options para ajustar a sensibilidade.
// Retorna { hasAlert, severity, issues, mainKey, foreignRatio, suggestedKey,
//           borrowings, score }.
// severity: 'ok' | 'atencao' | 'suspeito' | 'critico'
// ---------------------------------------------------------------------------
export function validarCifra(song, options = {}) {
  const o = { ...DEFAULTS, ...(options || {}) };
  const progs = Array.isArray(song?.progressions) ? song.progressions : [];
  const issues = [];

  // --- Verificações que independem das progressões ---
  const spelling = checkChordSpelling(song?.cifra_text);
  if (spelling.length) {
    issues.push({
      type: 'acorde_invalido',
      section: '(cifra)',
      line: spelling[0].line,
      severity: 'medio',
      message: `${spelling.length} acorde(s) com grafia inválida ou não reconhecida: ${spelling
        .slice(0, 6)
        .map((sp) => `"${sp.token}" (linha ${sp.line}) — ${sp.problem}`)
        .join('; ')}${spelling.length > 6 ? '…' : ''} — corrija a grafia dos acordes.`,
      detail: { items: spelling },
      suggestion: spelling.find((sp) => sp.suggestion)?.suggestion || null
    });
  }

  // Nota: acordes além do fim da linha de letra são comuns (passagem após a
  // cantoria) e NÃO são mais alertados. Só fica a checagem de acordes colados.
  const alignment = checkChordAlignment(song?.cifra_text);
  const colados = alignment.filter((a) => a.kind === 'colados');
  if (colados.length) {
    issues.push({
      type: 'acordes_colados',
      section: '(cifra)',
      line: colados[0].line,
      severity: 'baixo',
      message: `${colados.length} linha(s) com acordes colados junto à letra (ex: linha ${colados[0].line}: "${colados[0].sample}"). Separe os acordes em linha própria acima da letra.`,
      detail: { items: colados }
    });
  }

  const markerProblems = checkSectionMarkers(song?.cifra_text);
  issues.push(...markerProblems);

  // Enarmônicos misturados
  if (song?.cifra_text || progs.length) {
    const spellByPc = {};
    const addRoot = (chordStr) => {
      const m = String(chordStr || '').trim().match(/^([A-G][#b]?)/);
      if (!m) return;
      const idx = noteIndex(m[1]);
      if (idx < 0) return;
      (spellByPc[idx] = spellByPc[idx] || new Set()).add(m[1]);
    };
    if (song?.cifra_text) {
      for (const line of String(song.cifra_text).split('\n')) {
        for (const m of findChordSubstrings(line)) addRoot(m.chord.split('/')[0]);
      }
    }
    for (const p of progs) for (const c of p.chords || []) addRoot(c);
    const enharmonicPairs = [];
    for (const [pc, spells] of Object.entries(spellByPc)) {
      if (spells.size > 1) {
        const [a, b] = Array.from(spells);
        if ((a.includes('#') && b.includes('b')) || (a.includes('b') && b.includes('#'))) {
          enharmonicPairs.push({ pc: Number(pc), spellings: Array.from(spells) });
        }
      }
    }
    if (enharmonicPairs.length) {
      const detail = enharmonicPairs.map((p) => `${SHARP[p.pc]}/${['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'][p.pc]}`);
      issues.push({
        type: 'enarmonico',
        section: '(música toda)',
        line: null,
        severity: 'baixo',
        message: `Enarmônicos misturados na mesma música: ${detail.join(', ')} (ex: A# e Bb). Padronize a grafia conforme a armadura do tom.`,
        detail: { pairs: enharmonicPairs }
      });
    }
  }

  // Metadados faltando
  const missingMeta = [];
  if (!song?.rhythm_id || !song?.rhythm_name) missingMeta.push('ritmo');
  if (!song?.tempo) missingMeta.push('BPM');
  if (!song?.beats_per_measure) missingMeta.push('compasso');
  if (!song?.author) missingMeta.push('autor');
  if (!song?.year) missingMeta.push('ano');
  if (!song?.genre_style) missingMeta.push('gênero');
  if (missingMeta.length) {
    issues.push({
      type: 'metadados',
      section: '(cadastro)',
      line: null,
      severity: 'baixo',
      message: `Metadados faltando no cadastro: ${missingMeta.join(', ')}.`,
      detail: { fields: missingMeta }
    });
  }

  // chord_count desatualizado (campo vazio NÃO alerta — ignorado por decisão do usuário)
  if (song?.cifra_text && song?.chord_count != null) {
    const unique = uniqueChordsFromCifra(song.cifra_text);
    if (song.chord_count !== unique.length) {
      issues.push({
        type: 'chord_count',
        section: '(cadastro)',
        line: null,
        severity: 'baixo',
        message: `O campo "quantidade de acordes" (${song.chord_count}) está desatualizado em relação à cifra atual (${unique.length} acordes únicos fora da intro).`,
        detail: { stored: song.chord_count, computed: unique.length },
        suggestion: { kind: 'update_field', field: 'chord_count', value: unique.length }
      });
    }
  }

  // Nota: cifra customizada da apostila sobre versão antiga NÃO é mais alertada
  // (ignorado por decisão do usuário). O fallback customCifraBase permanece no
  // componente da apostila, que decide quando usar a cifra original.

  // original_key incoerente com main_key
  const pkMain = parseKey(song?.main_key);
  const pkOrig = parseKey(song?.original_key);
  if (pkMain && pkOrig && pkOrig.isMinor !== pkMain.isMinor) {
    issues.push({
      type: 'original_key_incoerente',
      section: '(cadastro)',
      line: null,
      severity: 'baixo',
      message: `A tonalidade original (${pkOrig.label} — ${pkOrig.isMinor ? 'menor' : 'maior'}) e o tom atual (${pkMain.label} — ${pkMain.isMinor ? 'menor' : 'maior'}) têm modos diferentes. Confira se a transposição está correta.`,
      detail: { main_key: pkMain.label, original_key: pkOrig.label }
    });
  }

  // --- Análises harmônicas (exigem progressões registradas) ---
  let severityHarmonic = 'ok';
  let mainKeyLabel = null;
  let foreignRatio = 0;
  let suggestedKey = null;
  let borrowings = [];

  if (progs.length) {
    const keyInfo =
      parseKey(song.main_key) ||
      (progs[0] && parseKey(progs[0].key)) ||
      bestKey(progs.flatMap((p) => p.chords || []));

    const tonicIdx = keyInfo?.tonicIdx ?? 0;
    const isMinor = keyInfo?.isMinor ?? false;
    mainKeyLabel = keyInfo?.label || SHARP[tonicIdx] + (isMinor ? 'm' : '');
    const mainDeg = scaleDegrees(tonicIdx, isMinor);
    const parallelDeg = scaleDegrees(tonicIdx, !isMinor);

    let foreignChordCount = 0;
    let totalChords = 0;
    const invalidChords = [];
    let tonicAppears = false;
    borrowings = [];

    // A) Campo harmônico + modulação por seção
    for (const p of progs) {
      const chords = p.chords || [];
      if (!chords.length) continue;
      totalChords += chords.length;

      const secFit = fitScore(chords, tonicIdx, isMinor);
      const best = bestKey(chords);
      const secDeg = scaleDegrees(best.tonicIdx, best.isMinor);
      const sectionKey = p.key || p.modulated_key;
      const registeredModulation =
        sectionKey && parseKey(sectionKey) && parseKey(sectionKey).label !== mainKeyLabel;

      if (
        chords.length >= o.modulationMinLen &&
        secFit < o.modulationSecFitMax &&
        best.score >= o.modulationBestMin &&
        best.score - secFit >= o.modulationGap &&
        !registeredModulation
      ) {
        issues.push({
          type: 'modulacao',
          section: p.section || '?',
          line: null,
          severity: 'alto',
          message: `Seção "${p.section || '?'}" encaixa melhor em ${best.label} (${Math.round(best.score * 100)}%) do que em ${mainKeyLabel} (${Math.round(secFit * 100)}%) — possível modulação não registrada.`,
          detail: { sectionKey: best.label, sectionFit: secFit, bestFit: best.score },
          suggestion: { main_key: best.label, kind: 'modulacao', section: p.section || '?' }
        });
      }

      for (const c of chords) {
        const pc = parseChord(c);
        if (!pc) {
          invalidChords.push(c);
          continue;
        }
        if (pc.rootIdx === tonicIdx) tonicAppears = true;
        const inMain = mainDeg.has(pc.rootIdx);
        const inSec = secDeg.has(pc.rootIdx);
        const inParallel = parallelDeg.has(pc.rootIdx);
        if (!inMain && !inSec && !inParallel) {
          const borrowing = classifyCommonBorrowing(pc.rootIdx, pc.family, tonicIdx, isMinor);
          if (borrowing) {
            borrowings.push({ chord: c, section: p.section || '?', label: borrowing });
          } else {
            foreignChordCount++;
          }
        }
      }
    }

    if (invalidChords.length > 0) {
      issues.push({
        type: 'acorde_invalido_progressoes',
        section: '(transcrição)',
        line: null,
        severity: 'medio',
        message: `${invalidChords.length} acorde(s) não reconhecido(s) nas progressões registradas: ${invalidChords.slice(0, 6).join(', ')}${invalidChords.length > 6 ? '…' : ''} — possível erro de digitação.`,
        detail: { chords: invalidChords }
      });
    }

    foreignRatio = totalChords ? foreignChordCount / totalChords : 0;

    // B) Consistência entre seções de mesmo nome (com as duas versões)
    const groups = {};
    for (const p of progs) {
      const n = normalizeSection(p.section);
      if (!n) continue;
      (groups[n] = groups[n] || []).push(p);
    }
    for (const [name, list] of Object.entries(groups)) {
      if (list.length < 2) continue;
      let worst = { chordOv: 1, degreeOv: 1, pair: null };
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const ci = list[i].chords || [];
          const cj = list[j].chords || [];
          if (ci.length < 4 || cj.length < 4) continue;
          const chordOv = setOverlap(chordTokenSet(ci), chordTokenSet(cj));
          const ki = parseKey(list[i].key || list[i].modulated_key) || keyInfo;
          const kj = parseKey(list[j].key || list[j].modulated_key) || keyInfo;
          const degreeOv = setOverlap(
            degreeTokenSet(ci, ki.tonicIdx, ki.isMinor),
            degreeTokenSet(cj, kj.tonicIdx, kj.isMinor)
          );
          if (chordOv < worst.chordOv || degreeOv < worst.degreeOv) {
            worst = { chordOv, degreeOv, pair: [list[i], list[j]] };
          }
        }
      }
      if (worst.degreeOv < o.degreeOverlapThreshold && worst.chordOv < o.chordOverlapThreshold) {
        const [a, b] = worst.pair || [];
        issues.push({
          type: 'inconsistencia',
          section: name,
          line: null,
          severity: 'alto',
          message: `As ocorrências de "${name}" têm estruturas harmônicas diferentes (sobreposição de ${Math.round(worst.degreeOv * 100)}% dos graus) — seções repetidas deveriam ter a mesma estrutura.`,
          detail: {
            degreeOverlap: worst.degreeOv,
            chordOverlap: worst.chordOv,
            versions: [
              a ? { section: `${a.section} (1ª ocorrência)`, chords: a.chords || [], key: a.key || a.modulated_key } : null,
              b ? { section: `${b.section} (2ª ocorrência)`, chords: b.chords || [], key: b.key || b.modulated_key } : null,
            ].filter(Boolean),
          }
        });
      }
    }

    // C) Análise GLOBAL da música (critérios extras)
    const allChords = progs.flatMap((p) => p.chords || []);
    const globalFit = fitScore(allChords, tonicIdx, isMinor);

    // Frequência de cada tônica na música inteira (para distinguir tônica real
    // de acordes que apenas "cabem" em várias tonalidades).
    const rootFreq = {};
    let parsedAll = 0;
    for (const c of allChords) {
      const p = parseChord(c);
      if (!p) continue;
      parsedAll++;
      rootFreq[p.rootIdx] = (rootFreq[p.rootIdx] || 0) + 1;
    }
    const declaredTonicFreq = parsedAll ? (rootFreq[tonicIdx] || 0) / parsedAll : 0;

    // Candidatos a tonalidade real: bom encaixe E tônica presente com frequência.
    let bestCandidate = null;
    for (let i = 0; i < 12; i++) {
      for (const isMin of [false, true]) {
        const sc = fitScore(allChords, i, isMin);
        if (sc < o.globalKeyBestMin) continue;
        const f = parsedAll ? (rootFreq[i] || 0) / parsedAll : 0;
        const composite = sc * (f + 0.1);
        if (!bestCandidate || composite > bestCandidate.composite) {
          bestCandidate = { tonicIdx: i, isMinor: isMin, score: sc, freq: f, composite, label: SHARP[i] + (isMin ? 'm' : '') };
        }
      }
    }

    const hasModulacaoIssue = issues.some((i) => i.type === 'modulacao');

    // Só sugere "tom errado" quando há evidência MUITO forte: a tônica declarada
    // quase não aparece, o encaixe é fraco, e não há modulação (modulação já é
    // reportada por seção). Isso evita confundir modulação com tom errado.
    if (
      allChords.length >= 6 &&
      bestCandidate &&
      bestCandidate.tonicIdx !== tonicIdx &&
      globalFit < 0.55 &&
      declaredTonicFreq < 0.15 &&
      bestCandidate.freq >= 0.25 &&
      bestCandidate.score - globalFit >= o.globalKeyGap &&
      !hasModulacaoIssue
    ) {
      suggestedKey = bestCandidate.label;
      issues.push({
        type: 'tom_errado',
        section: '(música toda)',
        line: null,
        severity: 'alto',
        message: `A tônica ${mainKeyLabel} mal aparece (${Math.round(declaredTonicFreq * 100)}% dos acordes) e o conjunto encaixa melhor em ${bestCandidate.label} (${Math.round(bestCandidate.score * 100)}%) — o tom principal provavelmente está errado.`,
        detail: { suggestedKey: bestCandidate.label, globalFit, bestFit: bestCandidate.score, declaredTonicFreq },
        suggestion: { main_key: bestCandidate.label, kind: 'tom' }
      });
    }

    // Tom informado diferente do tom detectado (evidência média — não exige os
    // critérios fortes do "tom_errado", apenas um desnível claro de encaixe).
    const detected = bestKey(allChords);
    if (
      !suggestedKey &&
      !hasModulacaoIssue &&
      parseKey(song.main_key) &&
      allChords.length >= 8 &&
      detected.score - globalFit >= o.detectedKeyGap
    ) {
      issues.push({
        type: 'tom_detectado',
        section: '(música toda)',
        line: null,
        severity: 'medio',
        message: `O tom informado (${mainKeyLabel}) tem encaixe de ${Math.round(globalFit * 100)}% nos acordes, enquanto ${detected.label} encaixa ${Math.round(detected.score * 100)}% — confira se o tom está correto.`,
        detail: { informed: mainKeyLabel, detected: detected.label, informedFit: globalFit, detectedFit: detected.score },
        suggestion: { main_key: detected.label, kind: 'tom' }
      });
    }

    // D) Tônica ausente
    if (!tonicAppears && allChords.length >= 4 && !suggestedKey) {
      issues.push({
        type: 'tonica_ausente',
        section: '(música toda)',
        line: null,
        severity: 'medio',
        message: `A tônica ${mainKeyLabel} não aparece em nenhuma seção — o tom declarado pode estar incorreto.`,
        detail: {}
      });
    }

    // Severidade harmônica (igual à regra antiga)
    const altoCount = issues.filter((i) => i.type === 'modulacao' || i.type === 'tom_errado' || i.type === 'inconsistencia').length;
    const medioCount = issues.filter((i) => i.severity === 'medio' && ['acorde_invalido', 'acorde_invalido_progressoes', 'acorde_além_do_fim', 'secao_nao_marcada', 'tom_detectado', 'tonica_ausente', 'marcador_secao'].includes(i.type)).length;
    if (altoCount >= 2) severityHarmonic = 'critico';
    else if (altoCount === 1) severityHarmonic = 'suspeito';
    else if (medioCount >= 3) severityHarmonic = 'suspeito';
    else if (medioCount >= 1 || foreignRatio > o.foreignSuspeito) severityHarmonic = foreignRatio > o.foreignSuspeito ? 'suspeito' : 'atencao';
    else if (foreignRatio > o.foreignAtencao) severityHarmonic = 'atencao';
  }

  // --- Marcadores de seção malformados na cifra ([VERSO 4), [REFRAO sem "]") ---
  if (song?.cifra_text) {
    const badMarkers = String(song.cifra_text)
      .split('\n')
      .map((line, i) => ({ line, i }))
      .filter(({ line }) => /^\s*\[/.test(line) && !line.includes(']'));
    if (badMarkers.length) {
      issues.push({
        type: 'marcador_secao',
        section: '(cifra)',
        line: badMarkers[0].i + 1,
        severity: 'medio',
        message: `${badMarkers.length} marcador(es) de seção malformado(s), sem "]" de fechamento: ${badMarkers
          .map((b) => `"${b.line.trim().slice(0, 24)}" (linha ${b.i + 1})`)
          .join(', ')} — corrija os colchetes das seções.`,
        detail: { lines: badMarkers.map((b) => b.i + 1), markers: badMarkers.map((b) => b.line.trim().slice(0, 30)) },
        suggestion: {
          kind: 'replace_token',
          line: badMarkers[0].i + 1,
          from: badMarkers[0].line.trim().slice(0, 30),
          to: badMarkers[0].line.trim() + ']'
        }
      });
    }
  }

  // --- Ordena por severidade e calcula severidade/nota final ---
  const SEV_RANK = { alto: 0, medio: 1, baixo: 2, info: 3 };
  issues.sort((a, b) => (SEV_RANK[a.severity] ?? 9) - (SEV_RANK[b.severity] ?? 9));

  let severity = severityHarmonic;
  if (severity === 'ok') {
    const baixoCount = issues.filter((i) => i.severity === 'baixo').length;
    if (baixoCount >= 5) severity = 'atencao';
  }

  const hasAlert = severity !== 'ok';
  const score = computeValidationScore(issues);
  return {
    hasAlert, severity, issues,
    mainKey: mainKeyLabel || (pkMain ? pkMain.label : null),
    foreignRatio: Math.round(foreignRatio * 100) / 100,
    suggestedKey,
    borrowings,
    score,
  };
}

export const AUDIT_DEFAULTS = DEFAULTS;