import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Calendar, CheckCircle2, XCircle, Save, Trash2, ChevronDown, ChevronUp, Pencil } from "lucide-react";

export default function AdminFrequencia() {
  const queryClient = useQueryClient();
  const [showNovaAula, setShowNovaAula] = useState(false);
  const [novaData, setNovaData] = useState(new Date().toISOString().split('T')[0]);
  const [novaDescricao, setNovaDescricao] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [observacoesGerais, setObservacoesGerais] = useState('');

  const { data: usuarios = [] } = useQuery({
    queryKey: ['usuarios'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: registros = [], isLoading } = useQuery({
    queryKey: ['frequencias'],
    queryFn: () => base44.entities.Frequencia.filter({}),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Frequencia.create(data),
    onSuccess: () => { queryClient.invalidateQueries(['frequencias']); setShowNovaAula(false); setNovaDescricao(''); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Frequencia.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['frequencias']),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Frequencia.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['frequencias']),
  });

  const criarNovaAula = () => {
    if (!novaData) return;
    const alunosList = usuarios.filter(u => u.role !== 'admin');
    const presencas = alunosList.map(u => ({
      aluno_email: u.email,
      aluno_nome: u.full_name || u.email,
      presente: false,
      observacao: '',
    }));
    createMutation.mutate({
      data_aula: novaData,
      descricao_aula: novaDescricao,
      presencas,
      observacoes_gerais: '',
    });
  };

  const togglePresenca = (registro, alunoEmail) => {
    const presencas = (registro.presencas || []).map(p =>
      p.aluno_email === alunoEmail ? { ...p, presente: !p.presente } : p
    );
    updateMutation.mutate({ id: registro.id, data: { presencas } });
  };

  const salvarObservacoes = (registro) => {
    updateMutation.mutate({ id: registro.id, data: { observacoes_gerais: observacoesGerais } });
  };

  const registrosOrdenados = [...registros].sort((a, b) => new Date(b.data_aula) - new Date(a.data_aula));

  // Estatísticas de frequência por aluno
  const statsAlunos = usuarios.filter(u => u.role !== 'admin').map(u => {
    const totalAulas = registros.length;
    const presencas = registros.filter(r =>
      r.presencas?.some(p => p.aluno_email === u.email && p.presente)
    ).length;
    return {
      nome: u.full_name || u.email,
      email: u.email,
      presencas,
      faltas: totalAulas - presencas,
      percentual: totalAulas > 0 ? Math.round((presencas / totalAulas) * 100) : 0,
    };
  }).sort((a, b) => b.percentual - a.percentual);

  return (
    <div className="space-y-6">
      {/* Header + botão */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#8B6F47] flex items-center gap-2">
          <Users className="w-7 h-7" /> Frequência de Alunos
        </h2>
        <Button onClick={() => setShowNovaAula(!showNovaAula)} className="bg-gradient-to-r from-[#8B6F47] to-[#A68A64] text-white">
          <Plus className="w-4 h-4 mr-2" /> Nova Chamada
        </Button>
      </div>

      {/* Formulário nova chamada */}
      {showNovaAula && (
        <Card className="border-[#D4C5B0] bg-white/90">
          <CardContent className="p-4 space-y-3">
            <h3 className="font-bold text-[#8B6F47]">Nova Chamada</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-[#8B6F47] font-medium block mb-1">Data da Aula *</label>
                <Input type="date" value={novaData} onChange={e => setNovaData(e.target.value)} className="border-[#D4C5B0]" />
              </div>
              <div>
                <label className="text-sm text-[#8B6F47] font-medium block mb-1">Descrição / Tema da Aula</label>
                <Input value={novaDescricao} onChange={e => setNovaDescricao(e.target.value)} placeholder="Ex: Introdução ao violão, acordes básicos..." className="border-[#D4C5B0]" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowNovaAula(false)}>Cancelar</Button>
              <Button onClick={criarNovaAula} disabled={!novaData || createMutation.isPending} className="bg-[#8B6F47] text-white">
                {createMutation.isPending ? 'Criando...' : 'Criar Chamada'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resumo de frequência por aluno */}
      {statsAlunos.length > 0 && (
        <Card className="border-[#D4C5B0] bg-white/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-[#8B6F47] text-lg flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" /> Resumo de Frequência
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#F5F1E8]">
                    <th className="text-left p-3 text-[#8B6F47] font-semibold">Aluno</th>
                    <th className="text-center p-3 text-[#8B6F47] font-semibold">Presenças</th>
                    <th className="text-center p-3 text-[#8B6F47] font-semibold">Faltas</th>
                    <th className="text-center p-3 text-[#8B6F47] font-semibold">Frequência</th>
                  </tr>
                </thead>
                <tbody>
                  {statsAlunos.map((aluno, i) => (
                    <tr key={i} className="border-b border-[#E8DCC4] hover:bg-[#F5F1E8]/50">
                      <td className="p-3 font-medium text-[#8B6F47]">{aluno.nome}</td>
                      <td className="p-3 text-center text-green-600 font-bold">{aluno.presencas}</td>
                      <td className="p-3 text-center text-red-500 font-bold">{aluno.faltas}</td>
                      <td className="p-3 text-center">
                        <Badge className={aluno.percentual >= 75 ? "bg-green-500 text-white" : aluno.percentual >= 50 ? "bg-yellow-500 text-white" : "bg-red-400 text-white"}>
                          {aluno.percentual}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de chamadas */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin w-10 h-10 border-4 border-[#8B6F47] border-t-transparent rounded-full mx-auto"></div>
        </div>
      ) : registrosOrdenados.length === 0 ? (
        <Card className="border-[#D4C5B0] bg-white/80">
          <CardContent className="p-10 text-center">
            <Calendar className="w-14 h-14 text-[#A68A64] mx-auto mb-3 opacity-50" />
            <p className="font-bold text-[#8B6F47]">Nenhuma chamada registrada ainda</p>
            <p className="text-sm text-[#A68A64]">Clique em "Nova Chamada" para criar a primeira</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {registrosOrdenados.map((registro) => {
            const isExpanded = expandedId === registro.id;
            const totalPresentes = (registro.presencas || []).filter(p => p.presente).length;
            const total = (registro.presencas || []).length;

            return (
              <Card key={registro.id} className="border-[#D4C5B0] bg-white/90">
                <CardContent className="p-0">
                  {/* Header da chamada */}
                  <div
                    className="p-4 cursor-pointer flex items-center justify-between hover:bg-[#F5F1E8]/50 transition-colors rounded-xl"
                    onClick={() => {
                      setExpandedId(isExpanded ? null : registro.id);
                      setObservacoesGerais(registro.observacoes_gerais || '');
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#8B6F47] to-[#D4AF37] flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-[#8B6F47]">
                          {new Date(registro.data_aula + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                        </p>
                        {registro.descricao_aula && <p className="text-sm text-[#A68A64]">{registro.descricao_aula}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={totalPresentes === total && total > 0 ? "bg-green-500 text-white" : "bg-[#8B6F47] text-white"}>
                        {totalPresentes}/{total} presentes
                      </Badge>
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); if (confirm('Excluir esta chamada?')) deleteMutation.mutate(registro.id); }} className="text-red-400 hover:text-red-600 hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      {isExpanded ? <ChevronUp className="w-5 h-5 text-[#A68A64]" /> : <ChevronDown className="w-5 h-5 text-[#A68A64]" />}
                    </div>
                  </div>

                  {/* Lista de presença expandida */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-[#E8DCC4]">
                      <div className="mt-4 space-y-2">
                        {(registro.presencas || []).length === 0 ? (
                          <p className="text-sm text-[#A68A64] text-center py-4">Nenhum aluno cadastrado nesta chamada.</p>
                        ) : (
                          (registro.presencas || []).map((p, i) => (
                            <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-[#F5F1E8]/60">
                              <span className="font-medium text-[#8B6F47] text-sm">{p.aluno_nome || p.aluno_email}</span>
                              <button
                                onClick={() => togglePresenca(registro, p.aluno_email)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                                  p.presente
                                    ? 'bg-green-100 text-green-700 border border-green-300'
                                    : 'bg-red-50 text-red-500 border border-red-200'
                                }`}
                              >
                                {p.presente ? <><CheckCircle2 className="w-4 h-4" /> Presente</> : <><XCircle className="w-4 h-4" /> Ausente</>}
                              </button>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Observações */}
                      <div className="mt-4">
                        <label className="text-sm font-medium text-[#8B6F47] block mb-1">Observações da Aula</label>
                        <textarea
                          value={observacoesGerais}
                          onChange={e => setObservacoesGerais(e.target.value)}
                          className="w-full border border-[#D4C5B0] rounded-lg p-2 text-sm resize-none focus:outline-none focus:border-[#8B6F47]"
                          rows={2}
                          placeholder="Anotações sobre a aula, comportamento da turma, conteúdo abordado..."
                        />
                        <Button onClick={() => salvarObservacoes(registro)} size="sm" className="mt-2 bg-[#8B6F47] text-white">
                          <Save className="w-3 h-3 mr-1" /> Salvar
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}