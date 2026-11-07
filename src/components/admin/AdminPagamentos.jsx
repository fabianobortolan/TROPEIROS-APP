import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Search, CheckCircle2, Clock, AlertCircle, X, Save, DollarSign, Pencil, Trash2 } from "lucide-react";

const statusConfig = {
  pendente: { label: "Pendente", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  pago: { label: "Pago", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  atrasado: { label: "Atrasado", color: "bg-red-100 text-red-800", icon: AlertCircle },
  cancelado: { label: "Cancelado", color: "bg-gray-100 text-gray-600", icon: X },
};

const emptyForm = { aluno_id: "", aluno_nome: "", mes_referencia: "", valor: "", data_vencimento: "", data_pagamento: "", status: "pendente", forma_pagamento: "", observacoes: "" };

export default function AdminPagamentos() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const { data: pagamentos = [], isLoading } = useQuery({
    queryKey: ["pagamentos"],
    queryFn: () => base44.entities.Pagamento.list("-created_date", 300),
  });

  const { data: alunos = [] } = useQuery({
    queryKey: ["alunos"],
    queryFn: () => base44.entities.Aluno.filter({ status: "ativo" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Pagamento.delete(id),
    onSuccess: () => queryClient.invalidateQueries(["pagamentos"]),
  });

  const filtered = pagamentos.filter((p) => {
    const matchSearch = p.aluno_nome?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "todos" || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totais = useMemo(() => ({
    total: filtered.reduce((s, p) => s + (p.valor || 0), 0),
    pago: filtered.filter((p) => p.status === "pago").reduce((s, p) => s + (p.valor || 0), 0),
    pendente: filtered.filter((p) => p.status === "pendente" || p.status === "atrasado").reduce((s, p) => s + (p.valor || 0), 0),
  }), [filtered]);

  const openNew = () => { setEditing(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (p) => { setEditing(p); setForm({ ...p }); setShowForm(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = { ...form, valor: Number(form.valor) };
    if (form.aluno_id) {
      const a = alunos.find((a) => a.id === form.aluno_id);
      data.aluno_nome = a?.nome || data.aluno_nome;
    }
    if (editing) await base44.entities.Pagamento.update(editing.id, data);
    else await base44.entities.Pagamento.create(data);
    setSaving(false);
    setShowForm(false);
    queryClient.invalidateQueries(["pagamentos"]);
  };

  const formatMoeda = (v) => `R$ ${(v || 0).toFixed(2).replace(".", ",")}`;

  return (
    <div>
      {/* Resumo financeiro */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total no período", value: totais.total, color: "text-[#8B6F47]" },
          { label: "Recebido", value: totais.pago, color: "text-green-700" },
          { label: "A receber", value: totais.pendente, color: "text-orange-700" },
        ].map((item) => (
          <Card key={item.label} className="border-[#D4C5B0] bg-white">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">{item.label}</p>
              <p className={`text-xl font-bold ${item.color}`}>{formatMoeda(item.value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4 justify-between">
        <div className="flex gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Buscar aluno..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
              <SelectItem value="atrasado">Atrasado</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openNew} className="bg-[#8B6F47] hover:bg-[#6B5437] text-white">
          <Plus className="w-4 h-4 mr-2" /> Novo Pagamento
        </Button>
      </div>

      {showForm && (
        <Card className="border-[#D4C5B0] bg-white mb-6 max-w-2xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[#8B6F47] text-lg">{editing ? "Editar Pagamento" : "Novo Pagamento"}</h3>
              <Button size="icon" variant="ghost" onClick={() => setShowForm(false)}><X className="w-4 h-4" /></Button>
            </div>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Aluno</Label>
                <Select value={form.aluno_id} onValueChange={(v) => setForm({ ...form, aluno_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {alunos.map((a) => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Nome (se não cadastrado)</Label>
                <Input value={form.aluno_nome} onChange={(e) => setForm({ ...form, aluno_nome: e.target.value })} placeholder="Ou digite o nome" />
              </div>
              <div>
                <Label>Mês de referência</Label>
                <Input type="month" required value={form.mes_referencia} onChange={(e) => setForm({ ...form, mes_referencia: e.target.value })} />
              </div>
              <div>
                <Label>Valor (R$)</Label>
                <Input type="number" required step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
              </div>
              <div>
                <Label>Vencimento</Label>
                <Input type="date" value={form.data_vencimento} onChange={(e) => setForm({ ...form, data_vencimento: e.target.value })} />
              </div>
              <div>
                <Label>Data do pagamento</Label>
                <Input type="date" value={form.data_pagamento} onChange={(e) => setForm({ ...form, data_pagamento: e.target.value })} />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                    <SelectItem value="atrasado">Atrasado</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Forma de pagamento</Label>
                <Select value={form.forma_pagamento} onValueChange={(v) => setForm({ ...form, forma_pagamento: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="cartao_debito">Cartão Débito</SelectItem>
                    <SelectItem value="cartao_credito">Cartão Crédito</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                  </SelectContent>
                </Select>
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
        <div className="text-center py-8 text-[#A68A64]">Carregando...</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => {
            const cfg = statusConfig[p.status] || statusConfig.pendente;
            const Icon = cfg.icon;
            return (
              <Card key={p.id} className="border-[#D4C5B0] bg-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1">
                      <DollarSign className="w-5 h-5 text-[#8B6F47] flex-shrink-0" />
                      <div className="flex-1">
                        <p className="font-semibold text-[#8B6F47]">{p.aluno_nome}</p>
                        <p className="text-xs text-gray-500">{p.mes_referencia} · {p.forma_pagamento || "—"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-bold text-[#8B6F47]">{formatMoeda(p.valor)}</p>
                      <Badge className={cfg.color}><Icon className="w-3 h-3 mr-1" />{cfg.label}</Badge>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Pencil className="w-4 h-4 text-[#8B6F47]" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => { if (confirm("Excluir?")) deleteMutation.mutate(p.id); }}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filtered.length === 0 && <div className="text-center py-8 text-[#A68A64]">Nenhum pagamento encontrado</div>}
        </div>
      )}
    </div>
  );
}