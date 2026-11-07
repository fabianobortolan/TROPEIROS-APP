// Reanálise de progressões em lote — executa NO NAVEGADOR com o sistema unificado:
// recálculo determinístico dos graus (calculatePatternFromChords) + matching
// canonizado (findProgressionMatch). Substitui a função de backend "reanalyzeBatch",
// que está inacessível no plano atual e espelhava a lógica antiga (viés por nome,
// fallback case-insensitive e patterns em cache do LLM).
import { findProgressionMatch, calculatePatternFromChords, getAnalysisNotes } from "@/utils/progressionUtils";

export const getSectionType = (section) => {
  if (!section) return 'outros';
  const s = section.toLowerCase().trim();
  if (s.includes('verso') || s.includes('verse')) return 'verso';
  if (s.includes('pré-refrão') || s.includes('pre-refrão') || s.includes('pre-refrao')) return 'pré-refrão';
  if (s.includes('refrão') || s.includes('refrao') || s.includes('chorus')) return 'refrão';
  if (s.includes('ponte') || s.includes('bridge')) return 'ponte';
  if (s.includes('intro')) return 'intro';
  if (s.includes('solo')) return 'solo';
  if (s.includes('outro') || s.includes('final')) return 'outro';
  return 'outros';
};

// Recolhe seções idênticas do mesmo tipo em UMA entrada, rotulada pelo nome
// base da seção (ex: "Verso 1" e "Verso 2" idênticos → uma seção "Verso").
// Seções do mesmo tipo com acordes DIFERENTES mantêm seus rótulos originais.
export const mergeIdenticalSections = (progressions) => {
  const sigOf = (prog) => {
    const sectionType = getSectionType(prog.section || 'outros');
    const chords = (Array.isArray(prog.chords) ? prog.chords : []).join('-').toUpperCase();
    return `${sectionType}|${chords}`;
  };
  const counts = {};
  (progressions || []).forEach((p) => {
    const sig = sigOf(p);
    counts[sig] = (counts[sig] || 0) + 1;
  });
  const seen = new Set();
  const merged = [];
  for (const prog of (progressions || [])) {
    const sig = sigOf(prog);
    if (seen.has(sig)) continue;
    seen.add(sig);
    const section = counts[sig] > 1
      ? ((prog.section || '').replace(/\s+\d+.*$/, '').trim() || prog.section)
      : prog.section;
    merged.push({ ...prog, section });
  }
  return merged;
};

export const determinePredominantProgression = (progressions) => {
  if (!progressions || progressions.length === 0) return null;
  const sectionWeights = {
    'refrão': 4, 'refrao': 4, 'chorus': 4, 'verso': 2.5, 'verse': 2.5,
    'estrofe': 2.5, 'pré-refrão': 2, 'pre-refrão': 2, 'pre-refrao': 2,
    'ponte': 2, 'bridge': 2, 'solo': 1.5, 'intro': 1, 'introdução': 1, 'outro': 1, 'final': 1
  };
  const progressionScores = {};
  progressions.forEach((prog, index) => {
    if (!prog.progression_name) return;
    const section = (prog.section || '').toLowerCase().trim();
    let weight = 1;
    let sectionType = 'outro';
    for (const [key, value] of Object.entries(sectionWeights)) {
      if (section.includes(key)) { weight = value; sectionType = key; break; }
    }
    if (index === 0) weight *= 1.2;
    const occBonus = progressions.filter(p =>
      p.progression_name === prog.progression_name && (p.section || '').toLowerCase().includes(sectionType)
    ).length;
    if (occBonus > 1) weight *= (1 + (occBonus - 1) * 0.3);
    if (!progressionScores[prog.progression_name]) {
      progressionScores[prog.progression_name] = { score: 0, occurrences: 0, sections: [], sectionTypes: [], pattern: prog.pattern };
    }
    progressionScores[prog.progression_name].score += weight;
    progressionScores[prog.progression_name].occurrences += 1;
    progressionScores[prog.progression_name].sections.push(section);
    progressionScores[prog.progression_name].sectionTypes.push(sectionType);
  });
  const sortedScores = Object.entries(progressionScores).sort(([, a], [, b]) => b.score - a.score);
  if (sortedScores.length === 0) return null;

  if (sortedScores.length === 1) {
    const [name, data] = sortedScores[0];
    return { name, pattern: data.pattern };
  }

  const [firstName, firstData] = sortedScores[0];
  const [secondName, secondData] = sortedScores[1];
  const scoreDiff = (firstData.score - secondData.score) / firstData.score;

  if (scoreDiff < 0.15) {
    if (firstData.occurrences > secondData.occurrences) return { name: firstName, pattern: firstData.pattern };
    if (firstData.sectionTypes.some(t => ['refrão', 'refrao', 'chorus'].includes(t))) {
      return { name: firstName, pattern: firstData.pattern };
    }
    return { name: secondName, pattern: secondData.pattern };
  }

  return { name: firstName, pattern: firstData.pattern };
};

// ── Modo rápido (Identificar): recalcula os graus a partir dos ACORDES de cada
// seção (fonte única da verdade) e re-identifica com o matching canonizado. ─────
export const identifySongProgressions = (song, knownProgressions, learningPatterns) => {
  const existing = song.progressions || [];
  if (existing.length === 0) return { skipped: true, reason: 'Sem progressões para identificar' };

  const mainKey = song.main_key || 'C';
  const progressions = existing.map(prog => {
    const progKey = prog.key || mainKey;
    const cleanedChords = (Array.isArray(prog.chords) ? prog.chords : []).filter(c => c && c.trim() !== '%');
    const recalcPattern = calculatePatternFromChords(cleanedChords, progKey);
    const finalPattern = recalcPattern || prog.pattern || '';
    const match = finalPattern
      ? findProgressionMatch(finalPattern, knownProgressions, learningPatterns, getSectionType(prog.section))
      : null;
    const notes = getAnalysisNotes(cleanedChords, progKey) || (prog.notes || null);
    return {
      ...prog,
      chords: cleanedChords,
      key: progKey,
      pattern: finalPattern,
      notes,
      progression_name: match?.progression_name || prog.progression_name || null,
      variation_name: match?.variation_name || prog.variation_name || null,
    };
  });

  const predominant = determinePredominantProgression(progressions);
  return {
    updates: {
      progressions,
      predominant_progression: predominant?.name || null,
      predominant_progression_pattern: predominant?.pattern || null,
    }
  };
};

// ── Modo completo (Reanalisar com IA): re-analisa a cifra com LLM e processa o
// resultado pelo mesmo caminho unificado (recálculo + matching canonizado). ─────

const removeConsecutiveDuplicateChords = (chords) => {
  if (!chords || !Array.isArray(chords) || chords.length === 0) return chords;
  const cleaned = [chords[0]];
  for (let i = 1; i < chords.length; i++) {
    if (chords[i] !== chords[i - 1]) cleaned.push(chords[i]);
  }
  return cleaned;
};

const identifyCyclicPattern = (chords) => {
  if (!chords || !Array.isArray(chords) || chords.length === 0) return chords;
  const cleaned = removeConsecutiveDuplicateChords(chords);
  for (let len = 2; len <= Math.floor(cleaned.length / 2); len++) {
    const pat = cleaned.slice(0, len);
    let isRepeating = true;
    for (let i = len; i < cleaned.length; i++) {
      if (cleaned[i] !== pat[i % len]) { isRepeating = false; break; }
    }
    if (isRepeating && cleaned.length >= len * 2) return pat;
  }
  return cleaned;
};

const buildAnalysisPrompt = (song) => `Você é um especialista em teoria musical e harmonia. Analise a cifra da música abaixo.

MÚSICA: "${song.title}" de ${song.artist}
ESTILO: ${song.genre_style || 'sertanejo_universitario'}

CIFRA:
${song.cifra_text}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TONALIDADE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Determine a tonalidade real pela análise harmônica:
- Identifique o acorde de repouso (tônica) pelas cadências
- TONALIDADE MAIOR: tônica é acorde maior (ex: "C", "G", "D")
- TONALIDADE MENOR: tônica é acorde menor (ex: "Am", "Em", "Dm") — use quando a música repousa em acorde menor
- Em tom menor, o V maior (ex: E em Am) é a dominante harmônica — isso NÃO muda a tônica para E
- Retorne "Am" se a tonalidade for Lá menor, "Em" para Mi menor, "Dm" para Ré menor, etc.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ANÁLISE POR SEÇÃO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Para cada seção (Intro, Verso, Pré-Refrão, Refrão, Ponte, Solo):

a) Acordes exatos: ["C", "Am7", "F", "G7"] — inclua extensões, remova % e repetições
b) Graus romanos em relação ao tom da SEÇÃO:
   - TONALIDADE MAIOR: I=tônica maior, ii=supertônica menor, iii=mediante menor, IV=subdominante maior, V=dominante maior, vi=relativa menor, vii°=sensível dim.
   - TONALIDADE MENOR: i=tônica menor, ii°=supertônica dim., III=relativa maior, iv=subdominante menor, V=dominante maior (harmônica), VI=submediante maior, VII=subtônica maior
   - Preserve extensões: V7, i7, iv7 — ex (Am): "i-VI-III-VII" ou "i-iv-V7-i"
   - Em tom menor, o acorde maior construído na dominante é V (ex: E em Am), não VI
c) Tom da seção (use notação menor quando aplicável: "Am", "Em", "Dm", etc.)

Seções idênticas do mesmo tipo (ex: "Verso 1" e "Verso 2" com os mesmos acordes)
devem aparecer APENAS UMA vez, rotulada apenas pelo nome da seção (ex: "Verso").`;

const ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    main_key: { type: "string" },
    tempo: { type: "number" },
    progressions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          section: { type: "string" },
          chords: { type: "array", items: { type: "string" } },
          pattern: { type: "string" },
          key: { type: "string" }
        },
        required: ["pattern"]
      }
    }
  }
};

export const reanalyzeSongWithIA = async (song, knownProgressions, learningPatterns, invokeLLM) => {
  if (!song.cifra_text || !song.cifra_text.trim()) {
    return { skipped: true, reason: 'Sem cifra' };
  }

  const result = await invokeLLM({
    prompt: buildAnalysisPrompt(song),
    response_json_schema: ANALYSIS_SCHEMA,
  });

  const mainKey = result.main_key || song.main_key || 'C';
  const rawProgs = [];

  for (const prog of (result.progressions || [])) {
    const cleanedChords = identifyCyclicPattern(
      (prog.chords || []).filter(c => c && c.trim() !== '%')
    );
    const progKey = prog.key || mainKey;
    // Fonte única do padrão: recalcula a partir dos acordes (determinístico).
    // O pattern do LLM só entra como último recurso se o tom não mapear.
    const recalcPattern = calculatePatternFromChords(cleanedChords, progKey);
    const finalPattern = recalcPattern || prog.pattern || '';
    if (!finalPattern) continue;
    rawProgs.push({
      section: prog.section || 'Sem nome',
      chords: cleanedChords,
      pattern: finalPattern,
      key: progKey,
      notes: getAnalysisNotes(cleanedChords, progKey),
    });
  }

  // Seções idênticas do mesmo tipo (ex: "Verso 1" e "Verso 2") viram UMA
  // única entrada rotulada apenas "Verso" — comportamento original.
  const progressions = mergeIdenticalSections(rawProgs).map(prog => {
    const match = findProgressionMatch(prog.pattern, knownProgressions, learningPatterns, getSectionType(prog.section || 'outros'));
    return {
      ...prog,
      progression_name: match?.progression_name || null,
      variation_name: match?.variation_name || null,
    };
  });

  const predominant = determinePredominantProgression(progressions);
  return {
    updates: {
      main_key: mainKey,
      tempo: result.tempo || song.tempo || null,
      progressions,
      predominant_progression: predominant?.name || null,
      predominant_progression_pattern: predominant?.pattern || null,
    }
  };
};