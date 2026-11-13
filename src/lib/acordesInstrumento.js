// =====================================================================
// ACORDES NO INSTRUMENTO — gera os desenhos (digitações) de qualquer
// acorde na viola caipira (Cebolão em Mi) e no violão (afinação padrão),
// sem depender de cadastro manual. Também mede a dificuldade de cada
// desenho (pestana, abertura, casa) — base da "Dica" de cada música.
// =====================================================================
import { parseChord } from "./motorHarmonico";
import { transposeChord, isChordLine, extractChords } from "@/utils/transposition";

const mod12 = (n) => ((n % 12) + 12) % 12;

// Afinação de cada ordem, da mais grave para a mais aguda (MIDI).
export const INSTRUMENTOS = {
  viola: {
    id: "viola",
    nome: "Viola",
    afinacao: "Cebolão em Mi",
    cordas: [47, 52, 56, 59, 64], // B E G# B E (5º par → 1º par)
    rotulos: ["B", "E", "G#", "B", "E"],
    minTocadas: 3,
    baixoObrigatorio: false, // pares 4 e 5 têm oitava: o baixo é menos rígido
  },
  violao: {
    id: "violao",
    nome: "Violão",
    afinacao: "E A D G B E",
    cordas: [40, 45, 50, 55, 59, 64],
    rotulos: ["E", "A", "D", "G", "B", "E"],
    minTocadas: 4,
    baixoObrigatorio: true,
  },
};

// ---------------------------------------------------------------- notas do acorde
// Retorna { raiz, baixo, temBarra, obrig: [intervalos], opc: [...], tensoes: [...] }
export function notasDoAcorde(nome) {
  const c = parseChord(nome);
  if (!c) return null;
  const r = c.ext || "";
  const obrig = new Set([0]);
  const opc = new Set();
  const tensoes = new Set();

  const b5 = /(b5|5-|5b|\(-5\))/.test(r);
  const s5 = /(#5|5\+|\(\+5\))/.test(r);
  const sus4 = c.quality === "sus" ? !/sus2/.test(r) : /(\(4\)|7\/4|7sus|^4)/.test(r) && c.quality === "M";
  const sus2 = c.quality === "sus" && /sus2/.test(r);

  if (c.quality === "m") obrig.add(3);
  else if (c.quality === "dim") { obrig.add(3); obrig.add(6); }
  else if (c.quality === "hdim") { obrig.add(3); obrig.add(6); obrig.add(10); }
  else if (c.quality === "aug") { obrig.add(4); obrig.add(8); }
  else if (sus2) obrig.add(2);
  else if (sus4) obrig.add(5);
  else obrig.add(4);

  if (c.quality !== "dim" && c.quality !== "hdim" && c.quality !== "aug") {
    if (b5) obrig.add(6);
    else if (s5) obrig.add(8);
    else opc.add(7);
  }

  if (c.seventh === "b7") obrig.add(10);
  else if (c.seventh === "maj7") obrig.add(11);
  else if (c.seventh === "dim7") obrig.add(9);
  else if (c.seventh === "6") obrig.add(9);
  if (c.quality === "dim" && c.seventh !== "dim7") opc.add(9); // ° na cifra brasileira costuma ser o diminuto com 7ª

  // Tensões (9, 11, 13 e alteradas) — preferidas, mas podem cair se não couberem
  const re = /(b|#|\+|-)?(9|11|13)(?![0-9])/g;
  let m;
  while ((m = re.exec(r)) !== null) {
    const alt = m[1] === "b" || m[1] === "-" ? -1 : m[1] === "#" || m[1] === "+" ? 1 : 0;
    const base = m[2] === "9" ? 2 : m[2] === "11" ? 5 : 9;
    tensoes.add(mod12(base + alt));
  }
  if (/add2|\(2\)|^2|^m2|^6\/?9|^m6\/?9/.test(r)) tensoes.add(2);
  for (const t of tensoes) { obrig.delete(t); opc.delete(t); }
  // Tríade pura (sem 7ª nem tensão): a 5ª faz parte do desenho
  if (opc.has(7) && obrig.size <= 2 && !tensoes.size) { opc.delete(7); obrig.add(7); }

  return {
    raiz: c.root,
    baixo: c.bass,
    temBarra: !!c.hasSlash,
    obrig: [...obrig],
    opc: [...opc],
    tensoes: [...tensoes],
    simetrico: c.quality === "dim" || c.quality === "aug",
  };
}

// ---------------------------------------------------------------- busca de desenhos
const ABERTURA = 3; // dedos cobrem até 4 casas seguidas (casa base + 3)
const CUSTO_ABERTURA = [0, 0, 0.7, 3.5];

// Formas conhecidas (desenhos que o músico já usa), como deslocamento a partir
// de uma casa n; null = ordem não tocada. Entram com preferência na lista.
const FORMAS = {
  violao: [
    [0, 2, 2, 1, 0, 0], [0, 2, 2, 0, 0, 0], [0, 2, 0, 1, 0, 0], [0, 2, 0, 0, 0, 0], [0, 2, 1, 1, 0, 0],
    [null, 0, 2, 2, 2, 0], [null, 0, 2, 2, 1, 0], [null, 0, 2, 0, 2, 0], [null, 0, 2, 0, 1, 0], [null, 0, 2, 1, 2, 0],
    [null, 0, 1, 0, 1, null], [null, null, 0, 1, 0, 1], [null, null, 0, 1, 1, 1],
  ],
  violaoAbertas: [
    [null, 3, 2, 0, 1, 0], [null, 3, 2, 3, 1, 0], [null, 3, 2, 0, 0, 0], [3, 2, 0, 0, 0, 3], [3, 2, 0, 0, 3, 3],
    [3, 2, 0, 0, 0, 1], [3, 2, 0, 0, 0, 2], [null, null, 0, 2, 3, 2], [null, null, 0, 2, 1, 2], [null, null, 0, 2, 3, 1],
    [null, null, 0, 2, 2, 2], [null, null, 0, 2, 1, 1], [1, 3, 3, 2, 1, 1], [1, 3, 3, 1, 1, 1], [2, 0, 0, 2, 3, 2],
    [null, 2, 1, 2, 0, 2], [null, 0, 2, 2, 0, 0], [null, 3, 2, 0, 3, 0], [null, 0, 0, 2, 3, 0],
  ],
  viola: [
    [0, 0, 0, 0, 0], [null, null, 1, 2, 0], [null, 1, 0, 2, 1], [2, 0, 1, 2, 0], [2, 1, 0, 2, null],
    [null, 0, 1, 1, 0], [null, 1, 0, 1, 1], [null, 0, 1, 2, 3], [null, 0, 0, 3, 0], [null, null, 0, 1, 1],
  ],
  violaAbertas: [[3, 2, 4, 3, 0], [null, 0, 0, 3, 0], [null, null, 4, 5, 3]],
};

function candidatosConhecidos(instId) {
  const out = [];
  const moveis = FORMAS[instId] || [];
  for (const f of moveis) for (let n = 0; n <= 10; n++) out.push(f.map((x) => (x === null ? null : x + n)));
  for (const f of FORMAS[`${instId}Abertas`] || []) out.push(f.slice());
  return out;
}

function avaliar(trastes, inst, notas, tons, exigirTensoes) {
  const n = trastes.length;
  const tocadas = trastes.map((f, i) => (f === null ? null : inst.cordas[i] + f));
  const qtd = tocadas.filter((x) => x !== null).length;
  if (qtd < inst.minTocadas) return null;

  // cordas abafadas só do lado grave (nada de "buraco" no meio)
  const primeira = trastes.findIndex((f) => f !== null);
  for (let i = primeira; i < n; i++) if (trastes[i] === null) return null;

  for (const x of tocadas) if (x !== null && !tons.has(mod12(x))) return null; // nota fora do acorde
  const pcs = new Set(tocadas.filter((x) => x !== null).map((x) => mod12(x - notas.raiz)));
  for (const o of notas.obrig) if (!pcs.has(o)) return null;
  const faltaTensao = notas.tensoes.filter((t) => !pcs.has(t)).length;
  if (exigirTensoes && faltaTensao) return null;

  const grave = mod12(tocadas[primeira]);
  // diminuto com 7ª é simétrico: qualquer nota dele serve de baixo
  const baixoCerto = grave === notas.baixo || (notas.simetrico && !notas.temBarra);
  if (inst.baixoObrigatorio && !baixoCerto) return null;

  // dedos e pestana
  const presas = trastes.filter((f) => f !== null && f > 0);
  const menor = presas.length ? Math.min(...presas) : 0;
  const maior = presas.length ? Math.max(...presas) : 0;
  if (maior - menor > ABERTURA) return null;
  let pestana = null;
  let dedos = presas.length;
  const naMenor = presas.filter((f) => f === menor).length;
  if (presas.length > 4 || (naMenor >= 3 && presas.length >= 4)) {
    // pestana na menor casa: da primeira ordem presa nessa casa até a mais aguda, sem corda solta no caminho
    const ini = trastes.findIndex((f) => f === menor);
    let livre = true;
    for (let i = ini; i < n; i++) if (trastes[i] === 0) livre = false;
    if (livre) {
      dedos = 1 + presas.filter((f) => f > menor).length;
      pestana = { casa: menor, de: ini };
    } else if (presas.length > 4) return null;
    if (dedos > 4) return null;
  }

  // corda solta "presa" entre notas altas é desconfortável
  let soltasNoMeio = 0;
  if (maior >= 4) {
    const ultimaPresa = trastes.reduce((u, f, i) => (f > 0 ? i : u), -1);
    for (let i = primeira; i < ultimaPresa; i++) if (trastes[i] === 0) soltasNoMeio++;
  }

  const soltas = trastes.filter((f) => f === 0).length;
  const abafadas = trastes.filter((f) => f === null).length;
  const custo =
    dedos * 1.0 +
    (pestana ? 3 : 0) +
    Math.max(0, maior - 4) * 0.7 +
    (presas.length ? CUSTO_ABERTURA[maior - menor] : 0) +
    (maior >= 5 ? soltas * 0.4 : -soltas * 0.3) +
    soltasNoMeio * 1.6 +
    abafadas * 0.6 +
    faltaTensao * 3 +
    (baixoCerto ? 0 : 1.2);
  return { trastes, custo, pestana, casaBase: menor, casaMax: maior, dedos, faltaTensao };
}

function chave(t) { return t.map((f) => (f === null ? "x" : f)).join(","); }

/**
 * Lista os desenhos possíveis de um acorde, do mais fácil para o mais difícil.
 * Cada desenho: { trastes: [por ordem, grave→agudo; null = não toca], custo, pestana, casaBase, casaMax }
 */
const cache = new Map();
export function desenhosDoAcorde(nome, instId = "viola", { casaLimite = 12 } = {}) {
  const k = `${instId}|${nome}|${casaLimite}`;
  if (cache.has(k)) return cache.get(k);
  const inst = INSTRUMENTOS[instId];
  const notas = notasDoAcorde(nome);
  if (!inst || !notas) { cache.set(k, []); return []; }
  const tons = new Set([...notas.obrig, ...notas.opc, ...notas.tensoes].map((i) => mod12(notas.raiz + i)));
  const n = inst.cordas.length;

  const achados = new Map();
  const guardar = (t, exigir, bonus) => {
    if (t.some((f) => f !== null && f > casaLimite)) return;
    const key = chave(t);
    const av = avaliar(t, inst, notas, tons, exigir);
    if (!av) return;
    av.custo -= bonus;
    av.conhecido = bonus > 0;
    const ant = achados.get(key);
    if (!ant || av.custo < ant.custo) achados.set(key, av);
  };

  for (const exigir of [true, false]) {
    if (!exigir && achados.size) break;
    for (const t of candidatosConhecidos(instId)) guardar(t, exigir, 3);
    for (let base = 0; base <= casaLimite - 1; base++) {
      const lo = base === 0 ? 1 : base;
      const hi = Math.min(casaLimite, lo + ABERTURA);
      const opcoes = inst.cordas.map((corda) => {
        const op = [null];
        if (tons.has(mod12(corda))) op.push(0);
        for (let f = lo; f <= hi; f++) if (tons.has(mod12(corda + f))) op.push(f);
        return op;
      });
      const atual = new Array(n);
      const rec = (i) => {
        if (i === n) {
          const t = atual.slice();
          if (!achados.has(chave(t))) guardar(t, exigir, 0);
          return;
        }
        for (const f of opcoes[i]) { atual[i] = f; rec(i + 1); }
      };
      rec(0);
    }
  }
  const lista = [...achados.values()].sort((a, b) => a.custo - b.custo);
  // variedade: no máximo 2 desenhos por região do braço
  const porRegiao = new Map();
  const out = [];
  for (const d of lista) {
    const reg = Math.floor(d.casaBase / 3);
    const q = porRegiao.get(reg) || 0;
    if (q >= 2) continue;
    porRegiao.set(reg, q + 1);
    out.push(d);
    if (out.length >= 8) break;
  }
  cache.set(k, out);
  return out;
}

export const melhorDesenho = (nome, instId) => desenhosDoAcorde(nome, instId)[0] || null;

// ---------------------------------------------------------------- acordes de uma cifra
export function acordesDaCifra(texto) {
  const vistos = [];
  for (const linha of String(texto || "").split("\n")) {
    if (!isChordLine(linha)) continue;
    for (const { chord } of extractChords(linha)) {
      const c = chord.trim();
      if (c && parseChord(c) && !vistos.includes(c)) vistos.push(c);
    }
  }
  return vistos;
}

// ---------------------------------------------------------------- dica da música
const custoDe = (nome, instId, casaLimite) => {
  const d = desenhosDoAcorde(nome, instId, { casaLimite })[0];
  return d ? d.custo : 30;
};
const precisaPestana = (nome, instId, casaLimite = 12) => {
  const d = desenhosDoAcorde(nome, instId, { casaLimite })[0];
  return !!(d && d.pestana);
};

/**
 * Monta a dica de uma música para o instrumento escolhido.
 * Retorna { pestana: [acordes], capo: {casa, desenhos:[{de, para}], semPestana} | null,
 *           tom: {semitons, desenhos, semPestana} | null, temDiminuto, barras: [acordes com baixo trocado] }
 */
export function dicaDaMusica(texto, instId = "viola", { useFlats = false } = {}) {
  const acordes = acordesDaCifra(texto);
  if (!acordes.length) return null;
  const pestana = acordes.filter((a) => precisaPestana(a, instId));
  const custoAtual = acordes.reduce((s, a) => s + custoDe(a, instId, 12), 0);

  // Capotraste: o desenho é o acorde "abaixado" pelo nº da casa
  let capo = null;
  for (let casa = 1; casa <= 7; casa++) {
    const desenhos = acordes.map((a) => transposeChord(a, -casa, false));
    const custo = desenhos.reduce((s, d) => s + custoDe(d, instId, 12 - casa), 0) + casa * 0.8; // capo alto incomoda
    const comPestana = desenhos.filter((d) => precisaPestana(d, instId, 12 - casa)).length;
    if (!capo || custo < capo.custo) capo = { casa, custo, comPestana, desenhos: acordes.map((de, i) => ({ de, para: desenhos[i] })) };
  }
  if (capo && !(capo.comPestana < pestana.length && capo.custo < custoAtual - 1.5)) capo = null;

  // Outro tom (só quando o capotraste não resolve; serve para tocar sem cantor preso ao tom)
  let tom = null;
  for (let st = -5; st <= 6 && !capo; st++) {
    if (st === 0) continue;
    const desenhos = acordes.map((a) => transposeChord(a, st, useFlats));
    const custo = desenhos.reduce((s, d) => s + custoDe(d, instId, 12), 0);
    const comPestana = desenhos.filter((d) => precisaPestana(d, instId)).length;
    if (!tom || custo < tom.custo) tom = { semitons: st, custo, comPestana, desenhos: acordes.map((de, i) => ({ de, para: desenhos[i] })) };
  }
  if (tom && !(tom.comPestana < pestana.length && tom.custo < custoAtual - 1.5)) tom = null;

  const temDiminuto = acordes.some((a) => parseChord(a)?.quality === "dim");
  const barras = acordes.filter((a) => parseChord(a)?.hasSlash);
  return { acordes, pestana, capo, tom, temDiminuto, barras };
}

// Instrumento escolhido (vale para todas as músicas neste aparelho)
const CHAVE_INST = "cifra:instrumento";
export const lerInstrumento = () => { try { const v = localStorage.getItem(CHAVE_INST); return INSTRUMENTOS[v] ? v : "viola"; } catch { return "viola"; } };
export const gravarInstrumento = (v) => { try { localStorage.setItem(CHAVE_INST, v); } catch { /* sem espaço */ } };
