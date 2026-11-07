import { useRef, useCallback, useState } from 'react';
import * as Tone from 'tone';
import { Midi } from '@tonejs/midi';

// ─── Mapeamento diagram_pattern → notas de percussão ────────────────────────
const DIAGRAM_TO_NOTE = {
  'B': 'C1',   // Bumbo
  'A': 'D1',   // Alto (caixa)
  'X': 'F#1',  // Abafado (hihat fechado)
  'L': 'A#1',  // Leque (hihat aberto)
};

// ─── Cria o kit de percussão sintética ───────────────────────────────────────
function buildDrumKit() {
  const kick = new Tone.MembraneSynth({
    pitchDecay: 0.07, octaves: 6,
    envelope: { attack: 0.001, decay: 0.35, sustain: 0, release: 0.2 },
    volume: 2,
  }).toDestination();

  const snare = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.001, decay: 0.18, sustain: 0, release: 0.05 },
    volume: -4,
  }).toDestination();

  const hihat = new Tone.MetalSynth({
    frequency: 400, envelope: { attack: 0.001, decay: 0.05, release: 0.01 },
    harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5,
    volume: -14,
  }).toDestination();

  const openHat = new Tone.MetalSynth({
    frequency: 400, envelope: { attack: 0.001, decay: 0.18, release: 0.05 },
    harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5,
    volume: -16,
  }).toDestination();

  return { kick, snare, hihat, openHat };
}

function noteToInstrument(note, kit) {
  if (note === 'C1')  return kit.kick;
  if (note === 'D1')  return kit.snare;
  if (note === 'F#1') return kit.hihat;
  if (note === 'A#1') return kit.openHat;
  return kit.hihat;
}

// ─── Fallback: diagram_pattern → beats ──────────────────────────────────────
function diagramPatternToBeats(diagramPattern, timeSignature) {
  if (!diagramPattern) return [];
  const tokens = diagramPattern.trim().toUpperCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];

  const [numerator] = (timeSignature || '4/4').split('/').map(Number);
  const beatsPerMeasure = numerator || 4;
  const totalEighths = beatsPerMeasure * 2;
  const beats = [];

  for (let ei = 0; ei < totalEighths; ei++) {
    const token = tokens[ei % tokens.length];
    if (!token || token === '-') continue;
    const note = DIAGRAM_TO_NOTE[token] || 'F#1';
    const beat = Math.floor(ei / 2);
    const subdiv16 = (ei % 2) * 2;
    const time = `0:${beat}:${subdiv16}`;
    const vel = token === 'B' ? (ei === 0 ? 0.95 : 0.82)
              : token === 'A' ? 0.72
              : token === 'X' ? 0.48
              : token === 'L' ? 0.42 : 0.38;
    beats.push({ time, note, vel });
  }
  return beats;
}

// ─── MIDI: carrega e toca o arquivo .mid em loop ─────────────────────────────
async function startMidiPlayback(midiUrl, bpm, partsRef) {
  const response = await fetch(midiUrl);
  const arrayBuffer = await response.arrayBuffer();
  const midi = new Midi(arrayBuffer);

  // Usa o BPM do usuário, ignorando o do arquivo MIDI para sincronizar com os acordes
  Tone.getTransport().bpm.value = bpm;

  // Calcula a duração total do MIDI em segundos (usando o bpm do arquivo para referência)
  // e converte para o tempo do transport atual
  const midiDurationSeconds = midi.duration;
  // Duração do loop = comprimento do arquivo MIDI (em "ticks" ou segundos relativos ao BPM atual)
  // Para simplicidade, usamos a duração em beats a partir do BPM original do MIDI
  const originalBpm = midi.header.tempos?.[0]?.bpm || bpm;
  const durationInBeats = midiDurationSeconds * (originalBpm / 60);
  const loopDurationAtCurrentBpm = (durationInBeats / bpm) * 60;

  const createdParts = [];

  midi.tracks.forEach((track) => {
    // Cria um sampler simples mapeando as notas MIDI de percussão (ch 10 = GM drums)
    // Para percussão, usamos MembraneSynth/MetalSynth por nota MIDI
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.1 },
      volume: -8,
    }).toDestination();

    const notes = track.notes.map(note => ({
      time: note.time,
      note: note.name,
      duration: note.duration,
      velocity: note.velocity,
    }));

    if (notes.length === 0) return;

    const part = new Tone.Part((time, n) => {
      synth.triggerAttackRelease(n.note, n.duration, time, n.velocity);
    }, notes);

    // Calcula o loopEnd com base no tamanho real do MIDI
    part.loop = true;
    part.loopEnd = midiDurationSeconds;
    part.start(0);
    createdParts.push({ part, synth });
  });

  partsRef.current = createdParts;
}

// ─── Hook principal ──────────────────────────────────────────────────────────
export function useBackingTrack() {
  const midiPartsRef = useRef([]);
  const synthPartRef = useRef(null);
  const kitRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const getKit = useCallback(() => {
    if (!kitRef.current) kitRef.current = buildDrumKit();
    return kitRef.current;
  }, []);

  const stopBacking = useCallback(() => {
    // Para parts MIDI
    midiPartsRef.current.forEach(({ part, synth }) => {
      try { part.stop(); part.dispose(); } catch {}
      try { synth.dispose(); } catch {}
    });
    midiPartsRef.current = [];

    // Para part de síntese
    if (synthPartRef.current) {
      try { synthPartRef.current.stop(); synthPartRef.current.dispose(); } catch {}
      synthPartRef.current = null;
    }

    Tone.getTransport().stop();
    Tone.getTransport().cancel();
    setIsPlaying(false);
  }, []);

  /**
   * startBacking aceita um objeto Rhythm da entidade:
   * { backing_track_url, diagram_pattern, time_signature, name }
   *
   * Prioridade:
   *  1. Se tiver backing_track_url com .mid/.midi → toca o MIDI diretamente
   *  2. Senão → sintetiza a partir do diagram_pattern
   */
  const startBacking = useCallback(async (rhythmData, bpm = 100) => {
    await Tone.start();
    stopBacking();

    Tone.getTransport().bpm.value = bpm;

    const hasMidi = rhythmData?.backing_track_url &&
      (rhythmData.backing_track_url.toLowerCase().includes('.mid'));

    if (hasMidi) {
      try {
        await startMidiPlayback(rhythmData.backing_track_url, bpm, midiPartsRef);
        Tone.getTransport().start();
        setIsPlaying(true);
        return;
      } catch (err) {
        console.warn('Falha ao carregar MIDI, usando síntese fallback:', err);
      }
    }

    // Fallback: síntese por diagram_pattern
    const timeSignature = rhythmData?.time_signature || '4/4';
    const [num, den] = timeSignature.split('/').map(Number);
    Tone.getTransport().timeSignature = [num || 4, den || 4];

    const beats = diagramPatternToBeats(rhythmData?.diagram_pattern, timeSignature);
    if (beats.length === 0) return;

    const kit = getKit();
    const part = new Tone.Part((time, hit) => {
      const instr = noteToInstrument(hit.note, kit);
      if (instr instanceof Tone.NoiseSynth) {
        instr.triggerAttackRelease('8n', time, hit.vel);
      } else if (instr instanceof Tone.MembraneSynth) {
        instr.triggerAttackRelease('C1', '8n', time, hit.vel);
      } else {
        instr.triggerAttackRelease('8n', time, hit.vel);
      }
    }, beats);

    part.loop = true;
    part.loopEnd = '1m';
    synthPartRef.current = part;
    part.start(0);
    Tone.getTransport().start();
    setIsPlaying(true);
  }, [getKit, stopBacking]);

  return { startBacking, stopBacking, isPlaying };
}