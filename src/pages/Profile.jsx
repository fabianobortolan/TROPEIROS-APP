import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { User, Award, Music2, Star, Target, Calendar, TrendingUp, Trash2, Plus, Clock, BookOpen, Eye, Edit, Brain, Guitar, Dumbbell, Lightbulb } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import StudyPlanForm from "../components/studyplan/StudyPlanForm";
import StudyPlanDetails from "../components/studyplan/StudyPlanDetails";
import ExerciseGenerator from "../components/ai/ExerciseGenerator";
import StudyRecommendations from "../components/ai/StudyRecommendations";

const statusColors = {
  rascunho: "bg-gray-100 text-gray-700",
  ativo: "bg-green-100 text-green-700",
  concluido: "bg-blue-100 text-blue-700"
};

const statusLabels = {
  rascunho: "Rascunho",
  ativo: "Ativo",
  concluido: "Concluído"
};

export default function Profile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newGoal, setNewGoal] = useState({ goal: "", target: "", type: "songs" });
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showExerciseGenerator, setShowExerciseGenerator] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);

  const { data: currentUser, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    initialData: null
  });

  const { data: allSongs } = useQuery({
    queryKey: ['songs'],
    queryFn: () => base44.fetchAllSongs(),
    initialData: []
  });

  const { data: chords } = useQuery({
    queryKey: ['chords'],
    queryFn: () => base44.entities.Chord.list(),
    initialData: []
  });

  const { data: studyPlans } = useQuery({
    queryKey: ['study-plans'],
    queryFn: () => base44.entities.StudyPlan.list('-created_date'),
    initialData: []
  });

  const deletePlanMutation = useMutation({
    mutationFn: (id) => base44.entities.StudyPlan.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['study-plans'] })
  });

  const updateUserMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    }
  });

  const completedGuides = JSON.parse(localStorage.getItem('completed_study_guides') || '[]');
  const exercisesCompleted = JSON.parse(localStorage.getItem('exercises_completed') || '{}');
  const totalExercises = Object.keys(exercisesCompleted).length;

  const favoriteChords = currentUser?.favorite_chords || [];
  const studyGoals = currentUser?.study_goals || [];
  const songHistory = currentUser?.song_history || [];

  // Calcula estatísticas
  const totalSongs = allSongs.length;
  const recentSongs = songHistory.slice(-5).reverse();

  const removeFavoriteChord = async (chordId, instrument) => {
    const newFavorites = favoriteChords.filter(
      fav => !(fav.chord_id === chordId && fav.instrument === instrument)
    );
    await updateUserMutation.mutateAsync({ favorite_chords: newFavorites });
  };

  const addGoal = async () => {
    if (!newGoal.goal || !newGoal.target) return;
    
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    
    const goals = [
      ...(studyGoals || []),
      {
        goal: newGoal.goal,
        target: parseInt(newGoal.target),
        current: 0,
        type: newGoal.type,
        week_start: weekStart.toISOString().split('T')[0]
      }
    ];
    
    await updateUserMutation.mutateAsync({ study_goals: goals });
    setNewGoal({ goal: "", target: "", type: "songs" });
    setShowAddGoal(false);
  };

  const removeGoal = async (index) => {
    const goals = studyGoals.filter((_, i) => i !== index);
    await updateUserMutation.mutateAsync({ study_goals: goals });
  };

  const updateGoalProgress = async (index, increment) => {
    const goals = [...studyGoals];
    goals[index].current = Math.max(0, Math.min(goals[index].target, goals[index].current + increment));
    await updateUserMutation.mutateAsync({ study_goals: goals });
  };

  const handleEdit = (plan) => {
    setEditingPlan(plan);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingPlan(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <p className="text-[#8B6F47]">Carregando perfil...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header do Perfil */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-[#8B6F47] to-[#A68A64] rounded-full flex items-center justify-center shadow-lg">
            <User className="w-10 h-10 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-[#8B6F47]">Meu Perfil</h1>
            <p className="text-[#A68A64]">{currentUser?.email || "Usuário"}</p>
          </div>
        </motion.div>

        {/* Estatísticas Gerais */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-[#D4C5B0] bg-white/80">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#A68A64]">Músicas</p>
                  <p className="text-2xl font-bold text-[#8B6F47]">{totalSongs}</p>
                </div>
                <Music2 className="w-8 h-8 text-[#8B6F47] opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#D4C5B0] bg-white/80">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#A68A64]">Guias Completos</p>
                  <p className="text-2xl font-bold text-[#8B6F47]">{completedGuides.length}</p>
                </div>
                <Award className="w-8 h-8 text-[#D4AF37] opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#D4C5B0] bg-white/80">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#A68A64]">Exercícios Feitos</p>
                  <p className="text-2xl font-bold text-[#8B6F47]">{totalExercises}</p>
                </div>
                <Target className="w-8 h-8 text-[#9CAF88] opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#D4C5B0] bg-white/80">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#A68A64]">Acordes Favoritos</p>
                  <p className="text-2xl font-bold text-[#8B6F47]">{favoriteChords.length}</p>
                </div>
                <Star className="w-8 h-8 text-[#D4AF37] opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Metas de Estudo */}
          <Card className="border-[#D4C5B0] bg-white/80">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-[#8B6F47] flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Metas da Semana
                </CardTitle>
                <Button
                  size="sm"
                  onClick={() => setShowAddGoal(!showAddGoal)}
                  className="bg-[#8B6F47] text-white"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {showAddGoal && (
                <div className="p-3 bg-[#F5F1E8] rounded-lg space-y-2">
                  <Input
                    placeholder="Descrição da meta"
                    value={newGoal.goal}
                    onChange={(e) => setNewGoal({ ...newGoal, goal: e.target.value })}
                    className="border-[#D4C5B0]"
                  />
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Alvo"
                      value={newGoal.target}
                      onChange={(e) => setNewGoal({ ...newGoal, target: e.target.value })}
                      className="border-[#D4C5B0]"
                    />
                    <select
                      value={newGoal.type}
                      onChange={(e) => setNewGoal({ ...newGoal, type: e.target.value })}
                      className="flex-1 h-10 px-3 rounded-md border border-[#D4C5B0] bg-white text-sm"
                    >
                      <option value="songs">Músicas</option>
                      <option value="guides">Guias</option>
                      <option value="exercises">Exercícios</option>
                      <option value="practice_hours">Horas de Prática</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={addGoal}
                      className="flex-1 bg-[#9CAF88] text-white"
                    >
                      Adicionar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowAddGoal(false)}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}

              {studyGoals.length === 0 ? (
                <div className="text-center py-8 text-[#A68A64]">
                  <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Nenhuma meta definida ainda.</p>
                  <p className="text-sm">Clique em + para adicionar.</p>
                </div>
              ) : (
                studyGoals.map((goal, idx) => {
                  const percentage = (goal.current / goal.target) * 100;
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-[#F5F1E8] rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-[#8B6F47]">{goal.goal}</p>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeGoal(idx)}
                          className="text-red-600 hover:bg-red-50 h-7 w-7 p-0"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <Progress value={percentage} className="flex-1 h-2" />
                        <span className="text-sm text-[#8B6F47] font-medium">
                          {goal.current}/{goal.target}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateGoalProgress(idx, -1)}
                          disabled={goal.current === 0}
                          className="flex-1 h-7 text-xs"
                        >
                          -1
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => updateGoalProgress(idx, 1)}
                          disabled={goal.current >= goal.target}
                          className="flex-1 h-7 text-xs bg-[#9CAF88] text-white"
                        >
                          +1
                        </Button>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Histórico Recente */}
          <Card className="border-[#D4C5B0] bg-white/80">
            <CardHeader>
              <CardTitle className="text-[#8B6F47] flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Músicas Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentSongs.length === 0 ? (
                <div className="text-center py-8 text-[#A68A64]">
                  <Music2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Nenhuma música visualizada ainda.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentSongs.map((item, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="p-3 bg-[#F5F1E8] rounded-lg hover:bg-[#E8DCC4] transition-colors cursor-pointer"
                      onClick={() => navigate(createPageUrl("Library"))}
                    >
                      <div className="flex items-center gap-3">
                        <Music2 className="w-4 h-4 text-[#8B6F47]" />
                        <div className="flex-1">
                          <p className="font-medium text-[#8B6F47] text-sm">{item.song_title}</p>
                          <p className="text-xs text-[#A68A64]">
                            {new Date(item.viewed_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Acordes Favoritos */}
        <Card className="border-[#D4C5B0] bg-white/80">
          <CardHeader>
            <CardTitle className="text-[#8B6F47] flex items-center gap-2">
              <Star className="w-5 h-5 text-[#D4AF37]" />
              Meus Acordes Favoritos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {favoriteChords.length === 0 ? (
              <div className="text-center py-8 text-[#A68A64]">
                <Star className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Nenhum acorde favorito marcado.</p>
                <p className="text-sm">Marque acordes favoritos ao visualizar cifras das músicas.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {favoriteChords.map((fav, idx) => {
                  const chord = chords.find(c => c.id === fav.chord_id);
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      className="relative p-4 bg-gradient-to-br from-[#F5F1E8] to-[#E8DCC4] rounded-lg border border-[#D4C5B0] text-center"
                    >
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeFavoriteChord(fav.chord_id, fav.instrument)}
                        className="absolute top-1 right-1 h-6 w-6 p-0 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                      <Star className="w-4 h-4 text-[#D4AF37] fill-[#D4AF37] mx-auto mb-2" />
                      <p className="font-bold text-[#8B6F47] text-lg">{fav.chord_name}</p>
                      <Badge variant="outline" className="text-[10px] mt-1">
                        {fav.instrument === 'violao' ? '🎸 Violão' : '🎻 Viola'}
                      </Badge>
                      {chord && chord.fret && (
                        <p className="text-xs text-[#A68A64] mt-1">Casa {chord.fret}</p>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Conquistas */}
        <Card className="border-[#D4AF37] bg-gradient-to-r from-[#D4AF37]/10 to-white">
          <CardHeader>
            <CardTitle className="text-[#8B6F47] flex items-center gap-2">
              <Award className="w-5 h-5 text-[#D4AF37]" />
              Conquistas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className={`p-4 rounded-lg text-center ${totalSongs >= 10 ? 'bg-[#D4AF37]/20' : 'bg-gray-100 opacity-50'}`}>
                <Music2 className={`w-8 h-8 mx-auto mb-2 ${totalSongs >= 10 ? 'text-[#D4AF37]' : 'text-gray-400'}`} />
                <p className="text-sm font-medium text-[#8B6F47]">Colecionador</p>
                <p className="text-xs text-[#A68A64]">10+ músicas</p>
              </div>

              <div className={`p-4 rounded-lg text-center ${completedGuides.length >= 2 ? 'bg-[#D4AF37]/20' : 'bg-gray-100 opacity-50'}`}>
                <Award className={`w-8 h-8 mx-auto mb-2 ${completedGuides.length >= 2 ? 'text-[#D4AF37]' : 'text-gray-400'}`} />
                <p className="text-sm font-medium text-[#8B6F47]">Estudioso</p>
                <p className="text-xs text-[#A68A64]">2+ guias completos</p>
              </div>

              <div className={`p-4 rounded-lg text-center ${totalExercises >= 5 ? 'bg-[#D4AF37]/20' : 'bg-gray-100 opacity-50'}`}>
                <Target className={`w-8 h-8 mx-auto mb-2 ${totalExercises >= 5 ? 'text-[#D4AF37]' : 'text-gray-400'}`} />
                <p className="text-sm font-medium text-[#8B6F47]">Praticante</p>
                <p className="text-xs text-[#A68A64]">5+ exercícios</p>
              </div>

              <div className={`p-4 rounded-lg text-center ${favoriteChords.length >= 5 ? 'bg-[#D4AF37]/20' : 'bg-gray-100 opacity-50'}`}>
                <Star className={`w-8 h-8 mx-auto mb-2 ${favoriteChords.length >= 5 ? 'text-[#D4AF37]' : 'text-gray-400'}`} />
                <p className="text-sm font-medium text-[#8B6F47]">Especialista</p>
                <p className="text-xs text-[#A68A64]">5+ favoritos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Planos de Estudo */}
        <Card className="border-[#D4C5B0] bg-white/80">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-[#8B6F47] flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Meus Planos de Estudo
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowExerciseGenerator(true)}
                  className="border-[#D4AF37] text-[#D4AF37]"
                >
                  <Dumbbell className="w-4 h-4 mr-1" />
                  Exercícios
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowRecommendations(true)}
                  className="border-[#9CAF88] text-[#9CAF88]"
                >
                  <Lightbulb className="w-4 h-4 mr-1" />
                  Dicas
                </Button>
                <Button
                  size="sm"
                  onClick={() => setShowForm(true)}
                  className="bg-[#8B6F47] text-white"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {studyPlans.length === 0 ? (
              <div className="text-center py-8 text-[#A68A64]">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Nenhum plano de estudo criado.</p>
                <Button
                  size="sm"
                  onClick={() => setShowForm(true)}
                  className="mt-3 bg-[#8B6F47] text-white"
                >
                  Criar Primeiro Plano
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {studyPlans.slice(0, 4).map((plan, idx) => (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="p-4 bg-[#F5F1E8] rounded-lg border border-[#D4C5B0]"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-[#8B6F47]">{plan.name}</p>
                        {plan.week_start && (
                          <p className="text-xs text-[#A68A64] flex items-center gap-1 mt-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(plan.week_start), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        )}
                      </div>
                      <Badge className={statusColors[plan.status || 'rascunho']}>
                        {statusLabels[plan.status || 'rascunho']}
                      </Badge>
                    </div>
                    <div className="flex gap-2 text-xs text-[#A68A64] mb-3">
                      <span>📚 {plan.theory_topics?.length || 0}</span>
                      <span>🎸 {plan.technique_exercises?.length || 0}</span>
                      <span>🎵 {plan.repertoire_songs?.length || 0}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-[#D4C5B0] text-[#8B6F47] h-8 text-xs"
                        onClick={() => setSelectedPlan(plan)}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Ver
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-[#D4C5B0] text-[#8B6F47] h-8 w-8 p-0"
                        onClick={() => handleEdit(plan)}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-200 text-red-600 h-8 w-8 p-0"
                        onClick={() => {
                          if (confirm("Excluir este plano?")) {
                            deletePlanMutation.mutate(plan.id);
                          }
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AnimatePresence>
        {showForm && (
          <StudyPlanForm
            plan={editingPlan}
            onClose={handleCloseForm}
          />
        )}
        {selectedPlan && (
          <StudyPlanDetails
            plan={selectedPlan}
            onClose={() => setSelectedPlan(null)}
            onEdit={() => {
              setEditingPlan(selectedPlan);
              setSelectedPlan(null);
              setShowForm(true);
            }}
          />
        )}
        {showExerciseGenerator && (
          <ExerciseGenerator
            onClose={() => setShowExerciseGenerator(false)}
          />
        )}
        {showRecommendations && (
          <StudyRecommendations
            onClose={() => setShowRecommendations(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}