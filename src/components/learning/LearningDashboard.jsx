import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Brain, TrendingUp, Award, Target, AlertCircle, 
  CheckCircle, BookOpen, Lightbulb, BarChart3, 
  RefreshCw, Sparkles, MessageSquare
} from "lucide-react";
import { motion } from "framer-motion";

export default function LearningDashboard() {
  const queryClient = useQueryClient();
  const [generatingFeedback, setGeneratingFeedback] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState(null);

  const { data: songs } = useQuery({
    queryKey: ['songs'],
    queryFn: () => base44.fetchAllSongs(),
    initialData: []
  });

  const { data: learningPatterns } = useQuery({
    queryKey: ['learningPatterns'],
    queryFn: () => base44.entities.LearningPattern.list(),
    initialData: []
  });

  const { data: progressions } = useQuery({
    queryKey: ['progressions'],
    queryFn: () => base44.entities.Progression.list(),
    initialData: []
  });

  // Análise de métricas de aprendizado
  const learningMetrics = useMemo(() => {
    const totalPatterns = learningPatterns.length;
    const highConfidence = learningPatterns.filter(p => p.confidence >= 90).length;
    const needsReview = learningPatterns.filter(p => p.confidence < 70).length;
    const recentlyLearned = learningPatterns.filter(p => {
      const lastUsed = new Date(p.last_used || p.created_date);
      const daysDiff = (Date.now() - lastUsed) / (1000 * 60 * 60 * 24);
      return daysDiff <= 30;
    }).length;

    // Análise por estilo
    const styleAccuracy = {};
    songs.forEach(song => {
      const style = song.genre_style || 'outro';
      if (!styleAccuracy[style]) {
        styleAccuracy[style] = { total: 0, withProgressions: 0 };
      }
      styleAccuracy[style].total++;
      if (song.progressions && song.progressions.length > 0) {
        styleAccuracy[style].withProgressions++;
      }
    });

    // Top progressões aprendidas
    const progressionFrequency = {};
    learningPatterns.forEach(lp => {
      const key = lp.progression_name || 'Desconhecida';
      progressionFrequency[key] = (progressionFrequency[key] || 0) + (lp.times_seen || 1);
    });
    const topProgressions = Object.entries(progressionFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      totalPatterns,
      highConfidence,
      needsReview,
      recentlyLearned,
      confidenceRate: totalPatterns > 0 ? Math.round((highConfidence / totalPatterns) * 100) : 0,
      styleAccuracy,
      topProgressions
    };
  }, [learningPatterns, songs]);

  // Gera sugestões e validações da IA
  const generateAIFeedback = async () => {
    setGeneratingFeedback(true);
    try {
      const prompt = `
Você é um especialista em análise harmônica de música sertaneja.

Analise os seguintes dados de aprendizado do sistema:

MÉTRICAS GERAIS:
- Total de padrões aprendidos: ${learningMetrics.totalPatterns}
- Taxa de confiança alta (>=90%): ${learningMetrics.confidenceRate}%
- Padrões que precisam revisão (<70%): ${learningMetrics.needsReview}

PROGRESSÕES MAIS IDENTIFICADAS:
${learningMetrics.topProgressions.map(([name, count]) => `- ${name}: ${count} vezes`).join('\n')}

ANÁLISE POR ESTILO:
${Object.entries(learningMetrics.styleAccuracy).map(([style, data]) => 
  `- ${style}: ${data.withProgressions}/${data.total} músicas com progressões identificadas (${Math.round(data.withProgressions/data.total*100)}%)`
).join('\n')}

PADRÕES COM BAIXA CONFIANÇA:
${learningPatterns
  .filter(lp => lp.confidence < 70)
  .slice(0, 10)
  .map(lp => `- ${lp.progression_name || 'Sem nome'} (${lp.pattern}) em ${lp.key}: ${lp.confidence}% confiança`)
  .join('\n')}

Com base nesses dados, forneça:
1. SUGESTÕES DE MELHORIA: 3-5 recomendações específicas para melhorar a precisão do sistema
2. VALIDAÇÕES: Identifique possíveis erros ou inconsistências nos padrões aprendidos
3. INSIGHTS: Padrões interessantes que você observa nos dados
4. PRÓXIMOS PASSOS: O que o sistema deve focar em aprender a seguir

Retorne em formato JSON estruturado.
      `.trim();

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  priority: { type: "string", enum: ["alta", "média", "baixa"] }
                }
              }
            },
            validations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  issue: { type: "string" },
                  recommendation: { type: "string" }
                }
              }
            },
            insights: {
              type: "array",
              items: { type: "string" }
            },
            nextSteps: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      setAiSuggestions(result);
    } catch (err) {
      console.error("Erro ao gerar feedback da IA:", err);
      alert("❌ Erro ao gerar sugestões da IA");
    } finally {
      setGeneratingFeedback(false);
    }
  };

  const styleLabels = {
    sertanejo_raiz: "🌾 Raiz",
    sertanejo_universitario: "🎓 Universitário",
    sertanejo_romantico: "💕 Romântico",
    sertanejo_moderno: "🎸 Moderno",
    sertanejo_modao: "🪗 Modão",
    outro: "🎵 Outro"
  };

  const priorityColors = {
    alta: "bg-red-100 text-red-800 border-red-200",
    média: "bg-yellow-100 text-yellow-800 border-yellow-200",
    baixa: "bg-blue-100 text-blue-800 border-blue-200"
  };

  return (
    <div className="space-y-6">
      {/* Header com métricas principais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <Card className="border-[#8B6F47]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#A68A64]">Padrões Aprendidos</p>
                  <p className="text-2xl font-bold text-[#8B6F47]">{learningMetrics.totalPatterns}</p>
                </div>
                <BookOpen className="w-8 h-8 text-[#D4AF37]" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-[#9CAF88]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#A68A64]">Alta Confiança</p>
                  <p className="text-2xl font-bold text-[#9CAF88]">{learningMetrics.confidenceRate}%</p>
                </div>
                <CheckCircle className="w-8 h-8 text-[#9CAF88]" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-orange-400">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#A68A64]">Precisam Revisão</p>
                  <p className="text-2xl font-bold text-orange-600">{learningMetrics.needsReview}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border-[#D4AF37]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#A68A64]">Aprendidos (30d)</p>
                  <p className="text-2xl font-bold text-[#D4AF37]">{learningMetrics.recentlyLearned}</p>
                </div>
                <Sparkles className="w-8 h-8 text-[#D4AF37]" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-[#E8DCC4]">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="styles">Por Estilo</TabsTrigger>
          <TabsTrigger value="ai-feedback">Feedback da IA</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Top Progressões */}
          <Card className="border-[#D4C5B0]">
            <CardHeader>
              <CardTitle className="text-[#8B6F47] flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Top 5 Progressões Aprendidas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {learningMetrics.topProgressions.map(([name, count], idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <Badge className="bg-gradient-to-r from-[#D4AF37] to-[#9CAF88] text-white">
                    #{idx + 1}
                  </Badge>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-[#8B6F47]">{name}</span>
                      <span className="text-sm text-[#A68A64]">{count} vezes</span>
                    </div>
                    <Progress 
                      value={(count / learningMetrics.topProgressions[0][1]) * 100} 
                      className="h-2"
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Padrões com baixa confiança */}
          {learningMetrics.needsReview > 0 && (
            <Card className="border-orange-400">
              <CardHeader>
                <CardTitle className="text-orange-600 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Padrões que Precisam Revisão ({learningMetrics.needsReview})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {learningPatterns
                  .filter(lp => lp.confidence < 70)
                  .slice(0, 5)
                  .map((lp, idx) => (
                    <div key={idx} className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-[#8B6F47]">
                            {lp.progression_name || 'Sem nome'}
                          </p>
                          <p className="text-sm text-[#A68A64]">
                            {lp.pattern} em {lp.key} • {lp.times_seen || 1} vezes visto
                          </p>
                        </div>
                        <Badge variant="outline" className="border-orange-400 text-orange-600">
                          {lp.confidence}% confiança
                        </Badge>
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="styles" className="space-y-4">
          <Card className="border-[#D4C5B0]">
            <CardHeader>
              <CardTitle className="text-[#8B6F47] flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Precisão por Estilo Musical
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(learningMetrics.styleAccuracy).map(([style, data]) => {
                const accuracy = data.total > 0 ? Math.round((data.withProgressions / data.total) * 100) : 0;
                return (
                  <div key={style} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-[#8B6F47]">
                        {styleLabels[style] || style}
                      </span>
                      <span className="text-sm text-[#A68A64]">
                        {data.withProgressions}/{data.total} músicas • {accuracy}%
                      </span>
                    </div>
                    <Progress value={accuracy} className="h-2" />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai-feedback" className="space-y-4">
          <Card className="border-[#D4C5B0]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-[#8B6F47] flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  Análise e Sugestões da IA
                </CardTitle>
                <Button
                  onClick={generateAIFeedback}
                  disabled={generatingFeedback}
                  className="bg-gradient-to-r from-[#8B6F47] to-[#A68A64] text-white"
                >
                  {generatingFeedback ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Analisando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Gerar Análise
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!aiSuggestions ? (
                <div className="text-center py-8">
                  <Brain className="w-12 h-12 text-[#A68A64] mx-auto mb-4" />
                  <p className="text-[#A68A64]">
                    Clique em "Gerar Análise" para receber sugestões e validações da IA sobre o aprendizado do sistema
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Sugestões */}
                  {aiSuggestions.suggestions && aiSuggestions.suggestions.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-bold text-[#8B6F47] flex items-center gap-2">
                        <Lightbulb className="w-5 h-5" />
                        Sugestões de Melhoria
                      </h3>
                      {aiSuggestions.suggestions.map((sug, idx) => (
                        <div key={idx} className="p-4 bg-[#F5F1E8] rounded-lg border border-[#D4C5B0]">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium text-[#8B6F47]">{sug.title}</h4>
                            <Badge className={priorityColors[sug.priority]}>
                              {sug.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-[#8B6F47]">{sug.description}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Validações */}
                  {aiSuggestions.validations && aiSuggestions.validations.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-bold text-[#8B6F47] flex items-center gap-2">
                        <CheckCircle className="w-5 h-5" />
                        Validações e Correções
                      </h3>
                      {aiSuggestions.validations.map((val, idx) => (
                        <div key={idx} className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                          <p className="font-medium text-orange-800 mb-1">⚠️ {val.issue}</p>
                          <p className="text-sm text-orange-700">💡 {val.recommendation}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Insights */}
                  {aiSuggestions.insights && aiSuggestions.insights.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-bold text-[#8B6F47] flex items-center gap-2">
                        <MessageSquare className="w-5 h-5" />
                        Insights
                      </h3>
                      <ul className="space-y-1">
                        {aiSuggestions.insights.map((insight, idx) => (
                          <li key={idx} className="text-sm text-[#8B6F47] flex items-start gap-2">
                            <span className="text-[#D4AF37] mt-1">✦</span>
                            <span>{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Próximos Passos */}
                  {aiSuggestions.nextSteps && aiSuggestions.nextSteps.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-bold text-[#8B6F47] flex items-center gap-2">
                        <Target className="w-5 h-5" />
                        Próximos Passos
                      </h3>
                      <ul className="space-y-1">
                        {aiSuggestions.nextSteps.map((step, idx) => (
                          <li key={idx} className="text-sm text-[#8B6F47] flex items-start gap-2">
                            <span className="text-[#9CAF88] font-bold mt-1">{idx + 1}.</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}