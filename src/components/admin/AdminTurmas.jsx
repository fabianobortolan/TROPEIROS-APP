import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Users, Clock, Save, X, GraduationCap } from "lucide-react";

const diasLabels = { segunda: "Seg", terca: "Ter", quarta: "Qua", quinta: "Qui", sexta: "Sex", sabado: "Sáb", domingo: "Dom" };
const nivelColors = {
  iniciante: "bg-green-100 text-green-800",
  basico: "bg-blue-100 text-blue-800",
  intermediario: "bg-yellow-100 text-yellow-800",
  avancado: "bg-red-100 text-red-800",
};

const emptyForm = { nome: "", descricao: "", nivel: "iniciante", professor_nome: "", hora_inicio: "", hora_fim: "", max_alunos: 10, status: "ativa", dia_semana: [] };

export default function AdminTurmas() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const { data: turmas = [], isLoading } = useQuery({
    queryKey: ["turmas"],
    queryFn: () => base44.entities.Turma.list("-created_date", 100),
  });

  const { data: alunos = [] } = useQuery({
    queryKey: ["alunos"],
    queryFn: () => base44.entities.Aluno.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Turma.delete(id),
    onSuccess: () => queryClient.invalidateQueries(["turmas"]),
  });

  const openNew = () => { setEditing(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (t) => { setEditing(t); setForm({ ...t, dia_semana: t.dia_semana || [] }); setShowForm(true); };

  const toggleDia = (dia) => {
    setForm((prev) => ({
      ...prev,
      dia_semana: prev.dia_semana.includes(dia) ? prev.dia_semana.filter((d) => d !== dia) : [...prev.dia_semana, dia],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    if (editing) await base44.entities.Turma.update(editing.id, form);
    else await base44.entities.Turma.create(form);
    setSaving(false);
    setShowForm(false);
    queryClient.invalidateQueries(["turmas"]);
  };

  const alunosDaTurma = (turmaId) => alunos.filter((a) => a.turma_id === turmaId && a.status === "ativo").length;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <p className="text-sm text-[#A68A64]">{turmas.length} turma(s) cadastrada(s)</p>
        <Button onClick={openNew} className="bg-[#8B6F47] hover:bg-[#6B5437] text-white">
          <Plus className="w-4 h-4 mr-2" /> Nova Turma
        </Button>
      </div>

      {showForm && (
        <Card className="border-[#D4C5B0] bg-white mb-6 max-w-2xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[#8B6F47] text-lg">{editing ? "Editar Turma" : "Nova Turma"}</h3>
              <Button size="icon" variant="ghost" onClick={() => setShowForm(false)}><X className="w-4 h-4" /></Button>
            </div>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>Nome da turma *</Label>
                <Input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
              </div>
              <div>
                <Label>Professor</Label>
                <Input value={form.professor_nome} onChange={(e) => setForm({ ...form, professor_nome: e.target.value })} />
              </div>
              <div>
                <Label>Nível</Label>
                <Select value={form.nivel} onValueChange={(v) => setForm({ ...form, nivel: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="iniciante">Iniciante</SelectItem>
                    <SelectItem value="basico">Básico</SelectItem>
                    <SelectItem value="intermediario">Intermediário</SelectItem>
                    <SelectItem value="avancado">Avançado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Hora início</Label>
                <Input type="time" value={form.hora_inicio} onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })} />
              </div>
              <div>
                <Label>Hora fim</Label>
                <Input type="time" value={form.hora_fim} onChange={(e) => setForm({ ...form, hora_fim: e.target.value })} />
              </div>
              <div>
                <Label>Máx. alunos</Label>
                <Input type="number" value={form.max_alunos} onChange={(e) => setForm({ ...form, max_alunos: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativa">Ativa</SelectItem>
                    <SelectItem value="pausada">Pausada</SelectItem>
                    <SelectItem value="encerrada">Encerrada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>Dias da semana</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {Object.entries(diasLabels).map(([key, label]) => (
                    <button type="button" key={key} onClick={() => toggleDia(key)}
                      className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                        form.dia_semana?.includes(key) ? "bg-[#8B6F47] text-white border-[#8B6F47]" : "bg-white text-[#8B6F47] border-[#D4C5B0]"
                      }`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="md:col-span-2 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
                <Button type="submit" disabled={saving} className="bg-[#8B6F47] hover:bg-[#6B5437] text-white">
                  <Save className="w-4 h-4 mr-2" /> {saving ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-[#A68A64]">Carregando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {turmas.map((turma) => (
            <Card key={turma.id} className="border-[#D4C5B0] bg-white hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-[#8B6F47]" />
                    <p className="font-bold text-[#8B6F47]">{turma.nome}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(turma)}><Pencil className="w-4 h-4 text-[#8B6F47]" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => { if (confirm(`Excluir "${turma.nome}"?`)) deleteMutation.mutate(turma.id); }}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap mb-3">
                  <Badge className={nivelColors[turma.nivel] || "bg-gray-100"}>{turma.nivel}</Badge>
                  <Badge className={turma.status === "ativa" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}>{turma.status}</Badge>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  {turma.professor_nome && <p>👤 {turma.professor_nome}</p>}
                  {turma.hora_inicio && <p className="flex items-center gap-1"><Clock className="w-3 h-3" />{turma.hora_inicio} – {turma.hora_fim}</p>}
                  {turma.dia_semana?.length > 0 && (
                    <p className="flex flex-wrap gap-1">
                      {turma.dia_semana.map((d) => <span key={d} className="bg-[#F5F1E8] px-2 py-0.5 rounded text-xs">{diasLabels[d]}</span>)}
                    </p>
                  )}
                  <p className="flex items-center gap-1"><Users className="w-3 h-3" />{alunosDaTurma(turma.id)} / {turma.max_alunos} alunos</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}