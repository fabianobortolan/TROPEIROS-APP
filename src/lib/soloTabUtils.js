// Utilitários para o formato "tropeiros-tab-v1" usado pelo player "Tocar junto".

// Normaliza e valida o objeto solo_tab. Retorna null se inválido.
export function parseSoloTab(raw) {
  if (!raw || typeof raw !== "object") return null;
  if (raw.format && raw.format !== "tropeiros-tab-v1") return null;
  const bpm = Number(raw.bpm);
  const beatsPerBar = Number(raw.beatsPerBar) || Number(raw.time?.split("/")[0]) || 4;
  if (!bpm || bpm <= 0) return null;
  const measures = Array.isArray(raw.measures) ? raw.measures : [];
  if (measures.length === 0) return null;
  const tuning = raw.tuning || {};
  const octavePairs = Array.isArray(raw.octavePairs) ? raw.octavePairs.map(Number) : [];
  return {
    format: raw.format || "tropeiros-tab-v1",
    bpm,
    time: raw.time || `${beatsPerBar}/4`,
    beatsPerBar,
    tuning,
    octavePairs,
    measures,
    // 'viola' | 'violao'; se não informado, o player decide pelo nº de cordas (6 = violão)
    ...(raw.instrument === "viola" || raw.instrument === "violao" ? { instrument: raw.instrument } : {}),
  };
}
// Nº de cordas da tablatura (pela afinação) e instrumento efetivo.
export function tabStrings(tab) {
  const ks = Object.keys(tab?.tuning || {}).map(Number).filter((n) => n > 0);
  return ks.length ? Math.max(...ks) : 5;
}
export function tabInstrument(tab) {
  if (tab?.instrument === "viola" || tab?.instrument === "violao") return tab.instrument;
  return tabStrings(tab) >= 6 ? "violao" : "viola";
}
