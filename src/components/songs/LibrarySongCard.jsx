import React from "react";
import { Music, RefreshCw, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { parseSoloTab } from "@/lib/soloTabUtils";

const GENRE_COLORS = {
  pop: "bg-pink-100 text-pink-800 border-pink-200",
  rock: "bg-red-100 text-red-800 border-red-200",
  pop_rock: "bg-purple-100 text-purple-800 border-purple-200",
  hard_rock: "bg-orange-100 text-orange-800 border-orange-200",
  metal: "bg-gray-100 text-gray-800 border-gray-200",
  punk: "bg-yellow-100 text-yellow-800 border-yellow-200",
  blues_rock: "bg-blue-100 text-blue-800 border-blue-200",
  indie: "bg-teal-100 text-teal-800 border-teal-200",
  alternativo: "bg-violet-100 text-violet-800 border-violet-200",
  classico_rock: "bg-amber-100 text-amber-800 border-amber-200",
  pop_internacional: "bg-cyan-100 text-cyan-800 border-cyan-200",
  mpb: "bg-sky-100 text-sky-800 border-sky-200",
  samba: "bg-blue-100 text-blue-900 border-blue-200",
  forro: "bg-lime-100 text-lime-900 border-lime-200",
  outro: "bg-gray-100 text-gray-800 border-gray-200",
};

const GENRE_LABELS = {
  pop: "🎤 Pop",
  rock: "🎸 Rock",
  pop_rock: "🎵 Pop/Rock",
  hard_rock: "🔥 Hard Rock",
  metal: "⚡ Metal",
  punk: "💥 Punk",
  blues_rock: "🎷 Blues Rock",
  indie: "🌀 Indie",
  alternativo: "🎭 Alternativo",
  classico_rock: "🏛️ Clássico Rock",
  pop_internacional: "🌍 Pop Internacional",
  mpb: "🎶 MPB",
  samba: "🥁 Samba",
  forro: "🪗 Forró",
  outro: "🎵 Outro",
};

// Paletas por tema da biblioteca (classes sempre literais para o Tailwind)
const THEMES = {
  orange: {
    neon: "linear-gradient(90deg, #f97316, #f59e0b, #d97706)",
    hoverOverlay: "linear-gradient(135deg, rgba(249,115,22,0.08), rgba(217,119,6,0.05))",
    cardBorder: "border-orange-500/20 hover:border-orange-400/60",
    cardGlow: "hover:shadow-orange-500/20",
    iconBg: "linear-gradient(135deg, #f97316, #d97706)",
    artist: "text-orange-300",
    keyBg: "rgba(249,115,22,0.15)",
    keyBorder: "border-purple-500/30",
    keyLabel: "text-orange-300/70",
    keyValue: "text-orange-200",
  },
  blue: {
    neon: "linear-gradient(90deg, #2563eb, #60a5fa, #1d4ed8)",
    hoverOverlay: "linear-gradient(135deg, rgba(37,99,235,0.10), rgba(29,78,216,0.06))",
    cardBorder: "border-blue-500/25 hover:border-blue-400/70",
    cardGlow: "hover:shadow-blue-500/20",
    iconBg: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
    artist: "text-blue-200",
    keyBg: "rgba(37,99,235,0.18)",
    keyBorder: "border-blue-400/40",
    keyLabel: "text-blue-300/80",
    keyValue: "text-blue-100",
  },
};

export default function LibrarySongCard({
  song,
  index = 0,
  theme = "blue",
  onOpenSong,
  onStage,
  onInfo,
  onApostila,
  onTocarJunto,
}) {
  const t = THEMES[theme] || THEMES.blue;
  const hasSoloTab = !!parseSoloTab(song.solo_tab);

  const chordSummary = (() => {
    const pattern = song.predominant_progression_pattern;
    const key = song.main_key;
    if (!pattern || !key) return "N/A";
    const keyMap = {
      C: ["C", "Dm", "Em", "F", "G", "Am", "Bdim"],
      G: ["G", "Am", "Bm", "C", "D", "Em", "F#dim"],
      D: ["D", "Em", "F#m", "G", "A", "Bm", "C#dim"],
      A: ["A", "Bm", "C#m", "D", "E", "F#m", "G#dim"],
      E: ["E", "F#m", "G#m", "A", "B", "C#m", "D#dim"],
      F: ["F", "Gm", "Am", "Bb", "C", "Dm", "Edim"],
      B: ["B", "C#m", "D#m", "E", "F#", "G#m", "A#dim"],
    };
    const chords = keyMap[key];
    if (!chords) return "N/A";
    const romanToIndex = { I: 0, i: 0, II: 1, ii: 1, III: 2, iii: 2, IV: 3, iv: 3, V: 4, v: 4, VI: 5, vi: 5, VII: 6, vii: 6 };
    const unique = [];
    const seen = new Set();
    pattern.split("-").filter(Boolean).forEach((degree) => {
      const clean = degree.replace(/7|°|\+|m/g, "");
      if (seen.has(clean)) return;
      seen.add(clean);
      const idx = romanToIndex[clean];
      if (idx === undefined) { unique.push(degree); return; }
      unique.push(chords[idx] + (degree.includes("7") ? "7" : ""));
    });
    return unique.join("-");
  })();

  return (
    <Card
      className={`cursor-pointer transition-all duration-300 overflow-hidden group relative ${t.cardBorder} hover:shadow-xl ${t.cardGlow}`}
      style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(8px)" }}
      onClick={() => onOpenSong(song)}
    >
      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: t.neon }} />
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: t.hoverOverlay }}
      />

      <CardContent className="p-4 pt-5 pb-5 relative">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => onOpenSong(song)}>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0 cursor-pointer hover:scale-110 transition-transform"
              style={{ background: t.iconBg }}
              onClick={(e) => { e.stopPropagation(); onStage(song); }}
              title="🎸 Modo de Palco"
            >
              <Music className="w-5 h-5 text-white" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                {song.is_fully_revised && <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />}
                <h3 className="font-bold text-base text-white truncate uppercase" style={{ letterSpacing: "0.5px" }}>
                  {song.title}
                </h3>
                {song.genre_style && GENRE_LABELS[song.genre_style] && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-semibold ${GENRE_COLORS[song.genre_style] || GENRE_COLORS.outro}`}>
                    {GENRE_LABELS[song.genre_style]}
                  </span>
                )}
              </div>
              <p className={`text-sm truncate ${t.artist}`}>{song.artist}</p>
            </div>

            <div
              className={`flex-shrink-0 flex flex-col items-center justify-center px-2 py-1 rounded-lg border ${t.keyBorder} text-center min-w-[40px]`}
              style={{ background: t.keyBg }}
              onClick={(e) => { e.stopPropagation(); onOpenSong(song); }}
            >
              <p className={`text-[9px] leading-none ${t.keyLabel}`}>Tom</p>
              <p className={`text-xs font-bold flex items-center gap-0.5 ${t.keyValue}`}>
                {song.main_key || "N/A"}
                {song.progressions?.some((p) => p.modulated_key) && <RefreshCw className="w-2 h-2 text-yellow-400" />}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-6 gap-1">
            <div
              className={`flex flex-col items-center justify-center px-1 py-1 rounded-lg border text-center cursor-pointer ${song.predominant_progression ? "border-yellow-500/30" : "border-white/10"}`}
              style={{ background: song.predominant_progression ? "rgba(234,179,8,0.15)" : "rgba(255,255,255,0.05)" }}
              onClick={() => onOpenSong(song)}
            >
              <p className={`text-[9px] leading-none ${song.predominant_progression ? "text-yellow-300/70" : "text-white/30"}`}>Prog.</p>
              <p className={`text-[10px] font-bold truncate w-full text-center ${song.predominant_progression ? "text-yellow-200" : "text-white/30"}`}>
                {song.predominant_progression || "N/A"}
              </p>
            </div>

            <div
              className={`flex flex-col items-center justify-center px-1 py-1 rounded-lg border text-center cursor-pointer ${song.rhythm_name ? "border-sky-500/40" : "border-white/10"}`}
              style={{ background: song.rhythm_name ? t.keyBg : "rgba(255,255,255,0.05)" }}
              onClick={() => onOpenSong(song)}
            >
              <p className={`text-[9px] leading-none ${song.rhythm_name ? t.keyLabel : "text-white/30"}`}>Ritmo</p>
              <p className={`text-[10px] font-bold truncate w-full text-center ${song.rhythm_name ? t.keyValue : "text-white/30"}`}>
                {song.rhythm_name || "N/A"}
              </p>
            </div>

            <div
              className={`flex flex-col items-center justify-center px-1 py-1 rounded-lg border text-center cursor-pointer ${song.predominant_progression_pattern && song.main_key ? "border-amber-500/30" : "border-white/10"}`}
              style={{ background: song.predominant_progression_pattern && song.main_key ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.05)" }}
              onClick={() => onOpenSong(song)}
            >
              <p className={`text-[9px] leading-none ${song.predominant_progression_pattern && song.main_key ? "text-cyan-300/70" : "text-white/30"}`}>Acordes</p>
              <p className={`text-[10px] font-bold truncate w-full text-center ${song.predominant_progression_pattern && song.main_key ? "text-cyan-200" : "text-white/30"}`}>
                {chordSummary}
              </p>
            </div>

            <div
              className="flex flex-col items-center justify-center px-1 py-1 rounded-lg border border-green-400/50 text-center cursor-pointer hover:bg-green-500 transition-colors group/info"
              style={{ background: "rgba(34,197,94,0.1)" }}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onInfo(song); }}
            >
              <p className="text-[9px] leading-none text-green-400 group-hover/info:text-white">Info</p>
              <p className="text-[10px] font-bold text-green-300 group-hover/info:text-white">ℹ️</p>
            </div>

            <div
              className="flex flex-col items-center justify-center px-1 py-1 rounded-lg border border-pink-400/50 text-center cursor-pointer hover:bg-pink-500 transition-colors group/ap"
              style={{ background: "rgba(236,72,153,0.1)" }}
              onClick={(e) => { e.stopPropagation(); onApostila(song); }}
            >
              <p className="text-[9px] leading-none text-pink-300 group-hover/ap:text-white">Apostila</p>
              <p className="text-[10px] font-bold text-pink-200 group-hover/ap:text-white">📄</p>
            </div>

            <div
              className={`flex flex-col items-center justify-center px-1 py-1 rounded-lg border text-center transition-colors group/tj ${hasSoloTab ? "border-indigo-400/60 bg-indigo-500/20 hover:bg-indigo-500 cursor-pointer" : "border-white/10 bg-white/5 cursor-not-allowed"}`}
              title={hasSoloTab ? "🎸 Tocar junto — abre a tablatura do solo" : "Esta música ainda não possui tablatura de solo"}
              onClick={(e) => { e.stopPropagation(); if (hasSoloTab) onTocarJunto(song); }}
            >
              <p className={`text-[9px] leading-none ${hasSoloTab ? "text-indigo-300 group-hover/tj:text-white" : "text-white/30"}`}>Tocar</p>
              <p className={`text-[10px] font-bold ${hasSoloTab ? "text-indigo-200 group-hover/tj:text-white" : "text-white/30"}`}>🎸</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}