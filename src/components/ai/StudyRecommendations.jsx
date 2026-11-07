import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  X, Lightbulb, Loader2, Music, Star, TrendingUp, 
  Target, Clock, CheckCircle, Plus, BookOpen, Brain, Play
} from "lucide-react";
import { motion } from "framer-motion";
import StageView from "../setlists/StageView";

const STORAGE_KEY = 'ai_training_preferences';

export default function StudyRecommendations({ onClose, onSelectSong, currentPlanSongs = [] }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recommendations, setRecommendations] = useState(null);
  const [activeTab, setActiveTab] = useState('suggested');
  const [showStageView, setShowStageView] = useState(false);

  const { data: songs } = useQuery({
    queryKey: ['songs'],
    queryFn: () => base44.fetchAllSongs(),
    initialData: []
  });

  const { data: studyPlans } = useQuery({
    queryKey: ['study-plans'],
    queryFn: () => base44.entities.StudyPlan.list('-created_date'),
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

  const getPreferences = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  };

  const analyzeAndRecommend = async () => {
    setIsAnalyzing(true);

    try {
      const preferences = getPreferences();

      // Analisar músicas já estudadas
      const studiedSongIds = new Set();
      studyPlans.forEach(plan => {
        (plan.repertoire_songs || []).forEach(s => {
          if (s.song_id) studiedSongIds.add(s.song_id);
        });
      });

      // Músicas não estudadas
      const unstudiedSongs = songs.filter(s => !studiedSongIds.has(s.id));

      // Análise de padrões no repertório
      const keyDistribution = {};
      const rhythmDistribution = {};
      const progressionDistribution = {};

      songs.forEach(song => {
        if (song.main_key) {
          keyDistribution[song.main_key] = (keyDistribution[song.main_key] || 0) + 1;
        }
        if (song.rhythm_name) {
          rhythmDistribution[song.rhythm_name] = (rhythmDistribution[song.rhythm_name] || 0) + 1;
        }
        if (song.predominant_progression) {
          progressionDistribution[song.predominant_progression] = (progressionDistribution[song.predominant_progression] || 0) + 1;
        }
      });

      // Preparar contexto para IA
      const songsContext = songs.slice(0, 20).map(s => ({
        id: s.id,
        title: s.title,
        artist: s.artist,
        key: s.main_key,
        rhythm: s.rhythm_name,
        progression: s.predominant_progression,
        tempo: s.tempo,
        studied: studiedSongIds.has(s.id)
      }));

      const stylePrefs = Object.entries(preferences.styles || {})
        .filter(([_, w]) => w > 50)
        .map(([s]) => s)
        .join(', ');

      const artistPrefs = Object.keys(preferences.artists || {}).join(', ');

      const prompt = `Você é um consultor musical especialista em planejamento de estudos para músicos sertanejos.

REPERTÓRIO DO ALUNO (${songs.length} músicas):
${JSON.stringify(songsContext, null, 2)}

PREFERÊNCIAS DO ALUNO:
- Estilos favoritos: ${stylePrefs || 'Sertanejo geral'}
- Artistas de referência: ${artistPrefs || 'Diversos'}
- Ritmos preferidos: ${Object.entries(preferences.rhythms || {}).filter(([_, w]) => w > 50).map(([r]) => r).join(', ') || 'Variados'}

DISTRIBUIÇÃO NO REPERTÓRIO:
- Tons mais usados: ${Object.entries(keyDistribution).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `${k}(${v})`).join(', ')}
- Ritmos mais usados: ${Object.entries(rhythmDistribution).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([r, v]) => `${r}(${v})`).join(', ')}
- Progressões predominantes: ${Object.entries(progressionDistribution).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([p, v]) => `${p}(${v})`).join(', ')}

MÚSICAS JÁ ESTUDADAS: ${studiedSongIds.size} de ${songs.length}
IDs estudados: ${Array.from(studiedSongIds).join(', ')}

TAREFA:
Analise o repertório e as preferências para recomendar:

1. MÚSICAS SUGERIDAS PARA ESTUDO (5 músicas):
   - Escolha músicas do repertório que ainda não foram estudadas
   - Priorize diversidade de tons, ritmos e progressões
   - Considere as preferências do aluno
   - Para cada música, explique POR QUE estudá-la agora

2. LACUNAS IDENTIFICADAS (3 pontos):
   - Identifique áreas onde o aluno precisa melhorar
   - Baseie-se na distribuição do repertório
   - Sugira como preencher cada lacuna

3. SEQUÊNCIA DE ESTUDO RECOMENDADA:
   - Ordene as 5 músicas sugeridas em sequência lógica de estudo
   - Considere progressão de dificuldade e conexões harmônicas

Use APENAS músicas que existem no repertório do aluno (IDs fornecidos).`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            suggested_songs: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  song_id: { type: "string" },
                  reason: { type: "string" },
                  focus_areas: { type: "array", items: { type: "string" } },
                  estimated_time: { type: "string" },
                  difficulty: { type: "string" }
                }
              }
            },
            gaps: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  area: { type: "string" },
                  description: { type: "string" },
                  suggestion: { type: "string" }
                }
              }
            },
            study_sequence: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  order: { type: "number" },
                  song_id: { type: "string" },
                  connection: { type: "string" }
                }
              }
            },
            overall_analysis: { type: "string" }
          }
        }
      });

      // Enriquecer recomendações com dados das músicas
      const enrichedRecommendations = {
        ...result,
        suggested_songs: (result.suggested_songs || []).map(rec => ({
          ...rec,
          song: songs.find(s => s.id === rec.song_id)
        })).filter(rec => rec.song),
        study_sequence: (result.study_sequence || []).map(seq => ({
          ...seq,
          song: songs.find(s => s.id === seq.song_id)
        })).filter(seq => seq.song)
      };

      setRecommendations(enrichedRecommendations);

    } catch (error) {
      console.error('Erro ao gerar recomendações:', error);
      alert('Erro ao analisar repertório. Tente novamente.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (songs.length > 0) {
      analyzeAndRecommend();
    }
  }, [songs.length]);

  const getDifficultyColor = (difficulty) => {
    const colors = {
      'fácil': 'bg-green-100 text-green-700',
      'facil': 'bg-green-100 text-green-700',
      'médio': 'bg-yellow-100 text-yellow-700',
      'medio': 'bg-yellow-100 text-yellow-700',
      'intermediário': 'bg-yellow-100 text-yellow-700',
      'intermediario': 'bg-yellow-100 text-yellow-700',
      'difícil': 'bg-orange-100 text-orange-700',
      'dificil': 'bg-orange-100 text-orange-700',
      'avançado': 'bg-red-100 text-red-700',
      'avancado': 'bg-red-100 text-red-700'
    };
    return colors[difficulty?.toLowerCase()] || 'bg-gray-100 text-gray-700';
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
        <div className="sticky top-0 bg-gradient-to-r from-[#9CAF88] via-[#8B6F47] to-[#D4AF37] text-white p-6 rounded-t-2xl z-10">
          <div className="flex items-center gap-3">
            <Lightbulb className="w-8 h-8" />
            <div>
              <h2 className="text-2xl font-bold">Recomendações de Estudo com IA</h2>
              <p className="text-white/90 text-sm">Análise inteligente do seu repertório e sugestões personalizadas</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {isAnalyzing ? (
            <div className="text-center py-16">
              <Loader2 className="w-16 h-16 text-[#8B6F47] mx-auto mb-4 animate-spin" />
              <p className="text-[#8B6F47] font-bold text-lg">Analisando seu repertório...</p>
              <p className="text-[#A68A64] text-sm mt-2">
                Identificando padrões, lacunas e oportunidades de estudo
              </p>
            </div>
          ) : recommendations ? (
            <div className="space-y-6">
              {/* Análise Geral */}
              {recommendations.overall_analysis && (
                <Card className="border-[#9CAF88] bg-[#9CAF88]/10">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Brain className="w-6 h-6 text-[#9CAF88] flex-shrink-0 mt-1" />
                      <div>
                        <p className="font-bold text-[#8B6F47] mb-1">Análise do Repertório</p>
                        <p className="text-sm text-gray-700">{recommendations.overall_analysis}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4 bg-[#E8DCC4]">
                  <TabsTrigger value="suggested" className="data-[state=active]:bg-[#8B6F47] data-[state=active]:text-white">
                    <Star className="w-4 h-4 mr-2" />
                    Sugeridas ({recommendations.suggested_songs?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="sequence" className="data-[state=active]:bg-[#8B6F47] data-[state=active]:text-white">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Sequência
                  </TabsTrigger>
                  <TabsTrigger value="gaps" className="data-[state=active]:bg-[#8B6F47] data-[state=active]:text-white">
                    <Target className="w-4 h-4 mr-2" />
                    Lacunas ({recommendations.gaps?.length || 0})
                  </TabsTrigger>
                </TabsList>

                {/* Músicas Sugeridas */}
                <TabsContent value="suggested">
                  <div className="space-y-3">
                    {recommendations.suggested_songs?.map((rec, index) => (
                      <motion.div
                        key={rec.song?.id || index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <Card className="border-[#D4C5B0] hover:shadow-lg transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-4">
                              <div className="w-12 h-12 bg-gradient-to-br from-[#D4AF37] to-[#9CAF88] rounded-xl flex items-center justify-center flex-shrink-0">
                                <Music className="w-6 h-6 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <h4 className="font-bold text-[#8B6F47]">{rec.song?.title}</h4>
                                    <p className="text-sm text-[#A68A64]">{rec.song?.artist}</p>
                                  </div>
                                  <div className="flex gap-2">
                                    {rec.difficulty && (
                                      <Badge className={getDifficultyColor(rec.difficulty)}>
                                        {rec.difficulty}
                                      </Badge>
                                    )}
                                    {rec.estimated_time && (
                                      <Badge variant="outline" className="border-[#D4C5B0]">
                                        <Clock className="w-3 h-3 mr-1" />
                                        {rec.estimated_time}
                                      </Badge>
                                    )}
                                  </div>
                                </div>

                                <p className="text-sm text-gray-600 mt-2">{rec.reason}</p>

                                {rec.focus_areas?.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {rec.focus_areas.map((area, i) => (
                                      <Badge key={i} className="bg-[#8B6F47]/10 text-[#8B6F47] text-xs">
                                        {area}
                                      </Badge>
                                    ))}
                                  </div>
                                )}

                                <div className="flex gap-2 mt-3">
                                  {onSelectSong && (
                                    <Button
                                      size="sm"
                                      onClick={() => onSelectSong(rec.song)}
                                      className="bg-[#9CAF88] hover:bg-[#8B9F78] text-white"
                                    >
                                      <Plus className="w-4 h-4 mr-1" />
                                      Adicionar ao Plano
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </TabsContent>

                {/* Sequência de Estudo */}
                <TabsContent value="sequence">
                  <Card className="border-[#D4C5B0]">
                    <CardHeader className="py-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg text-[#8B6F47]">
                          Sequência Recomendada de Estudo
                        </CardTitle>
                        {recommendations.study_sequence?.length > 0 && (
                          <Button
                            onClick={() => setShowStageView(true)}
                            className="bg-gradient-to-r from-[#8B6F47] to-[#D4AF37] hover:from-[#A68A64] hover:to-[#9CAF88] text-white"
                          >
                            <Play className="w-4 h-4 mr-2" />
                            Modo Palco
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {recommendations.study_sequence?.map((item, index) => (
                          <div 
                            key={index}
                            className="flex items-center gap-4 p-3 bg-[#F5F1E8] rounded-lg"
                          >
                            <div className="w-10 h-10 bg-gradient-to-br from-[#8B6F47] to-[#D4AF37] rounded-full flex items-center justify-center text-white font-bold">
                              {item.order || index + 1}
                            </div>
                            <div className="flex-1">
                              <p className="font-bold text-[#8B6F47]">{item.song?.title}</p>
                              <p className="text-sm text-[#A68A64]">{item.song?.artist}</p>
                              {item.connection && (
                                <p className="text-xs text-gray-600 mt-1">
                                  🔗 {item.connection}
                                </p>
                              )}
                            </div>
                            {onSelectSong && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onSelectSong(item.song)}
                                className="border-[#D4C5B0] text-[#8B6F47]"
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Lacunas Identificadas */}
                <TabsContent value="gaps">
                  <div className="space-y-3">
                    {recommendations.gaps?.map((gap, index) => (
                      <Card key={index} className="border-[#D4AF37] bg-[#D4AF37]/5">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <Target className="w-6 h-6 text-[#D4AF37] flex-shrink-0 mt-1" />
                            <div>
                              <p className="font-bold text-[#8B6F47]">{gap.area}</p>
                              <p className="text-sm text-gray-700 mt-1">{gap.description}</p>
                              <div className="mt-2 p-2 bg-white rounded border border-[#D4C5B0]">
                                <p className="text-sm text-[#9CAF88]">
                                  <CheckCircle className="w-4 h-4 inline mr-1" />
                                  <strong>Sugestão:</strong> {gap.suggestion}
                                </p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>

              <Button
                onClick={analyzeAndRecommend}
                variant="outline"
                className="w-full border-[#D4C5B0] text-[#8B6F47]"
              >
                <Lightbulb className="w-4 h-4 mr-2" />
                Reanalisar Repertório
              </Button>
            </div>
          ) : (
            <div className="text-center py-16">
              <BookOpen className="w-16 h-16 text-[#A68A64] mx-auto mb-4" />
              <p className="text-[#8B6F47] font-bold">Nenhuma análise disponível</p>
              <Button
                onClick={analyzeAndRecommend}
                className="mt-4 bg-[#8B6F47] hover:bg-[#A68A64] text-white"
              >
                <Lightbulb className="w-4 h-4 mr-2" />
                Analisar Repertório
              </Button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Modo Palco para Sequência de Estudo */}
      {showStageView && recommendations?.study_sequence?.length > 0 && (
        <StageView
          setlist={{
            name: "Sequência de Estudo Recomendada",
            songs: recommendations.study_sequence.map(item => item.song?.id).filter(Boolean)
          }}
          songs={recommendations.study_sequence.map(item => item.song).filter(Boolean)}
          onClose={() => setShowStageView(false)}
        />
      )}
    </motion.div>
  );
}