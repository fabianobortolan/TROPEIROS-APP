import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Save, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

const CATEGORY_EMOJIS = {
  palhetada: '🎸',
  dedilhado: '👆',
  acordes: '🎵',
  ritmo: '🥁',
  velocidade: '⚡',
  transicao: '↔️',
  tecnica_geral: '✨'
};

const DIFFICULTY_COLORS = {
  iniciante: 'bg-green-100 text-green-800',
  intermediario: 'bg-yellow-100 text-yellow-800',
  avancado: 'bg-red-100 text-red-800',
  expert: 'bg-blue-100 text-blue-800'
};

export default function GeneratedExerciseDisplay({ exercises, onSave, isSaving }) {
  const [expandedId, setExpandedId] = useState(null);

  const handleSaveExercise = async (exercise) => {
    const exerciseData = {
      title: exercise.title,
      description: exercise.description,
      instructions: exercise.instructions,
      tips: exercise.tips || [],
      goals: exercise.goals || [],
      duration_minutes: exercise.duration_minutes || 15,
      category: exercise.category,
      difficulty: exercise.difficulty || 'intermediario',
      completed_count: 0,
      last_practiced: null
    };

    try {
      const saved = await base44.entities.Exercise.create(exerciseData);
      alert(`✅ "${exercise.title}" salvo com sucesso!`);
    } catch (err) {
      alert(`❌ Erro ao salvar: ${err.message}`);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4">

      <div className="grid gap-4">
        {exercises.map((exercise, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}>

            <Card className="border-[#D4C5B0] bg-white/80 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setExpandedId(expandedId === idx ? null : idx)}>

              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{CATEGORY_EMOJIS[exercise.category] || '📝'}</span>
                      <CardTitle className="text-[#8B6F47] text-lg">
                        {exercise.title}
                      </CardTitle>
                    </div>
                    <p className="text-sm text-[#A68A64]">{exercise.description}</p>
                  </div>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSaveExercise(exercise);
                    }}
                    size="sm"
                    className="bg-[#9CAF88] hover:bg-[#8B9B7B] text-white">
                    <Save className="w-4 h-4 mr-1" />
                    Salvar
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge variant="outline" className="text-[#8B6F47]">
                    ⏱️ {exercise.duration_minutes} min
                  </Badge>
                </div>
              </CardHeader>

              {expandedId === idx && (
                <CardContent className="space-y-4 border-t border-[#D4C5B0] pt-4">
                  {/* Instructions */}
                  <div>
                    <h4 className="font-semibold text-[#8B6F47] mb-2">📋 Instruções</h4>
                    <p className="text-sm text-[#A68A64] whitespace-pre-wrap">{exercise.instructions}</p>
                  </div>

                  {/* Goals */}
                  {exercise.goals && exercise.goals.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-[#8B6F47] mb-2">🎯 Objetivos</h4>
                      <ul className="space-y-1">
                        {exercise.goals.map((goal, gidx) => (
                          <li key={gidx} className="text-sm text-[#A68A64] flex gap-2">
                            <span>•</span> {goal}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Tips */}
                  {exercise.tips && exercise.tips.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-[#8B6F47] mb-2">💡 Dicas</h4>
                      <ul className="space-y-1">
                        {exercise.tips.map((tip, tidx) => (
                          <li key={tidx} className="text-sm text-[#A68A64] flex gap-2">
                            <span>✓</span> {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}