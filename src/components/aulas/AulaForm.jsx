import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, X, Save, Printer } from "lucide-react";
import { motion } from "framer-motion";

export default function AulaForm({ aula, onClose, onSave }) {
  const queryClient = useQueryClient();
  const { data: materiais = [] } = useQuery({
    queryKey: ['materiais-aula-form'],
    queryFn: () => base44.entities.MaterialDidatico.list("-created_date", 200),
  });

  const [formData, setFormData] = useState(aula || {
    numero: 0,
    titulo: "",
    descricao: "",
    nivel: "iniciante",
    duracao_minutos: 60,
    teoria: {
      topicos: [],
      conceitos_chave: []
    },
    exercicios: [],
    objetivos: [],
    prerequisitos: [],
    material_ids: [],
    status: "rascunho"
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Aula.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['aulas']);
      onSave();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Aula.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['aulas']);
      onSave();
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (aula) {
      updateMutation.mutate({ id: aula.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const addTopico = () => {
    setFormData({
      ...formData,
      teoria: {
        ...formData.teoria,
        topicos: [...(formData.teoria?.topicos || []), { titulo: "", conteudo: "", exemplos: [] }]
      }
    });
  };

  const removeTopico = (index) => {
    const novosTopicos = [...formData.teoria.topicos];
    novosTopicos.splice(index, 1);
    setFormData({
      ...formData,
      teoria: { ...formData.teoria, topicos: novosTopicos }
    });
  };

  const updateTopico = (index, field, value) => {
    const novosTopicos = [...formData.teoria.topicos];
    novosTopicos[index] = { ...novosTopicos[index], [field]: value };
    setFormData({
      ...formData,
      teoria: { ...formData.teoria, topicos: novosTopicos }
    });
  };

  const addExercicio = () => {
    setFormData({
      ...formData,
      exercicios: [...(formData.exercicios || []), {
        titulo: "",
        instrucoes: "",
        dificuldade: "facil",
        tempo_pratica: 15,
        dicas: []
      }]
    });
  };

  const removeExercicio = (index) => {
    const novosExercicios = [...formData.exercicios];
    novosExercicios.splice(index, 1);
    setFormData({ ...formData, exercicios: novosExercicios });
  };

  const updateExercicio = (index, field, value) => {
    const novosExercicios = [...formData.exercicios];
    novosExercicios[index] = { ...novosExercicios[index], [field]: value };
    setFormData({ ...formData, exercicios: novosExercicios });
  };

  return (
    <div className="bg-amber-50 p-4 min-h-screen md:p-8">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}>
          <div className="flex gap-2 mb-4">
            <Button
              onClick={onClose}
              variant="outline"
              className="border-[#8B6F47] text-[#8B6F47]">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <Button
              onClick={() => window.print()}
              variant="outline"
              className="border-[#8B6F47] text-[#8B6F47] hover:bg-[#8B6F47] hover:text-white">
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
          </div>

          <h1 className="text-3xl font-bold text-[#8B6F47] mb-6">
            {aula ? "Editar Aula" : "Nova Aula"}
          </h1>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações Básicas */}
          <Card className="border-[#D4C5B0] bg-white/80">
            <CardHeader>
              <CardTitle className="text-[#8B6F47]">Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-[#8B6F47]">Número da Aula *</Label>
                  <Input
                    type="number"
                    required
                    value={formData.numero}
                    onChange={(e) => setFormData({ ...formData, numero: parseInt(e.target.value) })}
                    className="border-[#D4C5B0]"
                  />
                </div>
                <div>
                  <Label className="text-[#8B6F47]">Nível *</Label>
                  <Select value={formData.nivel} onValueChange={(value) => setFormData({ ...formData, nivel: value })}>
                    <SelectTrigger className="border-[#D4C5B0]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="iniciante">Iniciante</SelectItem>
                      <SelectItem value="basico">Básico</SelectItem>
                      <SelectItem value="intermediario">Intermediário</SelectItem>
                      <SelectItem value="avancado">Avançado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-[#8B6F47]">Título *</Label>
                <Input
                  required
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  className="border-[#D4C5B0]"
                />
              </div>

              <div>
                <Label className="text-[#8B6F47]">Descrição</Label>
                <Textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  className="border-[#D4C5B0]"
                />
              </div>

              <div>
                <Label className="text-[#8B6F47]">Duração (minutos)</Label>
                <Input
                  type="number"
                  value={formData.duracao_minutos}
                  onChange={(e) => setFormData({ ...formData, duracao_minutos: parseInt(e.target.value) })}
                  className="border-[#D4C5B0]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Objetivos */}
          <Card className="border-[#D4C5B0] bg-white/80">
            <CardHeader>
              <CardTitle className="text-[#8B6F47]">Objetivos de Aprendizado</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Digite cada objetivo em uma linha separada"
                value={formData.objetivos?.join('\n') || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  objetivos: e.target.value.split('\n').filter(o => o.trim()) 
                })}
                className="border-[#D4C5B0] min-h-24"
              />
            </CardContent>
          </Card>

          {/* Teoria */}
          <Card className="border-[#D4C5B0] bg-white/80">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-[#8B6F47]">Conteúdo Teórico</CardTitle>
              <Button type="button" onClick={addTopico} size="sm" className="bg-[#8B6F47]">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Tópico
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.teoria?.topicos?.map((topico, index) => (
                <div key={index} className="p-4 border border-[#D4C5B0] rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-[#8B6F47]">Tópico {index + 1}</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTopico(index)}
                      className="text-red-500">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <Input
                    placeholder="Título do tópico"
                    value={topico.titulo}
                    onChange={(e) => updateTopico(index, 'titulo', e.target.value)}
                    className="border-[#D4C5B0]"
                  />
                  <Textarea
                    placeholder="Conteúdo completo do tópico"
                    value={topico.conteudo}
                    onChange={(e) => updateTopico(index, 'conteudo', e.target.value)}
                    className="border-[#D4C5B0] min-h-32"
                  />
                  <Textarea
                    placeholder="Exemplos (um por linha)"
                    value={topico.exemplos?.join('\n') || ''}
                    onChange={(e) => updateTopico(index, 'exemplos', e.target.value.split('\n').filter(ex => ex.trim()))}
                    className="border-[#D4C5B0]"
                  />
                </div>
              ))}

              <div>
                <Label className="text-[#8B6F47]">Conceitos-Chave</Label>
                <Input
                  placeholder="Separe por vírgulas"
                  value={formData.teoria?.conceitos_chave?.join(', ') || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    teoria: {
                      ...formData.teoria,
                      conceitos_chave: e.target.value.split(',').map(c => c.trim()).filter(c => c)
                    }
                  })}
                  className="border-[#D4C5B0]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Exercícios */}
          <Card className="border-[#D4C5B0] bg-white/80">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-[#8B6F47]">Exercícios Práticos</CardTitle>
              <Button type="button" onClick={addExercicio} size="sm" className="bg-[#8B6F47]">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Exercício
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.exercicios?.map((exercicio, index) => (
                <div key={index} className="p-4 border border-[#D4C5B0] rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-[#8B6F47]">Exercício {index + 1}</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeExercicio(index)}
                      className="text-red-500">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <Input
                    placeholder="Título do exercício"
                    value={exercicio.titulo}
                    onChange={(e) => updateExercicio(index, 'titulo', e.target.value)}
                    className="border-[#D4C5B0]"
                  />
                  <Textarea
                    placeholder="Instruções detalhadas"
                    value={exercicio.instrucoes}
                    onChange={(e) => updateExercicio(index, 'instrucoes', e.target.value)}
                    className="border-[#D4C5B0] min-h-24"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-[#8B6F47] text-sm">Dificuldade</Label>
                      <Select 
                        value={exercicio.dificuldade} 
                        onValueChange={(value) => updateExercicio(index, 'dificuldade', value)}>
                        <SelectTrigger className="border-[#D4C5B0]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="facil">Fácil</SelectItem>
                          <SelectItem value="medio">Médio</SelectItem>
                          <SelectItem value="dificil">Difícil</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[#8B6F47] text-sm">Tempo (min)</Label>
                      <Input
                        type="number"
                        value={exercicio.tempo_pratica}
                        onChange={(e) => updateExercicio(index, 'tempo_pratica', parseInt(e.target.value))}
                        className="border-[#D4C5B0]"
                      />
                    </div>
                  </div>
                  <Textarea
                    placeholder="Dicas (uma por linha)"
                    value={exercicio.dicas?.join('\n') || ''}
                    onChange={(e) => updateExercicio(index, 'dicas', e.target.value.split('\n').filter(d => d.trim()))}
                    className="border-[#D4C5B0]"
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Materiais de Apoio */}
          <Card className="border-[#D4C5B0] bg-white/80">
            <CardHeader>
              <CardTitle className="text-[#8B6F47]">Materiais de Apoio</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {materiais.length === 0 ? (
                <p className="text-sm text-[#A68A64]">Nenhum material didático cadastrado na plataforma ainda.</p>
              ) : (
                materiais.map((mat) => {
                  const selecionado = formData.material_ids?.includes(mat.id);
                  return (
                    <label
                      key={mat.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        selecionado
                          ? 'border-[#8B6F47] bg-[#F5F1E8]'
                          : 'border-[#D4C5B0] bg-white hover:border-[#A68A64]'
                      }`}>
                      <input
                        type="checkbox"
                        checked={selecionado}
                        onChange={() => {
                          const ids = selecionado
                            ? formData.material_ids.filter(id => id !== mat.id)
                            : [...(formData.material_ids || []), mat.id];
                          setFormData({ ...formData, material_ids: ids });
                        }}
                        className="rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[#8B6F47] text-sm">{mat.titulo}</p>
                        {mat.descricao && <p className="text-xs text-[#A68A64]">{mat.descricao}</p>}
                      </div>
                      <Badge variant="outline" className="text-xs capitalize flex-shrink-0">{mat.tipo}</Badge>
                    </label>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Botões */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-[#8B6F47] text-[#8B6F47]">
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-[#8B6F47] to-[#A68A64] hover:from-[#A68A64] hover:to-[#8B6F47]">
              <Save className="w-4 h-4 mr-2" />
              {aula ? "Salvar Alterações" : "Criar Aula"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}