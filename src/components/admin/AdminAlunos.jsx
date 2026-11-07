import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Pencil, Trash2, UserCircle2, Phone, Mail, Music, MessageCircle } from "lucide-react";
import AlunoForm from "./AlunoForm";

const nivelColors = {
  iniciante: "bg-green-100 text-green-800",
  basico: "bg-blue-100 text-blue-800",
  intermediario: "bg-yellow-100 text-yellow-800",
  avancado: "bg-red-100 text-red-800",
};

const statusColors = {
  ativo: "bg-green-100 text-green-800",
  inativo: "bg-gray-100 text-gray-600",
  trancado: "bg-orange-100 text-orange-800",
};

export default function AdminAlunos() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [showForm, setShowForm] = useState(false);
  const [editingAluno, setEditingAluno] = useState(null);
  const queryClient = useQueryClient();

  const { data: alunos = [], isLoading } = useQuery({
    queryKey: ["alunos"],
    queryFn: () => base44.entities.Aluno.list("-created_date", 200),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Aluno.delete(id),
    onSuccess: () => queryClient.invalidateQueries(["alunos"]),
  });

  const filtered = alunos.filter((a) => {
    const matchSearch = a.nome?.toLowerCase().includes(search.toLowerCase()) ||
      a.email?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "todos" || a.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const handleDelete = (aluno) => {
    if (confirm(`Excluir o aluno "${aluno.nome}"?`)) deleteMutation.mutate(aluno.id);
  };

  if (showForm) {
    return (
      <AlunoForm
        aluno={editingAluno}
        onClose={() => { setShowForm(false); setEditingAluno(null); }}
        onSave={() => { setShowForm(false); setEditingAluno(null); queryClient.invalidateQueries(["alunos"]); }}
      />
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-6 justify-between">
        <div className="flex gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Buscar aluno..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="ativo">Ativos</SelectItem>
              <SelectItem value="inativo">Inativos</SelectItem>
              <SelectItem value="trancado">Trancados</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-[#8B6F47] hover:bg-[#6B5437] text-white">
          <Plus className="w-4 h-4 mr-2" /> Novo Aluno
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-[#A68A64]">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-[#A68A64]">Nenhum aluno encontrado</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((aluno) => (
            <Card key={aluno.id} className="border-[#D4C5B0] bg-white hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#F5F1E8] flex items-center justify-center">
                      <UserCircle2 className="w-8 h-8 text-[#8B6F47]" />
                    </div>
                    <div>
                      <p className="font-bold text-[#8B6F47]">{aluno.nome}</p>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        <Badge className={nivelColors[aluno.nivel] || "bg-gray-100 text-gray-600"}>
                          {aluno.nivel || "—"}
                        </Badge>
                        <Badge className={statusColors[aluno.status] || "bg-gray-100"}>
                          {aluno.status || "ativo"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setEditingAluno(aluno); setShowForm(true); }}>
                      <Pencil className="w-4 h-4 text-[#8B6F47]" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(aluno)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1 text-sm text-gray-600">
                  {aluno.email && <div className="flex items-center gap-2"><Mail className="w-3 h-3" />{aluno.email}</div>}
                  {aluno.telefone && <div className="flex items-center gap-2"><Phone className="w-3 h-3" />{aluno.telefone}</div>}
                  {aluno.whatsapp && (
                    <div className="flex items-center gap-2">
                      <MessageCircle className="w-3 h-3 text-green-600" />
                      <span>{aluno.whatsapp}</span>
                    </div>
                  )}
                  {aluno.instrumento && <div className="flex items-center gap-2"><Music className="w-3 h-3" />{aluno.instrumento}</div>}
                  {aluno.turma_nome && <div className="text-xs text-[#A68A64] mt-1">Turma: {aluno.turma_nome}</div>}
                </div>
                {aluno.whatsapp && (
                  <a
                    href={`https://wa.me/55${aluno.whatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-medium transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Enviar WhatsApp
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}