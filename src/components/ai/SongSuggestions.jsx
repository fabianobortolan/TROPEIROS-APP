import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Music, X, Brain, ChevronRight, Loader2, RefreshCw, Star } from "lucide-react";
import { motion } from "framer-motion";

function computeSimilarity(songA, songB) {
  let score = 0;
  if (songA.predominant_progression && songA.predominant_progression === songB.predominant_progression) score += 40;
  if (songA.main_key && songA.main_key === songB.main_key) score += 20;
  if (songA.rhythm_name && songA.rhythm_name === songB.rhythm_name) score += 20;
  if (songA.genre_style && songA.genre_style === songB.genre_style) score += 15;
  if (songA.artist && songB.artist && songA.artist.toLowerCase() === songB.artist.toLowerCase()) score += 5;
  return score;
}

export default function SongSuggestions({ songs = [], progressions = [], onSelectSong, onClose }) {
  const [loading, setLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState(null);

  // Músicas recentes do usuário como base
  const recentSongs = useMemo(() => {
    return [...songs]
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
      .slice(0, 5);
  }, [songs]);

  // Similaridade baseada em regras locais
  const localSuggestions = useMemo(() => {
    if (songs.length < 3) return [];

    const recentIds = new Set(recentSongs.map(s => s.id));
    const candidates = songs.filter(s => !recentIds.has(s.id));

    const scored = [];

    recentSongs.forEach(base => {
      candidates.forEach(candidate => {
        const existing = scored.find(s => s.song.id === candidate.id);
        const sim = computeSimilarity(base, candidate);
        if (sim >= 20) {
          if (existing) {
            if (sim > existing.score) {
              existing.score = sim;
              existing.basedOn = base.title;
            }
          } else {
            const reasons = [];
            if (base.predominant_progression && base.predominant_progression === candidate.predominant_progression)
              reasons.push(`Progressão: ${candidate.predominant_progression}`);
            if (base.main_key && base.main_key === candidate.main_key)
              reasons.push(`Tom: ${candidate.main_key}`);
            if (base.rhythm_name && base.rhythm_name === candidate.rhythm_name)
              reasons.push(`Ritmo: ${candidate.rhythm_name}`);
            if (base.genre_style && base.genre_style === candidate.genre_style)
              reasons.push(`Estilo similar`);

            scored.push({ song: candidate, score: sim, basedOn: base.title, reasons });
          }
        }
      });
    });

    return scored.sort((a, b) => b.score - a.score).slice(0, 8);
  }, [songs, recentSongs]);

  const fetchAISuggestions = async () => {
    setLoading(true);
    try {
      const songSummaries = songs.slice(0, 30).map(s => ({
        title: s.title,
        artist: s.artist,
        key: s.main_key,
        rhythm: s.rhythm_name,
        progression: s.predominant_progression,
        genre: s.genre_style
      }));

      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Você é um especialista em música sertaneja. Analise este repertório e sugira 5 músicas REAIS (que existem) do universo sertanejo que combinariam bem com o estilo musical do usuário, mas que AINDA NÃO estão na lista.

REPERTÓRIO ATUAL (${songs.length} músicas):
${JSON.stringify(songSummaries, null, 2)}

Analise padrões de: tonalidades favoritas, ritmos mais usados, progressões harmônicas predominantes, artistas e estilos preferidos.

Retorne 5 sugestões de músicas reais que existem, com alta compatibilidade harmônica e estilística.`,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  artist: { type: "string" },
                  reason: { type: "string" },
                  expected_key: { type: "string" },
                  expected_rhythm: { type: "string" },
                  compatibility_score: { type: "number" }
                }
              }
            },
            analysis_summary: { type: "string" }
          }
        }
      });

      setAiSuggestions(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-[#F5F1E8] rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-[#8B6F47] to-[#A68A64] p-5 rounded-t-2xl z-10 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5" /> Sugestões de Músicas por IA
            </h2>
            <p className="text-white/80 text-sm">Baseado na similaridade harmônica do seu repertório</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20 rounded-full">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-5 space-y-5">
          {/* Sugestões locais */}
          {localSuggestions.length > 0 && (
            <Card className="border-[#D4C5B0] bg-white/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-[#8B6F47] text-base flex items-center gap-2">
                  <Music className="w-4 h-4 text-[#9CAF88]" />
                  Músicas do Seu Repertório Mais Compatíveis
                  <Badge className="bg-[#9CAF88]/20 text-[#9CAF88] text-xs ml-1">Análise de Similaridade</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-[#A68A64] mb-3">
                  Músicas que você tem na biblioteca e que combinam mais com suas últimas análises — ótimas para sequenciar no setlist.
                </p>
                <div className="space-y-2">
                  {localSuggestions.map((rec, idx) => (
                    <motion.div
                      key={rec.song.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-center gap-3 p-3 bg-[#F5F1E8] rounded-xl border border-[#D4C5B0] hover:shadow-md transition-all cursor-pointer group"
                      onClick={() => { onSelectSong(rec.song); onClose(); }}
                    >
                      <div className="w-8 h-8 bg-gradient-to-br from-[#8B6F47] to-[#A68A64] rounded-lg flex items-center justify-center flex-shrink-0">
                        <Music className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[#8B6F47] text-sm truncate">{rec.song.title}</p>
                        <p className="text-xs text-[#A68A64] truncate">{rec.song.artist}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {rec.reasons.slice(0, 2).map((r, i) => (
                            <Badge key={i} className="bg-[#8B6F47]/10 text-[#8B6F47] text-[10px] px-1.5 py-0.5">{r}</Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <Badge className="bg-[#D4AF37]/20 text-[#D4AF37] text-xs font-bold">{rec.score}%</Badge>
                        <p className="text-[10px] text-[#A68A64]">similar</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#A68A64] group-hover:text-[#8B6F47] transition-colors" />
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sugestões IA externa */}
          <Card className="border-[#D4C5B0] bg-white/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-[#8B6F47] text-base flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-500" />
                Sugestões de Novas Músicas para Adicionar
                <Badge className="bg-purple-100 text-purple-600 text-xs ml-1">IA Generativa</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!aiSuggestions && !loading && (
                <div className="text-center py-6">
                  <Brain className="w-10 h-10 text-purple-300 mx-auto mb-3" />
                  <p className="text-sm text-[#A68A64] mb-4">
                    A IA vai analisar seu repertório e sugerir músicas reais que você ainda não tem — compatíveis com seu estilo harmônico.
                  </p>
                  <Button
                    onClick={fetchAISuggestions}
                    className="bg-gradient-to-r from-purple-500 to-purple-700 text-white hover:opacity-90"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Gerar Sugestões com IA
                  </Button>
                </div>
              )}

              {loading && (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-3" />
                  <p className="text-sm text-[#A68A64]">Analisando seu repertório...</p>
                </div>
              )}

              {aiSuggestions && (
                <div className="space-y-3">
                  {aiSuggestions.analysis_summary && (
                    <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 text-xs text-purple-700 mb-3">
                      <strong>Análise do repertório:</strong> {aiSuggestions.analysis_summary}
                    </div>
                  )}
                  {(aiSuggestions.suggestions || []).map((sug, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.08 }}
                      className="flex items-start gap-3 p-3 bg-purple-50/60 rounded-xl border border-purple-100"
                    >
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Star className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[#8B6F47] text-sm">{sug.title}</p>
                        <p className="text-xs text-[#A68A64]">{sug.artist}</p>
                        <p className="text-xs text-[#8B6F47] mt-1 leading-relaxed">{sug.reason}</p>
                        <div className="flex gap-2 mt-1 flex-wrap">
                          {sug.expected_key && <Badge className="text-[10px] bg-[#8B6F47]/10 text-[#8B6F47]">Tom: {sug.expected_key}</Badge>}
                          {sug.expected_rhythm && <Badge className="text-[10px] bg-[#9CAF88]/10 text-[#9CAF88]">{sug.expected_rhythm}</Badge>}
                          {sug.compatibility_score && <Badge className="text-[10px] bg-[#D4AF37]/20 text-[#D4AF37]">{sug.compatibility_score}% compatível</Badge>}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchAISuggestions}
                    className="w-full border-purple-300 text-purple-600 hover:bg-purple-50"
                  >
                    <RefreshCw className="w-3 h-3 mr-2" /> Gerar Novas Sugestões
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </motion.div>
  );
}