import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, UserCircle2 } from "lucide-react";

export default function AlunoForm({ aluno, onClose, onSave }) {
  const [form, setForm] = useState({
    nome: aluno?.nome || "",
    email: aluno?.email || "",
    telefone: aluno?.telefone || "",
    whatsapp: aluno?.whatsapp || "",
    data_nascimento: aluno?.data_nascimento || "",
    responsavel: aluno?.responsavel || "",
    telefone_responsavel: aluno?.telefone_responsavel || "",
    instrumento: aluno?.instrumento || "",
    nivel: aluno?.nivel || "iniciante",
    turma_id: aluno?.turma_id || "",
    turma_nome: aluno?.turma_nome || "",
    data_matricula: aluno?.data_matricula || "",
    status: aluno?.status || "ativo",
    observacoes: aluno?.observacoes || "",
  });
  const [saving, setSaving] = useState(false);

  const { data: turmas = [] } = useQuery({
    queryKey: ["turmas"],
    queryFn: () => base44.entities.Turma.list(),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = { ...form };
    if (data.turma_id) {
      const t = turmas.find((t) => t.id === data.turma_id);
      data.turma_nome = t?.nome || "";
    }
    if (aluno) {
      await base44.entities.Aluno.update(aluno.id, data);
    } else {
      await base44.entities.Aluno.create(data);
    }
    setSaving(false);
    onSave();
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" onClick={onClose}><ArrowLeft className="w-4 h-4 mr-1" /> Voltar</Button>
        <h2 className="text-xl font-bold text-[#8B6F47] flex items-center gap-2">
          <UserCircle2 className="w-6 h-6" />
          {aluno ? "Editar Aluno" : "Novo Aluno"}
        </h2>
      </div>
      <Card className="border-[#D4C5B0] bg-white max-w-2xl">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label>Nome completo *</Label>
              <Input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
            </div>
            <div>
              <Label>WhatsApp (com DDD)</Label>
              <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="Ex: 11999998888" />
            </div>
            <div>
              <Label>Data de nascimento</Label>
              <Input type="date" value={form.data_nascimento} onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })} />
            </div>
            <div>
              <Label>Data de matrícula</Label>
              <Input type="date" value={form.data_matricula} onChange={(e) => setForm({ ...form, data_matricula: e.target.value })} />
            </div>
            <div>
              <Label>Responsável (menores)</Label>
              <Input value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} />
            </div>
            <div>
              <Label>Telefone do responsável</Label>
              <Input value={form.telefone_responsavel} onChange={(e) => setForm({ ...form, telefone_responsavel: e.target.value })} />
            </div>
            <div>
              <Label>Instrumento</Label>
              <Input value={form.instrumento} onChange={(e) => setForm({ ...form, instrumento: e.target.value })} placeholder="Ex: Violão, Viola Caipira" />
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
              <Label>Turma</Label>
              <Select value={form.turma_id} onValueChange={(v) => setForm({ ...form, turma_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Sem turma</SelectItem>
                  {turmas.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                  <SelectItem value="trancado">Trancado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Observações</Label>
              <Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} rows={3} />
            </div>
            <div className="md:col-span-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit" disabled={saving} className="bg-[#8B6F47] hover:bg-[#6B5437] text-white">
                <Save className="w-4 h-4 mr-2" /> {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}