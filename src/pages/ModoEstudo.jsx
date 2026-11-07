import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
// Essentia.js loaded async (WASM ~2.5MB) — used for ChordsDetection algorithm
let _essentiaInstance = null;
let _essentiaLoading = false;
function loadEssentia() {
  if (_essentiaInstance) return Promise.resolve(_essentiaInstance);
  if (_essentiaLoading) return Promise.resolve(null);
  _essentiaLoading = true;
  return import('essentia.js').then(mod => {
    const Essentia = mod.default || mod.Essentia || mod;
    const EssentiaWASM = mod.EssentiaWASM;
    if (typeof Essentia === 'function' && EssentiaWASM) {
      _essentiaInstance = new Essentia(EssentiaWASM);
    }
    return _essentiaInstance;
  }).catch(() => null);
}
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useOfflineSync } from "@/components/utils/useOfflineSync";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Play, Pause, RotateCcw, Music, ChevronLeft,
  Clock, Guitar, Lightbulb, Volume2, VolumeX, Waves
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

// ─── Music theory ──────────────────────────────────────────────────────────────
const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const MAJOR_SCALE_STEPS = [0, 2, 4, 5, 7, 9, 11];
const MAJOR_CHORD_TYPES = ['', 'm', 'm', '', '', 'm', 'm'];

function getDiatonicChords(key) {
  const root = NOTE_NAMES.indexOf(key);
  if (root < 0) return new Set();
  const chords = new Set();
  MAJOR_SCALE_STEPS.forEach((step, i) => {
    const notePc = (root + step) % 12;
    const noteName = NOTE_NAMES[notePc];
    chords.add(noteName + MAJOR_CHORD_TYPES[i]);
    if (i === 4) chords.add(noteName + '7');
  });
  return chords;
}

// ─── Parser da cifra escrita ─────────────────────────────────────────────────
// Extrai todos os acordes únicos da cifra (sem timing) para usar como mapa
function parseCifraChords(cifraText) {
  if (!cifraText || typeof cifraText !== 'string') return new Set();
  // Captura tokens de acorde no início de palavras
  const chordRegex = /\b([A-G][b#]?(?:m(?:aj)?7?|maj7|[79]|sus[24]|dim|aug)?)/g;
  const chords = new Set();
  for (const m of cifraText.matchAll(chordRegex)) {
    let c = m[1];
    // Normaliza bemóis → sustenidos
    c = c.replace('Db','C#').replace('Eb','D#').replace('Fb','E')
         .replace('Gb','F#').replace('Ab','G#').replace('Bb','A#');
    if (c.length >= 1) chords.add(c);
  }
  return chords;
}

const TEMPLATES_BY_MODE = {
  easy: [
    { suffix: '',  intervals: [0, 4, 7] },
    { suffix: 'm', intervals: [0, 3, 7] },
  ],
  medium: [
    { suffix: '',   intervals: [0, 4, 7] },
    { suffix: 'm',  intervals: [0, 3, 7] },
    { suffix: '7',  intervals: [0, 4, 7, 10] },
    { suffix: 'm7', intervals: [0, 3, 7, 10] },
  ],
  advanced: [
    { suffix: '',   intervals: [0, 4, 7] },
    { suffix: 'm',  intervals: [0, 3, 7] },
    { suffix: '7',  intervals: [0, 4, 7, 10] },
    { suffix: 'm7', intervals: [0, 3, 7, 10] },
  ],
};

const KS_MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const KS_MINOR = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

function detectKeyFromChroma(chroma) {
  let bestKey = null, bestScore = -Infinity, bestIsMinor = false;
  for (let root = 0; root < 12; root++) {
    for (const [profile, isMinor] of [[KS_MAJOR, false], [KS_MINOR, true]]) {
      const rotated = Array.from({ length: 12 }, (_, i) => profile[(i + 12 - root) % 12]);
      const n = 12;
      const meanC = chroma.reduce((a, b) => a + b, 0) / n;
      const meanP = rotated.reduce((a, b) => a + b, 0) / n;
      let num = 0, dc = 0, dp = 0;
      for (let i = 0; i < n; i++) {
        const c = chroma[i] - meanC, p = rotated[i] - meanP;
        num += c * p; dc += c * c; dp += p * p;
      }
      const r = (dc > 0 && dp > 0) ? num / Math.sqrt(dc * dp) : 0;
      if (r > bestScore) { bestScore = r; bestKey = NOTE_NAMES[root]; bestIsMinor = isMinor; }
    }
  }
  return bestIsMinor ? bestKey + 'm' : bestKey;
}

const CIRCLE_OF_FIFTHS = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];
function fifthsDistance(a, b) {
  if (!a || !b) return 6;
  const rootA = NOTE_NAMES.indexOf(a.replace(/m7|maj7|sus4|sus2|dim|aug|m|7|9/g, ''));
  const rootB = NOTE_NAMES.indexOf(b.replace(/m7|maj7|sus4|sus2|dim|aug|m|7|9/g, ''));
  if (rootA < 0 || rootB < 0) return 6;
  const posA = CIRCLE_OF_FIFTHS.indexOf(rootA);
  const posB = CIRCLE_OF_FIFTHS.indexOf(rootB);
  const dist = Math.abs(posA - posB);
  return Math.min(dist, 12 - dist);
}

function buildChroma(fftData, sampleRate) {
  const chroma = new Float32Array(12);
  const bufLen = fftData.length;
  const nyquist = sampleRate / 2;
  const minBin = Math.max(1, Math.floor(60  / nyquist * bufLen));
  const maxBin = Math.min(bufLen - 1, Math.ceil(5000 / nyquist * bufLen));
  let totalEnergy = 0;
  for (let i = minBin; i < maxBin; i++) {
    const db = fftData[i];
    if (db < -80) continue;
    const freq = (i / bufLen) * sampleRate;
    const mag  = Math.pow(10, db / 20);
    totalEnergy += mag;
    const midi = 12 * Math.log2(freq / 440) + 69;
    const pc   = ((Math.round(midi) % 12) + 12) % 12;
    const weight = freq < 200 ? 3.5 : freq < 400 ? 2.5 : freq < 800 ? 1.5 : freq < 2000 ? 1.0 : 0.6;
    chroma[pc] += mag * weight;
  }
  const maxVal = Math.max(...chroma, 1e-10);
  for (let i = 0; i < 12; i++) chroma[i] /= maxVal;
  return { chroma, totalEnergy };
}

function buildChromaWithEssentia(ess, timeDomainData, sampleRate) {
  try {
    const WASMModule = ess.EssentiaModule || ess.module;
    if (!WASMModule) return null;
    const frameSize = timeDomainData.length;
    // Compute energy from time domain
    let energy = 0;
    for (let i = 0; i < frameSize; i++) energy += timeDomainData[i] * timeDomainData[i];
    const rmsEnergy = Math.sqrt(energy / frameSize);
    if (rmsEnergy < 0.001) return { chroma: new Float32Array(12), totalEnergy: 0 };
    // Build WASM vector from time domain frame
    const frameVec = new WASMModule.VectorFloat();
    for (let i = 0; i < frameSize; i++) frameVec.push_back(timeDomainData[i]);
    // Windowing
    const windowed = ess.Windowing(frameVec, true, 0, 'blackmanharris62', frameSize, false);
    frameVec.delete();
    if (!windowed?.frame) return null;
    // Spectrum
    const specResult = ess.Spectrum(windowed.frame, frameSize);
    windowed.frame.delete();
    if (!specResult?.spectrum) return null;
    // Chromagram (CQT-based)
    const chromaResult = ess.Chromagram(specResult.spectrum, frameSize, sampleRate, 12, 32.7, 'none', 0.0);
    specResult.spectrum.delete();
    if (!chromaResult?.chromagram) return null;
    const size = typeof chromaResult.chromagram.size === 'function' ? chromaResult.chromagram.size() : chromaResult.chromagram.length;
    const chroma = new Float32Array(12);
    for (let i = 0; i < Math.min(12, size); i++) {
      chroma[i] = typeof chromaResult.chromagram.get === 'function' ? chromaResult.chromagram.get(i) : chromaResult.chromagram[i];
    }
    chromaResult.chromagram.delete();
    const maxVal = Math.max(...chroma, 1e-10);
    for (let i = 0; i < 12; i++) chroma[i] /= maxVal;
    return { chroma, totalEnergy: rmsEnergy * 10 };
  } catch (_e) {
    return null;
  }
}

// ─── Solo / Melodic repose detection ─────────────────────────────────────────
// Returns { note, inferredChord, confidence } when passage is sparse (solo/bicorde)
function detectSoloRepose(chroma, totalEnergy, key) {
  if (totalEnergy < 0.008) return null;
  const sorted = [...chroma]
    .map((v, i) => ({ v, i }))
    .sort((a, b) => b.v - a.v);
  const top1 = sorted[0];
  const top2 = sorted[1];
  const top3 = sorted[2];
  // Solo passage: top note dominates, 3rd note is weak
  if (top1.v < 0.40) return null;
  if (top3.v > 0.42) return null; // too many notes = likely a chord, not solo
  // Repose note: strongest note
  const reposePc = top1.i;
  const reposeName = NOTE_NAMES[reposePc];
  // Infer chord: find diatonic chord whose root matches the repose note
  if (!key) return { note: reposeName, inferredChord: reposeName, confidence: 0.5 };
  const keyRoot = key.replace('m', '');
  const root = NOTE_NAMES.indexOf(keyRoot);
  if (root < 0) return { note: reposeName, inferredChord: reposeName, confidence: 0.5 };
  // Build diatonic chords of the key with degree info
  const diatonicRoots = MAJOR_SCALE_STEPS.map((step, i) => ({
    pc: (root + step) % 12,
    chord: NOTE_NAMES[(root + step) % 12] + MAJOR_CHORD_TYPES[i],
    step
  }));
  // Find which diatonic chord the repose note belongs to as a root
  const match = diatonicRoots.find(d => d.pc === reposePc);
  if (match) {
    // Check if the 5th of this chord also has some energy (confirms it)
    const fifthPc = (reposePc + 7) % 12;
    const confidence = 0.6 + (chroma[fifthPc] > 0.25 ? 0.25 : 0);
    return { note: reposeName, inferredChord: match.chord, confidence };
  }
  // Repose note is not a root: find diatonic chord that contains it
  for (const d of diatonicRoots) {
    const isMinor = MAJOR_CHORD_TYPES[MAJOR_SCALE_STEPS.indexOf(d.step)] === 'm';
    const third = isMinor ? 3 : 4;
    const containsAsThird = (d.pc + third) % 12 === reposePc;
    const containsAsFifth  = (d.pc + 7) % 12 === reposePc;
    if (containsAsThird || containsAsFifth) {
      return { note: reposeName, inferredChord: d.chord, confidence: 0.45 };
    }
  }
  return { note: reposeName, inferredChord: reposeName, confidence: 0.3 };
}

function detectChord({ chroma, totalEnergy }, diatonicChords = null, mode = 'medium', recentChords = [], cifraChords = null) {
  if (totalEnergy < 0.014) return null;
  const sortedChroma = [...chroma].sort((a, b) => b - a);
  if (sortedChroma[2] < 0.42) return null;
  const activeNotes = chroma.filter(v => v > 0.40).length;
  if (activeNotes < 3) return null;
  let bestName = null, bestScore = -Infinity, secondScore = -Infinity;
  const templates = TEMPLATES_BY_MODE[mode] || TEMPLATES_BY_MODE.medium;
  for (let root = 0; root < 12; root++) {
    for (const tmpl of templates) {
      const intervals = tmpl.intervals;
      const nNotes = intervals.length;
      const isMinorVariant = tmpl.suffix.startsWith('m') || tmpl.suffix === 'dim';
      let presenceScore = 0;
      for (const iv of intervals) {
        const pc = (root + iv) % 12;
        presenceScore += chroma[pc] * (iv === 0 ? 3.0 : iv === 7 ? 1.5 : 1.0);
      }
      presenceScore /= nNotes;
      let chromPenalty = 0, outsideCount = 0;
      for (let pc = 0; pc < 12; pc++) {
        const relPc = (pc - root + 12) % 12;
        if (!intervals.includes(relPc) && chroma[pc] > 0.3) {
          chromPenalty += chroma[pc] * 0.6;
          outsideCount++;
        }
      }
      if (outsideCount > 4) chromPenalty *= 1.2;
      let score = presenceScore - chromPenalty * 0.45;

      if (!isMinorVariant) {
        const seventhPc = (root + 10) % 12;
        const seventhEnergy = chroma[seventhPc];
        const candidateName7  = NOTE_NAMES[root] + '7';
        const candidateSimple = NOTE_NAMES[root];
        // Cifra sabe exatamente se tem 7ª ou não — usa isso para resolver ambiguidade
        const cifraHas7      = cifraChords?.has(candidateName7);
        const cifraHasSimple = cifraChords?.has(candidateSimple);
        if (tmpl.suffix === '7' || tmpl.suffix === 'm7') {
          if (seventhEnergy < 0.28) {
            // 7ª ausente no áudio: penaliza, mas cifra pode salvar
            score -= cifraHas7 ? 0.10 : 0.45;
          } else if (seventhEnergy < 0.42) {
            score -= cifraHas7 ? 0.00 : 0.18; // cifra confirma → sem penalidade
          }
          // Bônus extra quando cifra confirma a sétima
          if (cifraHas7) score += 0.30;
        } else {
          if (seventhEnergy < 0.28) {
            score += cifraHasSimple ? 0.50 : 0.42;
          } else if (seventhEnergy < 0.42) {
            // 7ª fraca: se cifra diz que é simples, reforça; se diz que é com 7, penaliza
            score += cifraHasSimple ? 0.35 : (cifraHas7 ? -0.10 : 0.26);
          } else {
            // 7ª presente no áudio: se cifra diz simples, bônus mínimo; se diz com 7, penaliza acorde simples
            score += cifraHasSimple ? 0.12 : (cifraHas7 ? -0.20 : 0.12);
          }
        }
      } else {
        const minorThirdPc = (root + 3) % 12;
        const majorThirdPc = (root + 4) % 12;
        if (chroma[majorThirdPc] > chroma[minorThirdPc] * 0.75) { score -= 0.45; }
        const thirdDiff = chroma[minorThirdPc] - chroma[majorThirdPc];
        if (thirdDiff < 0.25) { score -= 0.35; }
        if (chroma[minorThirdPc] < 0.55) { score -= 0.25; }
        // Cifra confirma acorde menor → bônus
        const candidateMinor = NOTE_NAMES[root] + (tmpl.suffix || 'm');
        if (cifraChords?.has(candidateMinor)) score += 0.25;
      }

      const candidateName = NOTE_NAMES[root] + tmpl.suffix;
      if (diatonicChords?.size > 0 && diatonicChords.has(candidateName)) score += 0.22;

      // ── Mapa da cifra: resolve ambiguidade para TODOS os tipos de acorde ──
      if (cifraChords?.size > 0) {
        if (cifraChords.has(candidateName)) {
          // Cifra confirma exatamente este acorde → boost forte
          score += 0.35;
        } else {
          // Acorde não está na cifra → penalidade leve (pode ser passagem cromática)
          score -= 0.12;
        }
      }

      if (recentChords.length > 0) {
        const dist = fifthsDistance(recentChords[recentChords.length - 1], candidateName);
        if (dist <= 1) score += 0.30;
        else if (dist <= 2) score += 0.12;
        else if (dist >= 5) score -= 0.20;
      }
      if (score > bestScore) { secondScore = bestScore; bestScore = score; bestName = candidateName; }
      else if (score > secondScore) { secondScore = score; }
    }
  }
  if (bestScore < 0.35) return null;
  if (bestScore - secondScore < 0.16) return null;
  if (!bestName) return null;
  const sortedNotes = [...NOTE_NAMES].sort((a, b) => b.length - a.length);
  const rootName = sortedNotes.find(n => bestName.startsWith(n)) || null;
  if (!rootName) return null;
  const rootPc = NOTE_NAMES.indexOf(rootName);
  if (rootPc < 0 || chroma[rootPc] < 0.30) return null;
  return bestName;
}

// ─── Hook de análise ──────────────────────────────────────────────────────────
function useAudioAnalyzer(audioRef, active, beatsPerMeasure, songKey, mode = 'medium', cifraChordsSet = null) {
  const [chord, setChord]               = useState(null);
  const [soloRepose, setSoloRepose]     = useState(null);
  const [analyzing, setAnalyzing]       = useState(false);
  const [bpm, setBpm]                   = useState(null);
  const [beatPosition, setBeatPosition] = useState(0);

  const ctxRef           = useRef(null);
  const analyserRef      = useRef(null);
  const timeDomainRef    = useRef(null);
  const rafRef           = useRef(null);
  const setupRef         = useRef(false);
  const essentiaRef      = useRef(null);
  const essFramesRef     = useRef([]);
  const ESS_FRAMES       = 30;

  useEffect(() => { loadEssentia().then(ess => { essentiaRef.current = ess; }); }, []);

  const BUFFER_SIZE      = 8;
  const bufferRef        = useRef([]);
  const CHROMA_HISTORY_SIZE = 5;
  const chromaHistoryRef = useRef([]);
  const lastChordRef     = useRef(null);
  const lastChangeRef    = useRef(0);
  const bpmRef           = useRef(null);

  const getMinInterval = useCallback(() => {
    const b = bpmRef.current;
    if (!b || b < 40) return 1200;
    return Math.max(600, Math.min(1800, (60000 / b) * 2));
  }, []);

  const diatonicRef     = useRef(null);
  const autoKeyRef      = useRef(null);
  const keyChromaAccum  = useRef(new Float32Array(12));
  const keyFrameCount   = useRef(0);
  const KEY_UPDATE_FRAMES = 200;

  useEffect(() => {
    if (songKey) {
      const keyForDiatonic = songKey.endsWith('m')
        ? NOTE_NAMES[(NOTE_NAMES.indexOf(songKey.replace('m','')) + 3) % 12]
        : songKey;
      diatonicRef.current = getDiatonicChords(keyForDiatonic);
      autoKeyRef.current = null;
    }
  }, [songKey]);

  const modeRef = useRef(mode);
  useEffect(() => { modeRef.current = mode; }, [mode]);

  // Ref para o mapa de acordes da cifra — atualiza sem recriar o analyze
  const cifraChordsRef = useRef(cifraChordsSet);
  useEffect(() => { cifraChordsRef.current = cifraChordsSet; }, [cifraChordsSet]);

  const recentChordsRef = useRef([]);

  const pendingChordRef = useRef(null);
  const pendingVotesRef = useRef(0);
  const beatPositionRef = useRef(0);

  // Beat detection
  const prevEnergyRef  = useRef(0);
  const beatTimesRef   = useRef([]);
  const beatCountRef   = useRef(0);
  const lastBeatRef    = useRef(0);
  const accentMapRef   = useRef({});
  const [autoTimeSig, setAutoTimeSig]   = useState(null);
  const autoTimeSigRef = useRef(beatsPerMeasure);
  const bpmMeasureRef  = useRef(beatsPerMeasure);
  useEffect(() => { bpmMeasureRef.current = beatsPerMeasure; }, [beatsPerMeasure]);

  const analyze = useCallback(() => {
    if (!analyserRef.current || !ctxRef.current) return;
    const analyser   = analyserRef.current;
    const sampleRate = ctxRef.current.sampleRate;
    const fftData    = new Float32Array(analyser.frequencyBinCount);
    analyser.getFloatFrequencyData(fftData);

    // Prefer Essentia Chromagram (CQT-based) when available
    let result = null;
    const ess = essentiaRef.current;
    if (ess) {
      if (!timeDomainRef.current || timeDomainRef.current.length !== analyser.fftSize) {
        timeDomainRef.current = new Float32Array(analyser.fftSize);
      }
      analyser.getFloatTimeDomainData(timeDomainRef.current);
      result = buildChromaWithEssentia(ess, timeDomainRef.current, sampleRate);
    }
    if (!result) result = buildChroma(fftData, sampleRate);

    const chromaHist = chromaHistoryRef.current;
    chromaHist.push(result.chroma);
    if (chromaHist.length > CHROMA_HISTORY_SIZE) chromaHist.shift();
    const temporalChroma = new Float32Array(12);
    const decay = 0.60;
    let totalWeight = 0;
    chromaHist.forEach((ch, i) => {
      const w = Math.pow(decay, chromaHist.length - 1 - i);
      totalWeight += w;
      for (let pc = 0; pc < 12; pc++) temporalChroma[pc] += ch[pc] * w;
    });
    if (totalWeight > 0) for (let pc = 0; pc < 12; pc++) temporalChroma[pc] /= totalWeight;

    if (!songKey) {
      const acc = keyChromaAccum.current;
      for (let i = 0; i < 12; i++) acc[i] += result.chroma[i];
      keyFrameCount.current += 1;
      if (keyFrameCount.current >= KEY_UPDATE_FRAMES) {
        const detectedKey = detectKeyFromChroma(acc);
        if (detectedKey) {
          autoKeyRef.current = detectedKey;
          // Se for tonalidade menor, usa a relativa maior para o campo harmônico
          const relMajor = detectedKey.endsWith('m')
            ? NOTE_NAMES[(NOTE_NAMES.indexOf(detectedKey.replace('m','')) + 3) % 12]
            : detectedKey;
          diatonicRef.current = getDiatonicChords(relMajor);
        }
        keyChromaAccum.current = new Float32Array(12);
        keyFrameCount.current = 0;
      }
    }

    // Solo/melodic repose detection (passagens esparsas — bicordes de viola)
    const soloResult = detectSoloRepose(temporalChroma, result.totalEnergy, songKey || autoKeyRef.current);

    const builtinDetected = detectChord(
      { chroma: temporalChroma, totalEnergy: result.totalEnergy },
      diatonicRef.current, modeRef.current, recentChordsRef.current, cifraChordsRef.current
    );

    let essentiaDetected = null;
    if (ess && result.totalEnergy > 0.006) {
      const frames = essFramesRef.current;
      frames.push(Array.from(result.chroma));
      if (frames.length > ESS_FRAMES * 3) frames.shift();
      if (frames.length >= ESS_FRAMES) {
        try {
          const WASMModule = ess.EssentiaModule;
          if (WASMModule?.VectorVectorReal) {
            const pcp = new WASMModule.VectorVectorReal();
            for (const fr of frames) {
              const v = new WASMModule.VectorReal();
              fr.forEach(val => v.push_back(val));
              pcp.push_back(v); v.delete();
            }
            const res = ess.ChordsDetection(pcp, 2048, sampleRate);
            pcp.delete();
            if (res?.chords && res?.strength) {
              let maxStr = 0, bestIdx = -1;
              const n = typeof res.strength.size === 'function' ? res.strength.size() : res.strength.length;
              for (let i = 0; i < n; i++) {
                const s = typeof res.strength.get === 'function' ? res.strength.get(i) : res.strength[i];
                if (s > maxStr) { maxStr = s; bestIdx = i; }
              }
              if (bestIdx >= 0 && maxStr > 0.3) {
                const raw = typeof res.chords.get === 'function' ? res.chords.get(bestIdx) : res.chords[bestIdx];
                if (raw?.includes(' ')) {
                  const parts = raw.split(' ');
                  essentiaDetected = parts[1] === 'minor' ? parts[0] + 'm' : parts[0];
                } else if (raw) { essentiaDetected = raw; }
              }
            }
          }
        } catch (_e) {}
      }
    }

    let detected = builtinDetected;
    if (essentiaDetected) {
      const diatonic = diatonicRef.current;
      const isDiatonic = !diatonic || diatonic.has(essentiaDetected);
      const sortedNotes2 = [...NOTE_NAMES].sort((a, b) => b.length - a.length);
      const rootEss  = sortedNotes2.find(n => essentiaDetected.startsWith(n));
      const rootBlt  = builtinDetected ? sortedNotes2.find(n => builtinDetected.startsWith(n)) : null;
      const sameRoot = rootEss && rootBlt && rootEss === rootBlt;
      if (sameRoot) {
        detected = builtinDetected;
      } else {
        detected = isDiatonic ? essentiaDetected : (builtinDetected || essentiaDetected);
      }
    }

    // Se não detectou acorde completo, tenta repouso de solo
    if (!detected && soloResult?.inferredChord) {
      setSoloRepose(soloResult);
    } else if (detected) {
      setSoloRepose(null);
    }

    if (detected) {
      const rc = recentChordsRef.current;
      if (rc[rc.length - 1] !== detected) { rc.push(detected); if (rc.length > 4) rc.shift(); }
    }

    const buf = bufferRef.current;
    buf.push(detected);
    if (buf.length > BUFFER_SIZE) buf.shift();

    if (buf.length >= BUFFER_SIZE) {
      const rawVotes = {};
      for (const c of buf) { if (c) rawVotes[c] = (rawVotes[c] || 0) + 1; }
      const current = lastChordRef.current;
      if (current && rawVotes[current]) rawVotes[current] += 8;
      const sorted = Object.entries(rawVotes).sort((a, b) => b[1] - a[1]);
      const winner = sorted[0];
      if (winner?.[0]) {
        const trueVotes = buf.filter(c => c === winner[0]).length;
        const threshold = Math.ceil(BUFFER_SIZE * 0.50);
        if (trueVotes >= threshold) {
          const now = performance.now();
          const isBeat1 = beatPositionRef.current === 0;
          const isNewChord = winner[0] !== current;
          const minOk = (now - lastChangeRef.current) > getMinInterval();
          if (!current) {
            lastChordRef.current = winner[0]; lastChangeRef.current = now;
            setChord(winner[0]); pendingChordRef.current = null; pendingVotesRef.current = 0;
          } else if (isNewChord && minOk) {
            if (pendingChordRef.current !== winner[0]) { pendingChordRef.current = winner[0]; pendingVotesRef.current = 1; }
            else { pendingVotesRef.current += 1; }
            const confirmedOnBeat1   = isBeat1 && pendingVotesRef.current >= 2;
            const confirmedSustained = pendingVotesRef.current >= 5;
            if (confirmedOnBeat1 || confirmedSustained) {
              lastChordRef.current = winner[0]; lastChangeRef.current = now;
              pendingChordRef.current = null; pendingVotesRef.current = 0;
              setChord(winner[0]);
            }
          } else if (!isNewChord) { pendingChordRef.current = null; pendingVotesRef.current = 0; }
        }
      }
    }

    // ── Multi-band adaptive beat detection ──────────────────────────────────
    const nyquist = sampleRate / 2;
    const bufLen  = fftData.length;
    const nowMs   = performance.now();
    const bands = [
      { lo: 40,   hi: 120,   w: 1.8 },
      { lo: 150,  hi: 400,   w: 1.2 },
      { lo: 4000, hi: 12000, w: 0.6 },
    ];
    let onsetEnergy = 0;
    for (const band of bands) {
      const lo = Math.max(1, Math.floor(band.lo / nyquist * bufLen));
      const hi = Math.min(bufLen - 1, Math.ceil(band.hi / nyquist * bufLen));
      let e = 0;
      for (let i = lo; i <= hi; i++) { if (fftData[i] > -80) e += Math.pow(10, fftData[i] / 20); }
      onsetEnergy += e * band.w;
    }
    const adaptiveThreshold = prevEnergyRef.current * 1.75 + 0.018;
    const minGap = bpmRef.current ? Math.max(250, Math.min(450, (60000 / bpmRef.current) * 0.75)) : 300;

    if (onsetEnergy > adaptiveThreshold && (nowMs - lastBeatRef.current) > minGap) {
      lastBeatRef.current = nowMs;
      const times = beatTimesRef.current;
      times.push(nowMs);
      if (times.length > 17) times.shift();
      if (times.length >= 4) {
        const ibi = [];
        for (let i = 1; i < times.length; i++) ibi.push(times[i] - times[i - 1]);
        const sorted = [...ibi].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];
        const valid = ibi.filter(v => Math.abs(v - median) / median < 0.28);
        if (valid.length >= 2) {
          const avgIBI = valid.reduce((s, v) => s + v, 0) / valid.length;
          const rawBpm = 60000 / avgIBI;
          if (rawBpm >= 40 && rawBpm <= 240) {
            const prev = bpmRef.current || rawBpm;
            const smoothed = Math.round(prev * 0.70 + rawBpm * 0.30);
            bpmRef.current = smoothed;
            setBpm(smoothed);
          }
        }
      }
      beatCountRef.current += 1;
      const measureLen = bpmMeasureRef.current;
      const pos = beatCountRef.current % measureLen;
      const am = accentMapRef.current;
      am[pos] = (am[pos] || 0) * 0.92 + onsetEnergy * 0.08;
      if (beatCountRef.current % 16 === 0 && beatCountRef.current > 16) {
        const maxPos = Object.keys(am).length;
        if (maxPos >= 3) {
          const b0 = am[0] || 0.001;
          const b1 = am[1] || 0.001;
          const b2 = am[2] || 0.001;
          const b3 = am[3] || 0.001;
          const b5 = am[5] || 0.001;
          // 3/4: beat 0 muito mais forte que os outros, sem beat forte no meio
          const is3_4 = b0 > b1 * 1.6 && b0 > b2 * 1.6 && b3 < b0 * 0.6;
          // 6/8: beat 0 e beat 3 fortes (padrão ternário composto)
          const is6_8 = b0 > b1 * 1.4 && b3 > b1 * 1.2 && b3 > b2 * 1.2 && maxPos >= 6;
          // 2/4: só 2 beats relevantes
          const is2_4 = maxPos <= 2 || (b2 < b0 * 0.4 && b2 < b1 * 0.4);
          // 4/4: beat 0 e beat 2 mais fortes
          const is4_4 = b0 > b1 * 1.1 && b2 > b1 * 1.1 && !is3_4 && !is6_8;
          const detected = is3_4 ? 3 : is6_8 ? 6 : is2_4 ? 2 : 4;
          if (detected !== autoTimeSigRef.current) {
            autoTimeSigRef.current = detected;
            setAutoTimeSig(detected);
          }
        }
      }
      beatPositionRef.current = pos;
      setBeatPosition(pos);
    }
    prevEnergyRef.current = onsetEnergy > prevEnergyRef.current
      ? prevEnergyRef.current * 0.60 + onsetEnergy * 0.40
      : prevEnergyRef.current * 0.88 + onsetEnergy * 0.12;

    rafRef.current = requestAnimationFrame(analyze);
  }, []);

  const start = useCallback(() => {
    if (!audioRef.current) return;
    try {
      if (!setupRef.current) {
        const ctx      = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = ctx.createAnalyser();
        analyser.fftSize               = 32768;
        analyser.smoothingTimeConstant = 0.88;
        const source = ctx.createMediaElementSource(audioRef.current);
        source.connect(analyser);
        analyser.connect(ctx.destination);
        ctxRef.current      = ctx;
        analyserRef.current = analyser;
        setupRef.current    = true;
      }
      if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
      setAnalyzing(true);
      bufferRef.current = [];
      rafRef.current = requestAnimationFrame(analyze);
    } catch (err) { console.warn('Audio analyzer error:', err.message); }
  }, [audioRef, analyze]);

  const stop = useCallback(() => { cancelAnimationFrame(rafRef.current); setAnalyzing(false); }, []);

  const resetBeat = useCallback(() => {
    beatTimesRef.current  = [];
    beatCountRef.current  = 0;
    lastBeatRef.current   = 0;
    prevEnergyRef.current = 0;
    accentMapRef.current  = {};
    autoTimeSigRef.current = beatsPerMeasure;
    setBpm(null);
    setBeatPosition(0);
    setAutoTimeSig(null);
  }, []);

  useEffect(() => {
    if (active) start(); else stop();
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, start, stop]);

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    if (ctxRef.current?.state !== 'closed') ctxRef.current?.close().catch(() => {});
  }, []);

  return { chord, soloRepose, analyzing, bpm, beatPosition, resetBeat, essentiaLoaded: !!_essentiaInstance, autoKey: autoKeyRef.current, autoTimeSig, _analyserRef: analyserRef };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(s) {
  if (!s || isNaN(s)) return "0:00";
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

// Qualidade esperada de cada grau na escala maior
const DEGREE_QUALITIES = ['Maior', 'Menor', 'Menor', 'Maior', 'Maior', 'Menor', 'Dim'];
const DEGREE_IS_MINOR   = [false,    true,    true,    false,   false,   true,   true];

function getRomanDegree(chordName, key) {
  if (!chordName || !key) return null;
  const romans = ['I','II','III','IV','V','VI','VII'];
  const root = NOTE_NAMES.indexOf(key);
  if (root < 0) return null;
  const sortedNotes = [...NOTE_NAMES].sort((a, b) => b.length - a.length);
  const chordRoot = sortedNotes.find(n => chordName.startsWith(n));
  if (!chordRoot) return null;
  const interval = (NOTE_NAMES.indexOf(chordRoot) - root + 12) % 12;
  const degreeMap = { 0:0, 2:1, 4:2, 5:3, 7:4, 9:5, 11:6 };
  const deg = degreeMap[interval];
  if (deg === undefined) return null;
  // Usa a qualidade REAL do acorde detectado (sufixo do nome)
  const suffix = chordName.slice(chordRoot.length);
  const isMinorChord = suffix.startsWith('m') && !suffix.startsWith('maj');
  const roman = isMinorChord ? romans[deg].toLowerCase() : romans[deg];
  const quality = isMinorChord ? 'Menor' : 'Maior';
  return { roman, quality, deg };
}

// ─── Waveform Timeline (Moises-style) ─────────────────────────────────────────
function WaveformTimeline({ analyserRef, currentTime, duration, chordEvents, songKey, onSeek, bpm }) {
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);
  const VISIBLE_SECS = 10;
  const ctRef = useRef(currentTime);
  const bpmRef2 = useRef(bpm);
  useEffect(() => { ctRef.current = currentTime; }, [currentTime]);
  useEffect(() => { bpmRef2.current = bpm; }, [bpm]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext('2d');
    const draw = () => {
      const W = canvas.offsetWidth || 800;
      const H = canvas.offsetHeight || 120;
      if (canvas.width !== W) canvas.width = W;
      if (canvas.height !== H) canvas.height = H;
      ctx2d.clearRect(0, 0, W, H);
      ctx2d.fillStyle = '#0d0d1e';
      ctx2d.fillRect(0, 0, W, H);

      const BAR_W = 3, GAP = 1, stride = BAR_W + GAP;
      const nBars = Math.floor(W / stride);
      const analyser = analyserRef?.current;

      if (analyser) {
        const freq = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(freq);
        const step = Math.max(1, Math.floor(freq.length / nBars));
        for (let i = 0; i < nBars; i++) {
          const x = i * stride;
          const distFromCenter = Math.abs(i / nBars - 0.5) * 2;
          const val  = freq[i * step] / 255;
          const barH = Math.max(2, val * H * 0.88);
          const y = (H - barH) / 2;
          const alpha = 0.85 - distFromCenter * 0.55;
          if (distFromCenter < 0.06) {
            ctx2d.fillStyle = `rgba(212,175,55,${alpha})`;
          } else if (distFromCenter < 0.2) {
            ctx2d.fillStyle = `rgba(160,140,220,${alpha * 0.9})`;
          } else {
            ctx2d.fillStyle = `rgba(80,100,180,${alpha * 0.6})`;
          }
          ctx2d.beginPath();
          if (ctx2d.roundRect) ctx2d.roundRect(x, y, BAR_W, barH, 1);
          else ctx2d.rect(x, y, BAR_W, barH);
          ctx2d.fill();
        }
      } else {
        for (let i = 0; i < nBars; i++) {
          const x = i * stride;
          const d = Math.abs(i / nBars - 0.5) * 2;
          const h = H * 0.22 * (0.4 + 0.6 * Math.abs(Math.sin(i * 0.35)));
          ctx2d.fillStyle = `rgba(80,100,180,${0.22 - d * 0.18})`;
          ctx2d.beginPath();
          ctx2d.rect(x, (H - h) / 2, BAR_W, h);
          ctx2d.fill();
        }
      }

      // Beat grid
      const bpmNow = bpmRef2.current;
      const ctNow  = ctRef.current;
      if (bpmNow > 0) {
        const secPerBeat = 60 / bpmNow;
        const startT = ctNow - VISIBLE_SECS / 2;
        const firstBeat = Math.ceil(startT / secPerBeat) * secPerBeat;
        ctx2d.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx2d.lineWidth = 1;
        for (let t = firstBeat; t <= ctNow + VISIBLE_SECS / 2; t += secPerBeat) {
          const frac = (t - startT) / VISIBLE_SECS;
          const x = frac * W;
          ctx2d.beginPath(); ctx2d.moveTo(x, 0); ctx2d.lineTo(x, H); ctx2d.stroke();
        }
      }

      // Playhead
      const cx = W / 2;
      ctx2d.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx2d.lineWidth = 2;
      ctx2d.beginPath(); ctx2d.moveTo(cx, 0); ctx2d.lineTo(cx, H); ctx2d.stroke();
      // Arrow top
      ctx2d.fillStyle = 'rgba(255,255,255,0.85)';
      ctx2d.beginPath();
      ctx2d.moveTo(cx - 7, 0); ctx2d.lineTo(cx + 7, 0); ctx2d.lineTo(cx, 10);
      ctx2d.fill();

      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [analyserRef]);

  const halfVis = VISIBLE_SECS / 2;

  // Ticks
  const ticks = [];
  if (duration > 0) {
    const TICK = 5;
    const startT = currentTime - halfVis;
    for (let t = Math.ceil(startT / TICK) * TICK; t <= currentTime + halfVis; t += TICK) {
      ticks.push({ t, frac: (t - startT) / VISIBLE_SECS });
    }
  }

  const visibleChords = chordEvents.filter(ev => Math.abs(ev.time - currentTime) < halfVis);

  const handleClick = (e) => {
    if (!onSeek || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = (e.clientX - rect.left) / rect.width;
    onSeek(Math.max(0, Math.min(duration, (currentTime - halfVis) + frac * VISIBLE_SECS)));
  };

  return (
    <div className="w-full relative rounded-xl overflow-hidden cursor-pointer" style={{ height: 130 }} onClick={handleClick}>
      <canvas ref={canvasRef} className="w-full h-full" style={{ display: 'block' }} />

      {/* Timestamp ticks */}
      <div className="absolute inset-0 pointer-events-none">
        {ticks.map(tick => (
          <div key={tick.t} className="absolute top-0 flex flex-col items-center"
            style={{ left: `${tick.frac * 100}%`, transform: 'translateX(-50%)' }}>
            <span className="text-white/35 text-[9px] font-mono pt-1">{fmt(tick.t)}</span>
            <div className="w-px h-2 bg-white/20 mt-0.5" />
          </div>
        ))}
      </div>

      {/* Key badge */}
      {songKey && (
        <div className="absolute bottom-2 left-2 pointer-events-none">
          <span className="bg-black/60 border border-white/20 text-white/70 text-[10px] font-bold px-2 py-0.5 rounded-full">
            ♪ {songKey}
          </span>
        </div>
      )}

      {/* Chord cards on timeline */}
      <div className="absolute inset-0 pointer-events-none">
        {visibleChords.map((ev, i) => {
          const frac = (ev.time - (currentTime - halfVis)) / VISIBLE_SECS;
          const degInfo = getRomanDegree(ev.chord, songKey);
          const isNear = Math.abs(ev.time - currentTime) < 0.5;
          const isSolo = ev.isSolo;
          return (
            <div key={i} className="absolute flex flex-col items-center"
              style={{ left: `${frac * 100}%`, top: '50%', transform: 'translate(-50%, -50%)' }}>
              <div className={`rounded-lg px-2.5 py-1 shadow-lg border transition-all duration-150 ${
                isSolo
                  ? isNear
                    ? 'bg-purple-900/90 border-purple-400/80 scale-110'
                    : 'bg-purple-900/60 border-purple-500/50'
                  : isNear
                    ? 'bg-[#e8d890] border-[#c8b840] scale-110'
                    : 'bg-[#e8d890]/75 border-[#c8b840]/50'
              }`}>
                <p className={`text-sm font-black leading-tight text-center ${
                  isSolo ? 'text-purple-200' : 'text-[#1a1a0a]'
                }`}>{ev.chord}</p>
                {degInfo && <p className={`text-[9px] font-bold text-center leading-none mt-0.5 ${
                  isSolo ? 'text-purple-400' : 'text-[#6b5a10]'
                }`}>{isSolo ? '♩' : ''}{degInfo.roman}</p>}
              </div>
              <div className={`w-px h-3 mt-0.5 ${
                isSolo ? 'bg-purple-500/40' : 'bg-[#c8b840]/40'
              }`} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Song Selector ────────────────────────────────────────────────────────────
function SongSelector({ songs, onSelect }) {
  const [search, setSearch] = useState("");
  const filtered = songs.filter(s =>
    s.title?.toLowerCase().includes(search.toLowerCase()) ||
    s.artist?.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div className="bg-amber-50 min-h-screen p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link to={createPageUrl("Library")}>
            <Button variant="ghost" size="icon" className="text-[#8B6F47]">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#8B6F47]">Modo Estudo</h1>
            <p className="text-sm text-[#A68A64]">Detecção de acordes em tempo real pelo playback</p>
          </div>
        </div>
        <div className="relative mb-4">
          <Music className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A68A64]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar música..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#D4C5B0] bg-white text-sm focus:outline-none focus:border-[#8B6F47]" />
        </div>
        <Card className="border-[#D4C5B0] bg-white/70">
          <CardContent className="p-2 space-y-1 max-h-[60vh] overflow-y-auto">
            {filtered.length === 0 && <p className="text-[#A68A64] text-center py-8 text-sm">Nenhuma música encontrada.</p>}
            {filtered.map(song => (
              <button key={song.id} onClick={() => onSelect(song)}
                className="w-full text-left p-3 rounded-xl hover:bg-[#8B6F47]/5 hover:border-[#8B6F47] border border-transparent transition-all">
                <p className="font-bold text-[#8B6F47] text-sm uppercase">{song.title}</p>
                <p className="text-xs text-[#A68A64]">{song.artist}{song.main_key ? ` • Tom: ${song.main_key}` : ""}</p>
                <div className="flex gap-2 mt-1">
                  {song.playback_url
                    ? <span className="text-[10px] bg-[#D4AF37]/20 text-[#D4AF37] px-1.5 py-0.5 rounded">🎵 Playback</span>
                    : <span className="text-[10px] bg-red-100 text-red-400 px-1.5 py-0.5 rounded">Sem playback</span>}
                  {song.main_key && <span className="text-[10px] bg-[#8B6F47]/10 text-[#8B6F47] px-1.5 py-0.5 rounded">Tom: {song.main_key}</span>}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Modo Treino ──────────────────────────────────────────────────────────────
function ModoTreino({ song, onBack, chordsDB, progressionsDB = [], learningPatterns = [] }) {
  // Mapa de aprendizado: correctionMap[acordeDetectado] = acordeCorreto, ignoredChords = acordes a ignorar
  const { correctionMap, ignoredChords } = useMemo(() => {
    // learningPatterns já vem ordenado por -created_date (mais recente primeiro)
    // Prioridade: 1) específica da música + mais recente, 2) global mais recente
    const map = {}; // detected -> { correct, songSpecific }
    const ignored = new Set();
    for (const lp of learningPatterns) {
      if (!lp.chords || lp.chords.length < 2) continue;
      const [detected, correct] = lp.chords;
      const isSongSpecific = lp.source_songs?.includes(song.id);
      if (correct === '__IGNORAR__') {
        if (isSongSpecific || !map[detected]) ignored.add(detected);
        continue;
      }
      if (!detected || !correct) continue;
      const existing = map[detected];
      // Substitui se: não há entrada ainda, OU a nova é específica da música e a existente não é
      if (!existing || (isSongSpecific && !existing.songSpecific)) {
        map[detected] = { correct, songSpecific: isSongSpecific };
      }
    }
    const finalMap = {};
    for (const [k, v] of Object.entries(map)) finalMap[k] = v.correct;
    return { correctionMap: finalMap, ignoredChords: ignored };
  }, [learningPatterns, song.id]);
  const audioRef = useRef(null);
  const queryClient = useQueryClient();  
  const [isPlaying, setIsPlaying]         = useState(false);
  const [currentTime, setCurrentTime]     = useState(0);
  const [duration, setDuration]           = useState(0);
  const [playbackRate, setPlaybackRate]   = useState(1);
  const [muted, setMuted]                 = useState(false);
  const [audioError, setAudioError]       = useState(false);
  const [showHints, setShowHints]         = useState(true);
  const [beatsPerMeasure, setBeatsPerMeasure] = useState(song.beats_per_measure || 4);
  const [savingTimeSig, setSavingTimeSig] = useState(false);
  const [timeSigSaved, setTimeSigSaved]   = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [chordEvents, setChordEvents]     = useState([]);
  const [detectedProgression, setDetectedProgression] = useState(null);
  const [soloSegments, setSoloSegments]   = useState([]);
  const [showCorrection, setShowCorrection] = useState(false);
  const [correctionInput, setCorrectionInput] = useState('');
  const [correctionSaved, setCorrectionSaved] = useState(false);
  const [correctionChord, setCorrectionChord] = useState(''); // acorde no momento que o modal abre
  const [savingCorrection, setSavingCorrection] = useState(false);
  const [localCorrections, setLocalCorrections] = useState({});
  const [localIgnored, setLocalIgnored] = useState(new Set());
  const calibrationTimer = useRef(null);
  const lastAddedRef     = useRef(null);
  const chordSequenceRef = useRef([]);
  const soloStartRef     = useRef(null); // timestamp de início do solo atual
  const lastSoloNoteRef  = useRef(null); // nota de repouso do solo atual

  // Mapa de acordes da cifra — guia para resolver ambiguidades em todos os acordes
  const cifraChordsSet = useMemo(() => parseCifraChords(song.cifra_text), [song.cifra_text]);

  const { chord: detectedChord, soloRepose, analyzing, bpm, beatPosition, resetBeat, essentiaLoaded, autoTimeSig, _analyserRef } =
    useAudioAnalyzer(audioRef, isPlaying || isCalibrating, beatsPerMeasure, song.main_key, 'medium', cifraChordsSet);

  const [suggestedTimeSig, setSuggestedTimeSig] = useState(null);
  useEffect(() => {
    if (autoTimeSig && autoTimeSig !== beatsPerMeasure) setSuggestedTimeSig(autoTimeSig);
  }, [autoTimeSig]);

  // Rastrear início/fim de segmentos de solo
  useEffect(() => {
    if (!isPlaying) return;
    const t = audioRef.current?.currentTime ?? 0;
    const isSoloNow = !detectedChord && !!soloRepose;
    if (isSoloNow) {
      // Solo em andamento
      if (soloStartRef.current === null) soloStartRef.current = t;
      lastSoloNoteRef.current = soloRepose.note;
    } else {
      // Solo terminou — registrar segmento se durou mais de 1s
      if (soloStartRef.current !== null) {
        const dur = t - soloStartRef.current;
        if (dur > 1.0) {
          setSoloSegments(prev => [...prev, {
            start: soloStartRef.current,
            end: t,
            duration: dur,
            note: lastSoloNoteRef.current,
            inferredChord: soloRepose?.inferredChord || lastSoloNoteRef.current,
          }].slice(-20));
        }
        soloStartRef.current = null;
        lastSoloNoteRef.current = null;
      }
    }
  }, [detectedChord, soloRepose, isPlaying]);

  // Record chord events with timestamp + progression detection
  useEffect(() => {
    const isSolo = !detectedChord && !!soloRepose;
    const activeChord = detectedChord || soloRepose?.inferredChord;
    if (activeChord && activeChord !== lastAddedRef.current && isPlaying) {
      lastAddedRef.current = activeChord;
      const t = audioRef.current?.currentTime ?? currentTime;
      setChordEvents(prev => {
        const filtered = prev.filter(e => Math.abs(e.time - t) > 0.5);
        return [...filtered, { chord: activeChord, time: t, isSolo }].slice(-80);
      });
      if (!isSolo) {
        const seq = chordSequenceRef.current;
        if (seq[seq.length - 1] !== activeChord) {
          seq.push(activeChord);
          if (seq.length > 12) seq.shift();
          const activeKey = song.main_key;
          if (activeKey && progressionsDB.length > 0) {
            const match = matchProgressionFromChords(seq, activeKey, progressionsDB);
            setDetectedProgression(match);
          }
        }
      }
    }
  }, [detectedChord, soloRepose, isPlaying, progressionsDB, song.main_key]);

  useEffect(() => { if (audioRef.current) audioRef.current.playbackRate = playbackRate; }, [playbackRate]);
  useEffect(() => { if (audioRef.current) audioRef.current.muted = muted; }, [muted]);

  const CALIBRATION_MS = 5000;

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause(); clearTimeout(calibrationTimer.current); setIsCalibrating(false);
    } else {
      setIsCalibrating(true); setChordEvents([]); lastAddedRef.current = null;
      clearTimeout(calibrationTimer.current);
      calibrationTimer.current = setTimeout(() => {
        setIsCalibrating(false);
        audio.play().catch(() => setAudioError(true));
      }, CALIBRATION_MS);
    }
  }, [isPlaying]);

  const reset = useCallback(() => {
    const audio = audioRef.current;
    if (audio) { audio.pause(); audio.currentTime = 0; }
    clearTimeout(calibrationTimer.current);
    setIsCalibrating(false); setIsPlaying(false); setCurrentTime(0);
    setChordEvents([]); lastAddedRef.current = null; resetBeat();
    chordSequenceRef.current = [];
    setDetectedProgression(null);
    setSoloSegments([]);
    soloStartRef.current = null;
    lastSoloNoteRef.current = null;
  }, [resetBeat]);

  const handleSeek = useCallback((t) => {
    if (audioRef.current) audioRef.current.currentTime = t;
    setCurrentTime(t);
  }, []);

  // Aplica aprendizado: substitui acordes corrigidos anteriormente pelo usuário
  const displayChord = useMemo(() => {
    if (!detectedChord) return null;
    if (ignoredChords.has(detectedChord) || localIgnored.has(detectedChord)) return null;
    return localCorrections[detectedChord] || correctionMap[detectedChord] || detectedChord;
  }, [detectedChord, correctionMap, ignoredChords, localCorrections, localIgnored]);

  const chordData = chordsDB.find(c => c.name?.toLowerCase() === displayChord?.toLowerCase());
  const degInfo = getRomanDegree(displayChord, song.main_key);

  // Auto-save compasso na base
  const saveBeatsPerMeasure = async (beats) => {
    setSavingTimeSig(true);
    setTimeSigSaved(false);
    try {
      await base44.entities.Song.update(song.id, { beats_per_measure: beats });
      setTimeSigSaved(true);
      setTimeout(() => setTimeSigSaved(false), 2000);
      // Invalida o cache para que ao voltar a música carregue com o valor correto
      queryClient.invalidateQueries({ queryKey: ['songs_estudo'] });
    } catch (e) {
      console.error('Erro ao salvar compasso:', e);
    } finally {
      setSavingTimeSig(false);
    }
  };

  const handleBeatsPerMeasureChange = (b) => {
    setBeatsPerMeasure(b);
    setSuggestedTimeSig(null);
    saveBeatsPerMeasure(b);
  };

  const handleSaveCorrection = async (deleteMode = false) => {
    const chord = correctionChord;
    if (!chord) return;
    if (!deleteMode && !correctionInput.trim()) return;
    setSavingCorrection(true);
    // Aplica correção localmente de imediato (sem esperar o refetch)
    if (deleteMode) {
      setLocalIgnored(prev => new Set([...prev, chord]));
    } else {
      setLocalCorrections(prev => ({ ...prev, [chord]: correctionInput.trim() }));
    }
    await base44.entities.LearningPattern.create({
      chords: deleteMode ? [chord, '__IGNORAR__'] : [chord, correctionInput.trim()],
      pattern: deleteMode ? 'exclusão manual' : 'correção manual',
      progression_name: 'Feedback do Usuário',
      key: song.main_key || '',
      observations: deleteMode
        ? `Acorde EXCLUÍDO/IGNORADO: ${chord} | Música: ${song.title} (${song.artist}) | Tom: ${song.main_key || 'N/A'}`
        : `Acorde detectado: ${chord} → Correto: ${correctionInput.trim()} | Música: ${song.title} (${song.artist}) | Tom: ${song.main_key || 'N/A'}`,
      times_seen: 1,
      times_corrected: 1,
      confidence: 100,
      source_songs: [song.id],
      last_used: new Date().toISOString().split('T')[0],
    });
    setSavingCorrection(false);
    setCorrectionSaved(true);
    queryClient.invalidateQueries({ queryKey: ['learning_patterns_feedback'] });
    setTimeout(() => { setShowCorrection(false); setCorrectionInput(''); setCorrectionSaved(false); setCorrectionChord(''); }, 1500);
  };

  return (
    <div className="bg-[#0a0a14] h-screen flex flex-col select-none overflow-hidden">
      {song.playback_url && (
        <audio ref={audioRef} src={song.playback_url} preload="auto" crossOrigin="anonymous"
          onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onEnded={() => setIsPlaying(false)}
          onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
          onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)}
          onError={() => setAudioError(true)} />
      )}

      {/* Header */}
      <div className="bg-[#12122a] px-4 py-3 flex items-center gap-3 border-b border-white/10 flex-shrink-0">
        <button onClick={() => { reset(); onBack(); }} className="text-white/60 hover:text-white p-1">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm truncate uppercase">{song.title}</p>
          <p className="text-white/40 text-xs truncate">
            {song.artist}{song.main_key ? ` • Tom: ${song.main_key}` : ""}
            {bpm ? <span className="ml-2 text-[#D4AF37]/70">♩ {bpm} BPM</span> : null}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setMuted(m => !m)}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-all">
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold ${
            analyzing ? (essentiaLoaded ? "bg-purple-900/50 text-purple-300" : "bg-green-900/50 text-green-400") : "bg-white/10 text-white/30"
          }`}>
            <Waves className="w-3 h-3" />
            {analyzing ? (essentiaLoaded ? 'Essentia ✦' : 'Analisando') : 'Aguardando'}
          </div>
        </div>
      </div>

      {/* Detected Progression — abaixo do header */}
      {detectedProgression && (
        <div className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-[#D4AF37]/15 to-[#9CAF88]/10 border-b border-[#D4AF37]/30">
          <div className="flex-1 min-w-0">
            <p className="text-[#D4AF37] text-[9px] font-bold uppercase tracking-widest leading-none mb-0.5">Progressão Detectada</p>
            <p className="text-white font-black text-sm leading-tight truncate">
              {detectedProgression.name}
              {detectedProgression.variationName && (
                <span className="text-white/50 text-xs font-normal ml-1">({detectedProgression.variationName})</span>
              )}
            </p>
            {detectedProgression.pattern && (
              <p className="text-[#9CAF88] text-[9px] font-mono">{detectedProgression.pattern}</p>
            )}
          </div>
          <div className="flex-shrink-0 text-right">
            <p className="text-white/30 text-[9px] uppercase">Cobertura</p>
            <p className="text-[#D4AF37] font-black text-base leading-none">
              {Math.round((detectedProgression.matchedLength / detectedProgression.totalLength) * 100)}%
            </p>
          </div>
        </div>
      )}

      {audioError && (
        <div className="bg-orange-900/40 border-b border-orange-500/30 px-4 py-2 text-orange-300 text-xs text-center">
          ⚠ Não foi possível carregar o áudio.
        </div>
      )}
      {!song.playback_url && (
        <div className="bg-yellow-900/30 border-b border-yellow-500/20 px-4 py-3 text-yellow-300 text-sm text-center">
          Esta música não possui playback. Adicione uma URL de playback para usar o Modo Estudo.
        </div>
      )}

      {/* Correction Modal */}
      {showCorrection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setShowCorrection(false)}>
          <div className="bg-[#1a1a2e] border border-white/20 rounded-2xl p-5 w-72 shadow-2xl" onClick={e => e.stopPropagation()}>
            <p className="text-white font-bold text-sm mb-1">Corrigir Acorde Detectado</p>
            <p className="text-white/40 text-xs mb-3">Sistema detectou: <span className="text-[#D4AF37] font-black">{correctionChord}</span></p>
            <input
              autoFocus
              value={correctionInput}
              onChange={e => setCorrectionInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSaveCorrection(false)}
              placeholder="Ex: A7, Bm, C#m..."
              className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white text-sm placeholder-white/30 focus:outline-none focus:border-[#D4AF37] mb-3"
            />
            {cifraChordsSet.size > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {[...cifraChordsSet].slice(0, 12).map(c => (
                  <button key={c} onClick={() => setCorrectionInput(c)}
                    className={`text-xs px-2 py-0.5 rounded-lg border transition-all ${
                      correctionInput === c ? 'bg-[#D4AF37] border-[#D4AF37] text-black font-bold' : 'bg-white/10 border-white/20 text-white/70 hover:bg-white/20'
                    }`}>{c}</button>
                ))}
              </div>
            )}
            {correctionSaved ? (
              <p className="text-green-400 text-xs text-center font-bold">✅ Salvo com sucesso! Obrigado.</p>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <button onClick={() => { setShowCorrection(false); setCorrectionChord(''); }} className="flex-1 py-2 rounded-xl bg-white/10 text-white/50 text-xs hover:bg-white/20">Cancelar</button>
                  <button onClick={() => handleSaveCorrection(false)} disabled={!correctionInput.trim() || savingCorrection} className="flex-1 py-2 rounded-xl bg-[#D4AF37] text-black font-bold text-xs hover:bg-[#c9a430] disabled:opacity-30">
                    {savingCorrection ? 'Salvando...' : 'Salvar Correção'}
                  </button>
                </div>
                <button onClick={() => handleSaveCorrection(true)} disabled={savingCorrection}
                  className="w-full py-2 rounded-xl bg-red-900/50 border border-red-500/40 text-red-300 text-xs font-bold hover:bg-red-800/60 transition-all disabled:opacity-30">
                  🗑 Excluir / Ignorar este acorde
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex flex-col gap-2 px-4 py-2">

        {/* Current chord display */}
        <div className="flex items-center justify-center gap-4 py-0">
          <AnimatePresence mode="wait">
            <motion.div key={isCalibrating ? "__cal__" : (detectedChord || (soloRepose ? `solo_${soloRepose.inferredChord}` : "__none__"))}
              initial={{ opacity: 0, scale: 0.7, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.1, y: -12 }} transition={{ duration: 0.12 }}
              className="flex items-end gap-3">
              {isCalibrating ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 border-4 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full animate-spin" />
                  <p className="text-[#D4AF37]/60 text-sm font-bold tracking-widest">CALIBRANDO...</p>
                </div>
              ) : displayChord ? (
                <>
                  <div className="flex flex-col items-center gap-1">
                    <p className="text-8xl md:text-9xl font-black tracking-tight leading-none text-white">
                      {displayChord}
                    </p>
                    {correctionMap[detectedChord] && (
                      <span className="text-[9px] text-[#9CAF88]/60 font-mono">aprendido ✓</span>
                    )}
                    <button
                      onClick={() => { setCorrectionInput(''); setCorrectionChord(detectedChord); setShowCorrection(true); }}
                      className="text-[10px] text-white/30 hover:text-[#D4AF37] border border-white/10 hover:border-[#D4AF37]/50 px-2 py-0.5 rounded-full transition-all">
                      ✏️ Corrigir acorde
                    </button>
                  </div>
                  {degInfo && (
                    <div className="mb-3 flex flex-col items-center">
                      <span className="text-[#D4AF37] text-2xl font-black leading-none">{degInfo.roman}</span>
                      <span className="text-[#9CAF88] text-[10px] capitalize mt-1">{degInfo.quality}</span>
                    </div>
                  )}
                </>
              ) : soloRepose ? (
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-end gap-3">
                    <p className="text-8xl md:text-9xl font-black tracking-tight leading-none text-[#D4AF37]/70">
                      {soloRepose.inferredChord}
                    </p>
                    {getRomanDegree(soloRepose.inferredChord, song.main_key) && (
                      <div className="mb-3 flex flex-col items-center">
                        <span className="text-[#D4AF37]/70 text-2xl font-black leading-none">
                          {getRomanDegree(soloRepose.inferredChord, song.main_key)?.roman}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-purple-800/60 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-full font-bold tracking-widest">
                      ♩ SOLO — nota de repouso: {soloRepose.note}
                    </span>
                    <span className="text-[10px] text-white/30">{Math.round(soloRepose.confidence * 100)}% conf.</span>
                  </div>
                </div>
              ) : (
                <p className="text-8xl md:text-9xl font-black tracking-tight leading-none text-white/15">
                  {isPlaying ? '…' : '—'}
                </p>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Painel de Solo Ativo */}
        {!detectedChord && soloRepose && (
          <div className="rounded-xl border border-purple-500/50 bg-purple-950/60 px-4 py-3 flex items-center gap-4">
            <div className="flex-shrink-0 flex flex-col items-center">
              <span className="text-3xl font-black text-purple-200 leading-none">{soloRepose.note}</span>
              <span className="text-[9px] text-purple-400 font-bold uppercase tracking-widest mt-0.5">Repouso</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[9px] bg-purple-700/60 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-full font-bold tracking-widest">♩ SOLO DETECTADO</span>
                <span className="text-purple-400/60 text-[9px]">{Math.round(soloRepose.confidence * 100)}% conf.</span>
                {soloStartRef.current !== null && audioRef.current && (
                  <span className="text-purple-400/60 text-[9px]">{fmt(audioRef.current.currentTime - soloStartRef.current)}s</span>
                )}
              </div>
              <p className="text-white/70 text-xs">Acorde inferido: <span className="text-purple-200 font-bold">{soloRepose.inferredChord}</span></p>
            </div>
            {soloSegments.length > 0 && (
              <div className="flex-shrink-0 text-right">
                <p className="text-purple-400 text-[9px] uppercase">Solos</p>
                <p className="text-purple-200 font-black text-lg leading-none">{soloSegments.length}</p>
              </div>
            )}
          </div>
        )}

        {/* Histórico de Solos */}
        {soloSegments.length > 0 && !soloRepose && (
          <div className="rounded-xl border border-purple-500/20 bg-purple-950/30 px-3 py-2">
            <p className="text-purple-400 text-[9px] font-bold uppercase tracking-widest mb-2">Solos Identificados na Sessão</p>
            <div className="flex flex-wrap gap-1.5">
              {soloSegments.map((seg, i) => (
                <button key={i} onClick={() => handleSeek(seg.start)}
                  className="flex items-center gap-1.5 bg-purple-900/50 border border-purple-500/30 rounded-lg px-2 py-1 hover:bg-purple-800/60 transition-all">
                  <span className="text-purple-200 text-xs font-bold">{seg.note}</span>
                  <span className="text-purple-400/60 text-[9px]">{fmt(seg.start)}</span>
                  <span className="text-purple-400/40 text-[9px]">{fmt(seg.duration)}s</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Waveform Timeline */}
        <WaveformTimeline
          analyserRef={_analyserRef}
          currentTime={currentTime}
          duration={duration}
          chordEvents={chordEvents}
          songKey={song.main_key}
          onSeek={handleSeek}
          bpm={bpm}
        />

        {/* Time + scrubber */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-white/30 font-mono px-1">
            <span>{fmt(currentTime)}</span>
            <span>{fmt(duration)}</span>
          </div>
          <input type="range" min={0} max={duration || 1} step={0.05} value={currentTime}
            onChange={e => handleSeek(Number(e.target.value))}
            className="w-full accent-[#D4AF37] cursor-pointer" />
        </div>

      </div>

      {/* Controls */}
      <div className="bg-[#12122a] border-t border-white/10 px-4 py-4 flex-shrink-0 space-y-3">
        {/* Play row */}
        <div className="flex items-center justify-center gap-6">
          <button onClick={reset} className="text-white/50 hover:text-white p-2 transition-all">
            <RotateCcw className="w-5 h-5" />
          </button>
          <button onClick={togglePlay} disabled={!song.playback_url}
            className={`w-16 h-16 rounded-full flex items-center justify-center shadow-xl transition-all active:scale-95 disabled:opacity-30 ${
              isPlaying ? 'bg-[#D4AF37]' : 'bg-gradient-to-br from-[#D4AF37] to-[#9CAF88] hover:scale-105'
            }`}>
            {isPlaying ? <Pause className="w-7 h-7 text-black" /> : <Play className="w-7 h-7 text-black ml-1" />}
          </button>
          <button onClick={() => setShowHints(h => !h)}
            className={`p-2 rounded-full transition-all ${showHints ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'text-white/30 hover:text-white'}`}>
            <Lightbulb className="w-5 h-5" />
          </button>
        </div>

        {/* Time sig + speed */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <p className="text-white/40 text-xs font-semibold">Compasso:</p>
              {suggestedTimeSig && suggestedTimeSig !== beatsPerMeasure && (
                <button onClick={() => handleBeatsPerMeasureChange(suggestedTimeSig)}
                  className="text-[9px] bg-[#D4AF37]/80 text-black font-bold px-2 h-5 rounded-full border border-[#D4AF37] animate-pulse">
                  Auto: {suggestedTimeSig === 6 ? '6/8' : `${suggestedTimeSig}/4`} ?
                </button>
              )}
            </div>
            <div className="flex gap-1">
              {[2, 3, 4, 6].map(b => (
                <button key={b} onClick={() => handleBeatsPerMeasureChange(b)}
                  className={`flex-1 h-8 rounded-lg text-xs font-bold transition-all ${
                    beatsPerMeasure === b
                      ? 'bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/30'
                      : 'bg-white/10 text-white/40 hover:bg-white/20'
                  }`}>{b === 6 ? '6/8' : `${b}/4`}</button>
              ))}
            </div>
            {(savingTimeSig || timeSigSaved) && (
              <p className={`text-[10px] font-semibold mt-1 ${timeSigSaved ? 'text-green-400' : 'text-white/40'}`}>
                {timeSigSaved ? '✓ Compasso salvo!' : 'Salvando...'}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-white/40">
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Velocidade</span>
              <span className="font-bold text-white">{playbackRate.toFixed(2)}x</span>
            </div>
            <input type="range" min="0.25" max="2" step="0.05" value={playbackRate}
              onChange={e => setPlaybackRate(Number(e.target.value))}
              className="w-full accent-[#D4AF37]" />
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Progression Detector ────────────────────────────────────────────────────
function matchProgressionFromChords(recentChords, key, progressionsDB) {
  if (!key || !progressionsDB?.length || recentChords.length < 2) return null;
  const root = NOTE_NAMES.indexOf(key.replace('m', ''));
  if (root < 0) return null;
  const INTERVAL_TO_ROMAN = { 0:'I', 2:'II', 4:'III', 5:'IV', 7:'V', 9:'VI', 11:'VII' };
  const INTERVAL_TO_ROMAN_LOWER = { 0:'i', 2:'ii', 4:'iii', 5:'iv', 7:'v', 9:'vi', 11:'vii' };
  const DEGREE_INDEX = { 0:0, 2:1, 4:2, 5:3, 7:4, 9:5, 11:6 };

  function chordToRoman(chordName) {
    const sortedNotes = [...NOTE_NAMES].sort((a, b) => b.length - a.length);
    const chordRoot = sortedNotes.find(n => chordName.startsWith(n));
    if (!chordRoot) return null;
    const interval = (NOTE_NAMES.indexOf(chordRoot) - root + 12) % 12;
    const isMinorChord = /m(?!aj|aj7)/.test(chordName.slice(chordRoot.length || 1));
    const degIdx = DEGREE_INDEX[interval];
    if (degIdx === undefined) return null;
    return isMinorChord ? INTERVAL_TO_ROMAN_LOWER[interval] : INTERVAL_TO_ROMAN[interval];
  }

  const romans = recentChords.map(chordToRoman).filter(Boolean);
  if (romans.length < 2) return null;

  let bestMatch = null;
  let bestScore = 0;

  const tryMatch = (prog, pattern, variationName) => {
    const progRomans = pattern.split('-').map(r => r.trim()).filter(Boolean);
    if (progRomans.length < 2) return;
    const windowSize = Math.min(progRomans.length, romans.length);
    for (let start = 0; start <= romans.length - windowSize; start++) {
      const window = romans.slice(start, start + windowSize);
      const matches = window.every((r, i) => r.toUpperCase() === progRomans[i].toUpperCase());
      if (matches) {
        const score = windowSize / progRomans.length; // coverage ratio
        if (score > bestScore) {
          bestScore = score;
          bestMatch = { ...prog, variationName: variationName || null, matchedLength: windowSize, totalLength: progRomans.length };
        }
      }
    }
  };

  for (const prog of progressionsDB) {
    if (prog.pattern) tryMatch(prog, prog.pattern, null);
    if (prog.variations?.length) {
      for (const v of prog.variations) {
        if (v.pattern) tryMatch(prog, v.pattern, v.name || v.description || null);
      }
    }
  }

  return bestScore >= 0.5 ? bestMatch : null; // require at least 50% coverage
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function ModoEstudo() {
  const [selectedSong, setSelectedSong] = useState(null);

  const fetchSongs = useCallback(() => base44.fetchAllSongs(), []);
  const fetchChords = useCallback(() => base44.entities.Chord.list(), []);
  const fetchProgressions = useCallback(() => base44.entities.Progression.list(), []);
  const fetchLearningPatterns = useCallback(
    () => base44.entities.LearningPattern.filter({ progression_name: 'Feedback do Usuário' }, '-created_date', 500),
    []
  );

  const { data: songs = [] } = useOfflineSync("songs", fetchSongs);
  const { data: chordsDB = [] } = useOfflineSync("chords", fetchChords);
  const { data: progressionsDB = [] } = useOfflineSync("progressions", fetchProgressions);
  const { data: learningPatterns = [] } = useOfflineSync("learningPatterns", fetchLearningPatterns);
  if (!selectedSong) return <SongSelector songs={songs} onSelect={s => setSelectedSong(s)} />;
  return <ModoTreino song={selectedSong} onBack={() => setSelectedSong(null)} chordsDB={chordsDB} progressionsDB={progressionsDB} learningPatterns={learningPatterns} />;
}