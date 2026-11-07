import { useRef, useCallback } from 'react';
import * as Tone from 'tone';

// ─────────────────────────────────────────────────────────────────
//  SISTEMA DE CÁLCULO DE NOTAS POR INTERVALOS CROMÁTICOS
//  Constrói qualquer acorde a partir da nota raiz + fórmula de semitons
// ─────────────────────────────────────────────────────────────────

// Mapeamento cromatico: nota → índice (0 = C)
const NOTE_INDEX = {
  'C': 0, 'C#': 1, 'Db': 1,
  'D': 2, 'D#': 3, 'Eb': 3,
  'E': 4,
  'F': 5, 'F#': 6, 'Gb': 6,
  'G': 7, 'G#': 8, 'Ab': 8,
  'A': 9, 'A#': 10, 'Bb': 10,
  'B': 11,
};

// Nome "limpo" para exibição (prefere bemol nos nomes enarmônicos)
const INDEX_TO_NOTE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Fórmulas de acordes: semitons a partir da raiz
// Formato: [semitons_desde_raiz, ...]
const CHORD_FORMULAS = {
  // ── Tríades ──────────────────────────────────────────────────
  '':      [0, 4, 7],          // maior         (C)
  'm':     [0, 3, 7],          // menor         (Cm)
  'dim':   [0, 3, 6],          // diminuto      (Cdim)
  'aug':   [0, 4, 8],          // aumentado     (Caug)
  'sus2':  [0, 2, 7],          // sus2          (Csus2)
  'sus4':  [0, 5, 7],          // sus4          (Csus4)
  '5':     [0, 7],             // power chord   (C5)

  // ── Quatro notas (7as) ────────────────────────────────────────
  '7':     [0, 4, 7, 10],      // dominante 7   (C7)
  'maj7':  [0, 4, 7, 11],      // maior 7       (Cmaj7)
  'M7':    [0, 4, 7, 11],      // maior 7       (CM7)
  'm7':    [0, 3, 7, 10],      // menor 7       (Cm7)
  'mM7':   [0, 3, 7, 11],      // menor maior 7 (CmM7)
  'dim7':  [0, 3, 6, 9],       // diminuto 7    (Cdim7)
  'm7b5':  [0, 3, 6, 10],      // meio-dim      (Cm7b5)
  'ø':     [0, 3, 6, 10],      // meio-dim      (Cø)
  'aug7':  [0, 4, 8, 10],      // aumentado 7   (Caug7)
  '7sus4': [0, 5, 7, 10],      // 7 sus4        (C7sus4)

  // ── Extensões ─────────────────────────────────────────────────
  '9':     [0, 4, 7, 10, 14],  // dominante 9   (C9)
  'maj9':  [0, 4, 7, 11, 14],  // maior 9       (Cmaj9)
  'm9':    [0, 3, 7, 10, 14],  // menor 9       (Cm9)
  '6':     [0, 4, 7, 9],       // maior 6       (C6)
  'm6':    [0, 3, 7, 9],       // menor 6       (Cm6)
  '11':    [0, 4, 7, 10, 14, 17],
  '13':    [0, 4, 7, 10, 14, 21],
  'add9':  [0, 4, 7, 14],      // add9 (sem 7)
  'add11': [0, 4, 7, 17],
};

/**
 * Parseia um nome de acorde (ex: "F#m7", "Bb7", "Dmaj7") e retorna { root, quality }
 */
function parseChord(chordName) {
  if (!chordName) return { root: 'C', quality: '' };

  // Remove variação de baixo (ex: G/B → G)
  const name = chordName.trim().replace(/\/.*$/, '').trim();

  // Identifica a nota raiz: 1 ou 2 caracteres (ex: F#, Bb, C)
  const rootMatch = name.match(/^([A-G][#b]?)/);
  if (!rootMatch) return { root: 'C', quality: '' };

  const root = rootMatch[1];
  const quality = name.slice(root.length);

  return { root, quality };
}

/**
 * Converte índice cromático + oitava para nome de nota Tone.js
 * Ex: (0, 4) → "C4", (1, 4) → "C#4"
 */
function indexToToneNote(index, octave) {
  const noteIdx = ((index % 12) + 12) % 12;
  return `${INDEX_TO_NOTE[noteIdx]}${octave}`;
}

/**
 * Calcula as notas reais de um acorde a partir do nome.
 * Retorna array no formato Tone.js: ["C3", "E4", "G4"]
 *
 * Voicing: baixo na oitava 3, harmonia na oitava 4 (com wrap automático)
 */
export function buildChordNotes(chordName) {
  const { root, quality } = parseChord(chordName);

  const rootIndex = NOTE_INDEX[root];
  if (rootIndex === undefined) return ['C3', 'E4', 'G4'];

  // Pega a fórmula — tenta exata, depois fallback gradual
  const formula = CHORD_FORMULAS[quality]
    ?? CHORD_FORMULAS[quality.replace(/^m/, 'm')] // normaliza
    ?? CHORD_FORMULAS[''];                         // fallback: maior

  // Constrói o voicing: [baixo (oitava 3), notas harmônicas (oitava 4+)]
  const notes = [];
  let prevMidi = -1;

  formula.forEach((semitones, i) => {
    const noteIdx = (rootIndex + semitones) % 12;
    let octave = i === 0 ? 3 : 4; // baixo na 3, resto na 4

    // Garante que cada nota seja mais aguda que a anterior (voicing aberto)
    const midi = octave * 12 + noteIdx;
    if (midi <= prevMidi) {
      octave += 1;
    }
    prevMidi = octave * 12 + noteIdx;

    notes.push(indexToToneNote(noteIdx, octave));
  });

  return notes;
}

// ─────────────────────────────────────────────────────────────────
//  HOOK DE ÁUDIO
// ─────────────────────────────────────────────────────────────────

export function useChordAudio() {
  const synthRef = useRef(null);
  const playerRef = useRef(null);

  const getSynth = useCallback(() => {
    if (!synthRef.current) {
      synthRef.current = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.05, decay: 0.3, sustain: 0.65, release: 1.8 },
        volume: -8,
      }).toDestination();
    }
    return synthRef.current;
  }, []);

  /**
   * Toca uma progressão sintetizada.
   * Cada acorde é construído calculando os intervalos corretos.
   */
  const playProgression = useCallback(async (chords, bpm = 80, beatsPerMeasure = 4) => {
    await Tone.start();
    const synth = getSynth();
    synth.releaseAll();

    const beatDuration = 60 / bpm;
    const chordDuration = beatDuration * beatsPerMeasure; // 1 compasso completo por acorde
    const now = Tone.now() + 0.15;

    chords.forEach((chord, i) => {
      const allNotes = buildChordNotes(chord);
      const bassNote = allNotes[0];         // oitava 3: grave
      const harmNotes = allNotes.slice(1);  // oitava 4+: harmonia
      const chordStart = now + i * chordDuration;

      // Baixo levemente mais forte e mais longo
      synth.triggerAttackRelease([bassNote], chordDuration * 0.95, chordStart, 0.75);
      // Harmonia um pouco depois (strumming simulado)
      synth.triggerAttackRelease(harmNotes, chordDuration * 0.82, chordStart + 0.04, 0.52);
    });
  }, [getSynth]);

  /**
   * Toca o playback da música + acordes sintetizados sincronizados
   */
  const playWithPlayback = useCallback(async (playbackUrl, chords, bpm = 80, beatsPerMeasure = 4) => {
    await Tone.start();
    stopAll();

    const synth = getSynth();
    synth.releaseAll();

    const audio = new Audio(playbackUrl);
    audio.volume = 0.75;
    audio.crossOrigin = 'anonymous';
    playerRef.current = audio;

    await new Promise((resolve) => {
      audio.addEventListener('canplay', resolve, { once: true });
      audio.addEventListener('error', resolve, { once: true });
      audio.load();
    });

    audio.play().catch(() => {});

    const beatDuration = 60 / bpm;
    const chordDuration = beatDuration * beatsPerMeasure;
    const now = Tone.now() + 0.2;

    chords.forEach((chord, i) => {
      const allNotes = buildChordNotes(chord);
      const bassNote = allNotes[0];
      const harmNotes = allNotes.slice(1);
      const chordStart = now + i * chordDuration;

      synth.triggerAttackRelease([bassNote], chordDuration * 0.85, chordStart, 0.35);
      synth.triggerAttackRelease(harmNotes, chordDuration * 0.8, chordStart + 0.05, 0.25);
    });

    return (chords.length * chordDuration + 0.5) * 1000;
  }, [getSynth]);

  const getProgressionDuration = useCallback((chords, bpm = 80) => {
    const beatDuration = 60 / bpm;
    const chordDuration = beatDuration * 2;
    return (chords.length * chordDuration + 0.5) * 1000;
  }, []);

  const getPlaybackDuration = useCallback((chords, bpm = 80, beatsPerMeasure = 4) => {
    const beatDuration = 60 / bpm;
    const chordDuration = beatDuration * beatsPerMeasure;
    return (chords.length * chordDuration + 0.5) * 1000;
  }, []);

  const stopAll = useCallback(() => {
    if (synthRef.current) synthRef.current.releaseAll();
    if (playerRef.current) {
      playerRef.current.pause();
      playerRef.current.currentTime = 0;
      playerRef.current = null;
    }
  }, []);

  const stop = stopAll;

  return { playProgression, playWithPlayback, stop, stopAll, getProgressionDuration, getPlaybackDuration, buildChordNotes };
}