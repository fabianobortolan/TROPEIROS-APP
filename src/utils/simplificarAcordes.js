// ---------------------------------------------------------------------------
// SIMPLIFICAR ACORDES — mostra a cifra com acordes mais fáceis, sem alterar a
// cifra gravada. Dois níveis:
//   "simples":   tira as notas de enfeite (9, 11, 13, 6, 7M, add, sus, baixo
//                trocado) e mantém o 7 (G7, Am7) e o meio-diminuto (Bm7(b5)).
//   "iniciante": só maior, menor e o 7 dominante (G7). Am7 → Am, Bm7(b5) → Bm.
// O diminuto (°) é mantido nos dois níveis: é curto e importante na harmonia.
// As colunas da linha de acordes são preservadas (os acordes seguintes não
// saem do lugar sobre a letra).
// ---------------------------------------------------------------------------
import { isChordLine, chordStartIndex } from "./transposition";

export const NIVEIS_SIMPLIFICACAO = [
  { id: "", nome: "Originais" },
  { id: "simples", nome: "Simples" },
  { id: "iniciante", nome: "Iniciante" },
];

// Mesmo formato reconhecido pelo transpositor:
// 1=raiz, 2=qualidade, 3=número, 4=alterações, 5=parênteses, 6=baixo
// 7=sinal brasileiro (5-, 7+), 8=números com barra (E7/9, C#m5-/7)
const ACORDE_RE =
  /\b([A-G][#b]?)(m(?:aj)?|M7?|dim|aug|sus[24]?|add\d+|°|º|\+)?(\d+(?:M)?)?((?:sus[24]?|add\d+|°|º|\+|b\d+|#\d+)*)((?:\([^)]*\))*)((?<=\d)[-+](?=[\s/()]|$))?((?:\/\d+[-+]?)*)(\/[A-G][#b]?)?(?=$|[\s)\]|,.;:!\-–/])/g;

export function simplificarAcorde(acorde, nivel = "simples") {
  if (!nivel || !acorde) return acorde;
  ACORDE_RE.lastIndex = 0;
  const m = ACORDE_RE.exec(acorde);
  if (!m || m.index !== 0 || m[0].length !== acorde.length) return acorde;
  return montar(m, nivel);
}

function montar(m, nivel) {
  const [, raiz, qual = "", num = "", alt = "", par = "", sinal = "", barras = ""] = m;
  const extras = `${alt}${par}${barras}`;
  const ehMaj = qual === "maj" || qual === "M" || qual === "M7" || /M$/.test(num);
  const menor = qual === "m";
  const dim = qual === "dim" || qual === "°" || qual === "º" || /[°º]/.test(extras);
  const seteMais = num === "7" && (sinal === "+" || alt.startsWith("+")); // "7+" = 7M na escrita brasileira
  const aum = !seteMais && (qual === "aug" || qual === "+" || /\+/.test(extras) || (sinal === "+" && num === "5"));
  const temB5 = /b5|5-/.test(`${extras}${num}${sinal}`);
  const numeros = [num, ...(barras.match(/\d+/g) || [])].map((x) => parseInt(x, 10)).filter((x) => !Number.isNaN(x));
  // 9/11/13 sem M já trazem o 7; "7+" (escrita brasileira) é 7M
  const ehMaj2 = ehMaj || seteMais;
  const tem7 = !ehMaj2 && numeros.some((x) => x === 7 || x === 9 || x === 11 || x === 13);

  if (dim) return `${raiz}°`;
  if (menor) {
    if (temB5 && tem7) return nivel === "iniciante" ? `${raiz}m` : `${raiz}m7(b5)`;
    if (tem7 && nivel === "simples") return `${raiz}m7`;
    return `${raiz}m`;
  }
  if (aum && !ehMaj2) return nivel === "iniciante" ? raiz : `${raiz}+`;
  if (tem7) return `${raiz}7`; // dominante: G7, G7(9), G13, G7sus4 → G7
  return raiz; // maior: C7M, C6, Cadd9, Csus4, C(9) → C
}

function simplificarTrecho(trecho, nivel) {
  // Troca da direita para a esquerda, mantendo cada acorde na mesma coluna
  const achados = [];
  ACORDE_RE.lastIndex = 0;
  let m;
  while ((m = ACORDE_RE.exec(trecho)) !== null) {
    if (!m[0]) { ACORDE_RE.lastIndex++; continue; }
    achados.push({ i: m.index, len: m[0].length, novo: montar(m, nivel) });
  }
  let out = trecho;
  for (let k = achados.length - 1; k >= 0; k--) {
    const { i, len, novo } = achados[k];
    const depois = out.slice(i + len);
    const fimDaLinha = !depois.trim();
    // Se o acorde novo é mais curto, completa com espaços para não puxar os próximos
    const colado = fimDaLinha ? novo : novo.padEnd(len, " ");
    // Se ficou mais longo (raro), garante ao menos um espaço antes do próximo
    const sep = !fimDaLinha && colado.length > len && depois[0] && depois[0] !== " " ? " " : "";
    out = out.slice(0, i) + colado + sep + depois;
  }
  return out.replace(/\s+$/, "");
}

export function simplificarCifra(texto, nivel) {
  if (!texto || !nivel) return texto;
  return texto
    .split("\n")
    .map((linha) => {
      if (!isChordLine(linha)) return linha;
      const ini = chordStartIndex(linha);
      return ini === 0 ? simplificarTrecho(linha, nivel) : linha.slice(0, ini) + simplificarTrecho(linha.slice(ini), nivel);
    })
    .join("\n");
}

// Diz se algum acorde da cifra muda ao simplificar (compara acorde por acorde;
// espaços no fim da linha e ° / º não contam como mudança)
export function temOQueSimplificar(texto, nivel = "iniciante") {
  if (!texto) return false;
  const igual = (a, b) => a.replace(/º/g, "°") === b.replace(/º/g, "°");
  for (const linha of texto.split("\n")) {
    if (!isChordLine(linha)) continue;
    const trecho = linha.slice(chordStartIndex(linha));
    ACORDE_RE.lastIndex = 0;
    let m;
    while ((m = ACORDE_RE.exec(trecho)) !== null) {
      if (!m[0]) { ACORDE_RE.lastIndex++; continue; }
      if (!igual(montar(m, nivel), m[0])) return true;
    }
  }
  return false;
}

// Preferência guardada no aparelho (vale para todas as músicas)
const CHAVE = "cifra:simplificar";
export const lerNivelSimplificacao = () => { try { return localStorage.getItem(CHAVE) || ""; } catch { return ""; } };
export const gravarNivelSimplificacao = (v) => { try { v ? localStorage.setItem(CHAVE, v) : localStorage.removeItem(CHAVE); } catch { /* sem espaço */ } };
