import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  X, Sparkles, Loader2, Music, ArrowRight, Copy, CheckCircle,
  Shuffle, Lightbulb, BookOpen, TrendingUp, RefreshCw
} from "lucide-react";
import { motion } from "framer-motion";

const STORAGE_KEY = 'ai_training_preferences';

export default function ProgressionSuggester({ onClose, song }) {
  const [selectedSongId, setSelectedSongId] = useState(song?.id || '');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [activeTab, setActiveTab] = useState('alternatives');

  const { data: songs } = useQuery({
    queryKey: ['songs'],
    queryFn: () => base44.fetchAllSongs(),
    initialData: []
  });

  const { data: progressions } = useQuery({
    queryKey: ['progressions'],
    queryFn: () => base44.entities.Progression.list(),
    initialData: []
  });

  const { data: rhythms } = useQuery({
    queryKey: ['rhythms'],
    queryFn: () => base44.entities.Rhythm.list(),
    initialData: []
  });

  const selectedSong = songs.find(s => s.id === selectedSongId);

  const getPreferences = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  };

  const generateSuggestions = async () => {
    if (!selectedSong) {
      alert('Selecione uma música primeiro');
      return;
    }

    setIsAnalyzing(true);
    setSuggestions(null);

    try {
      const preferences = getPreferences();

      // Preparar contexto das preferências
      const stylePrefs = Object.entries(preferences.styles || {})
        .filter(([_, w]) => w > 50)
        .map(([s]) => s)
        .join(', ');

      const patternPrefs = Object.entries(preferences.patterns || {})
        .sort((a, b) => b[1].weight - a[1].weight)
        .slice(0, 5)
        .map(([name, data]) => `${name}: ${data.pattern}`)
        .join('; ');

      // Todas as progressões cadastradas com variações
      const allProgressions = progressions.flatMap(prog => {
        const variations = (prog.variations || []).map(v => ({
          name: v.name || `${prog.name} (variação)`,
          pattern: v.pattern
        }));
        return [{ name: prog.name, pattern: prog.pattern }, ...variations];
      });

      const progressionsContext = allProgressions
        .map(p => `${p.name}: ${p.pattern}`)
        .join('\n');

      // Informações da música selecionada
      const songProgressions = (selectedSong.progressions || [])
        .map(p => `${p.section}: ${p.chords?.join(' - ')} (${p.pattern || 'N/A'})`)
        .join('\n');

      const prompt = `Você é um especialista em harmonia e arranjo musical, focado em música sertaneja brasileira.

MÚSICA SELECIONADA:
- Título: ${selectedSong.title}
- Artista: ${selectedSong.artist}
- Tom: ${selectedSong.main_key || 'N/A'}
- Ritmo: ${selectedSong.rhythm_name || 'N/A'}
- Progressão predominante: ${selectedSong.predominant_progression || 'N/A'}

PROGRESSÕES POR SEÇÃO:
${songProgressions || 'Não disponível'}

PREFERÊNCIAS DO USUÁRIO:
- Estilos favoritos: ${stylePrefs || 'Sertanejo geral'}
- Progressões preferidas: ${patternPrefs || 'Variadas'}

BANCO DE PROGRESSÕES DISPONÍVEIS:
${progressionsContext}

TAREFA:
Analise a música e sugira alternativas harmônicas criativas para enriquecer o arranjo.

Forneça:

1. PROGRESSÕES ALTERNATIVAS (3-4 sugestões):
   - Progressões que podem substituir as existentes
   - Para cada seção principal (verso, refrão)
   - Explique o efeito harmônico de cada substituição

2. ACORDES SUBSTITUTOS (3-4 sugestões):
   - Acordes que podem substituir acordes específicos
   - Tipo de substituição (relativo, trítono, dominante secundário, etc.)
   - Quando usar cada substituição

3. EXTENSÕES E ENRIQUECIMENTOS (3-4 sugestões):
   - Acordes com extensões (7ª, 9ª, sus4, add9)
   - Passagens cromáticas
   - Baixos pedal

4. REARMONIZAÇÃO COMPLETA (1 sugestão):
   - Uma versão completamente rearmonizada de uma seção
   - Com explicação teórica detalhada

IMPORTANTE: 
- Use nomenclatura clara (C, Dm, G7, etc.)
- Considere o tom original: ${selectedSong.main_key || 'C'}
- Mantenha a identidade sertaneja da música
- Explique o impacto emocional de cada sugestão`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            alternative_progressions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  section: { type: "string" },
                  original: { type: "string" },
                  suggested: { type: "string" },
                  pattern: { type: "string" },
                  effect: { type: "string" },
                  difficulty: { type: "string" }
                }
              }
            },
            chord_substitutes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  original_chord: { type: "string" },
                  substitute: { type: "string" },
                  type: { type: "string" },
                  when_to_use: { type: "string" },
                  example_context: { type: "string" }
                }
              }
            },
            extensions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  original_chord: { type: "string" },
                  extended: { type: "string" },
                  effect: { type: "string" },
                  tip: { type: "string" }
                }
              }
            },
            reharmonization: {
              type: "object",
              properties: {
                section: { type: "string" },
                original_progression: { type: "string" },
                new_progression: { type: "string" },
                chords_detail: { type: "array", items: { type: "string" } },
                explanation: { type: "string" },
                emotional_impact: { type: "string" }
              }
            },
            overall_tips: { type: "array", items: { type: "string" } }
          }
        }
      });

      setSuggestions(result);

    } catch (error) {
      console.error('Erro ao gerar sugestões:', error);
      alert('Erro ao gerar sugestões. Tente novamente.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-auto"
      onClick={onClose}
    >
      <Button
        onClick={onClose}
        size="lg"
        className="fixed top-4 right-4 z-50 bg-red-600 hover:bg-red-700 text-white shadow-2xl"
      >
        <X className="w-5 h-5 mr-2" />
        Fechar
      </Button>

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-[#8B6F47] via-[#D4AF37] to-[#9CAF88] text-white p-6 rounded-t-2xl z-10">
          <div className="flex items-center gap-3">
            <Shuffle className="w-8 h-8" />
            <div>
              <h2 className="text-2xl font-bold">Sugestões de Progressões com IA</h2>
              <p className="text-white/90 text-sm">Alternativas harmônicas personalizadas para suas músicas</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Seleção de Música */}
          <Card className="border-[#D4C5B0]">
            <CardHeader className="py-3">
              <CardTitle className="text-lg text-[#8B6F47]">Selecionar Música</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Select value={selectedSongId} onValueChange={setSelectedSongId}>
                  <SelectTrigger className="flex-1 border-[#D4C5B0]">
                    <SelectValue placeholder="Escolha uma música do repertório" />
                  </SelectTrigger>
                  <SelectContent>
                    {songs.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.title} - {s.artist} ({s.main_key || 'N/A'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  onClick={generateSuggestions}
                  disabled={!selectedSongId || isAnalyzing}
                  className="bg-gradient-to-r from-[#8B6F47] to-[#D4AF37] hover:from-[#A68A64] hover:to-[#9CAF88] text-white"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analisando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Gerar Sugestões
                    </>
                  )}
                </Button>
              </div>

              {selectedSong && (
                <div className="mt-4 p-3 bg-[#F5F1E8] rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#D4AF37] to-[#9CAF88] rounded-xl flex items-center justify-center">
                      <Music className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-[#8B6F47]">{selectedSong.title}</p>
                      <p className="text-sm text-[#A68A64]">{selectedSong.artist}</p>
                    </div>
                    <div className="flex gap-2">
                      {selectedSong.main_key && (
                        <Badge className="bg-[#8B6F47] text-white">Tom: {selectedSong.main_key}</Badge>
                      )}
                      {selectedSong.predominant_progression && (
                        <Badge className="bg-[#D4AF37] text-white">{selectedSong.predominant_progression}</Badge>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Resultados */}
          {suggestions && (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4 bg-[#E8DCC4] flex-wrap h-auto gap-1">
                <TabsTrigger value="alternatives" className="data-[state=active]:bg-[#8B6F47] data-[state=active]:text-white">
                  <Shuffle className="w-4 h-4 mr-2" />
                  Progressões Alt.
                </TabsTrigger>
                <TabsTrigger value="substitutes" className="data-[state=active]:bg-[#8B6F47] data-[state=active]:text-white">
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Substitutos
                </TabsTrigger>
                <TabsTrigger value="extensions" className="data-[state=active]:bg-[#8B6F47] data-[state=active]:text-white">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Extensões
                </TabsTrigger>
                <TabsTrigger value="reharmonization" className="data-[state=active]:bg-[#8B6F47] data-[state=active]:text-white">
                  <Lightbulb className="w-4 h-4 mr-2" />
                  Rearmonização
                </TabsTrigger>
              </TabsList>

              {/* Progressões Alternativas */}
              <TabsContent value="alternatives">
                <div className="space-y-3">
                  {suggestions.alternative_progressions?.map((prog, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className="border-[#D4C5B0] hover:shadow-lg transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <Badge className="bg-[#8B6F47]/10 text-[#8B6F47]">{prog.section}</Badge>
                            {prog.difficulty && (
                              <Badge variant="outline">{prog.difficulty}</Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-4 mb-3">
                            <div className="flex-1 p-2 bg-gray-100 rounded text-center">
                              <p className="text-xs text-gray-500 mb-1">Original</p>
                              <p className="font-mono font-bold text-[#8B6F47]">{prog.original}</p>
                            </div>
                            <ArrowRight className="w-6 h-6 text-[#D4AF37]" />
                            <div className="flex-1 p-2 bg-[#9CAF88]/10 rounded text-center border-2 border-[#9CAF88]">
                              <p className="text-xs text-[#9CAF88] mb-1">Sugerido</p>
                              <p className="font-mono font-bold text-[#8B6F47]">{prog.suggested}</p>
                            </div>
                          </div>

                          {prog.pattern && (
                            <p className="text-sm text-[#A68A64] mb-2">
                              <strong>Padrão:</strong> {prog.pattern}
                            </p>
                          )}

                          <p className="text-sm text-gray-700">{prog.effect}</p>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(prog.suggested, `alt-${index}`)}
                            className="mt-3 border-[#D4C5B0] text-[#8B6F47]"
                          >
                            {copiedIndex === `alt-${index}` ? (
                              <>
                                <CheckCircle className="w-4 h-4 mr-1 text-green-600" />
                                Copiado!
                              </>
                            ) : (
                              <>
                                <Copy className="w-4 h-4 mr-1" />
                                Copiar
                              </>
                            )}
                          </Button>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </TabsContent>

              {/* Acordes Substitutos */}
              <TabsContent value="substitutes">
                <div className="space-y-3">
                  {suggestions.chord_substitutes?.map((sub, index) => (
                    <Card key={index} className="border-[#D4C5B0]">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4 mb-3">
                          <div className="text-center p-3 bg-gray-100 rounded-lg min-w-[80px]">
                            <p className="text-xs text-gray-500">Original</p>
                            <p className="text-2xl font-bold text-[#8B6F47]">{sub.original_chord}</p>
                          </div>
                          <ArrowRight className="w-6 h-6 text-[#D4AF37]" />
                          <div className="text-center p-3 bg-[#D4AF37]/10 rounded-lg min-w-[80px] border-2 border-[#D4AF37]">
                            <p className="text-xs text-[#D4AF37]">Substituto</p>
                            <p className="text-2xl font-bold text-[#8B6F47]">{sub.substitute}</p>
                          </div>
                          <div className="flex-1">
                            <Badge className="bg-[#9CAF88]/10 text-[#9CAF88] mb-2">{sub.type}</Badge>
                            <p className="text-sm text-gray-700">{sub.when_to_use}</p>
                          </div>
                        </div>
                        {sub.example_context && (
                          <div className="p-2 bg-[#F5F1E8] rounded text-sm text-[#A68A64]">
                            <strong>Exemplo:</strong> {sub.example_context}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Extensões */}
              <TabsContent value="extensions">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {suggestions.extensions?.map((ext, index) => (
                    <Card key={index} className="border-[#D4C5B0]">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="text-center p-2 bg-gray-100 rounded">
                            <p className="text-xl font-bold text-[#8B6F47]">{ext.original_chord}</p>
                          </div>
                          <ArrowRight className="w-5 h-5 text-[#D4AF37]" />
                          <div className="text-center p-2 bg-[#9CAF88]/10 rounded border border-[#9CAF88]">
                            <p className="text-xl font-bold text-[#9CAF88]">{ext.extended}</p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{ext.effect}</p>
                        {ext.tip && (
                          <p className="text-xs text-[#D4AF37] italic">💡 {ext.tip}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Rearmonização Completa */}
              <TabsContent value="reharmonization">
                {suggestions.reharmonization && (
                  <Card className="border-[#D4AF37] bg-gradient-to-r from-[#D4AF37]/5 to-white">
                    <CardHeader>
                      <CardTitle className="text-lg text-[#8B6F47] flex items-center gap-2">
                        <Lightbulb className="w-5 h-5 text-[#D4AF37]" />
                        Rearmonização: {suggestions.reharmonization.section}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 bg-gray-100 rounded-lg">
                            <p className="text-xs text-gray-500 mb-1">Progressão Original</p>
                            <p className="font-mono font-bold text-[#8B6F47]">
                              {suggestions.reharmonization.original_progression}
                            </p>
                          </div>
                          <div className="p-3 bg-[#9CAF88]/10 rounded-lg border-2 border-[#9CAF88]">
                            <p className="text-xs text-[#9CAF88] mb-1">Nova Progressão</p>
                            <p className="font-mono font-bold text-[#8B6F47]">
                              {suggestions.reharmonization.new_progression}
                            </p>
                          </div>
                        </div>

                        {suggestions.reharmonization.chords_detail?.length > 0 && (
                          <div>
                            <p className="text-sm font-bold text-[#8B6F47] mb-2">Acordes Detalhados:</p>
                            <div className="flex flex-wrap gap-2">
                              {suggestions.reharmonization.chords_detail.map((chord, i) => (
                                <Badge key={i} className="bg-[#8B6F47] text-white text-lg px-3 py-1">
                                  {chord}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="p-4 bg-[#F5F1E8] rounded-lg">
                          <p className="text-sm font-bold text-[#8B6F47] mb-2">
                            <BookOpen className="w-4 h-4 inline mr-1" />
                            Explicação Teórica:
                          </p>
                          <p className="text-sm text-gray-700">{suggestions.reharmonization.explanation}</p>
                        </div>

                        {suggestions.reharmonization.emotional_impact && (
                          <div className="p-4 bg-[#9CAF88]/10 rounded-lg border border-[#9CAF88]">
                            <p className="text-sm font-bold text-[#9CAF88] mb-1">🎭 Impacto Emocional:</p>
                            <p className="text-sm text-gray-700">{suggestions.reharmonization.emotional_impact}</p>
                          </div>
                        )}

                        <Button
                          onClick={() => copyToClipboard(suggestions.reharmonization.new_progression, 'rehar')}
                          className="w-full bg-[#8B6F47] hover:bg-[#A68A64] text-white"
                        >
                          {copiedIndex === 'rehar' ? (
                            <>
                              <CheckCircle className="w-4 h-4 mr-2 text-green-300" />
                              Copiado!
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4 mr-2" />
                              Copiar Nova Progressão
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Dicas Gerais */}
              {suggestions.overall_tips?.length > 0 && (
                <Card className="mt-6 border-[#9CAF88]">
                  <CardHeader className="py-3">
                    <CardTitle className="text-lg text-[#8B6F47]">💡 Dicas Gerais</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {suggestions.overall_tips.map((tip, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                          <CheckCircle className="w-4 h-4 text-[#9CAF88] flex-shrink-0 mt-0.5" />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </Tabs>
          )}

          {!suggestions && !isAnalyzing && (
            <div className="text-center py-12 text-[#A68A64]">
              <Shuffle className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Selecione uma música e clique em "Gerar Sugestões"</p>
              <p className="text-sm mt-2">A IA vai analisar a harmonia e sugerir alternativas criativas</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}