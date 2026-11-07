import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ── Helpers — espelho EXATO de utils/progressionUtils.js ─────────────────────

const normalizePattern = (pattern) => {
  if (!pattern) return "";
  return pattern.toString().trim()
    .replace(/\s+/g, '')
    .replace(/[-–—_]/g, '-')
    .replace(/[,;.]/g, '-')
    .replace(/[()]/g, '')
    .replace(/\//g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

const extractCorePattern = (pattern) => {
  if (!pattern) return "";
  return normalizePattern(pattern);
};

const getLoopCell = (p) => {
  if (!p) return p;
  const parts = p.split('-');
  for (let len = 1; len <= Math.floor(parts.length / 2); len++) {
    const cell = parts.slice(0, len);
    if (parts.every((part, i) => part === cell[i % len])) return cell.join('-');
  }
  if (parts.length > 2) {
    const trimmed = parts.slice(0, -1);
    for (let len = 1; len <= Math.floor(trimmed.length / 2); len++) {
      const cell = trimmed.slice(0, len);
      if (trimmed.every((part, i) => part === cell[i % len])) return cell.join('-');
    }
  }
  return p;
};

const uniqueGrades = (p) => new Set(normalizePattern(p).toUpperCase().split('-').map(g => g.replace(/7/g, '')));
const setsEqual = (a, b) => a.size === b.size && [...a].every(g => b.has(g));
const removeSeventh = (p) => p.replace(/7/g, '');

// findProgressionMatch — espelho EXATO do utils/progressionUtils.js (9 passas)
const findProgressionMatch = (pattern, knownProgressions, learningPatterns = [], currentSection = '') => {
  if (!pattern || !knownProgressions || knownProgressions.length === 0) return null;

  const normalizedInput = normalizePattern(pattern);
  const coreInput = extractCorePattern(pattern);
  const loopCellNorm = getLoopCell(normalizedInput);

  const inputGrades = new Set(normalizedInput.toUpperCase().split('-').map(g => g.replace(/7/g, '')));
  const hasIV = inputGrades.has('IV');
  const hasII = inputGrades.has('II') || inputGrades.has('IIM') || normalizedInput.toLowerCase().split('-').some(g => g.startsWith('ii'));
  const hasVI = normalizedInput.toLowerCase().split('-').some(g => g.startsWith('vi'));
  const hasIII = normalizedInput.toLowerCase().split('-').some(g => g.startsWith('iii'));

  const matchesExact = (a, b) => a === b;
  const matchesFlex = (a, b) => a === b || a.toUpperCase() === b.toUpperCase();
  const matches = matchesFlex;

  // LearningPatterns (confiança >= 70)
  if (learningPatterns && learningPatterns.length > 0) {
    const sortedLearning = [...learningPatterns]
      .filter(lp => lp.confidence >= 70)
      .sort((a, b) => {
        let scoreA = (a.confidence || 0) + (a.times_seen || 0) * 5;
        let scoreB = (b.confidence || 0) + (b.times_seen || 0) * 5;
        if (currentSection && a.extracted_rules?.length > 0) {
          const hasRule = a.extracted_rules.some(r => r.type === 'section_preference' && currentSection.toLowerCase().includes(r.value));
          if (hasRule) scoreA += 20;
        }
        if (currentSection && b.extracted_rules?.length > 0) {
          const hasRule = b.extracted_rules.some(r => r.type === 'section_preference' && currentSection.toLowerCase().includes(r.value));
          if (hasRule) scoreB += 20;
        }
        return scoreB - scoreA;
      });

    for (const lp of sortedLearning) {
      const lpNorm = normalizePattern(lp.pattern);
      const lpCore = extractCorePattern(lpNorm);
      const progressionExists = knownProgressions.some(p => p.name === lp.progression_name);
      if (!progressionExists) continue;
      if (matches(lpNorm, normalizedInput)) return lp.progression_name;
      if (matches(removeSeventh(lpNorm), removeSeventh(normalizedInput))) return lp.progression_name;
      if (matches(lpCore, coreInput) && coreInput.split('-').length >= 2) return lp.progression_name;
    }
  }

  // Ordena progressões por compatibilidade de graus
  const sortedProgressions = [...knownProgressions].sort((a, b) => {
    const scoreProgression = (prog) => {
      const name = prog.name?.toUpperCase() || '';
      if (name === 'TERRA' && !hasIV) return 10;
      if (name === 'TERRA' && hasIV) return -10;
      if (name === 'RAIZ' && hasIV) return 10;
      if (name === 'RAIZ' && !hasIV) return -10;
      if ((name === 'QUADRADINHO' || name === 'HARMÔNICA' || name === 'BOMBADONA') && (hasII || hasVI)) return 5;
      if ((name === 'MEDO' || name === 'TRISTEZA') && (hasVI || hasIII)) return 5;
      return 0;
    };
    return scoreProgression(b) - scoreProgression(a);
  });

  const inputNoSeventh = removeSeventh(coreInput);
  const inputNoSeventhNorm = removeSeventh(normalizedInput);
  const inputUniqueGrades = uniqueGrades(normalizedInput);

  const isGradeCompatible = (progName) => {
    const n = (progName || '').toUpperCase();
    if (n === 'TERRA' && hasIV) return false;
    if (n === 'RAIZ' && !hasIV) return false;
    return true;
  };

  // Passa 1: match exato/loop/graus no padrão principal
  for (const prog of sortedProgressions) {
    if (!prog.pattern) continue;
    if (!isGradeCompatible(prog.name)) continue;
    const normalizedKnown = normalizePattern(prog.pattern);
    const knownCore = extractCorePattern(prog.pattern);
    const knownLoopCell = getLoopCell(normalizedKnown);
    const knownUniqueGrades = uniqueGrades(normalizedKnown);
    if (
      matchesExact(normalizedKnown, normalizedInput) ||
      matchesExact(knownCore, coreInput) ||
      matchesFlex(knownLoopCell, loopCellNorm) ||
      matchesFlex(getLoopCell(removeSeventh(normalizedKnown)), getLoopCell(removeSeventh(normalizedInput))) ||
      setsEqual(knownUniqueGrades, inputUniqueGrades)
    ) return prog.name;
  }

  // Passa 2: match nas variações
  for (const prog of sortedProgressions) {
    if (!prog.variations || !Array.isArray(prog.variations)) continue;
    if (!isGradeCompatible(prog.name)) continue;
    for (const variation of prog.variations) {
      if (!variation.pattern) continue;
      const normalizedVariation = normalizePattern(variation.pattern);
      const varCore = extractCorePattern(variation.pattern);
      const varLoopCell = getLoopCell(normalizedVariation);
      const varUniqueGrades = uniqueGrades(normalizedVariation);
      if (
        matchesExact(normalizedVariation, normalizedInput) ||
        matchesExact(varCore, coreInput) ||
        matchesFlex(varLoopCell, loopCellNorm) ||
        matchesFlex(getLoopCell(removeSeventh(normalizedVariation)), getLoopCell(removeSeventh(normalizedInput))) ||
        setsEqual(varUniqueGrades, inputUniqueGrades)
      ) return prog.name;
    }
  }

  // Passa 3: match sem sétima no padrão principal
  for (const prog of sortedProgressions) {
    if (!prog.pattern) continue;
    if (!isGradeCompatible(prog.name)) continue;
    const knownCore = extractCorePattern(prog.pattern);
    const knownNoSeventh = removeSeventh(knownCore);
    const knownNoSeventhNorm = removeSeventh(normalizePattern(prog.pattern));
    if (
      (matchesExact(knownNoSeventh, inputNoSeventh) || matchesExact(knownNoSeventhNorm, inputNoSeventhNorm)) &&
      inputNoSeventh.split('-').length >= 2
    ) return prog.name;
  }

  // Passa 4: match sem sétima nas variações
  for (const prog of sortedProgressions) {
    if (!prog.variations || !Array.isArray(prog.variations)) continue;
    if (!isGradeCompatible(prog.name)) continue;
    for (const variation of prog.variations) {
      if (!variation.pattern) continue;
      const varNoSeventh = removeSeventh(normalizePattern(variation.pattern));
      if (matchesExact(varNoSeventh, inputNoSeventhNorm) || matchesExact(removeSeventh(extractCorePattern(variation.pattern)), inputNoSeventh)) return prog.name;
    }
  }

  // Passa 5: match case-insensitive no padrão principal
  for (const prog of sortedProgressions) {
    if (!prog.pattern) continue;
    if (!isGradeCompatible(prog.name)) continue;
    const normalizedKnown = normalizePattern(prog.pattern);
    const knownCore = extractCorePattern(prog.pattern);
    if (matchesFlex(normalizedKnown, normalizedInput) || matchesFlex(knownCore, coreInput)) return prog.name;
  }

  // Passa 6: match case-insensitive nas variações
  for (const prog of sortedProgressions) {
    if (!prog.variations || !Array.isArray(prog.variations)) continue;
    if (!isGradeCompatible(prog.name)) continue;
    for (const variation of prog.variations) {
      if (!variation.pattern) continue;
      const normalizedVariation = normalizePattern(variation.pattern);
      if (matchesFlex(normalizedVariation, normalizedInput) || matchesFlex(removeSeventh(normalizedVariation), inputNoSeventhNorm)) return prog.name;
    }
  }

  // Passa 7: match parcial por início de sequência (2+ graus)
  for (const prog of sortedProgressions) {
    if (!prog.pattern) continue;
    if (!isGradeCompatible(prog.name)) continue;
    const knownCore = extractCorePattern(prog.pattern);
    const knownParts = knownCore.toUpperCase().split('-');
    const inputParts = coreInput.toUpperCase().split('-');
    const minLen = Math.min(knownParts.length, inputParts.length);
    if (minLen >= 2 && knownParts.slice(0, minLen).every((p, i) => p === inputParts[i])) return prog.name;
  }

  // Passa 7b: match parcial em variações
  for (const prog of sortedProgressions) {
    if (!prog.variations || !Array.isArray(prog.variations)) continue;
    if (!isGradeCompatible(prog.name)) continue;
    for (const variation of prog.variations) {
      if (!variation.pattern) continue;
      const varCore = extractCorePattern(variation.pattern);
      const varParts = varCore.toUpperCase().split('-');
      const inputParts = coreInput.toUpperCase().split('-');
      const minLen = Math.min(varParts.length, inputParts.length);
      if (minLen >= 2 && varParts.slice(0, minLen).every((p, i) => p === inputParts[i])) return prog.name;
    }
  }

  // Passa 8: graus únicos coincidentes (sem sétima)
  const removeSev = (p) => p.replace(/7/g, '');
  const inputUnique = [...new Set(normalizedInput.toUpperCase().split('-').map(removeSev))].sort().join('-');
  for (const prog of sortedProgressions) {
    if (!isGradeCompatible(prog.name)) continue;
    const allPatterns = [
      { pattern: prog.pattern },
      ...((prog.variations || []).map(v => ({ pattern: v.pattern })))
    ];
    for (const { pattern: p } of allPatterns) {
      if (!p) continue;
      const knownUnique = [...new Set(normalizePattern(p).toUpperCase().split('-').map(removeSev))].sort().join('-');
      if (knownUnique === inputUnique && knownUnique.split('-').length >= 2) return prog.name;
    }
  }

  // Passa 9: subconjunto de graus
  if (inputUniqueGrades.size >= 2 && inputUniqueGrades.size <= 3) {
    for (const prog of sortedProgressions) {
      if (!isGradeCompatible(prog.name)) continue;
      const allPatterns9 = [
        { pattern: prog.pattern },
        ...((prog.variations || []).map(v => ({ pattern: v.pattern })))
      ];
      for (const { pattern: p } of allPatterns9) {
        if (!p) continue;
        const knownUniqueSet = uniqueGrades(p);
        const isSubset = [...inputUniqueGrades].every(g => knownUniqueSet.has(g));
        if (isSubset && knownUniqueSet.size >= inputUniqueGrades.size) return prog.name;
      }
    }
  }

  return null;
};

const determinePredominantProgression = (progressions) => {
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

  const [first, second] = sortedScores;
  const [firstName, firstData] = first;
  const [secondName, secondData] = second;
  const scoreDiff = (firstData.score - secondData.score) / firstData.score;

  if (scoreDiff < 0.15) {
    // Desempate 1: mais ocorrências
    if (firstData.occurrences > secondData.occurrences) {
      return { name: firstName, pattern: firstData.pattern };
    }
    // Desempate 2: presença no refrão
    if (firstData.sectionTypes.some(t => ['refrão', 'refrao', 'chorus'].includes(t))) {
      return { name: firstName, pattern: firstData.pattern };
    }
    return { name: secondName, pattern: secondData.pattern };
  }

  return { name: firstName, pattern: firstData.pattern };
};

const getSectionType = (section) => {
  if (!section) return 'outros';
  const s = section.toLowerCase().trim();
  if (s.includes('verso') || s.includes('verse')) return 'verso';
  if (s.includes('refrão') || s.includes('refrao') || s.includes('chorus')) return 'refrão';
  if (s.includes('pré-refrão') || s.includes('pre-refrão') || s.includes('pre-refrao')) return 'pré-refrão';
  if (s.includes('ponte') || s.includes('bridge')) return 'ponte';
  if (s.includes('intro')) return 'intro';
  if (s.includes('solo')) return 'solo';
  if (s.includes('outro') || s.includes('final')) return 'outro';
  return 'outros';
};

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

// ── Análise de uma música ────────────────────────────────────────────────────

async function analyzeSong(song, knownProgressions, learningPatterns, base44) {
  if (!song.cifra_text || !song.cifra_text.trim()) {
    return { skipped: true, reason: 'Sem cifra' };
  }

  const prompt = `Você é um especialista em teoria musical e harmonia. Analise a cifra da música abaixo.

MÚSICA: "${song.title}" de ${song.artist}
ESTILO: ${song.genre_style || 'sertanejo_universitario'}

CIFRA:
${song.cifra_text}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TONALIDADE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Determine a tonalidade real pela análise harmônica:
- Identifique o acorde de repouso (tônica) pelas cadências
- TONALIDADE MAIOR: tônica é acorde maior (ex: "C", "G", "D")
- TONALIDADE MENOR: tônica é acorde menor (ex: "Am", "Em", "Dm") — use quando a música repousa em acorde menor
- Em tom menor, o V maior (ex: E em Am) é a dominante harmônica — isso NÃO muda a tônica para E
- Retorne "Am" se a tonalidade for Lá menor, "Em" para Mi menor, "Dm" para Ré menor, etc.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ANÁLISE POR SEÇÃO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Para cada seção (Intro, Verso, Pré-Refrão, Refrão, Ponte, Solo):

a) Acordes exatos: ["C", "Am7", "F", "G7"] — inclua extensões, remova % e repetições
b) Graus romanos em relação ao tom da SEÇÃO:
   - TONALIDADE MAIOR: I=tônica maior, ii=supertônica menor, iii=mediante menor, IV=subdominante maior, V=dominante maior, vi=relativa menor, vii°=sensível dim.
   - TONALIDADE MENOR: i=tônica menor, ii°=supertônica dim., III=relativa maior, iv=subdominante menor, V=dominante maior (harmônica), VI=submediante maior, VII=subtônica maior
   - Preserves extensões: V7, i7, iv7 — ex (Am): "i-VI-III-VII" ou "i-iv-V7-i"
   - Em tom menor, o acorde maior construído na dominante é V (ex: E em Am), não VI
c) Tom da seção (use notação menor quando aplicável: "Am", "Em", "Dm", etc.)

NÃO repita seções com acordes idênticos.`;

  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
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
    }
  });

  // Processa progressões
  const seenSignatures = new Map();
  const rawProgressions = (result.progressions || []).map(prog => {
    const cleanedChords = identifyCyclicPattern(
      (prog.chords || []).filter(c => c && c.trim() !== '%')
    );
    const matchedName = findProgressionMatch(prog.pattern, knownProgressions, learningPatterns);
    return { ...prog, chords: cleanedChords, progression_name: matchedName };
  });

  const progressionsWithNames = rawProgressions.filter(prog => {
    const sectionType = getSectionType(prog.section || 'outros');
    const chordsSignature = (Array.isArray(prog.chords) ? prog.chords : []).join('-').toUpperCase();
    const fullSignature = `${chordsSignature}|${normalizePattern(prog.pattern)}`;
    if (!seenSignatures.has(sectionType)) seenSignatures.set(sectionType, new Set());
    const sigs = seenSignatures.get(sectionType);
    if (sigs.has(fullSignature)) return false;
    for (const existing of sigs) {
      if (existing.split('|')[0] === chordsSignature) return false;
    }
    sigs.add(fullSignature);
    return true;
  });

  const predominant = determinePredominantProgression(progressionsWithNames);

  return {
    skipped: false,
    updates: {
      main_key: result.main_key || song.main_key || 'C',
      tempo: result.tempo || song.tempo || null,
      progressions: progressionsWithNames,
      predominant_progression: predominant?.name || null,
      predominant_progression_pattern: predominant?.pattern || null,
    }
  };
}

// ── Handler principal ────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso restrito a administradores' }, { status: 403 });
    }

    const body = await req.json();
    const { songIds, identifyOnly } = body;
    if (!Array.isArray(songIds) || songIds.length === 0) {
      return Response.json({ error: 'songIds é obrigatório e deve ser um array não vazio' }, { status: 400 });
    }

    // Busca dados necessários
    const [knownProgressions, learningPatterns] = await Promise.all([
      base44.asServiceRole.entities.Progression.list(),
      base44.asServiceRole.entities.LearningPattern.list(),
    ]);

    const results = { success: [], skipped: [], errors: [] };

    for (const songId of songIds) {
      try {
        const song = await base44.asServiceRole.entities.Song.get(songId);
        if (!song) {
          results.errors.push({ id: songId, reason: 'Música não encontrada' });
          continue;
        }

        let analysisResult;

        if (identifyOnly) {
          // Modo rápido: apenas identifica progressões nos patterns já existentes, sem re-analisar a cifra
          const existingProgressions = (song.progressions || []);
          if (existingProgressions.length === 0) {
            results.skipped.push({ id: songId, title: song.title, reason: 'Sem progressões para identificar' });
            continue;
          }

          const progressionsWithNames = existingProgressions.map(prog => ({
            ...prog,
            progression_name: findProgressionMatch(prog.pattern, knownProgressions, learningPatterns) || prog.progression_name || null
          }));

          const predominant = determinePredominantProgression(progressionsWithNames);

          analysisResult = {
            skipped: false,
            updates: {
              progressions: progressionsWithNames,
              predominant_progression: predominant?.name || null,
              predominant_progression_pattern: predominant?.pattern || null,
            }
          };
        } else {
          // Modo completo: re-analisa a cifra com IA
          analysisResult = await analyzeSong(song, knownProgressions, learningPatterns, base44);
        }

        if (analysisResult.skipped) {
          results.skipped.push({ id: songId, title: song.title, reason: analysisResult.reason });
        } else {
          await base44.asServiceRole.entities.Song.update(songId, analysisResult.updates);
          results.success.push({ id: songId, title: song.title, predominant: analysisResult.updates.predominant_progression });
        }
      } catch (err) {
        results.errors.push({ id: songId, reason: err.message });
      }
    }

    return Response.json({
      message: 'Reanálise concluída',
      total: songIds.length,
      ...results
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});