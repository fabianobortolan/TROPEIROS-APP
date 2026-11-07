import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Sparkles, AlertCircle } from "lucide-react";
import ExerciseForm from "../components/exercises/ExerciseForm";
import GeneratedExerciseDisplay from "../components/exercises/GeneratedExerciseDisplay";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ExerciseGenerator() {
  const [exercises, setExercises] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerate = async (config) => {
    setIsLoading(true);
    setError(null);
    setExercises([]);

    try {
      const response = await base44.functions.invoke('generateExercises', config);

      if (response.data.success) {
        setExercises(response.data.generated || []);
      } else {
        setError(response.data.error || 'Erro ao gerar exercícios');
      }
    } catch (err) {
      setError(err.message || 'Erro ao gerar exercícios');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-amber-50 p-4 min-h-screen md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8">
          <h1 className="text-4xl font-bold text-[#8B6F47] mb-2 flex items-center gap-2" style={{ letterSpacing: '0.5px' }}>
            <Sparkles className="w-8 h-8 text-[#D4AF37]" />
            Gerador de Exercícios
          </h1>
          <p className="text-[#A68A64]">Crie exercícios de música personalizados com IA</p>
        </motion.div>

        {/* Error Alert */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800">Erro ao gerar exercícios</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </motion.div>
        )}

        {/* Form */}
        <ExerciseForm onGenerate={handleGenerate} isLoading={isLoading} />

        {/* Results */}
        {exercises.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-[#8B6F47]">
                ✨ {exercises.length} Exercício{exercises.length > 1 ? 's' : ''} Gerado{exercises.length > 1 ? 's' : ''}
              </h2>
              <p className="text-[#A68A64] text-sm">Clique em um exercício para ver detalhes completos</p>
            </div>
            <GeneratedExerciseDisplay exercises={exercises} />
          </motion.div>
        )}

        {/* Empty State */}
        {!isLoading && exercises.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-12 text-center py-12">
            <div className="text-5xl mb-4">📝</div>
            <p className="text-[#A68A64] text-lg">Configure os exercícios e clique em Gerar para começar</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}