import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  X, Sparkles, Loader2, Dumbbell, Clock, Target, 
  Copy, CheckCircle, Music, Guitar, RefreshCw
} from "lucide-react";
import { motion } from "framer-motion";

const STORAGE_KEY = 'ai_training_preferences';

const CATEGORIES = [
  { id: 'palhetada', name: 'Palhetada', icon: '🎸' },
  { id: 'dedilhado', name: 'Dedilhado', icon: '👆' },
  { id: 'acordes', name: 'Acordes', icon: '🎹' },
  { id: 'ritmo', name: 'Ritmo', icon: '🥁' },
  { id: 'velocidade', name: 'Velocidade', icon: '⚡' },
  { id: 'transicao', name: 'Transição', icon: '🔄' }
];

const DIFFICULTIES = [
  { id: 'iniciante', name: 'Iniciante', color: 'bg-green-100 text-green-700' },
  { id: 'intermediario', name: 'Intermediário', color: 'bg-yellow-100 text-yellow-700' },
  { id: 'avancado', name: 'Avançado', color: 'bg-orange-100 text-orange-700' },
  { id: 'expert', name: 'Expert', color: 'bg-red-100 text-red-700' }
];

export default function ExerciseGenerator({ onClose, onAddToStudyPlan }) {
  const [category, setCategory] = useState('acordes');
  const [difficulty, setDifficulty] = useState('intermediario');
  const [focusArea, setFocusArea] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedExercises, setGeneratedExercises] = useState([]);
  const [copiedIndex, setCopiedIndex] = useState(null);

  const { data: songs } = useQuery({
    queryKey: ['songs'],
    queryFn: () => base44.fetchAllSongs(),
    initialData: []
  });

  const { data: rhythms } = useQuery({
    queryKey: ['rhythms'],
    queryFn: () => base44.entities.Rhythm.list(),
    initialData: []
  });

  const { data: progressions } = useQuery({
    queryKey: ['progressions'],
    queryFn: () => base44.entities.Progression.list(),
    initialData: []
  });

  // Carregar preferências do treinamento da IA
  const getPreferences = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  };

  const generateExercises = async () => {
    setIsGenerating(true);
    setGeneratedExercises([]);

    try {
      const preferences = getPreferences();
      
      // Construir contexto baseado nas preferências
      const styleContext = Object.entries(preferences.styles || {})
        .filter(([_, weight]) => weight > 60)
        .map(([style]) => style)
        .join(', ');

      const artistContext = Object.entries(preferences.artists || {})
        .map(([name, data]) => `${name} (${data.characteristics})`)
        .join('; ');

      const rhythmContext = Object.entries(preferences.rhythms || {})
        .filter(([_, weight]) => weight > 60)
        .map(([rhythm]) => rhythm)
        .join(', ');

      const patternContext = Object.entries(preferences.patterns || {})
        .sort((a, b) => b[1].weight - a[1].weight)
        .slice(0, 5)
        .map(([name, data]) => `${name}: ${data.pattern}`)
        .join('; ');

      // Músicas do repertório para contexto
      const repertoireContext = songs.slice(0, 10)
        .map(s => `${s.title} (${s.artist}) - Tom: ${s.main_key}, Ritmo: ${s.rhythm_name || 'N/A'}`)
        .join('\n');

      const prompt = `Você é um professor de violão/viola especialista em música sertaneja.

CONTEXTO DO ALUNO:
- Estilos preferidos: ${styleContext || 'Sertanejo em geral'}
- Artistas de referência: ${artistContext || 'Vários artistas sertanejos'}
- Ritmos favoritos: ${rhythmContext || 'Guarânia, Vanera, Rancheira'}
- Progressões preferidas: ${patternContext || 'I-IV-V-I, I-V-vi-IV'}

REPERTÓRIO DO ALUNO (últimas músicas):
${repertoireContext || 'Repertório variado de sertanejo'}

Ritmos disponíveis no sistema: ${rhythms.map(r => r.name).join(', ') || 'Guarânia, Vanera, Rancheira, Toada'}

TAREFA:
Gere 3 exercícios técnicos PERSONALIZADOS para a categoria "${CATEGORIES.find(c => c.id === category)?.name}" 
no nível "${DIFFICULTIES.find(d => d.id === difficulty)?.name}".
${focusArea ? `Foco específico: ${focusArea}` : ''}

Cada exercício deve ser PRÁTICO, ESPECÍFICO e relacionado ao estilo musical do aluno.

Para cada exercício, forneça:
1. Título criativo
2. Descrição clara do exercício
3. BPM inicial recomendado
4. BPM meta (para evoluir)
5. Duração sugerida em minutos
6. Instruções passo a passo (4-6 passos)
7. Dicas importantes (2-3 dicas)
8. Objetivos claros (2-3 objetivos)

IMPORTANTE: Os exercícios devem usar acordes, ritmos e progressões do contexto sertanejo do aluno.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            exercises: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  bpm_start: { type: "number" },
                  bpm_goal: { type: "number" },
                  duration_minutes: { type: "number" },
                  instructions: { type: "array", items: { type: "string" } },
                  tips: { type: "array", items: { type: "string" } },
                  goals: { type: "array", items: { type: "string" } }
                }
              }
            }
          }
        }
      });

      setGeneratedExercises(result.exercises || []);

    } catch (error) {
      console.error('Erro ao gerar exercícios:', error);
      alert('Erro ao gerar exercícios. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyExercise = (exercise, index) => {
    const text = `
📝 ${exercise.title}

${exercise.description}

⏱️ BPM: ${exercise.bpm_start} → ${exercise.bpm_goal}
⏰ Duração: ${exercise.duration_minutes} minutos

📋 INSTRUÇÕES:
${exercise.instructions.map((inst, i) => `${i + 1}. ${inst}`).join('\n')}

💡 DICAS:
${exercise.tips.map(tip => `• ${tip}`).join('\n')}

🎯 OBJETIVOS:
${exercise.goals.map(goal => `• ${goal}`).join('\n')}
    `.trim();

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
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-[#D4AF37] via-[#9CAF88] to-[#8B6F47] text-white p-6 rounded-t-2xl z-10">
          <div className="flex items-center gap-3">
            <Dumbbell className="w-8 h-8" />
            <div>
              <h2 className="text-2xl font-bold">Gerador de Exercícios com IA</h2>
              <p className="text-white/90 text-sm">Exercícios personalizados baseados nas suas preferências</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Configurações */}
          <Card className="border-[#D4C5B0]">
            <CardHeader className="py-3">
              <CardTitle className="text-lg text-[#8B6F47]">Configurar Exercício</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-[#8B6F47] mb-2 block">Categoria</label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="border-[#D4C5B0]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.icon} {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-[#8B6F47] mb-2 block">Dificuldade</label>
                  <Select value={difficulty} onValueChange={setDifficulty}>
                    <SelectTrigger className="border-[#D4C5B0]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DIFFICULTIES.map(diff => (
                        <SelectItem key={diff.id} value={diff.id}>
                          {diff.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-4">
                <label className="text-sm font-medium text-[#8B6F47] mb-2 block">
                  Foco Específico (opcional)
                </label>
                <Textarea
                  placeholder="Ex: Transição entre C e G, Batida de guarânia, Pestana no Fá..."
                  value={focusArea}
                  onChange={(e) => setFocusArea(e.target.value)}
                  className="border-[#D4C5B0]"
                />
              </div>

              <Button
                onClick={generateExercises}
                disabled={isGenerating}
                className="w-full mt-4 bg-gradient-to-r from-[#8B6F47] to-[#D4AF37] hover:from-[#A68A64] hover:to-[#9CAF88] text-white"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Gerando exercícios personalizados...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Gerar Exercícios com IA
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Exercícios Gerados */}
          {generatedExercises.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-[#8B6F47]">
                  Exercícios Gerados ({generatedExercises.length})
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateExercises}
                  disabled={isGenerating}
                  className="border-[#D4C5B0] text-[#8B6F47]"
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Regenerar
                </Button>
              </div>

              {generatedExercises.map((exercise, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="border-[#D4C5B0] hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg text-[#8B6F47] flex items-center gap-2">
                            <Guitar className="w-5 h-5" />
                            {exercise.title}
                          </CardTitle>
                          <p className="text-sm text-[#A68A64] mt-1">{exercise.description}</p>
                        </div>
                        <div className="flex gap-2">
                          <Badge className={DIFFICULTIES.find(d => d.id === difficulty)?.color}>
                            {DIFFICULTIES.find(d => d.id === difficulty)?.name}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        <div className="text-center p-2 bg-[#8B6F47]/10 rounded">
                          <Clock className="w-4 h-4 mx-auto text-[#8B6F47] mb-1" />
                          <p className="text-xs text-[#A68A64]">Duração</p>
                          <p className="font-bold text-[#8B6F47]">{exercise.duration_minutes} min</p>
                        </div>
                        <div className="text-center p-2 bg-[#D4AF37]/10 rounded">
                          <Target className="w-4 h-4 mx-auto text-[#D4AF37] mb-1" />
                          <p className="text-xs text-[#A68A64]">BPM Inicial</p>
                          <p className="font-bold text-[#8B6F47]">{exercise.bpm_start}</p>
                        </div>
                        <div className="text-center p-2 bg-[#9CAF88]/10 rounded">
                          <Target className="w-4 h-4 mx-auto text-[#9CAF88] mb-1" />
                          <p className="text-xs text-[#A68A64]">BPM Meta</p>
                          <p className="font-bold text-[#8B6F47]">{exercise.bpm_goal}</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-bold text-[#8B6F47] mb-1">📋 Instruções:</p>
                          <ol className="text-sm text-gray-700 space-y-1 ml-4">
                            {exercise.instructions.map((inst, i) => (
                              <li key={i}>{i + 1}. {inst}</li>
                            ))}
                          </ol>
                        </div>

                        <div>
                          <p className="text-sm font-bold text-[#8B6F47] mb-1">💡 Dicas:</p>
                          <ul className="text-sm text-gray-700 space-y-1 ml-4">
                            {exercise.tips.map((tip, i) => (
                              <li key={i}>• {tip}</li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <p className="text-sm font-bold text-[#8B6F47] mb-1">🎯 Objetivos:</p>
                          <ul className="text-sm text-gray-700 space-y-1 ml-4">
                            {exercise.goals.map((goal, i) => (
                              <li key={i}>• {goal}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-4 pt-4 border-t border-[#D4C5B0]">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyExercise(exercise, index)}
                          className="flex-1 border-[#D4C5B0] text-[#8B6F47]"
                        >
                          {copiedIndex === index ? (
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
                        {onAddToStudyPlan && (
                          <Button
                            size="sm"
                            onClick={() => onAddToStudyPlan({
                              exercise: exercise.title,
                              category,
                              bpm_start: exercise.bpm_start,
                              bpm_goal: exercise.bpm_goal,
                              duration_minutes: exercise.duration_minutes,
                              notes: exercise.description
                            })}
                            className="flex-1 bg-[#9CAF88] hover:bg-[#8B9F78] text-white"
                          >
                            <Music className="w-4 h-4 mr-1" />
                            Adicionar ao Plano
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}