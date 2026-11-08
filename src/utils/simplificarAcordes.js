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
const ACORDE_RE =
  /\b([A-G][#b]?)(m(?:aj)?|M7?|dim|aug|sus[24]?|add\d+|°|º|\+)?(\d+(?:M)?)?((?:sus[24]?|add\d+|°|º|\+|b\d+|#\d+)*)((?:\([^)]*\))*)(\/[A-G][#b]?)?/g;

export function simplificarAcorde(acorde, nivel = "simples") {
  if (!nivel || !acorde) return acorde;
  ACORDE_RE.lastIndex = 0;
  const m = ACORDE_RE.exec(acorde);
  if (!m || m.index !== 0 || m[0].length !== acorde.length) return acorde;
  return montar(m, nivel);
}

function montar(m, nivel) {
  const [, raiz, qual = "", num = "", alt = "", par = ""] = m;
  const extras = `${alt}${par}`;
  const ehMaj = qual === "maj" || qual === "M" || qual === "M7" || /M$/.test(num);
  const menor = qual === "m";
  const dim = qual === "dim" || qual === "°" || qual === "º" || /[°º]/.test(extras);
  const aum = qual === "aug" || qual === "+" || /\+/.test(extras);
  const temB5 = /b5/.test(extras);
  const n = parseInt(num, 10);
  const tem7 = !ehMaj && (n === 7 || n === 9 || n === 11 || n === 13); // 9/11/13 sem M já trazem o 7

  if (dim) return `${raiz}°`;
  if (menor) {
    if (temB5 && tem7) return nivel === "iniciante" ? `${raiz}m` : `${raiz}m7(b5)`;
    if (tem7 && nivel === "simples") return `${raiz}m7`;
    return `${raiz}m`;
  }
  if (aum) return nivel === "iniciante" ? raiz : `${raiz}+`;
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

// Preferência guardada no aparelho (vale para todas as músicas)
const CHAVE = "cifra:simplificar";
export const lerNivelSimplificacao = () => { try { return localStorage.getItem(CHAVE) || ""; } catch { return ""; } };
export const gravarNivelSimplificacao = (v) => { try { v ? localStorage.setItem(CHAVE, v) : localStorage.removeItem(CHAVE); } catch { /* sem espaço */ } };
