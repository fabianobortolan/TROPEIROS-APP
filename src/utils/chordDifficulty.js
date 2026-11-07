// Classificação de dificuldade de acordes (visão de violão didático).
// Nível da música = acorde mais difícil presente nas progressões.

export const difficultyLabels = {
  facil: "Fácil",
  medio: "Médio",
  dificil: "Difícil",
};

export const difficultyColors = {
  facil: "bg-green-100 text-green-800 border-green-200",
  medio: "bg-amber-100 text-amber-800 border-amber-200",
  dificil: "bg-red-100 text-red-800 border-red-200",
};

const LEVEL_ORDER = { facil: 1, medio: 2, dificil: 3 };

// Raízes com pestana (comuns no violão)
const BARRE_ROOTS = new Set(["F", "B"]);

export const getChordDifficulty = (chord) => {
  if (!chord) return null;
  const c = chord.trim();

  // Inversão / baixo diferente (slash chord) — ex: C/G, D/F#
  if (c.includes("/")) return "dificil";

  // Acordes alterados ou extendidos — ex: Cdim, C°, Caug, C+, C9, C11, C13, Cadd9, C6/9
  if (/(dim|°|aug|\+|add|9|11|13)/i.test(c)) return "dificil";

  // Acordes de sétima ou sus — ex: G7, Cmaj7, Am7, Dsus4
  if (c.includes("7") || /sus/i.test(c)) return "medio";

  // Raiz com acidente ou raiz de pestana — ex: F#, Bb, F, B, F#m, Bm
  const rootMatch = c.match(/^([A-G])(#|b)?/);
  if (!rootMatch) return null;
  const [, rootLetter, accidental] = rootMatch;
  if (accidental || BARRE_ROOTS.has(rootLetter.toUpperCase())) return "medio";

  // Tríades maiores/menores em raiz aberta — ex: C, G, Am, Em, Dm
  return "facil";
};

export const getSongDifficulty = (song) => {
  if (!song) return null;
  const chords = new Set();
  (song.progressions || []).forEach((prog) => {
    (Array.isArray(prog.chords) ? prog.chords : []).forEach((c) => {
      if (c && c.trim() && c.trim() !== "%") chords.add(c.trim());
    });
  });
  if (chords.size === 0) return null;

  let level = null;
  chords.forEach((chord) => {
    const d = getChordDifficulty(chord);
    if (d && (!level || LEVEL_ORDER[d] > LEVEL_ORDER[level])) level = d;
  });
  return level;
};