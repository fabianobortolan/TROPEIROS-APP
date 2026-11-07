import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { X, Sparkles, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function GenerateExercises({ songs, onClose }) {
  const queryClient = useQueryClient();
  const [selectedSong, setSelectedSong] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const createExercisesMutation = useMutation({
    mutationFn: (exercises) => 
      Promise.all(exercises.map(ex => base44.entities.Exercise.create(ex))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      setSuccess(true);
      setTimeout(() => onClose(), 2000);
    }
  });

  const generateExercises = async () => {
    if (!selectedSong) {
      setError("Selecione uma música primeiro");
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const song = songs.find(s => s.id === selectedSong);
      
      const prompt = `Baseado na música "${song.title}" de ${song.artist}, crie um plano de 5 exercícios práticos para músicos.

Música: ${song.title}
Tom: ${song.main_key || 'Não especificado'}
BPM: ${song.tempo || 'Não especificado'}
Ritmo: ${song.rhythm_name || 'Não especificado'}
${song.progressions ? `Progressões: ${JSON.stringify(song.progressions)}` : ''}

IMPORTANTE: Responda APENAS com um JSON válido no seguinte formato:

{
  "exercises": [
    {
      "title": "Nome do Exercício",
      "description": "Descrição breve",
      "category": "palhetada" ou "dedilhado" ou "acordes" ou "ritmo" ou "velocidade" ou "transicao" ou "tecnica_geral",
      "difficulty": "iniciante" ou "intermediario" ou "avancado" ou "expert",
      "duration_minutes": número,
      "instructions": "Instruções detalhadas passo a passo",
      "tips": ["dica 1", "dica 2", "dica 3"],
      "goals": ["objetivo 1", "objetivo 2"],
      "progression": [
        {"level": "Nome do Nível", "description": "Como progredir"}
      ]
    }
  ]
}

Crie exercícios focados em:
1. Palhetada/Dedilhado específico da música
2. Acordes difíceis da música
3. Transições entre acordes
4. Ritmo característico
5. Velocidade e precisão

Seja específico e prático. Cada exercício deve realmente ajudar a tocar ESTA música.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
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
                  category: { type: "string" },
                  difficulty: { type: "string" },
                  duration_minutes: { type: "number" },
                  instructions: { type: "string" },
                  tips: { type: "array", items: { type: "string" } },
                  goals: { type: "array", items: { type: "string" } },
                  progression: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        level: { type: "string" },
                        description: { type: "string" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });

      const exercisesData = response.exercises.map(ex => ({
        ...ex,
        song_id: song.id,
        song_title: song.title,
        completed_count: 0
      }));

      await createExercisesMutation.mutateAsync(exercisesData);
    } catch (err) {
      console.error("Erro ao gerar exercícios:", err);
      setError("Erro ao gerar exercícios. Tente novamente.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}>
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="max-w-2xl w-full"
        onClick={(e) => e.stopPropagation()}>
        <Card className="border-[#D4C5B0] bg-white">
          <CardHeader className="border-b border-[#D4C5B0]">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[#8B6F47] flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Gerar Exercícios com IA
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                disabled={generating}
                className="text-[#A68A64]">
                <X className="w-5 h-5" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-[#8B6F47] mb-2">
                Selecione uma Música
              </label>
              <Select value={selectedSong} onValueChange={setSelectedSong} disabled={generating}>
                <SelectTrigger className="border-[#D4C5B0]">
                  <SelectValue placeholder="Escolha uma música da biblioteca..." />
                </SelectTrigger>
                <SelectContent>
                  {songs.map((song) => (
                    <SelectItem key={song.id} value={song.id}>
                      {song.title} - {song.artist}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Alert className="bg-[#D4AF37]/10 border-[#D4AF37]">
              <Sparkles className="w-4 h-4 text-[#D4AF37]" />
              <AlertDescription className="text-sm text-gray-700">
                A IA analisará a música e criará 5 exercícios personalizados focados em:
                palhetada/dedilhado, acordes, transições, ritmo e velocidade.
              </AlertDescription>
            </Alert>

            {error && (
              <Alert className="bg-red-50 border-red-200">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <AlertDescription className="text-red-600 text-sm">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="bg-[#9CAF88]/10 border-[#9CAF88]">
                <CheckCircle2 className="w-4 h-4 text-[#9CAF88]" />
                <AlertDescription className="text-[#9CAF88] font-semibold">
                  ✓ 5 exercícios criados com sucesso!
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3">
              <Button
                onClick={generateExercises}
                disabled={!selectedSong || generating}
                className="flex-1 bg-gradient-to-r from-[#8B6F47] to-[#A68A64] text-white">
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Gerando Exercícios...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Gerar 5 Exercícios
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={onClose}
                disabled={generating}
                className="border-[#D4C5B0]">
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}