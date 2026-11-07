import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Brain, X, Plus, Loader2, CheckCircle2, Lightbulb, Music, RefreshCw, Pencil, Check } from "lucide-react";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";

export default function UnusualProgressionDetector({ songs = [], progressions = [], onClose }) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [creating, setCreating] = useState({});
  const [created, setCreated] = useState({});
  const [editing, setEditing] = useState({});
  const [editedItems, setEditedItems] = useState({});

  // Progressões existentes no banco (patterns)
  const existingPatterns = useMemo(() => {
    return new Set(progressions.map(p => p.pattern?.toUpperCase().trim()).filter(Boolean));
  }, [progressions]);

  const existingNames = useMemo(() => {
    return new Set(progressions.map(p => p.name?.toLowerCase().trim()).filter(Boolean));
  }, [progressions]);

  // Detecta localmente progressões que não estão no banco
  const localUnusual = useMemo(() => {
    const found = [];
    const seenPatterns = new Set();

    songs.forEach(song => {
      (song.progressions || []).forEach(prog => {
        if (!prog.pattern || !prog.progression_name) return;
        const patternKey = prog.pattern.toUpperCase().trim();
        if (seenPatterns.has(patternKey)) return;

        const inDB = existingPatterns.has(patternKey);
        if (!inDB) {
          seenPatterns.add(patternKey);
          found.push({
            pattern: prog.pattern,
            progression_name: prog.progression_name,
            song_title: song.title,
            song_artist: song.artist,
            section: prog.section,
            key: prog.key || song.main_key,
            notes: prog.notes
          });
        }
      });
    });

    return found;
  }, [songs, existingPatterns]);

  const runAIAnalysis = async () => {
    setLoading(true);
    setAnalysis(null);
    try {
      const existingProgressionsSummary = progressions.map(p => ({
        name: p.name,
        pattern: p.pattern,
        description: p.description
      }));

      const songProgressions = [];
      songs.forEach(song => {
        (song.progressions || []).forEach(prog => {
          if (prog.pattern) {
            songProgressions.push({
              song: song.title,
              artist: song.artist,
              section: prog.section,
              pattern: prog.pattern,
              progression_name: prog.progression_name || "não identificada",
              key: prog.key || song.main_key,
              chords: prog.chords
            });
          }
        });
      });

      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Você é um especialista em harmonia musical sertaneja. Analise as progressões harmônicas das músicas e identifique quais são INCOMUNS, ÚNICAS ou que merecem ser catalogadas como novas progressões no banco de dados.

PROGRESSÕES JÁ NO BANCO DE DADOS:
${JSON.stringify(existingProgressionsSummary, null, 2)}

PROGRESSÕES ENCONTRADAS NAS MÚSICAS DO REPERTÓRIO:
${JSON.stringify(songProgressions.slice(0, 60), null, 2)}

Identifique:
1. Progressões que não existem no banco e são musicalmente interessantes
2. Progressões que são variações únicas de progressões conhecidas
3. Progressões raras ou pouco comuns no sertanejo

Para cada uma, sugira um nome adequado e descrição musical completa.
Retorne apenas progressões que realmente merecem ser adicionadas ao banco.`,
        response_json_schema: {
          type: "object",
          properties: {
            unusual_progressions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  pattern: { type: "string" },
                  suggested_name: { type: "string" },
                  description: { type: "string" },
                  found_in_song: { type: "string" },
                  found_in_section: { type: "string" },
                  why_unusual: { type: "string" },
                  genre_tags: { type: "array", items: { type: "string" } },
                  rarity_level: { type: "string" }
                }
              }
            },
            summary: { type: "string" }
          }
        }
      });

      setAnalysis(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (item, idx) => {
    setEditedItems(prev => ({
      ...prev,
      [idx]: {
        suggested_name: item.suggested_name,
        pattern: item.pattern,
        description: item.description,
        why_unusual: item.why_unusual || "",
        genre_tags: (item.genre_tags || []).join(", ")
      }
    }));
    setEditing(prev => ({ ...prev, [idx]: true }));
  };

  const saveEdit = (idx) => {
    setEditing(prev => ({ ...prev, [idx]: false }));
  };

  const updateField = (idx, field, value) => {
    setEditedItems(prev => ({
      ...prev,
      [idx]: { ...prev[idx], [field]: value }
    }));
  };

  const getItem = (item, idx) => editing[idx] || editedItems[idx] ? { ...item, ...editedItems[idx] } : item;

  const createProgression = async (item, index) => {
    const finalItem = getItem(item, index);
    const genreTags = typeof finalItem.genre_tags === "string"
      ? finalItem.genre_tags.split(",").map(t => t.trim()).filter(Boolean)
      : finalItem.genre_tags || ["sertanejo"];
    setCreating(prev => ({ ...prev, [index]: true }));
    try {
      await base44.entities.Progression.create({
        name: finalItem.suggested_name,
        pattern: finalItem.pattern,
        description: finalItem.description,
        genre_tags: genreTags,
        examples: finalItem.found_in_song ? [finalItem.found_in_song] : []
      });
      setCreated(prev => ({ ...prev, [index]: true }));
      queryClient.invalidateQueries({ queryKey: ['progressions'] });
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(prev => ({ ...prev, [index]: false }));
    }
  };

  const rarityColor = (level) => {
    if (!level) return "bg-gray-100 text-gray-600";
    const l = level.toLowerCase();
    if (l.includes("muito") || l.includes("extrema")) return "bg-red-100 text-red-700";
    if (l.includes("rara") || l.includes("incomum")) return "bg-orange-100 text-orange-700";
    return "bg-yellow-100 text-yellow-700";
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
        <div className="sticky top-0 bg-gradient-to-r from-orange-500 to-amber-500 p-5 rounded-t-2xl z-10 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Detector de Progressões Incomuns
            </h2>
            <p className="text-white/80 text-sm">Identifica harmonias únicas e sugere criação no banco</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20 rounded-full">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-5 space-y-5">
          {/* Detecção local */}
          {localUnusual.length > 0 && (
            <Card className="border-orange-200 bg-orange-50/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-orange-700 text-base flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  Progressões Não Catalogadas Detectadas
                  <Badge className="bg-orange-100 text-orange-700 text-xs">{localUnusual.length} encontradas</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-orange-600 mb-3">
                  Estas progressões estão nas suas músicas mas não existem no banco de dados de progressões.
                </p>
                <div className="space-y-2">
                  {localUnusual.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-white rounded-xl border border-orange-100">
                      <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Music className="w-4 h-4 text-orange-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[#8B6F47] text-sm font-mono">{item.pattern}</p>
                        <p className="text-xs text-[#A68A64]">
                          Encontrada em: <strong>{item.song_title}</strong> — {item.section}
                          {item.key && ` — Tom: ${item.key}`}
                        </p>
                        {item.progression_name && item.progression_name !== "não identificada" && (
                          <Badge className="mt-1 text-[10px] bg-[#8B6F47]/10 text-[#8B6F47]">
                            Identificada como: {item.progression_name}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Análise IA */}
          <Card className="border-[#D4C5B0] bg-white/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-[#8B6F47] text-base flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-500" />
                Análise Profunda com IA
                <Badge className="bg-purple-100 text-purple-600 text-xs">Sugestão de Criação</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!analysis && !loading && (
                <div className="text-center py-6">
                  <Brain className="w-10 h-10 text-purple-300 mx-auto mb-3" />
                  <p className="text-sm text-[#A68A64] mb-4">
                    A IA vai varrer todas as progressões do repertório, identificar as mais incomuns e sugerir a criação automática no banco de dados.
                  </p>
                  <Button
                    onClick={runAIAnalysis}
                    className="bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:opacity-90"
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Detectar Progressões Incomuns
                  </Button>
                </div>
              )}

              {loading && (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-3" />
                  <p className="text-sm text-[#A68A64]">Analisando progressões harmônicas...</p>
                </div>
              )}

              {analysis && (
                <div className="space-y-3">
                  {analysis.summary && (
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-xs text-amber-700 mb-3">
                      <strong>Resumo da análise:</strong> {analysis.summary}
                    </div>
                  )}

                  {(analysis.unusual_progressions || []).length === 0 && (
                    <div className="text-center py-6 text-[#A68A64] text-sm">
                      <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                      Nenhuma progressão incomum detectada. Seu banco de dados está bem catalogado!
                    </div>
                  )}

                  {(analysis.unusual_progressions || []).map((item, idx) => {
                    const finalItem = getItem(item, idx);
                    const isEditing = editing[idx];
                    const genreTagsArr = typeof finalItem.genre_tags === "string"
                      ? finalItem.genre_tags.split(",").map(t => t.trim()).filter(Boolean)
                      : finalItem.genre_tags || [];
                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.08 }}
                        className="p-4 bg-white rounded-xl border border-orange-100 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {isEditing ? (
                                <Input
                                  value={editedItems[idx]?.pattern ?? item.pattern}
                                  onChange={e => updateField(idx, "pattern", e.target.value)}
                                  className="font-mono text-sm h-7 w-32 border-orange-300"
                                />
                              ) : (
                                <p className="font-bold text-[#8B6F47] text-sm font-mono">{finalItem.pattern}</p>
                              )}
                              {item.rarity_level && (
                                <Badge className={`text-[10px] ${rarityColor(item.rarity_level)}`}>
                                  {item.rarity_level}
                                </Badge>
                              )}
                            </div>
                            {isEditing ? (
                              <Input
                                value={editedItems[idx]?.suggested_name ?? item.suggested_name}
                                onChange={e => updateField(idx, "suggested_name", e.target.value)}
                                className="text-xs h-7 mt-1 border-purple-300 text-purple-700 font-semibold"
                                placeholder="Nome da progressão"
                              />
                            ) : (
                              <p className="text-xs font-semibold text-purple-700 mt-0.5">{finalItem.suggested_name}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {!created[idx] && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => isEditing ? saveEdit(idx) : startEditing(item, idx)}
                                className={`h-7 px-2 text-xs ${isEditing ? "text-green-600 hover:bg-green-50" : "text-[#8B6F47] hover:bg-orange-50"}`}
                              >
                                {isEditing ? <><Check className="w-3 h-3 mr-1" />OK</> : <><Pencil className="w-3 h-3 mr-1" />Editar</>}
                              </Button>
                            )}
                            {created[idx] ? (
                              <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Criada
                              </Badge>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => createProgression(item, idx)}
                                disabled={creating[idx] || isEditing}
                                className="bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs h-7 px-3"
                              >
                                {creating[idx] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3 mr-1" />}
                                {creating[idx] ? "Criando..." : "Adicionar ao Banco"}
                              </Button>
                            )}
                          </div>
                        </div>

                        {isEditing ? (
                          <Textarea
                            value={editedItems[idx]?.description ?? item.description}
                            onChange={e => updateField(idx, "description", e.target.value)}
                            className="text-xs min-h-[70px] border-orange-200 mt-1"
                            placeholder="Descrição da progressão..."
                          />
                        ) : (
                          <p className="text-xs text-[#A68A64] leading-relaxed">{finalItem.description}</p>
                        )}

                        {isEditing ? (
                          <div className="mt-2">
                            <p className="text-[10px] text-orange-500 font-semibold mb-1">Por que é incomum:</p>
                            <Input
                              value={editedItems[idx]?.why_unusual ?? item.why_unusual ?? ""}
                              onChange={e => updateField(idx, "why_unusual", e.target.value)}
                              className="text-xs h-7 border-orange-200"
                              placeholder="Por que esta progressão é incomum..."
                            />
                          </div>
                        ) : (
                          finalItem.why_unusual && (
                            <p className="text-xs text-orange-600 mt-1.5 flex items-start gap-1">
                              <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                              {finalItem.why_unusual}
                            </p>
                          )
                        )}

                        {item.found_in_song && (
                          <p className="text-[10px] text-[#A68A64] mt-1.5">
                            🎵 Encontrada em: <strong>{item.found_in_song}</strong>
                            {item.found_in_section && ` — ${item.found_in_section}`}
                          </p>
                        )}

                        {isEditing ? (
                          <div className="mt-2">
                            <p className="text-[10px] text-[#8B6F47] font-semibold mb-1">Tags (separadas por vírgula):</p>
                            <Input
                              value={editedItems[idx]?.genre_tags ?? (item.genre_tags || []).join(", ")}
                              onChange={e => updateField(idx, "genre_tags", e.target.value)}
                              className="text-xs h-7 border-[#D4C5B0]"
                              placeholder="sertanejo, pop, folk..."
                            />
                          </div>
                        ) : (
                          genreTagsArr.length > 0 && (
                            <div className="flex gap-1 mt-2 flex-wrap">
                              {genreTagsArr.map((tag, i) => (
                                <Badge key={i} className="text-[10px] bg-[#9CAF88]/20 text-[#9CAF88] px-1.5">{tag}</Badge>
                              ))}
                            </div>
                          )
                        )}
                      </motion.div>
                    );
                  })}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={runAIAnalysis}
                    className="w-full border-orange-300 text-orange-600 hover:bg-orange-50"
                  >
                    <RefreshCw className="w-3 h-3 mr-2" /> Reanalisar
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