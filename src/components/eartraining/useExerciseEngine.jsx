import { useMemo } from 'react';

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getDifficulty(chords) {
  if (chords.length <= 3) return 'facil';
  if (chords.length <= 5) return 'medio';
  return 'dificil';
}

// Detecta se uma linha é só de acordes (formato cifra: "B F#7 E" acima da letra)
function isChordOnlyLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  // Tablatura
  if (/^[eBGDAe]\|/.test(trimmed)) return true;
  const tokens = trimmed.split(/\s+/);
  // Token de acorde: começa com A-G, pode ter #/b, sufixo m/maj/dim/aug/sus/add, número, baixo
  const chordRegex = /^[A-G][#b]?(m|maj|min|dim|aug|sus|add|°|ø)?(\d{0,2})(\/[A-G][#b]?)?(\(.*\))?$/;
  const chordCount = tokens.filter(t => chordRegex.test(t)).length;
  return chordCount / tokens.length >= 0.65;
}

// Extrai letra real da cifra para uma seção
// Formato típico: linha de acordes (B  F#7  E) acima da linha de letra (CAPA DE REVISTA)
function extractLyricSnippet(cifraText, sectionName) {
  if (!cifraText) return null;

  const lines = cifraText.split('\n');
  const sectionLower = sectionName?.toLowerCase()?.trim() || '';

  // Localiza o início da seção (busca tolerante: contém qualquer palavra da seção)
  let startIdx = -1;
  const sectionWords = sectionLower.split(/[\s_\-]+/).filter(w => w.length > 2);

  if (sectionWords.length > 0) {
    for (let i = 0; i < lines.length; i++) {
      const t = lines[i].trim().toLowerCase();
      if (
        (t.startsWith('[') && sectionWords.some(w => t.includes(w))) ||
        (sectionWords.some(w => new RegExp('^' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s\\d]*$').test(t)))
      ) {
        startIdx = i + 1;
        break;
      }
    }
  }

  // Fallback: primeiro cabeçalho que não seja intro/intro
  if (startIdx === -1) {
    for (let i = 0; i < lines.length; i++) {
      const t = lines[i].trim().toLowerCase();
      if (/^\[.+\]/i.test(t) && !t.includes('intro')) { startIdx = i + 1; break; }
    }
  }
  // Último fallback: qualquer cabeçalho
  if (startIdx === -1) {
    for (let i = 0; i < lines.length; i++) {
      if (/^\[.+\]/i.test(lines[i].trim())) { startIdx = i + 1; break; }
    }
  }
  if (startIdx === -1) startIdx = 0;

  const lyricLines = [];
  for (let i = startIdx; i < lines.length && lyricLines.length < 4; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();
    if (!trimmed) continue;

    // Para ao encontrar nova seção
    if (/^\[.+\]/i.test(trimmed) && i > startIdx) break;
    if (/^\[.+\]/i.test(trimmed)) continue;

    // Pula tablaturas e linhas só de acordes
    if (/^[eBGDAe]\|/.test(trimmed)) continue;
    if (isChordOnlyLine(trimmed)) continue;

    // Tem texto de letra — limpa possíveis acordes inline
    const cleaned = trimmed
      .replace(/\([A-G][#b]?[^)]{0,8}\)/g, '')
      .replace(/\[[A-G][#b]?[^\]]{0,8}\]/g, '')
      .trim();

    if (cleaned.length > 3) lyricLines.push(cleaned);
  }

  return lyricLines.length > 0 ? lyricLines.slice(0, 3).join('\n') : null;
}

// Extrai exercícios das músicas agrupados por música, mantendo ordem original das seções
function extractFromSongs(songs) {
  // Agrupa por música: cada música vira um grupo de progressões em sequência
  const groups = [];
  songs.forEach(song => {
    if (!song.progressions?.length) return;
    const songExercises = [];
    song.progressions.forEach(prog => {
      if (!prog.chords?.length || prog.chords.length < 2) return;
      const name = (prog.progression_name || '').trim();
      if (!name) return;

      const lyricSnippet = extractLyricSnippet(song.cifra_text, prog.section);
      songExercises.push({
        id: `song-${song.id}-${prog.section}`,
        chords: prog.chords,
        key: prog.key || song.main_key || 'C',
        section: prog.section,
        songTitle: song.title,
        songArtist: song.artist,
        progressionName: name,
        pattern: prog.pattern || prog.notes || '',
        bpm: song.tempo || 80,
        beatsPerMeasure: song.beats_per_measure || 4,
        playbackUrl: song.playback_url || null,
        difficulty: getDifficulty(prog.chords),
        sourceType: 'song',
        correctAnswer: name,
        lyricSnippet,
      });
    });
    if (songExercises.length > 0) groups.push(songExercises);
  });

  // Embaralha a ordem das músicas, mas mantém a ordem das seções dentro de cada música
  const shuffledGroups = shuffleArray(groups);
  return shuffledGroups.flat();
}

export function useExerciseEngine(songs, progressions) {
  const allExercises = useMemo(() => {
    return extractFromSongs(songs || []);
  }, [songs]);

  // Pool de distratores: nomes únicos que aparecem nas músicas + banco de Progressions
  // Garante que a resposta correta sempre exista no pool
  const progressionPool = useMemo(() => {
    const pool = new Map();

    // Nomes do banco de Progressions (com padrão)
    progressions?.forEach(p => {
      if (p.name) pool.set(p.name, { progressionName: p.name, pattern: p.pattern || '' });
    });

    // Nomes que aparecem nas músicas da biblioteca (com padrão/notas da progressão)
    songs?.forEach(song => {
      song.progressions?.forEach(prog => {
        const name = (prog.progression_name || '').trim();
        if (name && !pool.has(name)) {
          pool.set(name, { progressionName: name, pattern: prog.pattern || prog.notes || '' });
        }
      });
    });

    return [...pool.values()];
  }, [progressions, songs]);

  function generateOptions(exercise, count = 4) {
    const correctName = exercise.correctAnswer;

    const correct = {
      value: correctName,
      progressionName: correctName,
      pattern: exercise.pattern || '',
    };

    // Distratores: outros nomes do pool que não são a resposta correta
    const candidates = progressionPool.filter(p => p.progressionName !== correctName);
    const distractors = shuffleArray(candidates).slice(0, count - 1);

    // Garante pelo menos 3 distratores com fallback genérico se necessário
    const fallbacks = ['Harmônica', 'Raiz', 'Quadradinho', 'Dois Acordes', 'Cadência'].filter(f => f !== correctName);
    let fi = 0;
    while (distractors.length < count - 1 && fi < fallbacks.length) {
      const fb = fallbacks[fi++];
      if (!distractors.find(d => d.progressionName === fb)) {
        distractors.push({ value: fb, progressionName: fb, pattern: '' });
      }
    }

    return shuffleArray([
      correct,
      ...distractors.slice(0, count - 1).map(d => ({ value: d.progressionName, progressionName: d.progressionName, pattern: d.pattern })),
    ]);
  }

  return { allExercises, generateOptions };
}