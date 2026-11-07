import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  X, 
  CheckCircle2, 
  Clock, 
  Target, 
  TrendingUp, 
  Star, 
  Music2,
  Lightbulb,
  BookOpen
} from "lucide-react";
import { motion } from "framer-motion";

export default function ExerciseDetails({ 
  exercise, 
  onClose, 
  categoryLabels, 
  difficultyLabels, 
  difficultyColors 
}) {
  const queryClient = useQueryClient();
  const [userNotes, setUserNotes] = useState(exercise.user_notes || "");
  const [rating, setRating] = useState(exercise.rating || 0);
  const [showSuccess, setShowSuccess] = useState(false);

  const updateExerciseMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Exercise.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
    }
  });

  const handleComplete = async () => {
    const newData = {
      completed_count: (exercise.completed_count || 0) + 1,
      last_practiced: new Date().toISOString().split('T')[0],
      user_notes: userNotes,
      rating: rating
    };

    await updateExerciseMutation.mutateAsync({ id: exercise.id, data: newData });
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
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
        className="max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        <Card className="border-[#D4C5B0] bg-white">
          <CardHeader className="border-b border-[#D4C5B0]">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <CardTitle className="text-2xl text-[#8B6F47] mb-3">
                  {exercise.title}
                </CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-[#8B6F47] text-white">
                    {categoryLabels[exercise.category]}
                  </Badge>
                  <Badge className={difficultyColors[exercise.difficulty]}>
                    {difficultyLabels[exercise.difficulty]}
                  </Badge>
                  {exercise.duration_minutes && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {exercise.duration_minutes} minutos
                    </Badge>
                  )}
                  {exercise.completed_count > 0 && (
                    <Badge className="bg-[#9CAF88] text-white flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {exercise.completed_count}x praticado
                    </Badge>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-[#A68A64] hover:bg-[#F5F1E8]">
                <X className="w-5 h-5" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Música Relacionada */}
            {exercise.song_title && (
              <div className="bg-[#F5F1E8] rounded-lg p-4 border-l-4 border-[#8B6F47]">
                <div className="flex items-center gap-2 text-[#8B6F47] font-semibold mb-1">
                  <Music2 className="w-4 h-4" />
                  Baseado na música
                </div>
                <p className="text-gray-700">{exercise.song_title}</p>
              </div>
            )}

            {/* Descrição */}
            <div>
              <h3 className="text-lg font-bold text-[#8B6F47] mb-2 flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Descrição
              </h3>
              <p className="text-gray-700 leading-relaxed">{exercise.description}</p>
            </div>

            {/* Objetivos */}
            {exercise.goals && exercise.goals.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-[#8B6F47] mb-3 flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Objetivos
                </h3>
                <ul className="space-y-2">
                  {exercise.goals.map((goal, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#9CAF88] mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{goal}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Instruções */}
            {exercise.instructions && (
              <div>
                <h3 className="text-lg font-bold text-[#8B6F47] mb-3 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Como Executar
                </h3>
                <div className="bg-[#F5F1E8] rounded-lg p-4">
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {exercise.instructions}
                  </p>
                </div>
              </div>
            )}

            {/* Dicas */}
            {exercise.tips && exercise.tips.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-[#8B6F47] mb-3 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5" />
                  Dicas Importantes
                </h3>
                <div className="space-y-2">
                  {exercise.tips.map((tip, index) => (
                    <div key={index} className="bg-[#D4AF37]/10 rounded-lg p-3 border-l-4 border-[#D4AF37]">
                      <p className="text-sm text-gray-700">{tip}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Progressão */}
            {exercise.progression && exercise.progression.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-[#8B6F47] mb-3">
                  Níveis de Progressão
                </h3>
                <div className="space-y-3">
                  {exercise.progression.map((level, index) => (
                    <div key={index} className="bg-white border border-[#D4C5B0] rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-[#8B6F47] text-white">
                          Nível {index + 1}
                        </Badge>
                        <span className="font-semibold text-[#8B6F47]">{level.level}</span>
                      </div>
                      <p className="text-sm text-gray-700">{level.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notas do Usuário */}
            <div>
              <h3 className="text-lg font-bold text-[#8B6F47] mb-3">
                Minhas Notas
              </h3>
              <Textarea
                value={userNotes}
                onChange={(e) => setUserNotes(e.target.value)}
                placeholder="Adicione suas observações, dificuldades, progressos..."
                className="border-[#D4C5B0] min-h-[100px]"
              />
            </div>

            {/* Avaliação */}
            <div>
              <h3 className="text-lg font-bold text-[#8B6F47] mb-3">
                Avaliação
              </h3>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="transition-transform hover:scale-110">
                    <Star
                      className={`w-8 h-8 ${
                        star <= rating
                          ? 'fill-[#D4AF37] text-[#D4AF37]'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Sucesso */}
            {showSuccess && (
              <Alert className="bg-[#9CAF88]/10 border-[#9CAF88]">
                <CheckCircle2 className="w-4 h-4 text-[#9CAF88]" />
                <AlertDescription className="text-[#9CAF88] font-semibold">
                  ✓ Exercício marcado como praticado!
                </AlertDescription>
              </Alert>
            )}

            {/* Ações */}
            <div className="flex gap-3 pt-4 border-t border-[#D4C5B0]">
              <Button
                onClick={handleComplete}
                className="flex-1 bg-gradient-to-r from-[#9CAF88] to-[#8B6F47] text-white">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Marcar como Praticado
              </Button>
              <Button
                variant="outline"
                onClick={onClose}
                className="border-[#D4C5B0]">
                Fechar
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}