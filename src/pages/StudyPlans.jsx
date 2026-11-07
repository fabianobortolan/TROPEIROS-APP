import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BookOpen, Plus, Calendar, Music, Guitar, Brain, 
  Share2, Copy, Trash2, Edit, Eye, Search, Sparkles, Lightbulb, Dumbbell
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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

export default function StudyPlans() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showExerciseGenerator, setShowExerciseGenerator] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);

  const { data: plans, isLoading } = useQuery({
    queryKey: ['study-plans'],
    queryFn: () => base44.entities.StudyPlan.list('-created_date'),
    initialData: []
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.StudyPlan.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['study-plans'] })
  });

  const filteredPlans = plans.filter(plan => 
    plan.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEdit = (plan) => {
    setEditingPlan(plan);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingPlan(null);
  };

  return (
    <div className="bg-amber-50 p-4 min-h-screen md:p-8">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-4xl font-bold text-[#8B6F47] mb-2">
                Planos de Estudo
              </h1>
              <p className="text-[#A68A64]">
                Organize e compartilhe planos semanais com teoria, técnica e repertório
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => setShowExerciseGenerator(true)}
                variant="outline"
                className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-white"
              >
                <Dumbbell className="w-4 h-4 mr-2" />
                Gerar Exercícios
              </Button>
              <Button
                onClick={() => setShowRecommendations(true)}
                variant="outline"
                className="border-[#9CAF88] text-[#9CAF88] hover:bg-[#9CAF88] hover:text-white"
              >
                <Lightbulb className="w-4 h-4 mr-2" />
                Recomendações
              </Button>
              <Button
                onClick={() => setShowForm(true)}
                className="bg-gradient-to-r from-[#8B6F47] to-[#A68A64] hover:from-[#A68A64] hover:to-[#8B6F47] text-white shadow-lg"
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Plano
              </Button>
            </div>
          </div>

          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#A68A64]" />
            <Input
              placeholder="Buscar planos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white border-[#D4C5B0]"
            />
          </div>
        </motion.div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array(6).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : filteredPlans.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16"
          >
            <div className="w-24 h-24 bg-[#9CAF88]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-12 h-12 text-[#9CAF88]" />
            </div>
            <h3 className="text-xl font-bold text-[#8B6F47] mb-2">
              Nenhum plano encontrado
            </h3>
            <p className="text-[#A68A64] mb-6">
              Crie seu primeiro plano de estudos semanal
            </p>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-[#8B6F47] to-[#A68A64] text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar Plano
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPlans.map((plan, index) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="border-[#D4C5B0] bg-white/80 hover:shadow-lg transition-all cursor-pointer group">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg text-[#8B6F47] group-hover:text-[#D4AF37] transition-colors">
                        {plan.name}
                      </CardTitle>
                      <Badge className={statusColors[plan.status || 'rascunho']}>
                        {statusLabels[plan.status || 'rascunho']}
                      </Badge>
                    </div>
                    {plan.week_start && (
                      <p className="text-sm text-[#A68A64] flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(plan.week_start), "dd/MM/yyyy", { locale: ptBR })}
                        {plan.week_end && ` - ${format(new Date(plan.week_end), "dd/MM/yyyy", { locale: ptBR })}`}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="text-center p-2 bg-[#8B6F47]/10 rounded-lg">
                        <Brain className="w-4 h-4 mx-auto text-[#8B6F47] mb-1" />
                        <p className="text-xs text-[#A68A64]">Teoria</p>
                        <p className="font-bold text-[#8B6F47]">
                          {plan.theory_topics?.length || 0}
                        </p>
                      </div>
                      <div className="text-center p-2 bg-[#D4AF37]/10 rounded-lg">
                        <Guitar className="w-4 h-4 mx-auto text-[#D4AF37] mb-1" />
                        <p className="text-xs text-[#A68A64]">Técnica</p>
                        <p className="font-bold text-[#8B6F47]">
                          {plan.technique_exercises?.length || 0}
                        </p>
                      </div>
                      <div className="text-center p-2 bg-[#9CAF88]/10 rounded-lg">
                        <Music className="w-4 h-4 mx-auto text-[#9CAF88] mb-1" />
                        <p className="text-xs text-[#A68A64]">Repertório</p>
                        <p className="font-bold text-[#8B6F47]">
                          {plan.repertoire_songs?.length || 0}
                        </p>
                      </div>
                    </div>

                    {plan.total_hours && (
                      <p className="text-sm text-[#A68A64] mb-3">
                        ⏱️ {plan.total_hours}h de estudo
                      </p>
                    )}

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-[#D4C5B0] text-[#8B6F47]"
                        onClick={() => setSelectedPlan(plan)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Ver
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-[#D4C5B0] text-[#8B6F47]"
                        onClick={() => handleEdit(plan)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-200 text-red-600 hover:bg-red-50"
                        onClick={() => {
                          if (confirm("Excluir este plano?")) {
                            deleteMutation.mutate(plan.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

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
    </div>
  );
}