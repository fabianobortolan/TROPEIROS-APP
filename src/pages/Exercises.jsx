import React, { useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOfflineSync } from "../components/utils/useOfflineSync";
import { savePendingSync } from "../components/utils/useOfflineDB";
import OfflineBanner from "../components/utils/OfflineBanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Target, Plus, Search, Filter, TrendingUp, Loader2, CheckCircle2, Music2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ExerciseCard from "../components/exercises/ExerciseCard";
import ExerciseDetails from "../components/exercises/ExerciseDetails";
import GenerateExercises from "../components/exercises/GenerateExercises";

const categoryLabels = {
  palhetada: "Palhetada",
  dedilhado: "Dedilhado",
  acordes: "Acordes",
  ritmo: "Ritmo",
  velocidade: "Velocidade",
  transicao: "Transição",
  tecnica_geral: "Técnica Geral"
};

const difficultyLabels = {
  iniciante: "Iniciante",
  intermediario: "Intermediário",
  avancado: "Avançado",
  expert: "Expert"
};

const difficultyColors = {
  iniciante: "bg-green-100 text-green-800",
  intermediario: "bg-blue-100 text-blue-800",
  avancado: "bg-orange-100 text-orange-800",
  expert: "bg-red-100 text-red-800"
};

export default function Exercises() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [showGenerator, setShowGenerator] = useState(false);

  // Sincroniza progresso de exercícios salvos offline
  const handleSyncExerciseProgress = useCallback(async (item) => {
    if (item.type === "exercise_progress") {
      await base44.entities.Exercise.update(item.exerciseId, {
        completed_count: item.completed_count,
        last_practiced: item.last_practiced,
      });
    }
  }, []);

  const fetchExercises = useCallback(() => base44.entities.Exercise.list('-created_date'), []);
  const fetchSongs = useCallback(() => base44.fetchAllSongs(), []);

  const {
    data: exercises,
    isOffline,
    isSyncing,
    pendingCount,
    reload: reloadExercises,
  } = useOfflineSync("exercises", fetchExercises, { onSyncPending: handleSyncExerciseProgress });

  const { data: songs } = useOfflineSync("songs", fetchSongs);

  const isLoading = exercises.length === 0 && !isOffline;

  const deleteExerciseMutation = useMutation({
    mutationFn: (id) => base44.entities.Exercise.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
    }
  });

  const filteredExercises = exercises.filter((exercise) => {
    const matchesSearch = 
      exercise.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exercise.song_title?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || exercise.category === categoryFilter;
    const matchesDifficulty = difficultyFilter === "all" || exercise.difficulty === difficultyFilter;
    
    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  // Estatísticas
  const stats = {
    total: exercises.length,
    completed: exercises.reduce((sum, ex) => sum + (ex.completed_count || 0), 0),
    lastWeek: exercises.filter(ex => {
      if (!ex.last_practiced) return false;
      const lastDate = new Date(ex.last_practiced);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return lastDate >= weekAgo;
    }).length
  };

  return (
    <div className="bg-amber-50 p-4 min-h-screen md:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8">
          <h1 className="text-4xl font-bold text-[#8B6F47] mb-2">
            🎯 Exercícios Práticos
          </h1>
          <p className="text-[#A68A64]">
            Treine técnicas específicas com exercícios personalizados baseados nas músicas
          </p>
        </motion.div>

        <OfflineBanner isOffline={isOffline} isSyncing={isSyncing} pendingCount={pendingCount} />

        {/* Estatísticas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="border-[#8B6F47] bg-gradient-to-br from-[#8B6F47]/10 to-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#A68A64] mb-1">Total de Exercícios</p>
                  <p className="text-3xl font-bold text-[#8B6F47]">{stats.total}</p>
                </div>
                <Target className="w-12 h-12 text-[#8B6F47] opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#9CAF88] bg-gradient-to-br from-[#9CAF88]/10 to-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#A68A64] mb-1">Sessões Completas</p>
                  <p className="text-3xl font-bold text-[#9CAF88]">{stats.completed}</p>
                </div>
                <CheckCircle2 className="w-12 h-12 text-[#9CAF88] opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#D4AF37] bg-gradient-to-br from-[#D4AF37]/10 to-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#A68A64] mb-1">Praticados (7 dias)</p>
                  <p className="text-3xl font-bold text-[#D4AF37]">{stats.lastWeek}</p>
                </div>
                <TrendingUp className="w-12 h-12 text-[#D4AF37] opacity-20" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Filtros e Ações */}
        <Card className="border-[#D4C5B0] bg-white/80 backdrop-blur-sm mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#A68A64]" />
                <Input
                  placeholder="Buscar exercícios..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 border-[#D4C5B0]"
                />
              </div>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full md:w-[180px] border-[#D4C5B0]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Categorias</SelectItem>
                  {Object.entries(categoryLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                <SelectTrigger className="w-full md:w-[180px] border-[#D4C5B0]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Dificuldades</SelectItem>
                  {Object.entries(difficultyLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                onClick={() => setShowGenerator(true)}
                className="bg-gradient-to-r from-[#8B6F47] to-[#A68A64] text-white">
                <Sparkles className="w-4 h-4 mr-2" />
                Gerar com IA
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Exercícios */}
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-12 h-12 animate-spin text-[#8B6F47] mx-auto mb-4" />
            <p className="text-[#A68A64]">Carregando exercícios...</p>
          </div>
        ) : filteredExercises.length === 0 ? (
          <Card className="border-[#D4C5B0] bg-white/80">
            <CardContent className="p-12 text-center">
              <Target className="w-16 h-16 text-[#A68A64] mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-bold text-[#8B6F47] mb-2">
                {searchQuery || categoryFilter !== "all" || difficultyFilter !== "all"
                  ? "Nenhum exercício encontrado"
                  : "Nenhum exercício criado"}
              </h3>
              <p className="text-[#A68A64] mb-6">
                {searchQuery || categoryFilter !== "all" || difficultyFilter !== "all"
                  ? "Tente ajustar os filtros"
                  : "Gere exercícios personalizados com IA baseados nas suas músicas"}
              </p>
              {!searchQuery && categoryFilter === "all" && difficultyFilter === "all" && (
                <Button
                  onClick={() => setShowGenerator(true)}
                  className="bg-gradient-to-r from-[#8B6F47] to-[#A68A64] text-white">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Gerar Primeiro Exercício
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredExercises.map((exercise, index) => (
              <motion.div
                key={exercise.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}>
                <ExerciseCard
                  exercise={exercise}
                  onView={() => setSelectedExercise(exercise)}
                  onDelete={() => {
                    if (confirm(`Tem certeza que deseja excluir "${exercise.title}"?`)) {
                      deleteExerciseMutation.mutate(exercise.id);
                    }
                  }}
                  categoryLabels={categoryLabels}
                  difficultyLabels={difficultyLabels}
                  difficultyColors={difficultyColors}
                />
              </motion.div>
            ))}
          </div>
        )}

        {/* Modal de Detalhes */}
        <AnimatePresence>
          {selectedExercise && (
            <ExerciseDetails
              exercise={selectedExercise}
              onClose={() => setSelectedExercise(null)}
              categoryLabels={categoryLabels}
              difficultyLabels={difficultyLabels}
              difficultyColors={difficultyColors}
            />
          )}
        </AnimatePresence>

        {/* Modal Gerador */}
        <AnimatePresence>
          {showGenerator && (
            <GenerateExercises
              songs={songs}
              onClose={() => setShowGenerator(false)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}