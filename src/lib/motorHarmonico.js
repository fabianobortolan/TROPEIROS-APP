// =====================================================================
// motorHarmonico.js — Motor de análise de progressões harmônicas
// App Tropeiros do Bebedouro (Base44)  ·  versão 1.2 (nov/2026)
//
// 1.2: tom cadastrado só é trocado com folga clara (e nunca pelo homônimo);
//      V7→I pesa mais que tríade V→I (não confunde I com IV); terça de picardia;
//      seções menores casam também pelo relativo maior; padrões 'ambos' em menor
//      (ii–V–i); ciclos de quintas diatônicos (com elo de trítono) até a tônica;
//      dominante secundária com resolução deceptiva tratada como preparação;
//      modulação local exige folga ≥4 e afirmação do novo tom; linhas podem
//      dividir o acorde de chegada com a progressão.
//
// Sem dependências. Funciona no navegador ou em função de backend (Deno/Node).
// Entrada : texto da cifra (cifra_text) + tom cadastrado (main_key, opcional)
// Saída   : análise por seção — graus em ordem, função de cada acorde,
//           acordes de preparação (dominantes secundárias, ii–V, SubV,
//           diminutos de passagem), empréstimos modais, linhas de baixo
//           (caída/subida, cromática ou diatônica), cadências, cadeias de
//           quintas, e a progressão do catálogo reconhecida COM a variação.
// =====================================================================

// ---------------------------------------------------------------- notas
const NOTE_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const FLAT_KEYS = new Set([5, 10, 3, 8, 1]); // F Bb Eb Ab Db (maiores)
const mod12 = (n) => ((n % 12) + 12) % 12;

function parsePitch(s) {
  const m = /^([A-Ga-g])([#b]?)/.exec(s);
  if (!m) return null;
  let pc = NOTE_PC[m[1].toUpperCase()];
  if (m[2] === '#') pc += 1;
  if (m[2] === 'b') pc -= 1;
  return { pc: mod12(pc), len: m[0].length };
}

export function noteName(pc, keyPc = 0, keyMinor = false) {
  const ref = keyMinor ? mod12(keyPc + 3) : keyPc;
  return (FLAT_KEYS.has(ref) ? FLAT_NAMES : SHARP_NAMES)[mod12(pc)];
}

// -------------------------------------------------------------- acordes
// qualidade: 'M' maior, 'm' menor, 'dim', 'hdim' (meio-diminuto), 'aug', 'sus'
// seventh  : null | 'b7' | 'maj7' | 'dim7' | '6'
export function parseChord(raw) {
  if (!raw) return null;
  let s = raw.trim().replace(/[()]/g, '');
  if (!s) return null;
  const p = parsePitch(s);
  if (!p) return null;
  let rest = s.slice(p.len);
  let bass = null;
  const slash = rest.lastIndexOf('/');
  if (slash >= 0) {
    const b = parsePitch(rest.slice(slash + 1));
    if (b && rest.slice(slash + 1).length === b.len) {
      bass = b.pc;
      rest = rest.slice(0, slash);
    } else if (!/^\/?\d/.test(rest.slice(slash + 1))) {
      return null;
    }
  }
  // Cifras em CAIXA ALTA (padrão do app): "BM", "C#M" = menor. "7M" continua = maj7.
  rest = rest.replace(/^M(?![A-Z0-9])/, 'm').replace(/^M(?=\d)(?!7)/, 'm');
  if (/^MIN/i.test(rest)) rest = 'm' + rest.slice(3);
  const r = rest;
  let quality = 'M', seventh = null, ext = r;
  if (/^(m7b5|m7\(b5\)|ø)/.test(r)) { quality = 'hdim'; seventh = 'b7'; }
  else if (/^(°|º|o(?!\w)|dim)/i.test(r)) { quality = 'dim'; if (/7/.test(r)) seventh = 'dim7'; }
  else if (/^(\+|aug|5\+|\(#5\))/i.test(r)) { quality = 'aug'; }
  else if (/^m(?!aj)/.test(r)) {
    quality = 'm';
    if (/^m(7M|maj7|\(7M\)|\+7)/.test(r)) seventh = 'maj7';
    else if (/^m6/.test(r)) seventh = '6';
    else if (/^m(7|9|11|13)/.test(r)) seventh = 'b7';
  } else {
    if (/^(sus|4)/.test(r)) quality = 'sus';
    if (/(7M|maj7|M7|7\+)/.test(r)) seventh = 'maj7';
    else if (/^(6|69|6\/9)/.test(r)) seventh = '6';
    else if (/(^|sus\d?|4)(7|9|11|13)/.test(r) || /^(7|9|11|13)/.test(r)) seventh = 'b7';
  }
  if (!/^[0-9a-zA-Z#b+°º()\/ø\-]*$/.test(r)) return null;
  if (/[h-zH-Z]/.test(r.replace(/(m|maj|M|dim|aug|sus|add|o|ø|min)/g, ''))) return null;
  return { raw: raw.trim(), root: p.pc, quality, seventh, ext, bass: bass ?? p.pc, hasSlash: bass !== null };
}

const isDominantQuality = (c) => (c.quality === 'M' && c.seventh !== 'maj7' && c.seventh !== '6') || (c.quality === 'sus' && c.seventh === 'b7');
const isMinorish = (c) => c.quality === 'm' || c.quality === 'hdim';
const isDim = (c) => c.quality === 'dim';

// ------------------------------------------------------------- parse da cifra
const TOKEN_IGNORE = /^(\||\|\||x\d+|\d+x|%|-|–|\(|\)|\.{2,}|:)$/i;

function tokenizeChordLine(line) {
  const toks = line.replace(/[|]/g, ' ').replace(/\(([^)]*)\)/g, ' $1 ').split(/\s+/).filter(Boolean);
  if (!toks.length) return null;
  const out = [];
  for (const t of toks) {
    if (t === '%') { out.push('%'); continue; }
    if (TOKEN_IGNORE.test(t)) continue;
    const c = parseChord(t);
    if (!c) return null; // linha com texto -> não é linha de acordes
    out.push(c);
  }
  return out.length ? out : null;
}

export function parseCifra(text) {
  const sections = [];
  let cur = null, auto = 0, pendingSplit = false;
  const lines = String(text || '').split(/\r?\n/);
  const open = (name, isAuto = false) => {
    cur = { name: name.trim() || 'Seção', events: [], auto: isAuto };
    sections.push(cur);
  };
  for (let line of lines) {
    const tag = /^\s*\[\s*([^\]]+?)\s*\]\s*(.*)$/.exec(line);
    if (tag) {
      open(tag[1]);
      pendingSplit = false;
      line = tag[2] || '';
      if (!line.trim()) continue;
    }
    if (!line.trim()) { if (cur && cur.events.length && cur.auto) pendingSplit = true; continue; }
    const toks = tokenizeChordLine(line);
    if (!toks) {
      // letra dentro de uma INTRO = a intro acabou; o que vem depois é outra parte
      if (cur && /intro/i.test(cur.name) && cur.events.length) { open(`Parte ${++auto}`, true); }
      continue;
    }
    if (!cur) open(`Parte ${++auto}`, true);
    else if (pendingSplit) { open(`Parte ${++auto}`, true); }
    pendingSplit = false;
    for (const t of toks) {
      if (t === '%') { const last = cur.events[cur.events.length - 1]; if (last) cur.events.push(last); }
      else cur.events.push(t);
    }
  }
  return sections.filter((s) => s.events.length);
}

const collapse = (evs) => evs.filter((c, i) => i === 0 || !(c.root === evs[i - 1].root && c.quality === evs[i - 1].quality && c.seventh === evs[i - 1].seventh && c.bass === evs[i - 1].bass));

// ---------------------------------------------------------------- campo harmônico
// cada grau: [intervalo, qualidade de tríade esperada]
const MAJOR_FIELD = [[0, 'M'], [2, 'm'], [4, 'm'], [5, 'M'], [7, 'M'], [9, 'm'], [11, 'dim']];
const MINOR_FIELD = [[0, 'm'], [2, 'dim'], [3, 'M'], [5, 'm'], [7, 'm'], [7, 'M'], [8, 'M'], [10, 'M'], [11, 'dim']];
// empréstimos modais usuais
const MAJOR_BORROW = [[5, 'm', 'iv (do menor homônimo)'], [8, 'M', 'bVI (do menor homônimo)'], [10, 'M', 'bVII (mixolídio/menor)'], [3, 'M', 'bIII (do menor homônimo)'], [0, 'm', 'i (menor homônimo)'], [2, 'dim', 'ii° (do menor homônimo)'], [2, 'hdim', 'iiø (do menor homônimo)'], [7, 'm', 'v (mixolídio)'], [1, 'M', 'bII (napolitano)']];
const MINOR_BORROW = [[5, 'M', 'IV (dórico)'], [0, 'M', 'I (terça de picardia / maior homônimo)'], [1, 'M', 'bII (napolitano)'], [2, 'm', 'ii (dórico)']];

const ROMAN = ['I', 'bII', 'II', 'bIII', 'III', 'IV', '#IV', 'V', 'bVI', 'VI', 'bVII', 'VII'];
const ROMAN_MINOR_CTX = ['I', 'bII', 'II', 'III', '#III', 'IV', '#IV', 'V', 'VI', '#VI', 'VII', '#VII'];

function triadQ(c) { return c.quality === 'hdim' ? 'dim' : c.quality === 'sus' ? 'M' : c.quality; }

export function degreeLabel(c, key) {
  const iv = mod12(c.root - key.tonic);
  let r = (key.minor ? ROMAN_MINOR_CTX : ROMAN)[iv];
  if (isMinorish(c) || isDim(c)) r = r.toLowerCase().replace(/^b/, 'b').replace(/^#/, '#');
  let suf = '';
  if (c.quality === 'dim') suf = '°';
  else if (c.quality === 'hdim') suf = 'ø';
  else if (c.quality === 'aug') suf = '+';
  if (c.seventh === 'b7' && c.quality !== 'hdim') suf += '7';
  else if (c.seventh === 'maj7') suf += '7M';
  else if (c.seventh === '6') suf += '6';
  else if (c.seventh === 'dim7') suf = '°7';
  if (c.quality === 'sus') suf += 'sus';
  let lbl = r + suf;
  if (c.hasSlash && c.bass !== c.root) lbl += '/' + bassDegree(c.bass, key);
  return lbl;
}
function bassDegree(pc, key) {
  const iv = mod12(pc - key.tonic);
  return ['1', 'b2', '2', 'b3', '3', '4', '#4', '5', 'b6', '6', 'b7', '7'][iv];
}

function inField(c, key) {
  const iv = mod12(c.root - key.tonic), q = triadQ(c);
  const field = key.minor ? MINOR_FIELD : MAJOR_FIELD;
  return field.some(([i, fq]) => i === iv && (fq === q || (q === 'sus' && fq === 'M')));
}
function borrowed(c, key) {
  const iv = mod12(c.root - key.tonic);
  const list = key.minor ? MINOR_BORROW : MAJOR_BORROW;
  const hit = list.find(([i, q]) => i === iv && (q === c.quality || q === triadQ(c)));
  return hit ? hit[2] : null;
}
// sétima diatônica esperada no grau (para diferenciar I7 = V7/IV de I7M)
function diatonicSeventhIsMinor7(c, key) {
  const iv = mod12(c.root - key.tonic);
  if (!key.minor) return iv === 7; // só o V tem sétima menor sobre tríade maior
  return iv === 7 || iv === 10; // V7 (harmônica) e VII7 (natural)
}

// ---------------------------------------------------------------- tonalidade
export function parseKey(k) {
  if (!k) return null;
  const p = parsePitch(k.trim());
  if (!p) return null;
  const rest = k.trim().slice(p.len);
  return { tonic: p.pc, minor: /^m(?!aj)/.test(rest) || /^M$/.test(rest) && false };
}
export function keyName(key) { return noteName(key.tonic, key.tonic, key.minor) + (key.minor ? 'm' : ''); }

function scoreKey(evs, key) {
  let s = 0;
  evs.forEach((c, i) => {
    const n = evs[i + 1];
    if (inField(c, key)) s += 1;
    else if (n && isDominantQuality(c) && mod12(c.root - n.root) === 7) s += 0.5; // dominante secundária
    else if (borrowed(c, key)) s += 0.25;
    else s -= 0.75;
    // cadência na tônica
    // cadência V→I: V7 é marca forte do tom; tríade maior → tônica é fraca (I→IV também tem esse desenho)
    if (n && mod12(n.root - key.tonic) === 0 && triadQ(n) === (key.minor ? 'm' : 'M') && mod12(c.root - key.tonic) === 7 && isDominantQuality(c)) s += c.seventh === 'b7' ? 1.5 : 0.5;
  });
  const first = evs[0], last = evs[evs.length - 1];
  const isTonic = (c) => c && mod12(c.root - key.tonic) === 0 && triadQ(c) === (key.minor ? 'm' : 'M');
  if (isTonic(last)) s += 2.5;
  else if (key.minor && last && mod12(last.root - key.tonic) === 0 && triadQ(last) === 'M') s += 2.0; // terça de picardia
  if (isTonic(first)) s += 1.5;
  return s;
}

export function detectKey(evs, hint, opts = {}) {
  const cands = [];
  // tom cadastrado pesa mais quando é plausível (≥ 60% dos acordes no campo ou preparando um grau dele)
  let hintWeight = 1.0;
  if (hint) {
    const ok = evs.filter((c, i) => inField(c, hint) || borrowed(c, hint) || (evs[i + 1] && isDominantQuality(c) && mod12(c.root - evs[i + 1].root) === 7)).length;
    if (evs.length && ok / evs.length >= 0.6) hintWeight = 2.5;
  }
  for (let t = 0; t < 12; t++) for (const minor of [false, true]) {
    const key = { tonic: t, minor };
    let sc = scoreKey(evs, key);
    if (hint && hint.tonic === t && hint.minor === minor) sc += hintWeight; // tom cadastrado desempata
    cands.push({ key, score: sc });
  }
  cands.sort((a, b) => b.score - a.score);
  // tom cadastrado plausível só é contrariado com folga clara (evita trocar I por IV ou maior por menor)
  if (opts.cadastrado && hint && hintWeight > 1) {
    const h = cands.find((x) => x.key.tonic === hint.tonic && x.key.minor === hint.minor);
    const best = cands[0];
    // homônimo (Em × E): mesmo centro tonal; o modo cadastrado prevalece e as seções no outro modo viram "troca de modo"
    const homonimo = best.key.tonic === hint.tonic && best.key.minor !== hint.minor;
    if (h !== best && (homonimo || h.score >= best.score - Math.max(3, 0.12 * Math.abs(best.score)))) {
      return { key: h.key, score: h.score, runnerUp: best, hintKept: true };
    }
  }
  return { key: cands[0].key, score: cands[0].score, runnerUp: cands[1] };
}

// ---------------------------------------------------------------- análise funcional
// Para cada acorde: grau, função e papel (preparação, empréstimo, passagem…)
export function analyzeFunctions(seq, key, nextAfter = null) {
  const out = seq.map((c) => ({ chord: c.raw, c, degree: degreeLabel(c, key), role: null, func: null, target: null, transparent: false }));
  for (let i = 0; i < out.length; i++) {
    const a = out[i], c = a.c;
    const n = (out[i + 1] || (nextAfter ? { c: nextAfter } : null))?.c || null;
    const iv = mod12(c.root - key.tonic);
    const diat = inField(c, key);
    const targetLbl = n ? degreeLabel({ ...n, seventh: null, hasSlash: false, quality: triadQ(n) === 'dim' ? 'dim' : n.quality === 'hdim' ? 'dim' : n.quality === 'sus' ? 'M' : n.quality }, key) : null;

    // 1) dominante (principal ou secundária) — resolve uma quinta abaixo
    if (n && isDominantQuality(c) && mod12(c.root - n.root) === 7 && !isDim(n)) {
      const toTonic = mod12(n.root - key.tonic) === 0;
      if (iv === 7 && toTonic) {
        a.func = 'Dprin'; a.role = 'dominante principal (V→I)';
      } else if (diat && !c.seventh && !(key.minor && iv === 7)) {
        // tríade diatônica sem sétima (ex.: I→IV): é grau do campo, não preparação
        a.func = funcOf(iv, key);
      } else if (diat && c.seventh === 'b7' && diatonicSeventhIsMinor7(c, key) && !(iv === 7)) {
        a.func = funcOf(iv, key);
      } else {
        a.func = 'Dsec'; a.target = targetLbl; a.transparent = true;
        a.degree = (c.seventh ? 'V7/' : 'V/') + targetLbl;
        a.role = `dominante secundária — prepara o ${targetLbl}` + (iv === 0 && !key.minor ? ' (I com sétima vira V7/IV)' : '');
      }
    }
    // 1b) acorde maior/dominante FORA do campo cujo alvo natural (uma 5ª abaixo) é grau do campo,
    //     mas que não resolve nele: dominante secundária com resolução deceptiva/irregular
    else if (isDominantQuality(c) && !diat && !borrowed(c, key) && inField({ root: mod12(c.root - 7), quality: 'm', seventh: null }, key) | inField({ root: mod12(c.root - 7), quality: 'M', seventh: null }, key)) {
      const tgtPc = mod12(c.root - 7);
      const tq = inField({ root: tgtPc, quality: 'm' }, key) ? 'm' : 'M';
      const natural = degreeLabel({ root: tgtPc, quality: tq, seventh: null, hasSlash: false }, key);
      a.func = 'DsecDec'; a.target = natural; a.transparent = true;
      a.degree = (c.seventh ? 'V7/' : 'V/') + natural;
      a.role = `dominante secundária do ${natural} com resolução ${n ? 'deceptiva (vai para ' + targetLbl + ' em vez do ' + natural + ')' : 'adiada'}`;
    }
    // 2) SubV — dominante meio-tom acima do alvo
    else if (n && isDominantQuality(c) && c.seventh === 'b7' && mod12(c.root - n.root) === 1) {
      a.func = 'SubV'; a.target = targetLbl; a.transparent = true;
      a.degree = 'SubV7/' + targetLbl; a.role = `dominante substituta (trítono) — prepara o ${targetLbl}`;
    }
    // 3) diminutos
    else if (isDim(c) && n) {
      const d = mod12(n.root - c.root);
      a.transparent = true; a.target = targetLbl;
      if (d === 1) { a.func = 'dimPass'; a.degree = 'vii°/' + targetLbl; a.role = `diminuto de passagem ascendente — leva ao ${targetLbl}`; }
      else if (d === 0) { a.func = 'dimAux'; a.role = `diminuto auxiliar (bordadura) do ${targetLbl}`; }
      else if (d === 11) { a.func = 'dimDesc'; a.role = `diminuto de passagem descendente — leva ao ${targetLbl}`; }
      else { a.transparent = false; a.func = diat ? funcOf(iv, key) : 'crom'; a.role = diat ? null : 'diminuto cromático'; }
    }
    // 4) diatônico
    else if (diat) {
      a.func = funcOf(iv, key);
      if (key.minor && iv === 7 && triadQ(c) === 'M') a.role = 'V maior (menor harmônica)';
    }
    // 5) empréstimo modal
    else if (borrowed(c, key)) {
      a.func = 'emp'; a.role = 'empréstimo modal — ' + borrowed(c, key);
    }
    else { a.func = 'crom'; a.role = 'acorde cromático (fora do campo, sem resolução por quinta)'; }
  }
  // 6) ii cadencial: menor uma quinta acima de uma dominante que resolve
  for (let i = 0; i < out.length - 1; i++) {
    const a = out[i], b = out[i + 1];
    if (isMinorish(a.c) && (b.func === 'Dprin' || b.func === 'Dsec') && mod12(a.c.root - b.c.root) === 7) {
      const alvo = b.func === 'Dprin' ? (key.minor ? 'i' : 'I') : b.target;
      a.prepRole = `ii cadencial do ${alvo} (ii–V)`;
      if (b.func === 'Dsec') { a.degree = `ii/${alvo}`; a.transparent = !inField(a.c, key); a.func = inField(a.c, key) ? a.func : 'iiSec'; }
      a.role = a.role ? a.role + '; ' + a.prepRole : a.prepRole;
    }
  }
  for (let i = 0; i < out.length - 1; i++) {
    const a = out[i], b = out[i + 1];
    const cN = out[i + 2]?.c || (i + 2 === out.length ? nextAfter : null);
    if (a.prepRole || !cN || !isMinorish(a.c) || !isDominantQuality(b.c) || b.func === 'Dprin' || b.func === 'Dsec') continue;
    if (mod12(a.c.root - b.c.root) === 7 && mod12(b.c.root - cN.root) === 7 && mod12(cN.root - key.tonic) !== 0) {
      const alvo = degreeLabel({ root: cN.root, quality: triadQ(cN) === 'm' ? 'm' : 'M', seventh: null, hasSlash: false }, key);
      a.prepRole = `ii cadencial do ${alvo} (ii–V)`;
      if (!inField(a.c, key)) { a.degree = `ii/${alvo}`; a.func = 'iiSec'; a.transparent = true; }
      a.role = (a.role && !/empréstimo/.test(a.role) ? a.role + '; ' : '') + a.prepRole;
      b.role = `${b.degree} atua como V do ${alvo} (preparação)`;
      b.pivot = alvo;
    }
  }
  return out;
}
function funcOf(iv, key) {
  if (key.minor) return ({ 0: 'T', 3: 'T', 8: 'S', 5: 'S', 2: 'S', 7: 'D', 10: 'D', 11: 'D' })[iv] || 'T';
  return ({ 0: 'T', 9: 'T', 4: 'T', 5: 'S', 2: 'S', 7: 'D', 11: 'D' })[iv] || 'T';
}

// ---------------------------------------------------------------- preparações (relatório)
export function findPreparations(an) {
  const preps = [];
  an.forEach((a, i) => {
    if (a.func === 'Dsec' || a.func === 'DsecDec' || a.pivot || a.func === 'SubV' || a.func === 'Dprin' || a.func === 'dimPass' || a.func === 'dimDesc' || a.func === 'dimAux') {
      const tgt = an[i + 1];
      const prev = an[i - 1];
      const ii = prev && prev.prepRole && /ii cadencial/.test(prev.prepRole) ? prev : null;
      preps.push({
        type: a.pivot ? 'ii–V (pivô)' : ({ DsecDec: 'dominante secundária (resolução deceptiva)', Dprin: 'dominante', Dsec: 'dominante secundária', SubV: 'SubV', dimPass: 'diminuto de passagem', dimDesc: 'diminuto de passagem', dimAux: 'diminuto auxiliar' })[a.func],
        chords: [ii?.chord, a.chord, tgt?.chord].filter(Boolean),
        degrees: [ii?.degree, a.degree, tgt?.degree].filter(Boolean),
        target: tgt?.degree || a.target,
        text: a.pivot
          ? `${ii ? ii.chord + '–' : ''}${a.chord} → ${tgt ? tgt.chord : 'início da próxima seção'}: ii–V do ${a.pivot} (o ${a.chord}, ${a.degree} do tom, atua como V do ${a.pivot})`
          : (ii ? `${ii.chord}–` : '') + `${a.chord} → ${tgt ? tgt.chord : 'início da próxima seção'}: ` + (ii ? 'ii–V — ' : '') + (a.role || ''),
      });
    }
  });
  // só dominante principal sem ii não é "preparação" relevante: mantém só se tiver ii
  return preps.filter((p) => p.type !== 'dominante' || p.chords.length === 3);
}

// ---------------------------------------------------------------- cadências
export function findCadences(an, key, isSectionEnd = true) {
  const cad = [];
  for (let i = 0; i < an.length - 1; i++) {
    const a = an[i], b = an[i + 1];
    const ivB = mod12(b.c.root - key.tonic), ivA = mod12(a.c.root - key.tonic);
    const tonicB = ivB === 0 && triadQ(b.c) === (key.minor ? 'm' : 'M') && !b.transparent;
    if (a.func === 'Dprin' && tonicB) cad.push({ at: i, type: 'autêntica', text: `${a.chord}→${b.chord} (V→I)` });
    else if (tonicB && ivA === 5) cad.push({ at: i, type: 'plagal', text: `${a.chord}→${b.chord} (${a.degree}→${b.degree})` + (isMinorish(a.c) && !key.minor ? ' — plagal menor (iv emprestado)' : '') });
    else if (ivA === 7 && isDominantQuality(a.c) && ivB === (key.minor ? 8 : 9)) cad.push({ at: i, type: 'deceptiva', text: `${a.chord}→${b.chord} (V→${b.degree}, interrompida)` });
  }
  const last = an[an.length - 1];
  if (isSectionEnd && last && mod12(last.c.root - key.tonic) === 7 && isDominantQuality(last.c)) cad.push({ at: an.length - 1, type: 'semicadência', text: `seção termina no ${last.degree} (suspensa, pede continuação)` });
  return cad;
}

// ---------------------------------------------------------------- linhas (caída / subida)
export function findLines(seq, key) {
  const lines = [];
  const scale = key.minor ? [0, 2, 3, 5, 7, 8, 10, 11] : [0, 2, 4, 5, 7, 9, 11];
  const inScale = (pc) => scale.includes(mod12(pc - key.tonic));
  const name = (pc) => noteName(pc, key.tonic, key.minor);
  // (a) linha do baixo (baixo invertido ou fundamental)
  const scan = (getPc, label) => {
    let i = 0;
    while (i < seq.length - 2) {
      const d0 = signedStep(getPc(seq[i]), getPc(seq[i + 1]));
      if (!d0 || Math.abs(d0) > 2) { i++; continue; }
      const dir = Math.sign(d0);
      let j = i + 1;
      while (j < seq.length - 1) {
        const d = signedStep(getPc(seq[j]), getPc(seq[j + 1]));
        if (!d || Math.sign(d) !== dir || Math.abs(d) > 2) break;
        j++;
      }
      if (j - i >= 2) {
        const pcs = seq.slice(i, j + 1).map(getPc);
        const steps = pcs.slice(1).map((p, k) => Math.abs(signedStep(pcs[k], p)));
        const allChrom = steps.every((s) => s === 1);
        const hasChrom = steps.some((s) => s === 1) && pcs.some((p) => !inScale(p));
        const kind = allChrom ? 'cromática' : hasChrom ? 'diatônica com passagem cromática' : 'diatônica (melódica)';
        const usesSlash = seq.slice(i, j + 1).some((c) => c.hasSlash);
        lines.push({
          type: dir < 0 ? 'caída' : 'subida', kind, voice: label, slash: usesSlash,
          chords: seq.slice(i, j + 1).map((c) => c.raw), notes: pcs.map(name),
          text: `${dir < 0 ? 'Caída' : 'Subida'} ${kind} ${label === 'baixo' ? 'no baixo' : 'nas fundamentais'}: ${pcs.map(name).join(' → ')} (${seq.slice(i, j + 1).map((c) => c.raw).join(' ')})`,
        });
        i = j;
      } else i++;
    }
  };
  const anySlash = seq.some((c) => c.hasSlash);
  scan((c) => c.bass, anySlash ? 'baixo' : 'fundamental');
  // (b) clichê de voz interna sobre o mesmo baixo: C C+ C6 C7  /  Am Am7M Am7 Am6
  for (let i = 0; i < seq.length - 2; i++) {
    const run = [seq[i]];
    let j = i + 1;
    while (j < seq.length && seq[j].root === seq[i].root && seq[j].quality === seq[i].quality || (j < seq.length && seq[j].root === seq[i].root && ['aug', 'M'].includes(seq[j].quality) && seq[i].quality === 'M')) { run.push(seq[j]); j++; }
    if (run.length >= 3) {
      const v = run.map(innerVoice);
      if (v.every((x) => x !== null)) {
        const dir = Math.sign(v[v.length - 1] - v[0]);
        if (dir) lines.push({ type: dir < 0 ? 'caída' : 'subida', kind: 'cromática', voice: 'voz interna', chords: run.map((c) => c.raw), text: `Linha cromática ${dir < 0 ? 'descendente' : 'ascendente'} na voz interna sobre ${run[0].raw}: ${run.map((c) => c.raw).join(' → ')}` });
      }
      i = j - 1;
    }
  }
  return lines;
}
function signedStep(a, b) { const d = mod12(b - a); if (d === 0) return 0; return d <= 6 ? d : d - 12; }
function innerVoice(c) { // nota que caminha acima da tríade: 5ª,#5,6,b7,7M (maiores) / 8,7M,7,6 (menores)
  if (c.quality === 'aug') return 8;
  if (c.quality === 'M' || c.quality === 'm') {
    if (!c.seventh) return c.quality === 'M' ? 7 : 12;
    return ({ '6': 9, b7: 10, maj7: 11 })[c.seventh];
  }
  return null;
}

// ---------------------------------------------------------------- cadeias de quintas
// elo de trítono do ciclo diatônico: IV→vii(°) no maior, VI→ii(°) no menor (ambos do campo)
function tritoneLink(a, b) {
  return mod12(a.c.root - b.c.root) === 6 && triadQ(a.c) === 'M' && !a.transparent && (isMinorish(b.c) || isDim(b.c)) && a.func !== 'crom' && a.func !== 'emp';
}
export function findFifthChains(an) {
  const chains = [];
  let i = 0;
  while (i < an.length - 1) {
    let j = i;
    // a cadeia termina ao chegar na tônica (resolução); só pode começar nela
    const isTon = (x) => !x.transparent && /^(I|i)$/.test(normDeg(x.degree));
    while (j < an.length - 1 && (j === i || !isTon(an[j])) && (mod12(an[j].c.root - an[j + 1].c.root) === 7 || tritoneLink(an[j], an[j + 1]))) j++;
    const links = j - i;
    if (links >= 3) {
      const seg = an.slice(i, j + 1);
      const withSec = seg.some((x) => x.func === 'Dsec');
      chains.push({ anStart: i, anEnd: j, chords: seg.map((x) => x.chord), degrees: seg.map((x) => x.degree), links, withSecondary: withSec, text: `Ciclo das quintas (${links} elos)${withSec ? ' com dominantes secundárias' : ' diatônico'}: ${seg.map((x) => x.chord).join(' → ')}` });
    }
    i = Math.max(j, i + 1);
  }
  return chains;
}

// ---------------------------------------------------------------- catálogo
// tipo 'vocab'  : identifica pelo VOCABULÁRIO de graus (todos obrigatórios presentes, nada além do permitido)
// tipo 'loop'   : ciclo de N graus em ORDEM; qualquer rotação é a mesma progressão ("partindo do X")
// tipo 'linear' : sequência em ORDEM, sem rotação
// Graus aceitam sétima opcional (V = V ou V7). Acordes "transparentes" (preparações) são
// removidos antes do casamento e registrados como variação.
export const CATALOGO_PADRAO = [
  { name: 'TERRA', mode: 'major', type: 'vocab', required: ['I', 'V'], allowed: ['I', 'V'], priority: 1 },
  { name: 'CHÃO', mode: 'major', type: 'vocab', required: ['I', 'IV'], allowed: ['I', 'IV'], priority: 1 },
  { name: 'RAIZ', mode: 'major', type: 'vocab', required: ['I', 'IV', 'V'], allowed: ['I', 'IV', 'V'], priority: 2 },
  { name: 'TERRA MENOR', mode: 'minor', type: 'vocab', required: ['i', 'V'], allowed: ['i', 'V', 'v'], priority: 1 },
  { name: 'CHÃO MENOR', mode: 'minor', type: 'vocab', required: ['i', 'iv'], allowed: ['i', 'iv'], priority: 1 },
  { name: 'RAIZ MENOR', mode: 'minor', type: 'vocab', required: ['i', 'iv', 'V'], allowed: ['i', 'iv', 'V', 'v'], priority: 2 },
  { name: 'QUADRADINHO', mode: 'major', type: 'loop', pattern: ['I', 'vi', 'ii', 'V'], priority: 5 },
  { name: 'ANOS 60', mode: 'major', type: 'loop', pattern: ['I', 'vi', 'IV', 'V'], priority: 5 },
  { name: 'BOMBADONA', mode: 'major', type: 'loop', pattern: ['I', 'V', 'vi', 'IV'], priority: 5 },
  { name: 'TRISTEZA', mode: 'major', type: 'loop', pattern: ['ii', 'vi', 'IV', 'V'], priority: 5 },
  { name: 'EMOCIONAL', mode: 'major', type: 'loop', pattern: ['I', 'vi', 'iii', 'IV'], priority: 5 },
  { name: 'HARMÔNICA', mode: 'major', type: 'loop', pattern: ['I', 'V', 'iii', 'IV'], priority: 5 },
  { name: 'SINONIMOS', mode: 'major', type: 'loop', pattern: ['I', 'V', 'ii', 'IV'], priority: 5 },
  { name: 'POP EXPANSIVO', mode: 'major', type: 'loop', pattern: ['I', 'IV', 'vi', 'V'], priority: 5 },
  { name: 'POP MELODICO', mode: 'major', type: 'loop', pattern: ['I', 'iii', 'IV', 'V'], priority: 5 },
  { name: 'CANÇAO', mode: 'major', type: 'loop', pattern: ['I', 'ii', 'IV', 'V'], priority: 5 },
  { name: 'ROCK FOLK', mode: 'major', type: 'loop', pattern: ['I', 'V', 'IV', 'V'], priority: 4 },
  { name: 'POP ALTERNATIVO', mode: 'major', type: 'loop', pattern: ['I', 'III', 'vi', 'IV'], priority: 6 },
  { name: 'POP DRAMATICO', mode: 'major', type: 'linear', pattern: ['I', 'III', 'IV', 'iv'], priority: 6 },
  { name: 'Pachelbel', mode: 'major', type: 'linear', pattern: ['I', 'V', 'vi', 'iii', 'IV', 'I', 'IV', 'V'], partial: 5, priority: 7 },
  { name: 'FLAMENCO', mode: 'major', type: 'linear', pattern: ['vi', 'V', 'IV', 'iii'], priority: 6 },
  { name: 'CICLO DAS QUINTAS', mode: 'major', type: 'linear', pattern: ['iii', 'vi', 'ii', 'V', 'I'], partial: 4, priority: 6 },
  { name: 'CADÊNCIA PREPARATÓRIA', mode: 'any', type: 'linear', pattern: ['ii', 'V', 'I'], priority: 3 },
  { name: 'Ciclo Menor', mode: 'minor', type: 'loop', pattern: ['i', 'VII', 'III'], priority: 4 },
  { name: 'CADÊNCIA ANDALUZA', mode: 'minor', type: 'linear', pattern: ['i', 'VII', 'VI', 'V'], priority: 6 },
];

// normaliza grau para casamento: tira sétima/inversão; V/x continua V/x
function normDeg(d) { return d.replace(/\/[0-9b#]+$/, '').replace(/(7M|7|6|sus|9)$/g, '').replace(/7$/, ''); }
// ° e ø não mudam o grau para casamento (ii° do menor = ii da cadência; vii° = vii)
const cmpDeg = (d) => normDeg(d).replace(/[°ø]/g, '');
function degEq(a, b) { return cmpDeg(a) === cmpDeg(b); }
// padrão 'ambos' aplicado em tom menor: a tônica I vira i (ii–V–I → ii–V–i)
const toMinorTok = (t) => (t === 'I' ? 'i' : t);

function findSeq(pattern, skel, allowRotation, minLen) {
  const hits = [];
  const n = pattern.length;
  const rots = allowRotation ? n : 1;
  for (let r = 0; r < rots; r++) {
    const pat = pattern.slice(r).concat(pattern.slice(0, r));
    for (let len = n; len >= (minLen || n); len--) {
      const p = pat.slice(0, len);
      for (let i = 0; i + len <= skel.length; i++) {
        let ok = true;
        for (let k = 0; k < len; k++) if (!degEq(skel[i + k], p[k])) { ok = false; break; }
        if (ok) hits.push({ start: i, end: i + len - 1, rotation: r, len, full: len === n });
      }
      if (hits.length) break;
    }
  }
  return hits;
}

// Converte o padrão do catálogo do app ("I – V – vi – iii", "I-V7-I", "IV vi V I") em tokens
export function patternTokens(p) {
  return String(p || '').replace(/[–—]/g, '-').split(/[\s,\-]+/).map((t) => t.trim()).filter((t) => t && t !== 'N/A');
}

export function matchProgressions(an, key, catalogo = CATALOGO_PADRAO) {
  // esqueleto: remove preparações transparentes e repetições consecutivas,
  // guardando de que trecho da seção original cada grau veio
  const skel = [], spans = [];
  an.forEach((a, i) => {
    if (a.transparent) return;
    const d = normDeg(a.degree);
    if (skel.length && skel[skel.length - 1] === d) { spans[spans.length - 1][1] = i; return; }
    skel.push(d); spans.push([i, i]);
  });
  const anRange = (s, e) => [s === 0 ? 0 : spans[s][0], e === skel.length - 1 ? an.length - 1 : spans[e][1]];
  const vocabRes = [], seqRes = [];
  const lineRes = [];
  // caída/subida longa vira progressão (Queda Melódica / Descida Cromática / Subida Cromática)
  for (const ln of findLines(an.map((a) => a.c), key)) {
    if (ln.voice === 'voz interna') continue;
    const name = ln.type === 'caída' ? (ln.kind === 'cromática' ? 'Descida Cromática' : 'Queda Melódica') : (ln.kind === 'cromática' ? 'Subida Cromática' : null);
    if (!name) continue;
    const minLen = ln.kind === 'cromática' ? 3 : 4;
    if (ln.chords.length < minLen) continue;
    const s0 = an.findIndex((a, i) => an.slice(i, i + ln.chords.length).map((x) => x.chord).join(' ') === ln.chords.join(' '));
    if (s0 < 0) continue;
    lineRes.push({ name, type: 'line', entry: { name, priority: 2 }, anStart: s0, anEnd: s0 + ln.chords.length - 1, cover: ln.chords.length, len: ln.chords.length, line: ln, start: -1, end: -1 });
  }
  const inLine = new Set();
  lineRes.filter((l) => l.cover >= 4).forEach((l) => { for (let k = l.anStart; k <= l.anEnd; k++) inLine.add(k); });
  // grau do esqueleto que só aparece dentro de uma caída/subida é passagem, não sai do campo
  const skelInLine = spans.map(([a0, a1]) => { for (let k = a0; k <= a1; k++) if (!inLine.has(k)) return false; return true; });
  // leitura pelo relativo maior (seções menores): mesmo esqueleto, graus contados a partir do relativo
  const relKey = key.minor ? { tonic: mod12(key.tonic + 3), minor: false } : null;
  const relSkel = relKey ? spans.map(([a0]) => normDeg(degreeLabel(an[a0].c, relKey))) : null;
    for (const e of catalogo) {
    if (e.mode === 'major' && key.minor) {
      if (e.type === 'vocab' || !relSkel) continue;
      if (e.pattern.every((d) => ['I', 'IV', 'V'].includes(normDeg(d)))) continue; // RAIZ/ROCK no relativo não faz sentido
      const hitsR = findSeq(e.pattern, relSkel, e.type === 'loop', e.partial || e.pattern.length);
      for (const h of hitsR) seqRes.push({ ...h, name: e.name, type: e.type, entry: { ...e, priority: (e.priority || 0) - 1 }, cover: h.len, relative: keyName(relKey), relSkel });
      continue;
    }
    if (e.mode === 'minor' && !key.minor) continue;
    if (e.type === 'vocab') {
      if (!skel.length) continue;
      const set = new Set(skel);
      if (!e.required.every((r) => set.has(r))) continue;
      const out = skel.filter((d, i) => !e.allowed.includes(d) && !skelInLine[i]);
      const outShare = out.length / skel.length;
      if (out.length === 0 || (outShare <= 0.15 && new Set(out).size <= 2)) {
        vocabRes.push({ entry: e, name: e.name, type: 'vocab', start: 0, end: skel.length - 1, cover: skel.length - out.length, outside: [...new Set(out)] });
      }
      continue;
    }
    const pat = key.minor && e.mode === 'any' ? e.pattern.map(toMinorTok) : e.pattern;
    let hits = findSeq(pat, skel, e.type === 'loop', e.partial || e.pattern.length);
    if (e.type === 'loop' && e.pattern.every((d) => ['I', 'IV', 'V', 'i', 'iv'].includes(d))) {
      // ciclo só de graus primários: exige duas voltas seguidas, senão é só RAIZ
      hits = hits.filter((h) => hits.some((o) => o.start === h.start + e.pattern.length && o.rotation === h.rotation)).map((h) => ({ ...h, end: h.end + e.pattern.length, len: h.len * 2 }));
    }
    for (const h of hits) seqRes.push({ ...h, name: e.name, type: e.type, entry: e, cover: h.len });
  }
  // cadeia de quintas com dominantes secundárias vira progressão CICLO DAS QUINTAS
  for (const ch of findFifthChains(an)) {
    if (!ch.withSecondary && ch.links < 4) continue; // diatônico só com 4+ elos
    const e = catalogo.find((x) => x.name === 'CICLO DAS QUINTAS') || { name: 'CICLO DAS QUINTAS', priority: 6 };
    seqRes.push({ name: e.name, type: 'chain', entry: e, anStart: ch.anStart, anEnd: ch.anEnd, cover: ch.links + 1, len: ch.links + 1, chain: ch, start: -1, end: -1 });
  }
  seqRes.push(...lineRes);
  // escolhe trechos sem sobreposição: maior cobertura, prioridade, mais cedo
  seqRes.sort((x, y) => (y.cover * 10 + (y.entry.priority || 0)) - (x.cover * 10 + (x.entry.priority || 0)) || (x.start - y.start));
  const usedAn = new Array(an.length).fill(false);
  const chosen = [];
  for (const r of seqRes) {
    const [s0, e0] = (r.type === 'chain' || r.type === 'line') ? [r.anStart, r.anEnd] : anRange(r.start, r.end);
    // linhas (caída/subida) podem dividir o acorde de chegada/partida com outra progressão
    const [i0, i1] = r.type === 'line' ? [s0 + 1, e0 - 1] : [s0, e0];
    let free = true; for (let k = i0; k <= i1; k++) if (usedAn[k] === true) free = false;
    if (!free) continue;
    for (let k = s0; k <= e0; k++) usedAn[k] = (r.type === 'line' && (k === s0 || k === e0)) ? (usedAn[k] || 'edge') : true;
    r.anStart = s0; r.anEnd = e0;
    chosen.push(r);
  }
  chosen.sort((x, y) => x.anStart - y.anStart);
  const seqCover = chosen.reduce((t, r) => t + r.cover, 0);
  vocabRes.sort((x, y) => y.cover - x.cover || (y.entry.priority || 0) - (x.entry.priority || 0));
  const voc = vocabRes[0];
  let final;
  // vocabulário (TERRA/CHÃO/RAIZ) vence quando explica a seção tão bem quanto os ciclos;
  // ciclos só se impõem se cobrirem mais (ex.: refrão com vi/ii/iii)
  if (voc && (voc.cover >= seqCover || seqCover < 4)) {
    voc.anStart = 0; voc.anEnd = an.length - 1;
    final = [voc, ...chosen.filter((c) => c.type === 'chain' || c.type === 'line' || (c.entry.pattern || []).some((d) => !voc.entry.allowed.includes(d)))];
  } else final = chosen;
  return { skeleton: skel, matches: final.map((m) => describeMatch(m, an, skel)) };
}

function describeMatch(m, an, skel) {
  const e = m.entry;
  const seg = an.slice(m.anStart, m.anEnd + 1);
  const parts = [];
  if (m.relative) parts.push(`no relativo maior (${m.relative})`);
  if (m.type === 'loop' && m.rotation) parts.push(`partindo do ${e.pattern[m.rotation]}`);
  if ((m.type === 'linear' || m.type === 'loop') && !m.full && e.partial) parts.push(`parcial (${m.len} de ${e.pattern.length} graus)`);
  if (m.type === 'vocab' && m.outside?.length) parts.push(`com ${m.outside.join(', ')} fora do campo ${e.name}`);
  if (m.type === 'chain') parts.push(`${m.chain.links} elos, ${m.chain.withSecondary ? 'com dominantes secundárias' : 'diatônico'}`);
  if (m.type === 'line') parts.push(`${m.line.kind} ${m.line.voice === 'baixo' ? 'no baixo' : 'nas fundamentais'}: ${m.line.notes.join(' → ')}`);
  const tags = new Set();
  seg.forEach((x) => {
    if ((x.func === 'Dsec' || x.func === 'DsecDec') && m.type !== 'chain' && m.type !== 'line') tags.add('com preparação ' + x.degree);
    if (x.func === 'SubV') tags.add('com SubV ' + x.degree);
    if (x.func?.startsWith('dim')) tags.add('com diminuto de passagem');
    if (x.func === 'iiSec') tags.add('com ii–V secundário ' + x.degree);
    if (x.func === 'emp') tags.add('com empréstimo ' + x.degree);
    if (x.prepRole && /ii cadencial/.test(x.prepRole) && !x.transparent && !(e.pattern || []).includes('ii') && m.type !== 'chain') tags.add('com ii cadencial');
  });
  const variation = [...parts, ...tags].join('; ') || null;
  const segment = m.type === 'vocab' ? skel.join('-') : (m.type === 'chain' || m.type === 'line') ? seg.map((x) => x.degree).join('-') : skel.slice(m.start, m.end + 1).join('-') + (m.relative ? ` (= ${m.relSkel.slice(m.start, m.end + 1).join('-')} em ${m.relative})` : '');
  return { name: e.name, type: m.type, start: m.anStart, end: m.anEnd, segment, variation };
}

// ---------------------------------------------------------------- análise completa
export function analisarMusica(cifraText, mainKey, catalogo = CATALOGO_PADRAO) {
  const secs = parseCifra(cifraText);
  const all = secs.flatMap((s) => s.events);
  const warnings = [];
  if (!all.length) return { ok: false, warnings: ['Cifra sem acordes reconhecíveis'], sections: [] };
  const hint = parseKey(mainKey);
  const det = detectKey(collapse(all), hint, { cadastrado: true });
  const key = det.key;
  if (hint && (hint.tonic !== key.tonic || hint.minor !== key.minor)) {
    const rel = hint.minor !== key.minor && mod12(hint.tonic + (hint.minor ? 3 : -3)) === key.tonic;
    warnings.push(`Tom cadastrado ${mainKey} × tom detectado ${keyName(key)}${rel ? ' (relativo — conferir onde a música repousa)' : ''}`);
  }
  const seen = new Map();
  const sections = [];
  secs.forEach((s, idx) => {
    const seq = collapse(s.events);
    const sig = seq.map((c) => c.raw).join(' ');
    const base = s.name.replace(/\s*\d+$/, '').trim();
    const sigKey = base + '|' + sig;
    if (seen.has(sigKey)) { seen.get(sigKey).repeats++; return; }
    // tom local (modulação / troca de modo)
    let lk = key;
    if (seq.length >= 4) {
      const loc = detectKey(seq, key);
      const glob = scoreKey(seq, key);
      const k2 = loc.key;
      const isT = (c) => mod12(c.root - k2.tonic) === 0 && triadQ(c) === (k2.minor ? 'm' : 'M');
      // o novo tom precisa se afirmar: cadência V→I nele ou a seção repousar na sua tônica
      const afirma = seq.some((c, i) => i > 0 && isT(c) && mod12(seq[i - 1].root - k2.tonic) === 7 && isDominantQuality(seq[i - 1])) || isT(seq[seq.length - 1]);
      if ((k2.tonic !== key.tonic || k2.minor !== key.minor) && loc.score - glob >= 4 && afirma) lk = k2;
    }
    const nextSec = secs[idx + 1]?.events[0] || null;
    const an = analyzeFunctions(seq, lk, nextSec);
    const prog = matchProgressions(an, lk, catalogo);
    const sec = {
      section: s.name,
      key: keyName(key),
      modulated_key: lk === key ? null : keyName(lk),
      modulation_type: lk === key ? null : modulationType(key, lk),
      chords: seq.map((c) => c.raw),
      degrees: an.map((a) => a.degree),
      pattern: an.map((a) => a.degree).join(' – '),
      functions: an.map((a) => ({ chord: a.chord, degree: a.degree, func: a.func, role: a.role })),
      preparations: findPreparations(an),
      borrowed: an.filter((a) => a.func === 'emp').map((a) => ({ chord: a.chord, degree: a.degree, text: a.role })),
      chromatic: an.filter((a) => a.func === 'crom').map((a) => ({ chord: a.chord, degree: a.degree })),
      lines: findLines(seq, lk),
      fifth_chains: findFifthChains(an),
      cadences: findCadences(an, lk),
      skeleton: prog.skeleton.join('-'),
      progressions: prog.matches,
      repeats: 1,
    };
    // nome principal da seção: a progressão de acordes; a linha (caída/subida) só se for a única
    const principal = sec.progressions.find((p) => p.type !== 'line') || sec.progressions[0];
    sec.progression_name = principal?.name || null;
    sec.variation_name = principal?.variation || null;
    sec.notes = buildNotes(sec);
    seen.set(sigKey, sec);
    sections.push(sec);
  });
  // predominante: pondera pelo nº de acordes coberto × repetições
  const tally = {};
  sections.forEach((s) => s.progressions.forEach((p) => { const w = (p.end - p.start + 1) * s.repeats; tally[p.name] = (tally[p.name] || 0) + w; }));
  const pred = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
  const predSec = pred ? sections.find((s) => s.progressions.some((p) => p.name === pred[0])) : null;
  return {
    ok: true,
    key: keyName(key),
    key_confidence: +(det.score - det.runnerUp.score).toFixed(2),
    warnings,
    sections,
    predominant_progression: pred ? pred[0] : null,
    predominant_progression_pattern: predSec ? predSec.progressions.find((p) => p.name === pred[0]).segment : null,
    summary: summarize(sections),
  };
}

function modulationType(a, b) {
  if (a.tonic === b.tonic && a.minor !== b.minor) return 'troca de modo (homônimo)';
  if (a.minor !== b.minor && mod12(a.tonic + (a.minor ? 3 : -3)) === b.tonic) return 'tom relativo';
  const iv = mod12(b.tonic - a.tonic);
  if (iv === 1 || iv === 2) return `modulação ascendente de ${iv === 1 ? 'meio tom' : 'um tom'}`;
  if (iv === 7 || iv === 5) return 'modulação para tom vizinho (quinta)';
  return 'modulação';
}

function buildNotes(s) {
  const out = [];
  if (s.progressions.length) {
    const g = new Map();
    s.progressions.forEach((p) => { const k = `${p.name} [${p.segment}]` + (p.variation ? ` — ${p.variation}` : ''); g.set(k, (g.get(k) || 0) + 1); });
    out.push('Progressão: ' + [...g].map(([k, n]) => (n > 1 ? `${k} ×${n}` : k)).join(' + '));
  }
  else out.push('Sem progressão catalogada; esqueleto funcional: ' + s.skeleton);
  if (s.preparations.length) out.push('Preparações: ' + [...new Set(s.preparations.map((p) => p.text))].join(' | '));
  if (s.borrowed.length) out.push('Empréstimos: ' + [...new Set(s.borrowed.map((b) => `${b.chord} (${b.text.replace('empréstimo modal — ', '')})`))].join(', '));
  if (s.lines.length) out.push('Linhas: ' + [...new Set(s.lines.map((l) => l.text))].join(' | '));
  if (s.fifth_chains.length) out.push([...new Set(s.fifth_chains.map((c) => c.text))].join(' | '));
  if (s.cadences.length) out.push('Cadências: ' + s.cadences.map((c) => `${c.type} ${c.text}`).join('; '));
  if (s.modulated_key) out.push(`Tom local ${s.modulated_key} (${s.modulation_type})`);
  return out.join('\n');
}

function summarize(sections) {
  const prep = sections.flatMap((s) => s.preparations);
  const lines = sections.flatMap((s) => s.lines);
  const emp = sections.flatMap((s) => s.borrowed);
  return {
    preparations: prep.length, secondary_dominants: [...new Set(prep.filter((p) => p.type === 'dominante secundária').map((p) => p.degrees.find((d) => /^V/.test(d))))],
    lines: lines.length, borrowed: [...new Set(emp.map((e) => e.degree))],
  };
}

// Converte o resultado no formato do campo Song.progressions do app
export function paraSongProgressions(res) {
  return res.sections.map((s) => ({
    section: s.section,
    chords: s.chords,
    pattern: s.pattern,
    progression_name: s.progression_name,
    variation_name: s.variation_name,
    key: s.key,
    modulated_key: s.modulated_key,
    notes: s.notes,
  }));
}


// ---------------------------------------------------------------- catálogo vindo do app
const VOCAB_NAMES = { 'TERRA': ['I', 'V'], 'CHÃO': ['I', 'IV'], 'RAIZ': ['I', 'IV', 'V'], 'TERRA MENOR': ['i', 'V'], 'CHÃO MENOR': ['i', 'iv'], 'RAIZ MENOR': ['i', 'iv', 'V'] };
const tokNorm = (t) => normDeg(t.replace(/^(b|♭)/, 'b'));
const isMinorPattern = (toks) => toks[0] && /^i(?!i)/.test(toks[0]) || toks.includes('i');

// Converte registros da entidade Progression em catálogo do motor.
// Regras: (1) TERRA/CHÃO/RAIZ e versões menores = vocabulário; (2) padrão de 3–4 graus
// sem repetição = ciclo (rotação = mesma progressão, NÃO precisa cadastrar variações
// "partindo do X"); (3) demais = sequência linear. Registros 'N/A' (linhas cromáticas)
// são detectados pelo motor e ignorados aqui.
export function catalogoDoApp(registros) {
  const cat = [];
  for (const r of registros || []) {
    const toks = patternTokens(r.pattern).map(tokNorm);
    if (!toks.length || r.alias_de || r.tipo === 'linha') continue; // alias: a principal já cobre; linhas são automáticas
    const name = r.name.trim();
    const up = name.toUpperCase();
    if (r.tipo && r.tipo !== 'vocabulario' && !VOCAB_NAMES[up]) {
      const mode = r.modo === 'menor' ? 'minor' : r.modo === 'ambos' ? 'any' : 'major';
      cat.push({ name, id: r.id, mode, type: r.tipo === 'ciclo' ? 'loop' : 'linear', pattern: toks, partial: toks.length >= 5 ? Math.min(5, toks.length - 1) : undefined, priority: 4 + Math.min(toks.length, 4) / 2 });
      continue;
    }
    if (VOCAB_NAMES[up]) {
      const v = VOCAB_NAMES[up];
      cat.push({ name, mode: /MENOR/.test(up) ? 'minor' : 'major', type: 'vocab', required: v, allowed: v.concat(/MENOR/.test(up) ? ['v'] : []), priority: v.length - 1 });
      continue;
    }
    const uniq = new Set(toks).size === toks.length;
    const type = uniq && toks.length >= 3 && toks.length <= 4 && !/CAD[ÊE]NCIA/.test(up) ? 'loop' : 'linear';
    cat.push({ name, id: r.id, mode: isMinorPattern(toks) ? 'minor' : 'major', type, pattern: toks, partial: toks.length >= 5 ? toks.length - 1 : undefined, priority: 4 + Math.min(toks.length, 4) / 2 });
  }
  return cat;
}

