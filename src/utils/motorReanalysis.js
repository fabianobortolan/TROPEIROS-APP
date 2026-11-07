// Reanálise de progressões com o Motor Harmônico (src/lib/motorHarmonico.js).
// Determinístico, roda no navegador, não usa IA nem créditos.
import { analisarMusica, catalogoDoApp } from "@/lib/motorHarmonico";

export const MOTOR_VERSION = "motorHarmonico 1.2";

export const isSertaneja = (song) => String(song?.genre_style || "").startsWith("sertanejo_");

const slim = (arr, keys) => (arr || []).map((o) => {
  const out = {};
  keys.forEach((k) => { if (o[k] !== undefined) out[k] = o[k]; });
  return out;
});

// Analisa UMA música e devolve { updates } pronto para Song.update, ou { skipped, reason }.
// registros = lista da entidade Progression (catálogo do app).
export function analisarComMotor(song, registros) {
  if (!song?.cifra_text || !song.cifra_text.trim()) return { skipped: true, reason: "Sem cifra" };
  const res = analisarMusica(song.cifra_text, song.main_key, catalogoDoApp(registros || []));
  if (!res.ok) return { skipped: true, reason: res.warnings?.[0] || "Cifra sem acordes reconhecíveis" };

  const progressions = res.sections.map((s) => ({
    section: s.section,
    chords: s.chords,
    pattern: s.pattern,
    progression_name: s.progression_name,
    variation_name: s.variation_name,
    key: s.key,
    modulated_key: s.modulated_key,
    notes: s.notes,
    degrees: s.degrees,
    skeleton: s.skeleton,
    functions: slim(s.functions, ["chord", "degree", "func", "role"]),
    preparations: slim(s.preparations, ["type", "chords", "degrees", "target", "text"]),
    lines: slim(s.lines, ["type", "kind", "voice", "chords", "text"]),
    borrowed: slim(s.borrowed, ["chord", "degree", "text"]),
    cadences: slim(s.cadences, ["type", "text"]),
  }));

  const updates = {
    progressions,
    predominant_progression: res.predominant_progression,
    predominant_progression_pattern: res.predominant_progression_pattern,
    analysis_warnings: res.warnings || [],
    analysis_date: new Date().toISOString(),
    analysis_engine: MOTOR_VERSION,
  };
  // Backup da análise ANTERIOR AO MOTOR (só se a música nunca passou pelo motor e ainda não tem backup)
  const hasBackup = Array.isArray(song.progressions_backup) && song.progressions_backup.length > 0;
  if (!hasBackup && !song.analysis_engine && Array.isArray(song.progressions) && song.progressions.length > 0) {
    updates.progressions_backup = song.progressions;
  }
  return { updates, warnings: res.warnings || [] };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Grava com novas tentativas: o Base44 recusa gravações muito seguidas (limite de taxa).
// Tenta até 6 vezes, esperando 1s, 2s, 4s, 8s, 16s.
export async function salvarComRetry(fn, tentativas = 6) {
  let ultimoErro;
  for (let i = 0; i < tentativas; i++) {
    try {
      return await fn();
    } catch (e) {
      ultimoErro = e;
      await sleep(1000 * Math.pow(2, i));
    }
  }
  throw ultimoErro;
}

export const pausa = sleep;
