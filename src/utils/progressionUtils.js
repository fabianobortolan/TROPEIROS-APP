// Utilitários de análise harmônica e reconhecimento de progressões.
// Transposição foi unificada em src/utils/transposition.js (fonte única da verdade).
// Este módulo agora contém SOMENTE: normalização de padrões, matching de progressões
// e cálculo determinístico de padrão (acordes -> graus romanos).

/**
 * Normaliza um padrão harmônico em graus romanos para comparação.
 * PADRONIZA O CASE de cada grau (maior=MAIÚSCULO, menor=minúsculo) com base na
 * qualidade indicada pela primeira letra, corrigindo case misto do tipo "Vii"/"vII"
 * sem alterar a qualidade pretendida. Assim, vi (relativa menor) e VI (submediante
 * maior) — funções harmônicas distintas — nunca casam entre si.
 *   - Graus maiores: I, II, III, IV, V, VI, VII (maiúsculas)
 *   - Graus menores: ii, iii, vi, vii (minúsculas)
 * Remove espaços, padroniza separadores para '-', remove parênteses e barras.
 */
export const normalizePattern = (pattern) => {
  if (!pattern) return "";
  const cleaned = pattern.toString().trim()
    .replace(/\s+/g, '')
    .replace(/[-–—_]/g, '-')
    .replace(/[,;.]/g, '-')
    .replace(/[()]/g, '')
    // Protege tokens de dominante secundária (ex.: V/III) do split por '/'
    .replace(/([IVXivx]+)\/([IVXivx]+)/g, '$1§$2')
    .replace(/\//g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  if (!cleaned) return "";
  return cleaned.split('-').map(tok => {
    const m = tok.match(/^([#b]?)([IVXivx]+)(.*)$/);
    if (!m) return tok;
    const isMinor = m[2][0] === m[2][0].toLowerCase() && m[2][0] !== m[2][0].toUpperCase();
    return m[1] + (isMinor ? m[2].toLowerCase() : m[2].toUpperCase()) + m[3];
  }).join('-').replace(/§/g, '/');
};

export const extractCorePattern = (pattern) => {
  if (!pattern) return "";
  const normalized = normalizePattern(pattern);
  // Sempre retorna o padrão normalizado sem remover graus.
  // A remoção de duplicatas causava falsos negativos em padrões como I-V7-I-V7-I ou I-ii-V7-ii-V7-I
  return normalized;
};

export const findProgressionMatch = (pattern, knownProgressions, learningPatterns = [], currentSection = '') => {
  const logMatch = (strategy, name, varName = null, detail = '') => {
    console.log(`  ✅ [${strategy}] → "${name}"${varName ? ` / var: "${varName}"` : ''}${detail ? ` (${detail})` : ''}`);
  };
  const logMiss = (strategy, reason = '') => {
    console.log(`  ❌ [${strategy}] sem match${reason ? ` — ${reason}` : ''}`);
  };

  console.log(`\n🔍 findProgressionMatch | pattern="${pattern}" | seção="${currentSection}"`);
  if (!pattern || !knownProgressions || knownProgressions.length === 0) {
    console.log("  ⚠️ Abortado: pattern vazio ou banco de progressões vazio");
    return null;
  }

  const normalizedInput = normalizePattern(pattern);
  const coreInput = extractCorePattern(pattern);
  console.log(`  📐 normalizado="${normalizedInput}" | core="${coreInput}"`);

  // NORMALIZAÇÃO DE LOOP: reduz padrões repetitivos à sua célula mínima
  // Ex: "I-V7-I-V7-I" → "I-V7" | "IV-I-IV-I" → "IV-I"
  const getLoopCell = (p) => {
    if (!p) return p;
    const parts = p.split('-');
    // célula de repetição perfeita
    for (let len = 1; len <= Math.floor(parts.length / 2); len++) {
      const cell = parts.slice(0, len);
      if (parts.every((part, i) => part === cell[i % len])) return cell.join('-');
    }
    // tolera até 2 acordes finais diferentes (turnaround) antes de checar a célula
    for (let drop = 1; drop <= 2 && parts.length - drop >= 4; drop++) {
      const trimmed = parts.slice(0, -drop);
      for (let len = 1; len <= Math.floor(trimmed.length / 2); len++) {
        const cell = trimmed.slice(0, len);
        if (trimmed.every((part, i) => part === cell[i % len])) return cell.join('-');
      }
    }
    return p;
  };
  const loopCellNorm = getLoopCell(normalizedInput);
  console.log(`  🔄 loop-cell="${loopCellNorm}"`);

  // PRÉ-FILTRO: detecta quais graus estão presentes no input (case-sensitive após canonização)
  const inputGrades = new Set(normalizedInput.split('-').map(g => g.replace(/7/g, '')));
  const hasIV = inputGrades.has('IV');
  const hasII = inputGrades.has('II') || inputGrades.has('IIM') || normalizedInput.toLowerCase().split('-').some(g => g.startsWith('ii'));
  const hasVI = normalizedInput.toLowerCase().split('-').some(g => g.startsWith('vi'));
  const hasIII = normalizedInput.toLowerCase().split('-').some(g => g.startsWith('iii'));
  console.log(`  🎼 graus: IV=${hasIV}, ii=${hasII}, vi=${hasVI}, iii=${hasIII}`);

  // Comparação case-SENSITIVE (graus já canonizados em normalizePattern).
  // Não há mais fallback case-insensitive: grau maior (I/IV/V) e menor (ii/vi) são
  // funções harmônicas distintas e não devem casar entre si.
  const matchesExact = (a, b) => a === b;
  const removeSeventh = (p) => p.replace(/7/g, '');

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

    console.log(`  🧠 Testando ${sortedLearning.length} LearningPatterns (confiança ≥ 70)...`);
    for (const lp of sortedLearning) {
      const lpNorm = normalizePattern(lp.pattern);
      const lpCore = extractCorePattern(lpNorm);
      const progressionExists = knownProgressions.some(p => p.name === lp.progression_name);
      if (!progressionExists) continue;
      if (matchesExact(lpNorm, normalizedInput)) {
        logMatch('LP-EXATO', lp.progression_name, lp.variation_name, `confiança=${lp.confidence}`);
        return { progression_name: lp.progression_name, variation_name: lp.variation_name || null };
      }
      if (matchesExact(removeSeventh(lpNorm), removeSeventh(normalizedInput))) {
        logMatch('LP-SEM7', lp.progression_name, lp.variation_name, `confiança=${lp.confidence}`);
        return { progression_name: lp.progression_name, variation_name: lp.variation_name || null };
      }
      if (matchesExact(lpCore, coreInput) && coreInput.split('-').length >= 2) {
        logMatch('LP-CORE', lp.progression_name, lp.variation_name, `confiança=${lp.confidence}`);
        return { progression_name: lp.progression_name, variation_name: lp.variation_name || null };
      }
    }
    logMiss('LP', 'nenhum LearningPattern compatível');
  }

  // Helper: conjunto de graus únicos sem sétima (case-sensitive após canonização)
  const uniqueGrades = (p) => new Set(normalizePattern(p).split('-').map(g => g.replace(/7/g, '')));
  const setsEqual = (a, b) => a.size === b.size && [...a].every(g => b.has(g));
  const inputUniqueGrades = uniqueGrades(normalizedInput);

  const inputNoSeventh = removeSeventh(coreInput);
  const inputNoSeventhNorm = removeSeventh(normalizedInput);

  // Verifica se uma progressão candidata é compatível com os graus presentes no input.
  // TERRA proibe IV; RAIZ exige IV. Evita falsos positivos em todas as passas.
  const isGradeCompatible = (progName) => {
    const n = (progName || '').toUpperCase();
    if (n === 'TERRA' && hasIV) return false;   // TERRA não pode ter IV
    if (n === 'RAIZ' && !hasIV) return false;   // RAIZ precisa de IV
    return true;
  };

  // Ordena progressões por cobertura de graus (sem viés por nome):
  // prioriza candidatas cujo conjunto de graus cobre o input e tem tamanho próximo.
  const sortedProgressions = [...knownProgressions].sort((a, b) => {
    const coverage = (prog) => {
      const allP = [prog.pattern, ...((prog.variations || []).map(v => v.pattern))].filter(Boolean);
      if (allP.length === 0) return -999;
      let best = -999;
      for (const p of allP) {
        const knownSet = uniqueGrades(p);
        let cov = 0;
        for (const g of inputUniqueGrades) if (knownSet.has(g)) cov++;
        const sizePenalty = Math.abs(knownSet.size - inputUniqueGrades.size) * 0.5;
        const score = cov - sizePenalty;
        if (score > best) best = score;
      }
      return best;
    };
    return coverage(b) - coverage(a);
  });

  console.log(`  📚 Testando ${sortedProgressions.length} progressões cadastradas...`);

  // Passa 1: match exato no padrão principal — inclui loop cell e graus únicos iguais
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
      matchesExact(knownLoopCell, loopCellNorm) ||
      matchesExact(getLoopCell(removeSeventh(normalizedKnown)), getLoopCell(removeSeventh(normalizedInput))) ||
      setsEqual(knownUniqueGrades, inputUniqueGrades)
    ) {
      logMatch('P1-EXATO', prog.name, null, `padrão="${prog.pattern}"`);
      return { progression_name: prog.name, variation_name: null };
    }
  }
  logMiss('P1-EXATO');

  // Passa 2: match nas variações — inclui loop cell e graus únicos iguais
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
        matchesExact(varLoopCell, loopCellNorm) ||
        matchesExact(getLoopCell(removeSeventh(normalizedVariation)), getLoopCell(removeSeventh(normalizedInput))) ||
        setsEqual(varUniqueGrades, inputUniqueGrades)
      ) {
        const varName = variation.name || variation.description || normalizedVariation;
        logMatch('P2-VAR', prog.name, varName, `var="${variation.pattern}"`);
        return { progression_name: prog.name, variation_name: varName };
      }
    }
  }
  logMiss('P2-VAR');

  // Passa 3: match sem sétima no padrão principal (preserva case)
  for (const prog of sortedProgressions) {
    if (!prog.pattern) continue;
    if (!isGradeCompatible(prog.name)) continue;
    const knownCore = extractCorePattern(prog.pattern);
    const knownNoSeventh = removeSeventh(knownCore);
    const knownNoSeventhNorm = removeSeventh(normalizePattern(prog.pattern));
    if (
      (matchesExact(knownNoSeventh, inputNoSeventh) || matchesExact(knownNoSeventhNorm, inputNoSeventhNorm)) &&
      inputNoSeventh.split('-').length >= 2
    ) {
      logMatch('P3-SEM7', prog.name, null, `padrão sem7="${knownNoSeventh}"`);
      return { progression_name: prog.name, variation_name: null };
    }
  }
  logMiss('P3-SEM7');

  // Passa 4: match sem sétima nas variações (preserva case)
  for (const prog of sortedProgressions) {
    if (!prog.variations || !Array.isArray(prog.variations)) continue;
    if (!isGradeCompatible(prog.name)) continue;
    for (const variation of prog.variations) {
      if (!variation.pattern) continue;
      const normalizedVariation = normalizePattern(variation.pattern);
      const varNoSeventh = removeSeventh(normalizePattern(variation.pattern));
      if (matchesExact(varNoSeventh, inputNoSeventhNorm) || matchesExact(removeSeventh(extractCorePattern(variation.pattern)), inputNoSeventh)) {
        const varName = variation.name || variation.description || normalizedVariation;
        logMatch('P4-VAR-SEM7', prog.name, varName);
        return { progression_name: prog.name, variation_name: varName };
      }
    }
  }
  logMiss('P4-VAR-SEM7');

  // Passas 5 e 6 (case-insensitive) REMOVIDAS: graus já são canonizados em
  // normalizePattern (maior=MAIÚSCULO, menor=minúsculo). Comparar ignorando case
  // faria vi (relativa menor) casar com VI (submediante maior) — funções distintas.

  // Passa 7: match parcial por prefixo (3+ graus, tamanhos próximos) — antes era >=2 e gerava falsos positivos
  for (const prog of sortedProgressions) {
    if (!prog.pattern) continue;
    if (!isGradeCompatible(prog.name)) continue;
    const knownCore = extractCorePattern(prog.pattern);
    const knownParts = knownCore.split('-');
    const inputParts = coreInput.split('-');
    const knownLen = knownParts.length, inputLen = inputParts.length;
    const minLen = Math.min(knownLen, inputLen);
    if (minLen >= 3 && Math.abs(knownLen - inputLen) <= 2) {
      const matchingParts = knownParts.slice(0, minLen).every((p, i) => p === inputParts[i]);
      if (matchingParts) {
        logMatch('P7-PARCIAL', prog.name, null, `${minLen} graus comuns`);
        return { progression_name: prog.name, variation_name: null };
      }
    }
  }

  // Passa 7b: match parcial em variações
  for (const prog of sortedProgressions) {
    if (!prog.variations || !Array.isArray(prog.variations)) continue;
    if (!isGradeCompatible(prog.name)) continue;
    for (const variation of prog.variations) {
      if (!variation.pattern) continue;
      const varCore = extractCorePattern(variation.pattern);
      const varParts = varCore.split('-');
      const inputParts = coreInput.split('-');
      const varLen = varParts.length, inputLen = inputParts.length;
      const minLen = Math.min(varLen, inputLen);
      if (minLen >= 3 && Math.abs(varLen - inputLen) <= 2) {
        const matchingParts = varParts.slice(0, minLen).every((p, i) => p === inputParts[i]);
        if (matchingParts) {
          const varName = variation.name || variation.description || varCore;
          logMatch('P7b-VAR-PARCIAL', prog.name, varName, `${minLen} graus comuns`);
          return { progression_name: prog.name, variation_name: varName };
        }
      }
    }
  }
  logMiss('P7-PARCIAL');

  // Passa 8: sequência ordenada de graus únicos (preserva ORDEM, ignora repetições imediatas).
  // Antes comparava só o conjunto (set), o que ignorava a ordem e gerava falsos positivos.
  const orderedDedup = (p) => {
    const out = []; const set = new Set();
    for (const g of normalizePattern(p).split('-').map(g => g.replace(/7/g, ''))) {
      if (!set.has(g)) { set.add(g); out.push(g); }
    }
    return out.join('-');
  };
  const inputOrdered = orderedDedup(normalizedInput);
  for (const prog of sortedProgressions) {
    if (!isGradeCompatible(prog.name)) continue;
    const allPatterns = [
      { pattern: prog.pattern, varName: null },
      ...((prog.variations || []).map(v => ({ pattern: v.pattern, varName: v.name || v.description || v.pattern })))
    ];
    for (const { pattern: p, varName } of allPatterns) {
      if (!p) continue;
      const knownOrdered = orderedDedup(p);
      if (knownOrdered === inputOrdered && knownOrdered.split('-').length >= 2) {
        logMatch('P8-ORDEM', prog.name, varName, `seq="${inputOrdered}"`);
        return { progression_name: prog.name, variation_name: varName };
      }
    }
  }
  logMiss('P8-ORDEM');

  console.log(`  ❌ Nenhum match encontrado para "${pattern}"`);
  return null;
};

// Índice cromático das notas (grafia com # ou b equivalente)
const NOTE_INDEX = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };

/**
 * Detecta acorde invertido com a QUINTA no baixo (ex.: C/G, Fm/C).
 * Quando o baixo é a quinta (7 semitons acima da raiz), o acorde não exerce
 * função de grau próprio — é a função de "quinta do acorde".
 * Retorna "5ª de <acorde>" ou null (terça no baixo, baixo de passagem, etc.).
 */
export const getFifthInBassLabel = (chord) => {
  const slash = (chord || '').trim().split('/');
  if (slash.length !== 2) return null;
  const rootM = slash[0].match(/^([A-G][#b]?)(m)?/);
  const bassM = slash[1].trim().match(/^([A-G][#b]?)/);
  if (!rootM || !bassM) return null;
  const rootIdx = NOTE_INDEX[rootM[1]];
  const bassIdx = NOTE_INDEX[bassM[1]];
  if (rootIdx == null || bassIdx == null) return null;
  if ((bassIdx - rootIdx + 12) % 12 !== 7) return null;
  return `5ª de ${rootM[1]}${rootM[2] || ''}`;
};

/**
 * Detecta QUEDA MELODICA no fim da sequência: run final de 3+ TRÍADES simples
 * (sem sétima) cujas raízes descem por grau conjunto (ex.: F-Em-Dm-C em C).
 * A queda acompanha a linha melódica descendente e NÃO representa graus
 * funcionais na progressão — o pattern deve ser calculado só sobre o núcleo.
 * Retorna { coreChords, descentChords, descentDegrees } ou null.
 * `degrees` (opcional) são os graus já mapeados de cada acorde.
 */
export const detectMelodicDescent = (chords, key, degrees = null) => {
  if (!Array.isArray(chords) || chords.length < 4 || !key) return null;
  const rootOf = (c) => {
    const m = (c || '').match(/^([A-G][#b]?)/);
    return m ? NOTE_INDEX[m[1]] : null;
  };
  const isStepDown = (prev, cur) => {
    const a = rootOf(prev), b = rootOf(cur);
    if (a == null || b == null) return false;
    const diff = (a - b + 12) % 12;
    return diff === 1 || diff === 2;
  };
  const isTriad = (c) => c && !c.includes('7') && !getFifthInBassLabel(c);
  const keyRoot = (normalizeMusicKey(key) || '').replace(/m$/, '');
  const tonicIdx = NOTE_INDEX[keyRoot];
  if (tonicIdx == null) return null;
  const buildResult = (runStart, runEnd) => {
    const descentChords = chords.slice(runStart, runEnd + 1);
    const descentDegrees = degrees
      ? degrees.slice(runStart, runEnd + 1)
      : (calculatePatternFromChords(descentChords, key) || '').split('-');
    const suffixChords = runEnd + 1 < chords.length ? chords.slice(runEnd + 1) : [];
    console.log(`  🎵 Queda melódica detectada: ${descentChords.join('-')} (${descentDegrees.join('-')})`);
    return { coreChords: chords.slice(0, runStart), descentChords, descentDegrees, suffixChords };
  };

  // 1) Run NO FIM da sequência resolvendo na TÔNICA (ex.: F-Em-Dm-C em C).
  //    Descidas que terminam em outro grau (ex.: vi-V-IV) são progressão, não queda.
  let start = chords.length - 1;
  if (isTriad(chords[start]) && rootOf(chords[start]) === tonicIdx) {
    while (start > 0 && isTriad(chords[start - 1]) && isStepDown(chords[start - 1], chords[start])) start--;
    if (chords.length - start >= 3 && start > 0) return buildResult(start, chords.length - 1);
  }

  // 2) Run NO MEIO: 3+ tríades descendo por grau conjunto seguidas de resolução
  //    na tônica — direto ou via dominante (ex.: G-F#m-Em-D7-G em G, "Avião das
  //    Nove"). Run no fim também é aceita quando COMEÇA na tônica (ex.:
  //    G-F#m-Em encerrando a seção em G). vi-V-IV continua sendo descartado.
  for (let i = 1; i <= chords.length - 3; i++) {
    if (!isTriad(chords[i]) || !isTriad(chords[i + 1]) || !isTriad(chords[i + 2])) continue;
    if (!isStepDown(chords[i], chords[i + 1]) || !isStepDown(chords[i + 1], chords[i + 2])) continue;
    let end = i + 2;
    while (end + 1 < chords.length && isTriad(chords[end + 1]) && isStepDown(chords[end], chords[end + 1])) end++;
    const resolves = end + 1 >= chords.length
      ? rootOf(chords[i]) === tonicIdx
      : chords.slice(end + 1, end + 3).some((c) => rootOf(c) === tonicIdx);
    if (resolves) return buildResult(i, end);
    i = end;
  }
  return null;
};

/**
 * Detecta SUBIDA CROMATICA: run de 3+ acordes cujas raízes sobem 1 semitom
 * consecutivamente (ex.: A-A#-B7 em E, passagem entre IV e V).
 * São acordes de passagem cromática — NÃO representam graus funcionais na
 * progressão — o pattern deve ser calculado só sobre o núcleo (+ sufixo).
 * Ocorre em duas formas:
 *   1) Run NO FIM da sequência (ex.: pré-refrão E-A-A#-B7);
 *   2) Run NO MEIO, seguida da TÔNICA do tom (resolução):
 *      ex. Verso E7-A-E-B7-A-A#-B7-E em E — a passagem leva de volta ao I.
 * Retorna { coreChords, ascentChords, suffixChords } ou null.
 */
export const detectChromaticAscent = (chords, key) => {
  if (!Array.isArray(chords) || chords.length < 3 || !key) return null;
  const rootOf = (c) => {
    const m = (c || '').match(/^([A-G][#b]?)/);
    return m ? NOTE_INDEX[m[1]] : null;
  };
  const isStepUp = (prev, cur) => {
    const a = rootOf(prev), b = rootOf(cur);
    if (a == null || b == null) return false;
    return (b - a + 12) % 12 === 1;
  };
  // 1) Run no fim da sequência (comportamento original)
  let start = chords.length - 1;
  while (start > 0 && isStepUp(chords[start - 1], chords[start])) start--;
  if (chords.length - start >= 3 && start > 0) {
    const ascentChords = chords.slice(start);
    console.log(`  🎵 Subida cromática detectada (fim): ${ascentChords.join('-')}`);
    return { coreChords: chords.slice(0, start), ascentChords, suffixChords: [] };
  }
  // 2) Run no meio, imediatamente seguida da TÔNICA do tom
  const keyRoot = (normalizeMusicKey(key) || '').replace(/m$/, '');
  const tonicIdx = NOTE_INDEX[keyRoot];
  if (tonicIdx == null) return null;
  for (let i = 1; i <= chords.length - 3; i++) {
    if (!isStepUp(chords[i], chords[i + 1]) || !isStepUp(chords[i + 1], chords[i + 2])) continue;
    let end = i + 2;
    while (end + 1 < chords.length && isStepUp(chords[end], chords[end + 1])) end++;
    const nextRoot = rootOf(chords[end + 1]);
    if (nextRoot === tonicIdx) {
      const ascentChords = chords.slice(i, end + 1);
      console.log(`  🎵 Subida cromática detectada (resolvendo na tônica): ${ascentChords.join('-')} → ${chords[end + 1]}`);
      return { coreChords: chords.slice(0, i), ascentChords, suffixChords: chords.slice(end + 1) };
    }
    i = end;
  }
  return null;
};

/**
 * Detecta DESCIDA CROMATICA: run de 3+ acordes cujas raízes descem 1 semitom
 * por passo (permitindo pausas de raiz repetida, ex. acordes diminutos de
 * passagem: D-C#-C#º-Cº em E). São acordes de passagem cromática — NÃO
 * representam graus funcionais na progressão.
 * Retorna { coreChords, descentChords, suffixChords } ou null.
 */
export const detectChromaticDescent = (chords, key) => {
  if (!Array.isArray(chords) || chords.length < 3 || !key) return null;
  const rootOf = (c) => {
    const m = (c || '').match(/^([A-G][#b]?)/);
    return m ? NOTE_INDEX[m[1]] : null;
  };
  const isChromaticStepDown = (prev, cur) => {
    const a = rootOf(prev), b = rootOf(cur);
    if (a == null || b == null) return false;
    const diff = (a - b + 12) % 12;
    return diff === 1 || diff === 0; // desce 1 semitom ou mantém a raiz (passagem)
  };
  const countDescents = (run) => {
    let n = 0;
    for (let i = 1; i < run.length; i++) {
      if (rootOf(run[i]) !== rootOf(run[i - 1])) n++;
    }
    return n;
  };
  for (let i = 1; i <= chords.length - 3; i++) {
    if (!isChromaticStepDown(chords[i], chords[i + 1]) || !isChromaticStepDown(chords[i + 1], chords[i + 2])) continue;
    let end = i + 2;
    while (end + 1 < chords.length && isChromaticStepDown(chords[end], chords[end + 1])) end++;
    const run = chords.slice(i, end + 1);
    if (countDescents(run) >= 2) {
      console.log(`  🎵 Descida cromática detectada: ${run.join('-')}`);
      return { coreChords: chords.slice(0, i), descentChords: run, suffixChords: chords.slice(end + 1) };
    }
    i = end;
  }
  return null;
};

/**
 * Anotação de análise para uma sequência de acordes: queda melódica,
 * subida ou descida cromática (a queda melódica tem prioridade).
 * Retorna string ou null.
 */
export const getAnalysisNotes = (chords, key) => {
  const descent = detectMelodicDescent(chords, key);
  if (descent) return `Queda melódica: ${descent.descentChords.join(' - ')} (${descent.descentDegrees.join('-')})`;
  const ascent = detectChromaticAscent(chords, key);
  if (ascent) return `Subida cromática: ${ascent.ascentChords.join(' - ')}`;
  const cDescent = detectChromaticDescent(chords, key);
  if (cDescent) return `Descida cromática: ${cDescent.descentChords.join(' - ')}`;
  return null;
};

export const calculatePatternFromChords = (chords, key) => {
  if (!chords || chords.length === 0 || !key) return null;
  console.log(`\n🧮 CALCULANDO PATTERN: Tom=${key}, Acordes=[${chords.join(', ')}]`);

  // Tonalidades MAIORES: graus em relação à escala maior
  // Tonalidades MENORES: graus em relação à escala menor natural/harmônica
  //   i=tônica menor, III=relativa maior, iv=subdominante menor, v/V=dominante, VI=submediante maior, VII=subtônica maior
  //   Acordes típicos da escala menor harmônica: V maior (dominante com sensível)
  const keyMap = {
    // ── Maiores ──
    'C':  { 'C': 'I', 'Dm': 'ii', 'Em': 'iii', 'F': 'IV', 'G': 'V', 'Am': 'vi', 'Bdim': 'vii°', 'C7': 'I7', 'G7': 'V7', 'F7': 'IV7', 'D': 'II', 'E': 'III', 'A': 'VI', 'B': 'VII', 'D7': 'II7', 'E7': 'III7', 'A7': 'VI7', 'B7': 'VII7' },
    'G':  { 'G': 'I', 'Am': 'ii', 'Bm': 'iii', 'C': 'IV', 'D': 'V', 'Em': 'vi', 'F#dim': 'vii°', 'G7': 'I7', 'D7': 'V7', 'C7': 'IV7', 'A': 'II', 'B': 'III', 'E': 'VI', 'F#': 'VII', 'A7': 'II7', 'B7': 'III7', 'E7': 'VI7' },
    'D':  { 'D': 'I', 'Em': 'ii', 'F#m': 'iii', 'G': 'IV', 'A': 'V', 'Bm': 'vi', 'C#dim': 'vii°', 'D7': 'I7', 'A7': 'V7', 'G7': 'IV7', 'E': 'II', 'F#': 'III', 'B': 'VI', 'C#': 'VII', 'E7': 'II7', 'F#7': 'III7', 'B7': 'VI7' },
    'A':  { 'A': 'I', 'Bm': 'ii', 'C#m': 'iii', 'D': 'IV', 'E': 'V', 'F#m': 'vi', 'G#dim': 'vii°', 'A7': 'I7', 'E7': 'V7', 'D7': 'IV7', 'B': 'II', 'C#': 'III', 'F#': 'VI', 'G#': 'VII', 'B7': 'II7', 'C#7': 'III7', 'F#7': 'VI7' },
    'E':  { 'E': 'I', 'F#m': 'ii', 'G#m': 'iii', 'A': 'IV', 'B': 'V', 'C#m': 'vi', 'D#dim': 'vii°', 'E7': 'I7', 'B7': 'V7', 'A7': 'IV7', 'F#': 'II', 'G#': 'III', 'C#': 'VI', 'D#': 'VII', 'F#7': 'II7', 'G#7': 'III7', 'C#7': 'VI7' },
    'F':  { 'F': 'I', 'Gm': 'ii', 'Am': 'iii', 'Bb': 'IV', 'C': 'V', 'Dm': 'vi', 'Edim': 'vii°', 'F7': 'I7', 'C7': 'V7', 'Bb7': 'IV7', 'G': 'II', 'A': 'III', 'D': 'VI', 'E': 'VII', 'G7': 'II7', 'A7': 'III7', 'D7': 'VI7' },
    'B':  { 'B': 'I', 'C#m': 'ii', 'D#m': 'iii', 'E': 'IV', 'F#': 'V', 'G#m': 'vi', 'A#dim': 'vii°', 'B7': 'I7', 'F#7': 'V7', 'E7': 'IV7', 'C#': 'II', 'D#': 'III', 'G#': 'VI', 'A#': 'VII', 'C#7': 'II7', 'D#7': 'III7', 'G#7': 'VI7' },
    'Bb': { 'Bb': 'I', 'Cm': 'ii', 'Dm': 'iii', 'Eb': 'IV', 'F': 'V', 'Gm': 'vi', 'Adim': 'vii°', 'Bb7': 'I7', 'F7': 'V7', 'Eb7': 'IV7', 'C': 'II', 'D': 'III', 'G': 'VI', 'A': 'VII', 'C7': 'II7', 'D7': 'III7', 'G7': 'VI7' },
    'Eb': { 'Eb': 'I', 'Fm': 'ii', 'Gm': 'iii', 'Ab': 'IV', 'Bb': 'V', 'Cm': 'vi', 'Ddim': 'vii°', 'Eb7': 'I7', 'Bb7': 'V7', 'Ab7': 'IV7', 'F': 'II', 'G': 'III', 'C': 'VI', 'D': 'VII', 'F7': 'II7', 'G7': 'III7', 'C7': 'VI7' },
    'Ab': { 'Ab': 'I', 'Bbm': 'ii', 'Cm': 'iii', 'Db': 'IV', 'Eb': 'V', 'Fm': 'vi', 'Gdim': 'vii°', 'Ab7': 'I7', 'Eb7': 'V7', 'Db7': 'IV7', 'Bb': 'II', 'C': 'III', 'F': 'VI', 'G': 'VII', 'Bb7': 'II7', 'C7': 'III7', 'F7': 'VI7' },
    'F#': { 'F#': 'I', 'G#m': 'ii', 'A#m': 'iii', 'B': 'IV', 'C#': 'V', 'D#m': 'vi', 'E#dim': 'vii°', 'F#7': 'I7', 'C#7': 'V7', 'B7': 'IV7', 'G#': 'II', 'A#': 'III', 'D#': 'VI', 'E#': 'VII', 'G#7': 'II7', 'A#7': 'III7', 'D#7': 'VI7' },
    'Gb': { 'Gb': 'I', 'Abm': 'ii', 'Bbm': 'iii', 'Cb': 'IV', 'Db': 'V', 'Ebm': 'vi', 'Fdim': 'vii°', 'Gb7': 'I7', 'Db7': 'V7', 'Cb7': 'IV7', 'Ab': 'II', 'Bb': 'III', 'Eb': 'VI', 'F': 'VII', 'Ab7': 'II7', 'Bb7': 'III7', 'Eb7': 'VI7' },
    'C#': { 'C#': 'I', 'D#m': 'ii', 'E#m': 'iii', 'F#': 'IV', 'G#': 'V', 'A#m': 'vi', 'B#dim': 'vii°', 'C#7': 'I7', 'G#7': 'V7', 'F#7': 'IV7', 'D#': 'II', 'E#': 'III', 'A#': 'VI', 'B#': 'VII', 'D#7': 'II7', 'E#7': 'III7', 'A#7': 'VI7' },
    'Db': { 'Db': 'I', 'Ebm': 'ii', 'Fm': 'iii', 'Gb': 'IV', 'Ab': 'V', 'Bbm': 'vi', 'Cdim': 'vii°', 'Db7': 'I7', 'Ab7': 'V7', 'Gb7': 'IV7', 'Eb': 'II', 'F': 'III', 'Bb': 'VI', 'C': 'VII', 'Eb7': 'II7', 'F7': 'III7', 'Bb7': 'VI7' },

    // ── Menores ─────────────────────────────────────────────────────────────────
    // Graus: i=tônica menor, III=relativa maior, iv=subdominante menor,
    //        V=dominante maior (harm.), v=dominante menor (nat.), VI=submediante maior,
    //        VII=subtônica maior, ii°=supertônica diminuta, vii°=sensível dim. (harm.)
    'Am': {
      // Tríades naturais (escala menor natural)
      'Am': 'i',   'Bdim': 'ii°', 'C': 'III', 'Dm': 'iv',  'Em': 'v',  'F': 'VI',  'G': 'VII',
      // Dominante harmônica (V maior, com sensível G#)
      'E': 'V',    'E7': 'V7',
      // Com sétima
      'Am7': 'i7', 'Dm7': 'iv7', 'G7': 'VII7', 'C7': 'III7', 'F7': 'VI7',
      // Empréstimos modais comuns em Am
      'A': 'I',    'D': 'IV',    'Esus4': 'Vsus4',
    },
    'Em': {
      'Em': 'i',   'F#dim': 'ii°', 'G': 'III', 'Am': 'iv', 'Bm': 'v', 'C': 'VI', 'D': 'VII',
      'B': 'V',    'B7': 'V7',
      'Em7': 'i7', 'Am7': 'iv7', 'D7': 'VII7', 'G7': 'III7', 'C7': 'VI7',
      'E': 'I',    'A': 'IV',
    },
    'Dm': {
      'Dm': 'i',   'Edim': 'ii°', 'F': 'III', 'Gm': 'iv', 'Am': 'v', 'Bb': 'VI', 'C': 'VII',
      'A': 'V',    'A7': 'V7',
      'Dm7': 'i7', 'Gm7': 'iv7', 'C7': 'VII7', 'F7': 'III7', 'Bb7': 'VI7',
      'D': 'I',    'G': 'IV',
    },
    'Bm': {
      'Bm': 'i',   'C#dim': 'ii°', 'D': 'III', 'Em': 'iv', 'F#m': 'v', 'G': 'VI', 'A': 'VII',
      'F#': 'V',   'F#7': 'V7',
      'Bm7': 'i7', 'Em7': 'iv7', 'A7': 'VII7', 'D7': 'III7', 'G7': 'VI7',
      'B': 'I',    'E': 'IV',
    },
    'F#m': {
      'F#m': 'i',  'G#dim': 'ii°', 'A': 'III', 'Bm': 'iv', 'C#m': 'v', 'D': 'VI', 'E': 'VII',
      'C#': 'V',   'C#7': 'V7',
      'F#m7': 'i7','Bm7': 'iv7', 'E7': 'VII7', 'A7': 'III7', 'D7': 'VI7',
      'F#': 'I',   'B': 'IV',
    },
    'C#m': {
      'C#m': 'i',  'D#dim': 'ii°', 'E': 'III', 'F#m': 'iv', 'G#m': 'v', 'A': 'VI', 'B': 'VII',
      'G#': 'V',   'G#7': 'V7',
      'C#m7': 'i7','F#m7': 'iv7', 'B7': 'VII7', 'E7': 'III7', 'A7': 'VI7',
      'C#': 'I',   'F#': 'IV',
    },
    'G#m': {
      'G#m': 'i',  'A#dim': 'ii°', 'B': 'III', 'C#m': 'iv', 'D#m': 'v', 'E': 'VI', 'F#': 'VII',
      'D#': 'V',   'D#7': 'V7',
      'G#m7': 'i7','C#m7': 'iv7', 'F#7': 'VII7', 'B7': 'III7', 'E7': 'VI7',
      'G#': 'I',   'C#': 'IV',
    },
    'Gm': {
      'Gm': 'i',   'Adim': 'ii°', 'Bb': 'III', 'Cm': 'iv', 'Dm': 'v', 'Eb': 'VI', 'F': 'VII',
      'D': 'V',    'D7': 'V7',
      'Gm7': 'i7', 'Cm7': 'iv7', 'F7': 'VII7', 'Bb7': 'III7', 'Eb7': 'VI7',
      'G': 'I',    'C': 'IV',
    },
    'Cm': {
      'Cm': 'i',   'Ddim': 'ii°', 'Eb': 'III', 'Fm': 'iv', 'Gm': 'v', 'Ab': 'VI', 'Bb': 'VII',
      'G': 'V',    'G7': 'V7',
      'Cm7': 'i7', 'Fm7': 'iv7', 'Bb7': 'VII7', 'Eb7': 'III7', 'Ab7': 'VI7',
      'C': 'I',    'F': 'IV',
    },
    'Fm': {
      'Fm': 'i',   'Gdim': 'ii°', 'Ab': 'III', 'Bbm': 'iv', 'Cm': 'v', 'Db': 'VI', 'Eb': 'VII',
      'C': 'V',    'C7': 'V7',
      'Fm7': 'i7', 'Bbm7': 'iv7', 'Eb7': 'VII7', 'Ab7': 'III7', 'Db7': 'VI7',
      'F': 'I',    'Bb': 'IV',
    },
    'Bbm': {
      'Bbm': 'i',  'Cdim': 'ii°', 'Db': 'III', 'Ebm': 'iv', 'Fm': 'v', 'Gb': 'VI', 'Ab': 'VII',
      'F': 'V',    'F7': 'V7',
      'Bbm7': 'i7','Ebm7': 'iv7', 'Ab7': 'VII7', 'Db7': 'III7', 'Gb7': 'VI7',
      'Bb': 'I',   'Eb': 'IV',
    },
    'Ebm': {
      'Ebm': 'i',  'Fdim': 'ii°', 'Gb': 'III', 'Abm': 'iv', 'Bbm': 'v', 'Cb': 'VI', 'Db': 'VII',
      'Bb': 'V',   'Bb7': 'V7',
      'Ebm7': 'i7','Abm7': 'iv7', 'Db7': 'VII7', 'Gb7': 'III7', 'Cb7': 'VI7',
      'Eb': 'I',   'Ab': 'IV',
    },
  };

  // Normaliza a tonalidade — implementação compartilhada em normalizeMusicKey (nível do módulo)
  const normalizeKey = normalizeMusicKey;

  const normalizedKey = normalizeKey(key);
  const map = keyMap[normalizedKey];
  if (!map) { console.log(`❌ Tom "${key}" (normalizado: "${normalizedKey}") não encontrado no mapa`); return null; }

  const degrees = chords.map(chord => {
    // 0) Acorde invertido com a quinta no baixo (ex.: C/G): função "quinta do acorde",
    //    em vez de identificar como um grau da progressão
    const fifthInBass = getFifthInBassLabel(chord);
    if (fifthInBass) { console.log(`  ${chord} → ${fifthInBass} (quinta no baixo)`); return fifthInBass; }
    // 1) Match exato
    if (map[chord]) { console.log(`  ${chord} → ${map[chord]}`); return map[chord]; }
    // 2) m7(b5) → dim
    if (chord.includes('m7(b5)') && map[chord.replace('m7(b5)', 'dim')]) return map[chord.replace('m7(b5)', 'dim')];
    // 3) Tenta apenas com a nota raiz + 'm' (acorde menor simples: Am7 → Am)
    const minorBase = chord.match(/^([A-G][#b]?m)/);
    if (minorBase && map[minorBase[1]]) { console.log(`  ${chord} (menor: ${minorBase[1]}) → ${map[minorBase[1]]}`); return map[minorBase[1]]; }
    // 4) Tenta apenas a nota raiz (acorde maior com extensões: C7, Cmaj7, Csus2 → C)
    const majorBase = chord.match(/^([A-G][#b]?)(?!m)/);
    if (majorBase && map[majorBase[1]]) { console.log(`  ${chord} (maior: ${majorBase[1]}) → ${map[majorBase[1]]}`); return map[majorBase[1]]; }
    console.log(`  ${chord} → ❓`);
    return '?';
  });

  // DOMINANTE SECUNDÁRIA: acorde com sétima que prepara o acorde seguinte —
  // sua raiz resolve (uma quinta acima) na raiz do acorde seguinte.
  // Ex.: em C, A7 → Dm não é VI7, é V/ii. Em Am, G7 → C é V/III.
  // O V7 direto na tônica (ex.: G7 → C em C) permanece V7.
  const keyTonic = (normalizeMusicKey(key) || '').replace(/m$/, '');
  const degreesProcessed = degrees.map((deg, i) => {
    const chord = chords[i];
    if (!deg || deg === '?' || deg.startsWith('5ª')) return deg;
    // Exige sétima de dominante (A7, E7, Bb7...) — exclui m7, maj7/7M, dim
    if (!/^([A-G][#b]?)7($|\()/.test(chord)) return deg;
    const rootM = chord.match(/^([A-G][#b]?)/);
    if (!rootM) return deg;
    // Sétima na TÔNICA do tom (ex.: E7 em E, A7 em A — muito comum no baião e
    // sertanejo): é o acorde I7, NÃO dominante secundária — mesmo que o próximo
    // acorde seja o IV (ex.: verso de Asa Branca: E7-A-E-B7-E-E7).
    if (rootM[1] === keyTonic) return deg;
    const nextDeg = degrees[i + 1];
    const nextChord = chords[i + 1];
    if (!nextDeg || nextDeg === '?' || nextDeg.includes('/') || nextDeg.startsWith('5ª')) return deg;
    const nextRootM = (nextChord || '').match(/^([A-G][#b]?)/);
    if (!nextRootM) return deg;
    const rIdx = NOTE_INDEX[rootM[1]];
    const nIdx = NOTE_INDEX[nextRootM[1]];
    if (rIdx == null || nIdx == null) return deg;
    // Alvo uma quinta abaixo da raiz do acorde com sétima
    if ((nIdx - rIdx + 12) % 12 !== 5) return deg;
    const targetBase = nextDeg.replace(/7$/, '');
    // V7 resolvendo no I já é a dominante do tom — não é secundária
    if (/^I$/i.test(targetBase) || targetBase.includes('°')) return deg;
    console.log(`  ⚡ ${chord} → V/${targetBase} (dominante secundária de ${nextChord})`);
    return `V/${targetBase}`;
  });

  // QUEDA MELODICA (prioridade): run final de 3+ tríades descendo por grau
  // conjunto (ex.: F-Em-Dm-C em C) acompanha a linha melódica e NÃO representa
  // graus na progressão — sai do pattern, que fica restrito ao núcleo harmônico.
  const descent = detectMelodicDescent(chords, key, degreesProcessed);

  // SUBIDA/DESCIDA CROMATICA: run de 3+ acordes em passagem cromática
  // (subindo: A-A#-B7 em E; descendo: D-C#-C#º-Cº em E) — NÃO representam
  // graus funcionais. Podem estar no fim da sequência OU no meio, resolvendo
  // na tônica (ex.: E7-A-E-B7-A-A#-B7-E → núcleo I7-IV-I-V7 + sufixo I).
  const ascent = descent ? null : detectChromaticAscent(chords, key);
  const cDescent = descent || ascent ? null : detectChromaticDescent(chords, key);
  const passing = ascent || cDescent;
  const passingLen = passing ? passing.coreChords.length : chords.length;
  const suffixLen = (descent && descent.suffixChords ? descent.suffixChords.length : 0)
    || (passing && passing.suffixChords ? passing.suffixChords.length : 0);
  const coreLen = descent ? descent.coreChords.length : passingLen;

  const pattern = [
    ...degreesProcessed.slice(0, coreLen),
    ...degreesProcessed.slice(chords.length - suffixLen),
  ].join('-');
  if (pattern.includes('?')) { console.log(`❌ Pattern incompleto: ${pattern}`); return null; }
  console.log(`✅ Pattern calculado: ${pattern}`);
  return pattern;
};

// Normaliza o nome de uma tonalidade (ex: "am" → "Am", "AM" → "Am", "A minor" → "Am").
// Implementação única usada por calculatePatternFromChords e getHarmonicField.
export const normalizeMusicKey = (k) => {
  if (!k) return k;
  k = k.trim();
  // Aceita formatos como "Am", "A minor", "Lá menor", "a menor", etc.
  const minorMatch = k.match(/^([A-G][#b]?)\s*(m|menor|minor|min)$/i);
  if (minorMatch) return minorMatch[1][0].toUpperCase() + minorMatch[1].slice(1) + 'm';
  // Garante capitalização correta para maiores: "c" → "C", "c#" → "C#", "bb" → "Bb"
  const majorMatch = k.match(/^([A-G])([#b]?)$/i);
  if (majorMatch) return majorMatch[1].toUpperCase() + majorMatch[2];
  return k;
};

/**
 * Retorna o campo harmônico (tríades naturais + dominante harmônica) da
 * tonalidade informada, como lista { degree, chord }. Ex (Em):
 *   Em(i) F#°(ii°) G(III) Am(iv) Bm(v) B(V harm.) C(VI) D(VII)
 * Retorna null se a tonalidade não for reconhecida.
 */
export const getHarmonicField = (key) => {
  const normalizedKey = normalizeMusicKey(key);
  if (!normalizedKey) return null;
  const isMinor = /m$/.test(normalizedKey);

  // Tonalidades com bemóis usam grafia com bemol (Ab, Bb, Eb...) — igual ao keyMap
  const FLAT_KEYS = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm', 'Abm', 'Dbm', 'Gbm']);
  const useFlats = FLAT_KEYS.has(normalizedKey);
  const SCALE = useFlats
    ? ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
    : ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  const rootName = isMinor ? normalizedKey.slice(0, -1) : normalizedKey;
  const root = SCALE.indexOf(rootName);
  if (root === -1) return null;
  const chord = (semi, suffix = '') => SCALE[(root + semi) % 12] + suffix;

  return isMinor
    ? [
        { degree: 'i', chord: chord(0, 'm') },
        { degree: 'ii°', chord: chord(2, '°') },
        { degree: 'III', chord: chord(3) },
        { degree: 'iv', chord: chord(5, 'm') },
        { degree: 'v', chord: chord(7, 'm') },
        { degree: 'V (harm.)', chord: chord(7) },
        { degree: 'VI', chord: chord(8) },
        { degree: 'VII', chord: chord(10) },
      ]
    : [
        { degree: 'I', chord: chord(0) },
        { degree: 'ii', chord: chord(2, 'm') },
        { degree: 'iii', chord: chord(4, 'm') },
        { degree: 'IV', chord: chord(5) },
        { degree: 'V', chord: chord(7) },
        { degree: 'vi', chord: chord(9, 'm') },
        { degree: 'vii°', chord: chord(11, '°') },
      ];
};