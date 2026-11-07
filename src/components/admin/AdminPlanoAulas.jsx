import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { GraduationCap, BookOpen, Clock, Target, Trash2, Pencil, Eye, GripVertical, Sparkles } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import AulaForm from "../aulas/AulaForm";
import GerarAulaPorTemaModal from "../aulas/GerarAulaPorTemaModal";
import AulaVisualizacao from "../aulas/AulaVisualizacao";

const nivelColors = {
  iniciante: "bg-green-500",
  basico: "bg-blue-500",
  intermediario: "bg-yellow-500",
  avancado: "bg-red-500",
};

const nivelLabels = {
  iniciante: "Iniciante",
  basico: "Básico",
  intermediario: "Intermediário",
  avancado: "Avançado",
};

export default function AdminPlanoAulas() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingAula, setEditingAula] = useState(null);
  const [showGerarPorTema, setShowGerarPorTema] = useState(false);
  const [viewingAula, setViewingAula] = useState(null);
  const [gerando, setGerando] = useState(false);
  const [aguardandoBackground, setAguardandoBackground] = useState(false);

  const { data: aulas = [], isLoading } = useQuery({
    queryKey: ['aulas'],
    queryFn: () => base44.entities.Aula.filter({}, 'numero', 200),
    refetchInterval: aguardandoBackground ? 8000 : false,
  });

  const deleteAulaMutation = useMutation({
    mutationFn: (id) => base44.entities.Aula.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['aulas']),
  });

  const gerarPlanoIA = async () => {
    if (!confirm('🤖 O plano será gerado em background pela IA.\n\nTempo estimado: 2-4 minutos.\n\nContinuar?')) return;
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

  const onDragEnd = async (result) => {
    if (!result.destination || result.source.index === result.destination.index) return;
    const items = Array.from(aulas);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    queryClient.setQueryData(['aulas'], items);
    for (let i = 0; i < items.length; i++) {
      if (items[i].numero !== i + 1) {
        await base44.entities.Aula.update(items[i].id, { numero: i + 1 });
      }
    }
    queryClient.invalidateQueries(['aulas']);
  };

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

  if (showForm) {
    return (
      <AulaForm
        aula={editingAula}
        onClose={() => { setShowForm(false); setEditingAula(null); }}
        onSave={() => { setShowForm(false); setEditingAula(null); queryClient.invalidateQueries(['aulas']); }}
      />
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-[#8B6F47] flex items-center gap-2">
          <GraduationCap className="w-7 h-7" />
          Plano de Aulas ({aulas.filter(a => a.titulo !== '__GERANDO__').length} aulas)
        </h2>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button onClick={() => setShowGerarPorTema(true)} disabled={gerando} variant="outline" className="border-purple-500 text-purple-700 hover:bg-purple-50">
            <Sparkles className="w-4 h-4 mr-2" /> Aula por Tema
          </Button>
          <Button onClick={gerarPlanoIA} disabled={gerando} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
            {gerando ? <><div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div> Gerando...</> : <><Sparkles className="w-4 h-4 mr-2" /> Gerar com IA</>}
          </Button>
          <Button onClick={() => setShowForm(true)} className="bg-gradient-to-r from-[#8B6F47] to-[#A68A64] text-white">
            <BookOpen className="w-4 h-4 mr-2" /> Nova Aula
          </Button>
        </div>
      </div>

      {aguardandoBackground && (
        <Card className="border-purple-300 bg-purple-50 mb-6">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full flex-shrink-0"></div>
            <div>
              <p className="font-bold text-purple-700">🤖 IA gerando plano de aulas...</p>
              <p className="text-sm text-purple-600">Leva 2-4 minutos. A página atualiza automaticamente.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-12 h-12 border-4 border-[#8B6F47] border-t-transparent rounded-full mx-auto"></div>
          <p className="text-[#A68A64] mt-4">Carregando aulas...</p>
        </div>
      ) : aulas.filter(a => a.titulo !== '__GERANDO__').length === 0 ? (
        <Card className="border-[#D4C5B0] bg-white/80">
          <CardContent className="p-12 text-center">
            <BookOpen className="w-16 h-16 text-[#A68A64] mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-bold text-[#8B6F47] mb-2">Nenhuma aula criada</h3>
            <p className="text-[#A68A64]">Crie a primeira aula ou gere um plano completo com IA</p>
          </CardContent>
        </Card>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="aulas-admin">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                {aulas.filter(a => a.titulo !== '__GERANDO__').map((aula, index) => (
                  <Draggable key={aula.id} draggableId={aula.id} index={index}>
                    {(provided, snapshot) => (
                      <div ref={provided.innerRef} {...provided.draggableProps}>
                        <Card className={`border-[#D4C5B0] bg-white/90 ${snapshot.isDragging ? 'shadow-2xl' : 'hover:shadow-md'} transition-all`}>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                                <GripVertical className="w-5 h-5 text-[#A68A64]" />
                              </div>
                              <div className={`w-12 h-12 rounded-full ${nivelColors[aula.nivel]} flex items-center justify-center text-white font-bold text-lg flex-shrink-0`}>
                                {aula.numero}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="font-bold text-[#8B6F47] truncate">{aula.titulo}</h3>
                                  <Badge className={nivelColors[aula.nivel] + " text-white text-xs"}>
                                    {nivelLabels[aula.nivel]}
                                  </Badge>
                                </div>
                                <p className="text-sm text-[#A68A64] truncate">{aula.descricao}</p>
                                <div className="flex gap-3 text-xs text-[#8B6F47] mt-1">
                                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{aula.duracao_minutos} min</span>
                                  {aula.exercicios && <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{aula.exercicios.length} exercícios</span>}
                                  {aula.objetivos && <span className="flex items-center gap-1"><Target className="w-3 h-3" />{aula.objetivos.length} objetivos</span>}
                                </div>
                              </div>
                              <div className="flex gap-2 flex-shrink-0">
                                <Button variant="outline" size="sm" onClick={() => setViewingAula(aula)} className="border-blue-500 text-blue-600 hover:bg-blue-50" title="Visualizar / Imprimir">
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => { setEditingAula(aula); setShowForm(true); }} className="border-[#8B6F47] text-[#8B6F47]">
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => { if (confirm(`Excluir "${aula.titulo}"?`)) deleteAulaMutation.mutate(aula.id); }} className="border-red-500 text-red-500 hover:bg-red-50">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {viewingAula && (
        <AulaVisualizacao aula={viewingAula} onClose={() => setViewingAula(null)} />
      )}
    </div>
  );
}