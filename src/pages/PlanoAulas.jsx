import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { GraduationCap, BookOpen, Play, CheckCircle2, Clock, Target, Award, Lock, Trash2, Sparkles, GripVertical, Printer } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import AulaDetalhes from "../components/aulas/AulaDetalhes";
import AulaForm from "../components/aulas/AulaForm";
import GerarAulaPorTemaModal from "../components/aulas/GerarAulaPorTemaModal";
import RegenerarPlanoIA from "../components/aulas/RegenerarPlanoIA";

const nivelColors = {
  iniciante: "bg-green-500",
  basico: "bg-blue-500",
  intermediario: "bg-yellow-500",
  avancado: "bg-red-500"
};

const nivelLabels = {
  iniciante: "Iniciante",
  basico: "Básico",
  intermediario: "Intermediário",
  avancado: "Avançado"
};

export default function PlanoAulas() {
  const [selectedAula, setSelectedAula] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingAula, setEditingAula] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [aguardandoBackground, setAguardandoBackground] = useState(false);
  const [showGerarPorTema, setShowGerarPorTema] = useState(false);
  const [showRegenerar, setShowRegenerar] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me()
      .then(setCurrentUser)
      .catch(() => {})
      .finally(() => setLoadingUser(false));
  }, []);

  const { data: aulas = [], isLoading, isFetching } = useQuery({
    queryKey: ['aulas'],
    queryFn: () => base44.entities.Aula.filter({}, 'numero', 200),
    // Faz polling enquanto há marcador de geração em background
    refetchInterval: aguardandoBackground ? 8000 : false,
  });

  // Detecta quando a geração terminou (marcador sumiu e aparecerem aulas reais)
  useEffect(() => {
    if (aguardandoBackground) {
      const temMarcador = aulas.some(a => a.titulo === '__GERANDO__');
      const temAulasReais = aulas.filter(a => a.titulo !== '__GERANDO__').length > 0;
      if (!temMarcador && temAulasReais) {
        setAguardandoBackground(false);
        setGerando(false);
        alert(`✅ Plano gerado! ${aulas.length} aulas criadas com sucesso.`);
      }
    }
  }, [aulas, aguardandoBackground]);

  const { data: progressos = [] } = useQuery({
    queryKey: ['progressos', currentUser?.email],
    queryFn: () => base44.entities.ProgressoAluno.filter({ created_by: currentUser.email }),
    enabled: !!currentUser,
    initialData: []
  });

  const createProgressoMutation = useMutation({
    mutationFn: (data) => base44.entities.ProgressoAluno.create(data),
    onSuccess: () => queryClient.invalidateQueries(['progressos'])
  });

  const updateProgressoMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProgressoAluno.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['progressos'])
  });

  const deleteAulaMutation = useMutation({
    mutationFn: (id) => base44.entities.Aula.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['aulas']);
      alert('✅ Aula excluída com sucesso!');
    }
  });

  const updateAulaMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Aula.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['aulas'])
  });

  const gerarPlanoIA = async () => {
    if (!confirm('🤖 O plano será gerado em background pela IA.\n\nTempo estimado: 2-4 minutos.\n\nA página atualizará automaticamente quando concluído.\n\nContinuar?')) return;
    setGerando(true);
    try {
      await base44.functions.invoke('iniciarGeracaoAulas', {});
      setAguardandoBackground(true);
      queryClient.invalidateQueries(['aulas']);
    } catch (error) {
      alert('❌ Erro ao iniciar geração: ' + (error.message || 'Erro desconhecido'));
      setGerando(false);
    }
  };

  const excluirAula = async (aula, e) => {
    e.stopPropagation();
    if (!confirm(`Tem certeza que deseja excluir a aula "${aula.titulo}"?`)) return;
    try {
      await deleteAulaMutation.mutateAsync(aula.id);
    } catch (error) {
      alert('❌ Erro ao excluir: ' + error.message);
    }
  };

  const getProgressoForAula = (aulaId) => {
    return progressos.find(p => p.aula_id === aulaId);
  };

  const iniciarAula = async (aula) => {
    const progresso = getProgressoForAula(aula.id);
    if (!progresso) {
      await createProgressoMutation.mutateAsync({
        aula_id: aula.id,
        aula_numero: aula.numero,
        status: "em_andamento",
        data_inicio: new Date().toISOString()
      });
    }
    setSelectedAula(aula);
  };

  const calcularProgressoGeral = () => {
    const totalAulas = aulas.length;
    if (totalAulas === 0) return 0;
    const concluidas = progressos.filter(p => p.status === "concluida").length;
    return Math.round((concluidas / totalAulas) * 100);
  };

  // Plano é voltado ao professor - sem bloqueio
  const aulaEstaBloqueada = (aula) => {
    return false;
  };

  const onDragEnd = async (result) => {
    if (!result.destination) return;
    if (result.source.index === result.destination.index) return;
    
    const items = Array.from(aulas);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Atualiza localmente primeiro para UI responsiva
    queryClient.setQueryData(['aulas'], items);

    // Atualiza os números das aulas uma de cada vez para evitar rate limit
    try {
      for (let i = 0; i < items.length; i++) {
        const aula = items[i];
        if (aula.numero !== i + 1) {
          await base44.entities.Aula.update(aula.id, { numero: i + 1 });
        }
      }
      queryClient.invalidateQueries(['aulas']);
    } catch (error) {
      alert('❌ Erro ao reordenar: ' + error.message);
      queryClient.invalidateQueries(['aulas']); // Reverte em caso de erro
    }
  };

  const progressoGeral = calcularProgressoGeral();

  // Aguarda carregamento do usuário antes de qualquer bloqueio
  if (loadingUser) {
    return (
      <div className="bg-amber-50 min-h-screen flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-[#8B6F47] border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (selectedAula) {
    return (
      <AulaDetalhes
        aula={selectedAula}
        progresso={getProgressoForAula(selectedAula.id)}
        onVoltar={() => setSelectedAula(null)}
        onUpdateProgresso={(data) => {
          const progresso = getProgressoForAula(selectedAula.id);
          if (progresso) {
            updateProgressoMutation.mutate({ id: progresso.id, data });
          }
        }}
        isAdmin={currentUser?.role === 'admin'}
      />
    );
  }

  if (showGerarPorTema) {
    return (
      <GerarAulaPorTemaModal
        onClose={() => setShowGerarPorTema(false)}
        onSaved={(aula) => {
          setShowGerarPorTema(false);
          queryClient.invalidateQueries(['aulas']);
          alert(`✅ Aula "${aula.titulo}" criada com sucesso!`);
        }}
      />
    );
  }

  if (showRegenerar) {
    return (
      <RegenerarPlanoIA
        onFechar={() => setShowRegenerar(false)}
        onConcluido={() => {
          setShowRegenerar(false);
          queryClient.invalidateQueries(['aulas']);
        }}
      />
    );
  }

  if (showForm) {
    return (
      <AulaForm
        aula={editingAula}
        onClose={() => {
          setShowForm(false);
          setEditingAula(null);
        }}
        onSave={() => {
          setShowForm(false);
          setEditingAula(null);
          queryClient.invalidateQueries(['aulas']);
        }}
      />
    );
  }

  return (
    <div className="bg-amber-50 p-4 min-h-screen md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-[#8B6F47] mb-2 flex items-center gap-3">
                <GraduationCap className="w-10 h-10" />
                Plano de Aulas
              </h1>
              <p className="text-[#A68A64] text-lg">
                Plano de ensino estruturado para professores
              </p>
            </div>
            {currentUser?.role === 'admin' && (
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowGerarPorTema(true)}
                  disabled={gerando}
                  variant="outline"
                  className="border-purple-500 text-purple-700 hover:bg-purple-50">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Aula por Tema
                </Button>
                <Button
                  onClick={() => setShowRegenerar(true)}
                  disabled={gerando}
                  variant="outline"
                  className="border-blue-500 text-blue-700 hover:bg-blue-50">
                  <GraduationCap className="w-4 h-4 mr-2" />
                  Regenerar Plano (IA)
                </Button>
                <Button
                  onClick={gerarPlanoIA}
                  disabled={gerando}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white">
                  {gerando ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      {aguardandoBackground ? 'Aguardando IA...' : 'Iniciando...'}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      🤖 Gerar Plano com IA
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => setShowForm(true)}
                  className="bg-gradient-to-r from-[#8B6F47] to-[#A68A64] hover:from-[#A68A64] hover:to-[#8B6F47] text-white">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Criar Nova Aula
                </Button>
              </div>
            )}
          </div>

          {/* Progresso Geral */}
          <Card className="border-[#D4C5B0] bg-white/80">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Award className="w-6 h-6 text-[#D4AF37]" />
                  <div>
                    <h3 className="font-bold text-[#8B6F47] text-lg">Seu Progresso</h3>
                    <p className="text-sm text-[#A68A64]">
                      {progressos.filter(p => p.status === "concluida").length} de {aulas.length} aulas concluídas
                    </p>
                  </div>
                </div>
                <div className="text-3xl font-bold text-[#8B6F47]">{progressoGeral}%</div>
              </div>
              <Progress value={progressoGeral} className="h-3" />
            </CardContent>
          </Card>
        </motion.div>

        {/* Lista de Aulas */}
        {aguardandoBackground && (
          <Card className="border-purple-300 bg-purple-50 mb-6">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full flex-shrink-0"></div>
              <div>
                <p className="font-bold text-purple-700">🤖 IA gerando seu plano de aulas...</p>
                <p className="text-sm text-purple-600">Isso leva 2-4 minutos. A página atualiza automaticamente quando pronto.</p>
              </div>
            </CardContent>
          </Card>
        )}
        {(isLoading || isFetching) && aulas.length === 0 ? (
          <div className="text-center py-12">
            <div className="animate-spin w-12 h-12 border-4 border-[#8B6F47] border-t-transparent rounded-full mx-auto"></div>
            <p className="text-[#A68A64] mt-4">Carregando aulas...</p>
          </div>
        ) : aulas.filter(a => a.titulo !== '__GERANDO__').length === 0 && !aguardandoBackground && !isLoading && !isFetching ? (
          <Card className="border-[#D4C5B0] bg-white/80">
            <CardContent className="p-12 text-center">
              <BookOpen className="w-16 h-16 text-[#A68A64] mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-bold text-[#8B6F47] mb-2">Nenhuma aula disponível</h3>
              <p className="text-[#A68A64]">
                {currentUser?.role === 'admin' 
                  ? 'Crie a primeira aula para começar o curso'
                  : 'Aguarde enquanto as aulas são preparadas'}
              </p>
            </CardContent>
          </Card>
        ) : !aguardandoBackground && (
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="aulas">
              {(provided) => (
                <div 
                  {...provided.droppableProps} 
                  ref={provided.innerRef}
                  className="space-y-4"
                >
                  {aulas.filter(a => a.titulo !== '__GERANDO__').map((aula, index) => {
                    const progresso = getProgressoForAula(aula.id);
                    const bloqueada = aulaEstaBloqueada(aula);
                    const concluida = progresso?.status === "concluida";
                    const emAndamento = progresso?.status === "em_andamento";

                    return (
                      <Draggable 
                        key={aula.id} 
                        draggableId={aula.id} 
                        index={index}
                        isDragDisabled={currentUser?.role !== 'admin'}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                          >
                            <Card 
                              className={`border-[#D4C5B0] bg-white/80 hover:shadow-lg transition-all ${
                                bloqueada ? 'opacity-60' : ''
                              } ${snapshot.isDragging ? 'shadow-2xl' : ''}`}
                            >
                              <CardContent className="p-6">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex items-start gap-4 flex-1">
                                    {currentUser?.role === 'admin' && (
                                      <div 
                                        {...provided.dragHandleProps}
                                        className="cursor-grab active:cursor-grabbing pt-4"
                                      >
                                        <GripVertical className="w-5 h-5 text-[#A68A64]" />
                                      </div>
                                    )}
                            {/* Número da Aula */}
                            <div className={`w-16 h-16 rounded-full ${nivelColors[aula.nivel]} flex items-center justify-center text-white font-bold text-xl flex-shrink-0`}>
                              {bloqueada ? <Lock className="w-6 h-6" /> : aula.numero}
                            </div>

                            {/* Conteúdo */}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-xl font-bold text-[#8B6F47]">{aula.titulo}</h3>
                                <Badge className={nivelColors[aula.nivel] + " text-white"}>
                                  {nivelLabels[aula.nivel]}
                                </Badge>
                                {concluida && (
                                  <Badge className="bg-green-500 text-white">
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    Concluída
                                  </Badge>
                                )}
                                {emAndamento && !concluida && (
                                  <Badge className="bg-blue-500 text-white">
                                    <Play className="w-3 h-3 mr-1" />
                                    Em Andamento
                                  </Badge>
                                )}
                              </div>

                              <p className="text-[#A68A64] mb-3">{aula.descricao}</p>

                              <div className="flex flex-wrap gap-4 text-sm text-[#8B6F47]">
                                <div className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  {aula.duracao_minutos} min
                                </div>
                                {aula.objetivos && (
                                  <div className="flex items-center gap-1">
                                    <Target className="w-4 h-4" />
                                    {aula.objetivos.length} objetivos
                                  </div>
                                )}
                                {aula.exercicios && (
                                  <div className="flex items-center gap-1">
                                    <BookOpen className="w-4 h-4" />
                                    {aula.exercicios.length} exercícios
                                  </div>
                                )}
                              </div>

                              {progresso && progresso.exercicios_completados?.length > 0 && (
                                <div className="mt-3">
                                  <Progress 
                                    value={(progresso.exercicios_completados.length / (aula.exercicios?.length || 1)) * 100} 
                                    className="h-2"
                                  />
                                  <p className="text-xs text-[#A68A64] mt-1">
                                    {progresso.exercicios_completados.length} de {aula.exercicios?.length || 0} exercícios completos
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Botões */}
                          <div className="flex flex-col gap-2">
                            <Button
                              onClick={() => iniciarAula(aula)}
                              disabled={bloqueada}
                              className={bloqueada 
                                ? "bg-gray-400 cursor-not-allowed" 
                                : concluida
                                ? "bg-[#9CAF88] hover:bg-[#8B9F78]"
                                : "bg-gradient-to-r from-[#8B6F47] to-[#A68A64] hover:from-[#A68A64] hover:to-[#8B6F47]"
                              }
                            >
                              {bloqueada ? (
                                <>
                                  <Lock className="w-4 h-4 mr-2" />
                                  Bloqueada
                                </>
                              ) : concluida ? (
                                <>
                                  <CheckCircle2 className="w-4 h-4 mr-2" />
                                  Revisar
                                </>
                              ) : emAndamento ? (
                                <>
                                  <Play className="w-4 h-4 mr-2" />
                                  Continuar
                                </>
                              ) : (
                                <>
                                  <Play className="w-4 h-4 mr-2" />
                                  Iniciar
                                </>
                              )}
                            </Button>
                            {currentUser?.role === 'admin' && (
                              <>
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setEditingAula(aula);
                                    setShowForm(true);
                                  }}
                                  className="border-[#8B6F47] text-[#8B6F47]"
                                >
                                  Editar
                                </Button>
                                <div className="grid grid-cols-2 gap-2">
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => {
                                      setSelectedAula(aula);
                                      setTimeout(() => window.print(), 100);
                                    }}
                                    className="border-[#8B6F47] text-[#8B6F47] hover:bg-[#8B6F47] hover:text-white w-full"
                                  >
                                    <Printer className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={(e) => excluirAula(aula, e)}
                                    className="border-red-500 text-red-500 hover:bg-red-50 hover:text-red-600 w-full"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </>
                            )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>
    </div>
  );
}