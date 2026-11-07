import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { X, Music, ChevronDown, CheckCircle, AlertCircle, Zap, ListMusic } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

// Distância entre tonalidades no círculo de quintas
const CIRCLE_OF_FIFTHS = ["C","G","D","A","E","B","F#","Db","Ab","Eb","Bb","F"];
function keyDistance(k1, k2) {
  const i1 = CIRCLE_OF_FIFTHS.indexOf(k1?.replace("m",""));
  const i2 = CIRCLE_OF_FIFTHS.indexOf(k2?.replace("m",""));
  if (i1 === -1 || i2 === -1) return 6;
  const diff = Math.abs(i1 - i2);
  return Math.min(diff, 12 - diff);
}

function analyzeCompatibility(songA, songB) {
  let score = 0;
  const insights = [];
  const warnings = [];

  // 1. Progressão predominante igual
  if (songA.predominant_progression && songB.predominant_progression) {
    if (songA.predominant_progression === songB.predominant_progression) {
      score += 40;
      insights.push({ icon: "🎵", text: `Mesma progressão predominante: "${songA.predominant_progression}"` });
    } else {
      score += 10;
    }
  }

  // 2. Padrão romano idêntico
  if (songA.predominant_progression_pattern && songB.predominant_progression_pattern) {
    if (songA.predominant_progression_pattern === songB.predominant_progression_pattern) {
      score += 20;
      insights.push({ icon: "🔗", text: `Mesmo padrão harmônico: ${songA.predominant_progression_pattern}` });
    }
  }

  // 3. Progressões em comum (qualquer seção)
  const progA = new Set((songA.progressions || []).map(p => p.progression_name).filter(Boolean));
  const progB = new Set((songB.progressions || []).map(p => p.progression_name).filter(Boolean));
  const shared = [...progA].filter(p => progB.has(p));
  if (shared.length > 0) {
    score += Math.min(shared.length * 10, 20);
    insights.push({ icon: "🔄", text: `Progressões em comum: ${shared.join(", ")}` });
  }

  // 4. Mesmo ritmo
  if (songA.rhythm_name && songB.rhythm_name) {
    if (songA.rhythm_name === songB.rhythm_name) {
      score += 15;
      insights.push({ icon: "🥁", text: `Mesmo ritmo: ${songA.rhythm_name}` });
    } else {
      warnings.push({ icon: "⚠️", text: `Ritmos diferentes: ${songA.rhythm_name} vs ${songB.rhythm_name}` });
    }
  }

  // 5. Tonalidades próximas no círculo de quintas
  const dist = keyDistance(songA.main_key, songB.main_key);
  if (dist === 0) {
    score += 10;
    insights.push({ icon: "🎼", text: `Mesma tonalidade: ${songA.main_key}` });
  } else if (dist <= 2) {
    score += 7;
    insights.push({ icon: "🎼", text: `Tonalidades próximas (${songA.main_key} → ${songB.main_key}), transição fácil` });
  } else if (dist >= 5) {
    warnings.push({ icon: "⚠️", text: `Tonalidades distantes (${songA.main_key} → ${songB.main_key}), pode exigir reafinar` });
  }

  // 6. Mesmo estilo
  if (songA.genre_style && songB.genre_style && songA.genre_style === songB.genre_style) {
    score += 5;
    insights.push({ icon: "🌾", text: `Mesmo estilo musical` });
  }

  score = Math.min(score, 100);

  let verdict, verdictColor, verdictIcon;
  if (score >= 75) {
    verdict = "Excelente compatibilidade — funcionam muito bem juntas no setlist";
    verdictColor = "bg-green-100 border-green-300 text-green-800";
    verdictIcon = "🟢";
  } else if (score >= 50) {
    verdict = "Boa compatibilidade — podem ser colocadas próximas no setlist";
    verdictColor = "bg-blue-100 border-blue-300 text-blue-800";
    verdictIcon = "🔵";
  } else if (score >= 30) {
    verdict = "Compatibilidade moderada — use como transição entre blocos";
    verdictColor = "bg-yellow-100 border-yellow-300 text-yellow-800";
    verdictIcon = "🟡";
  } else {
    verdict = "Baixa compatibilidade — contraste harmônico alto, use com intenção";
    verdictColor = "bg-orange-100 border-orange-300 text-orange-800";
    verdictIcon = "🟠";
  }

  return { score, insights, warnings, verdict, verdictColor, verdictIcon };
}

function SongSelector({ label, value, onChange, songs, excludeId }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const filtered = songs.filter(s => s.id !== excludeId &&
    (s.title?.toLowerCase().includes(search.toLowerCase()) || s.artist?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex-1 min-w-0">
      <p className="text-xs font-bold text-[#A68A64] uppercase mb-1">{label}</p>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border border-[#D4C5B0] bg-white hover:border-[#8B6F47] transition-all text-left"
        >
          {value ? (
            <div className="min-w-0">
              <p className="font-bold text-[#8B6F47] truncate text-sm">{value.title}</p>
              <p className="text-xs text-[#A68A64] truncate">{value.artist}</p>
            </div>
          ) : (
            <span className="text-[#A68A64] text-sm">Selecionar música...</span>
          )}
          <ChevronDown className={`w-4 h-4 text-[#A68A64] flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-[#D4C5B0] rounded-xl shadow-xl overflow-hidden"
            >
              <div className="p-2 border-b border-[#F0E8D8]">
                <input
                  autoFocus
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar..."
                  className="w-full px-2 py-1.5 text-sm rounded-lg border border-[#D4C5B0] focus:outline-none focus:border-[#8B6F47]"
                />
              </div>
              <div className="max-h-52 overflow-y-auto">
                {filtered.slice(0, 50).map(song => (
                  <button
                    key={song.id}
                    type="button"
                    onClick={() => { onChange(song); setOpen(false); setSearch(""); }}
                    className="w-full text-left px-3 py-2 hover:bg-[#F5F1E8] transition-colors"
                  >
                    <p className="font-medium text-[#8B6F47] text-sm truncate">{song.title}</p>
                    <p className="text-xs text-[#A68A64] truncate">{song.artist}</p>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <p className="text-center text-[#A68A64] text-sm py-4">Nenhuma música encontrada</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ProgressionList({ song }) {
  if (!song.progressions || song.progressions.length === 0) {
    return <p className="text-xs text-[#A68A64] italic">Sem progressões mapeadas</p>;
  }
  return (
    <div className="space-y-1.5">
      {song.progressions.map((prog, i) => (
        <div key={i} className="flex flex-col gap-0.5 bg-[#F5F1E8] rounded-lg px-2 py-1.5">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] font-semibold text-[#A68A64] uppercase truncate">{prog.section}</span>
            {prog.key && <Badge variant="outline" className="text-[9px] px-1 py-0">{prog.key}</Badge>}
          </div>
          <p className="text-xs font-bold text-[#8B6F47] truncate">{prog.progression_name || "—"}</p>
          {prog.pattern && <p className="text-[10px] text-[#A68A64] font-mono truncate">{prog.pattern}</p>}
        </div>
      ))}
    </div>
  );
}

export default function HarmonicSetlistAnalyzer({ onClose, songs: propSongs }) {
  const { data: songs } = useQuery({
    queryKey: ['songs'],
    queryFn: () => base44.fetchAllSongs(),
    initialData: propSongs || [],
    enabled: !propSongs,
  });

  const [songA, setSongA] = useState(null);
  const [songB, setSongB] = useState(null);

  const result = useMemo(() => {
    if (!songA || !songB) return null;
    return analyzeCompatibility(songA, songB);
  }, [songA, songB]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-amber-50 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#8B6F47] to-[#A68A64] p-4 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListMusic className="w-5 h-5 text-white" />
            <h2 className="text-lg font-bold text-white uppercase tracking-wide">Compatibilidade Harmônica</h2>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Seleção */}
          <div className="flex gap-3">
            <SongSelector
              label="Música A"
              value={songA}
              onChange={setSongA}
              songs={songs || []}
              excludeId={songB?.id}
            />
            <div className="flex items-end pb-2 text-[#D4AF37] font-black text-xl">vs</div>
            <SongSelector
              label="Música B"
              value={songB}
              onChange={setSongB}
              songs={songs || []}
              excludeId={songA?.id}
            />
          </div>

          <AnimatePresence>
            {songA && songB && result && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Score */}
                <div className={`rounded-xl border-2 p-4 ${result.verdictColor}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-black">{result.verdictIcon} Compatibilidade: {result.score}%</span>
                    <div className="w-32 h-3 bg-white/50 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${result.score}%`,
                          background: result.score >= 75 ? '#22c55e' : result.score >= 50 ? '#3b82f6' : result.score >= 30 ? '#eab308' : '#f97316'
                        }}
                      />
                    </div>
                  </div>
                  <p className="text-sm font-medium">{result.verdict}</p>
                </div>

                {/* Insights e Warnings */}
                {result.insights.length > 0 && (
                  <div className="bg-white rounded-xl p-3 border border-[#D4C5B0] space-y-1.5">
                    <p className="text-xs font-bold text-[#8B6F47] uppercase flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Semelhanças Encontradas
                    </p>
                    {result.insights.map((ins, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-[#5a4535]">
                        <span>{ins.icon}</span>
                        <span>{ins.text}</span>
                      </div>
                    ))}
                  </div>
                )}

                {result.warnings.length > 0 && (
                  <div className="bg-orange-50 rounded-xl p-3 border border-orange-200 space-y-1.5">
                    <p className="text-xs font-bold text-orange-700 uppercase flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Pontos de Atenção
                    </p>
                    {result.warnings.map((w, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-orange-700">
                        <span>{w.icon}</span>
                        <span>{w.text}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Comparação lado a lado */}
                <div className="grid grid-cols-2 gap-3">
                  {[songA, songB].map((song, idx) => (
                    <div key={idx} className="bg-white rounded-xl border border-[#D4C5B0] p-3 space-y-2">
                      <div>
                        <p className="font-bold text-[#8B6F47] text-sm truncate uppercase">{song.title}</p>
                        <p className="text-xs text-[#A68A64] truncate">{song.artist}</p>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {song.main_key && <Badge variant="outline" className="text-[10px]">🎼 {song.main_key}</Badge>}
                        {song.rhythm_name && <Badge variant="outline" className="text-[10px]">🥁 {song.rhythm_name}</Badge>}
                        {song.predominant_progression && (
                          <Badge className="bg-[#8B6F47]/10 text-[#8B6F47] border-[#8B6F47]/20 text-[10px]">
                            {song.predominant_progression}
                          </Badge>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-[#A68A64] uppercase mb-1">Progressões por Seção</p>
                        <ProgressionList song={song} />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {(!songA || !songB) && (
            <div className="text-center py-8 text-[#A68A64]">
              <Zap className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Selecione duas músicas para ver a análise de compatibilidade</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}