import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { X, Globe, CheckCircle, AlertCircle, Loader2, ChevronDown, ChevronUp, Save, RefreshCw } from "lucide-react";

// Avalia o "score de incompletude" de uma progressão
function getCompletenessScore(prog) {
  let missing = 0;
  if (!prog.description || prog.description.trim().length < 30) missing++;
  if (!prog.common_keys || prog.common_keys.length === 0) missing++;
  if (!prog.genre_tags || prog.genre_tags.length === 0) missing++;
  if (!prog.examples || prog.examples.length === 0) missing++;
  if (!prog.variations || prog.variations.length === 0) missing++;
  return missing;
}

export default function EnriquecerProgressoesIA({ onClose, onDone }) {
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [allProgressions, setAllProgressions] = useState([]);
  const [incompleteProgressions, setIncompleteProgressions] = useState([]);
  const [running, setRunning] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [results, setResults] = useState([]);
  const [finished, setFinished] = useState(false);
  const [saving, setSaving] = useState(false);

  // Busca dados FRESCOS do banco ao abrir o modal
  useEffect(() => {
    setLoadingQueue(true);
    base44.entities.Progression.list().then(freshProgressions => {
      setAllProgressions(freshProgressions);
      const incomplete = [...freshProgressions]
        .map(p => ({ ...p, _score: getCompletenessScore(p) }))
        .filter(p => p._score > 0)
        .sort((a, b) => b._score - a._score);
      setIncompleteProgressions(incomplete);
      setLoadingQueue(false);
    });
  }, []);

  const startScan = async () => {
    if (incompleteProgressions.length === 0) return;
    setRunning(true);
    setFinished(false);
    setResults([]);

    const newResults = [];

    for (let i = 0; i < incompleteProgressions.length; i++) {
      setCurrentIndex(i);
      const prog = incompleteProgressions[i];

      try {
        const suggestion = await base44.integrations.Core.InvokeLLM({
          prompt: `Você é um especialista em teoria musical e harmonia. Pesquise profundamente na internet sobre a progressão harmônica "${prog.name}" (padrão: ${prog.pattern}) e retorne informações enriquecidas.

IMPORTANTE: 
- Foque em progressões do contexto sertanejo brasileiro, mas também considere música popular em geral
- Seja específico e rico em detalhes
- Se já houver informações abaixo, complemente e melhore-as

Informações ATUAIS (para completar/melhorar):
- Descrição: ${prog.description || "(vazia)"}
- Tonalidades comuns: ${prog.common_keys?.join(", ") || "(vazio)"}
- Gêneros/tags: ${prog.genre_tags?.join(", ") || "(vazio)"}
- Exemplos de músicas: ${prog.examples?.join(", ") || "(vazio)"}
- Variações: ${prog.variations?.length > 0 ? JSON.stringify(prog.variations) : "(nenhuma)"}

Retorne um JSON com campos enriquecidos. Deixe campos que já estão bons com os valores originais. Só mude/complete o que estiver vazio ou insuficiente.`,
          add_context_from_internet: true,
          response_json_schema: {
            type: "object",
            properties: {
              description: { type: "string" },
              common_keys: { type: "array", items: { type: "string" } },
              genre_tags: { type: "array", items: { type: "string" } },
              examples: { type: "array", items: { type: "string" } },
              variations: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    pattern: { type: "string" },
                    name: { type: "string" },
                    description: { type: "string" }
                  }
                }
              }
            }
          }
        });

        newResults.push({
          id: prog.id,
          name: prog.name,
          pattern: prog.pattern,
          score: prog._score,
          status: "success",
          original: prog,
          suggestion,
          expanded: false,
          approved: false
        });
      } catch (err) {
        newResults.push({
          id: prog.id,
          name: prog.name,
          pattern: prog.pattern,
          score: prog._score,
          status: "error",
          original: prog,
          suggestion: null,
          expanded: false,
          approved: false
        });
      }

      setResults([...newResults]);
    }

    setRunning(false);
    setFinished(true);
    setCurrentIndex(-1);
  };

  const toggleExpand = (idx) => {
    setResults(prev => prev.map((r, i) => i === idx ? { ...r, expanded: !r.expanded } : r));
  };

  const toggleApprove = (idx) => {
    setResults(prev => prev.map((r, i) => i === idx ? { ...r, approved: !r.approved } : r));
  };

  const approveAll = () => {
    setResults(prev => prev.map(r => r.status === "success" ? { ...r, approved: true } : r));
  };

  const saveApproved = async () => {
    const toSave = results.filter(r => r.approved && r.suggestion);
    if (toSave.length === 0) return;

    setSaving(true);
    let saved = 0;

    for (const item of toSave) {
      await base44.entities.Progression.update(item.id, {
        description: item.suggestion.description || item.original.description,
        common_keys: item.suggestion.common_keys?.length > 0 ? item.suggestion.common_keys : item.original.common_keys,
        genre_tags: item.suggestion.genre_tags?.length > 0 ? item.suggestion.genre_tags : item.original.genre_tags,
        examples: item.suggestion.examples?.length > 0 ? item.suggestion.examples : item.original.examples,
        variations: item.suggestion.variations?.length > 0 ? item.suggestion.variations : item.original.variations,
      });
      saved++;
    }

    setSaving(false);
    onDone();
    onClose();
    alert(`✅ ${saved} progressões enriquecidas e salvas com sucesso!`);
  };

  const approvedCount = results.filter(r => r.approved).length;
  const successCount = results.filter(r => r.status === "success").length;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#D4C5B0] bg-gradient-to-r from-[#8B6F47] to-[#A68A64] rounded-t-2xl">
          <div className="flex items-center gap-3">
            <Globe className="w-6 h-6 text-white" />
            <div>
              <h2 className="text-xl font-bold text-white">Enriquecer Progressões com IA</h2>
              <p className="text-white/80 text-sm">Varredura na internet para completar informações</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white p-1">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Stats iniciais */}
          {loadingQueue ? (
            <div className="flex items-center justify-center py-8 gap-3 text-[#8B6F47]">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-sm">Verificando progressões no banco...</span>
            </div>
          ) : (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-amber-50 rounded-xl p-4 text-center border border-amber-200">
              <p className="text-2xl font-bold text-[#8B6F47]">{allProgressions.length}</p>
              <p className="text-xs text-[#A68A64]">Total de progressões</p>
            </div>
            <div className="bg-orange-50 rounded-xl p-4 text-center border border-orange-200">
              <p className="text-2xl font-bold text-orange-600">{incompleteProgressions.length}</p>
              <p className="text-xs text-orange-500">Com dados incompletos</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-center border border-green-200">
              <p className="text-2xl font-bold text-green-600">{allProgressions.length - incompleteProgressions.length}</p>
              <p className="text-xs text-green-600">Completas</p>
            </div>
          </div>
          )}

          {/* Progresso da varredura */}
          {(running || finished) && (
            <div className="bg-[#F5F1E8] rounded-xl p-4 border border-[#D4C5B0]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-[#8B6F47]">
                  {running
                    ? `Pesquisando: ${incompleteProgressions[currentIndex]?.name || "..."}`
                    : `Varredura concluída — ${successCount}/${incompleteProgressions.length} pesquisadas`}
                </span>
                <span className="text-xs text-[#A68A64]">
                  {results.length}/{incompleteProgressions.length}
                </span>
              </div>
              <Progress value={(results.length / Math.max(incompleteProgressions.length, 1)) * 100} className="h-2" />
            </div>
          )}

          {/* Resultados */}
          {results.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-[#8B6F47]">Sugestões da IA</h3>
                {finished && successCount > 0 && (
                  <Button size="sm" variant="outline" onClick={approveAll}
                    className="border-green-400 text-green-600 hover:bg-green-500 hover:text-white text-xs">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Aprovar Todas ({successCount})
                  </Button>
                )}
              </div>

              <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
                {results.map((item, idx) => (
                  <div key={item.id} className={`rounded-xl border transition-all ${item.approved ? "border-green-400 bg-green-50" : "border-[#D4C5B0] bg-white"}`}>
                    <div className="flex items-center gap-3 p-3">
                      {item.status === "success" ? (
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-[#8B6F47] truncate">{item.name}</p>
                        <p className="text-xs text-[#A68A64] font-mono">{item.pattern}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge className={`text-xs ${item.score >= 4 ? "bg-red-100 text-red-700" : item.score >= 2 ? "bg-orange-100 text-orange-700" : "bg-yellow-100 text-yellow-700"}`}>
                          {item.score} campos faltando
                        </Badge>
                        {item.status === "success" && (
                          <>
                            <button onClick={() => toggleApprove(idx)}
                              className={`text-xs px-2 py-1 rounded-lg font-semibold transition-colors ${item.approved ? "bg-green-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-green-100"}`}>
                              {item.approved ? "✓ Aprovado" : "Aprovar"}
                            </button>
                            <button onClick={() => toggleExpand(idx)} className="text-[#A68A64] hover:text-[#8B6F47]">
                              {item.expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {item.expanded && item.suggestion && (
                      <div className="border-t border-[#D4C5B0] p-3 space-y-2 text-xs">
                        {item.suggestion.description && (
                          <div>
                            <p className="font-semibold text-[#A68A64] mb-1">Descrição:</p>
                            <p className="text-[#8B6F47] bg-[#F5F1E8] rounded p-2">{item.suggestion.description}</p>
                          </div>
                        )}
                        {item.suggestion.genre_tags?.length > 0 && (
                          <div>
                            <p className="font-semibold text-[#A68A64] mb-1">Gêneros:</p>
                            <div className="flex flex-wrap gap-1">
                              {item.suggestion.genre_tags.map(t => (
                                <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {item.suggestion.common_keys?.length > 0 && (
                          <div>
                            <p className="font-semibold text-[#A68A64] mb-1">Tonalidades comuns:</p>
                            <p className="text-[#8B6F47]">{item.suggestion.common_keys.join(", ")}</p>
                          </div>
                        )}
                        {item.suggestion.examples?.length > 0 && (
                          <div>
                            <p className="font-semibold text-[#A68A64] mb-1">Exemplos de músicas:</p>
                            <p className="text-[#8B6F47]">{item.suggestion.examples.join(", ")}</p>
                          </div>
                        )}
                        {item.suggestion.variations?.length > 0 && (
                          <div>
                            <p className="font-semibold text-[#A68A64] mb-1">Variações ({item.suggestion.variations.length}):</p>
                            <div className="space-y-1">
                              {item.suggestion.variations.map((v, vi) => (
                                <div key={vi} className="bg-[#F5F1E8] rounded p-1.5">
                                  <span className="font-mono font-bold text-[#8B6F47]">{v.pattern}</span>
                                  {v.name && <span className="text-[#A68A64] ml-2">{v.name}</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ações */}
          <div className="flex gap-3 pt-2">
            {!running && !finished && !loadingQueue && (
              <Button
                onClick={startScan}
                disabled={incompleteProgressions.length === 0}
                className="flex-1 bg-gradient-to-r from-[#8B6F47] to-[#A68A64] hover:from-[#A68A64] hover:to-[#8B6F47] text-white font-semibold h-11">
                <Globe className="w-4 h-4 mr-2" />
                Iniciar Varredura ({incompleteProgressions.length} progressões)
              </Button>
            )}

            {running && (
              <Button disabled className="flex-1 h-11 bg-[#8B6F47] text-white">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Pesquisando na internet...
              </Button>
            )}

            {finished && (
              <>
                <Button
                  onClick={startScan}
                  variant="outline"
                  className="border-[#8B6F47] text-[#8B6F47] hover:bg-[#8B6F47] hover:text-white h-11">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Repetir
                </Button>
                <Button
                  onClick={saveApproved}
                  disabled={approvedCount === 0 || saving}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold h-11">
                  {saving ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</>
                  ) : (
                    <><Save className="w-4 h-4 mr-2" />Salvar Aprovadas ({approvedCount})</>
                  )}
                </Button>
              </>
            )}
          </div>

          {!loadingQueue && incompleteProgressions.length === 0 && !finished && (
            <div className="text-center py-6 text-[#A68A64]">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
              <p className="font-semibold text-green-700">Todas as progressões já estão completas!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}