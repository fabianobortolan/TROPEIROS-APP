import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Calendar, Save, X, Music, Users, Star, ClipboardList, Coffee } from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

const tipoConfig = {
  aula: { label: "Aula", color: "bg-blue-100 text-blue-800", icon: Music },
  recital: { label: "Recital", color: "bg-purple-100 text-purple-800", icon: Star },
  workshop: { label: "Workshop", color: "bg-orange-100 text-orange-800", icon: Users },
  avaliacao: { label: "Avaliação", color: "bg-red-100 text-red-800", icon: ClipboardList },
  reuniao: { label: "Reunião", color: "bg-gray-100 text-gray-800", icon: Coffee },
  outro: { label: "Outro", color: "bg-green-100 text-green-800", icon: Calendar },
};

const emptyForm = { titulo: "", descricao: "", tipo: "aula", data_inicio: "", data_fim: "", local: "", turma_nome: "", professor_nome: "", status: "agendado" };

export default function AdminCalendario() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const queryClient = useQueryClient();

  const { data: eventos = [] } = useQuery({
    queryKey: ["eventos"],
    queryFn: () => base44.entities.EventoEscola.list("-data_inicio", 200),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.EventoEscola.delete(id),
    onSuccess: () => queryClient.invalidateQueries(["eventos"]),
  });

  const openNew = (date) => {
    const dt = date ? format(date, "yyyy-MM-dd") + "T08:00" : "";
    setEditing(null);
    setForm({ ...emptyForm, data_inicio: dt });
    setShowForm(true);
  };

  const openEdit = (e) => { setEditing(e); setForm({ ...e }); setShowForm(true); };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setSaving(true);
    if (editing) await base44.entities.EventoEscola.update(editing.id, form);
    else await base44.entities.EventoEscola.create(form);
    setSaving(false);
    setShowForm(false);
    queryClient.invalidateQueries(["eventos"]);
  };

  const diasDoMes = eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) });
  const primeirodia = startOfMonth(currentDate).getDay();

  const eventosNoDia = (day) => eventos.filter((e) => {
    if (!e.data_inicio) return false;
    return isSameDay(parseISO(e.data_inicio), day);
  });

  const eventosDoMes = eventos.filter((e) => {
    if (!e.data_inicio) return false;
    return isSameMonth(parseISO(e.data_inicio), currentDate);
  });

  const prevMonth = () => setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={prevMonth} className="px-3">‹</Button>
          <h3 className="text-lg font-bold text-[#8B6F47] capitalize">{format(currentDate, "MMMM yyyy", { locale: ptBR })}</h3>
          <Button variant="outline" onClick={nextMonth} className="px-3">›</Button>
        </div>
        <Button onClick={() => openNew(null)} className="bg-[#8B6F47] hover:bg-[#6B5437] text-white">
          <Plus className="w-4 h-4 mr-2" /> Novo Evento
        </Button>
      </div>

      {showForm && (
        <Card className="border-[#D4C5B0] bg-white mb-6 max-w-2xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[#8B6F47] text-lg">{editing ? "Editar Evento" : "Novo Evento"}</h3>
              <Button size="icon" variant="ghost" onClick={() => setShowForm(false)}><X className="w-4 h-4" /></Button>
            </div>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>Título *</Label>
                <Input required value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(tipoConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agendado">Agendado</SelectItem>
                    <SelectItem value="realizado">Realizado</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data/hora início</Label>
                <Input type="datetime-local" required value={form.data_inicio} onChange={(e) => setForm({ ...form, data_inicio: e.target.value })} />
              </div>
              <div>
                <Label>Data/hora fim</Label>
                <Input type="datetime-local" value={form.data_fim} onChange={(e) => setForm({ ...form, data_fim: e.target.value })} />
              </div>
              <div>
                <Label>Local</Label>
                <Input value={form.local} onChange={(e) => setForm({ ...form, local: e.target.value })} />
              </div>
              <div>
                <Label>Professor</Label>
                <Input value={form.professor_nome} onChange={(e) => setForm({ ...form, professor_nome: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <Label>Descrição</Label>
                <Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} rows={2} />
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

      {/* Grade do calendário */}
      <div className="grid grid-cols-7 gap-px bg-[#D4C5B0] rounded-lg overflow-hidden mb-6">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
          <div key={d} className="bg-[#F5F1E8] text-center text-xs font-semibold text-[#8B6F47] py-2">{d}</div>
        ))}
        {Array.from({ length: primeirodia }).map((_, i) => (
          <div key={"empty" + i} className="bg-white min-h-[80px]" />
        ))}
        {diasDoMes.map((day) => {
          const evs = eventosNoDia(day);
          const isSelected = selectedDay && isSameDay(day, selectedDay);
          return (
            <div key={day.toISOString()}
              onClick={() => { setSelectedDay(isSameDay(day, selectedDay) ? null : day); }}
              className={`bg-white min-h-[80px] p-1 cursor-pointer hover:bg-[#F5F1E8] transition-colors border-2 ${isSelected ? "border-[#8B6F47]" : "border-transparent"}`}>
              <p className={`text-xs font-semibold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isSameDay(day, new Date()) ? "bg-[#8B6F47] text-white" : "text-gray-700"}`}>
                {format(day, "d")}
              </p>
              {evs.slice(0, 2).map((e) => {
                const cfg = tipoConfig[e.tipo] || tipoConfig.outro;
                return (
                  <div key={e.id} className={`text-xs px-1 py-0.5 rounded truncate mb-0.5 ${cfg.color}`}>{e.titulo}</div>
                );
              })}
              {evs.length > 2 && <div className="text-xs text-gray-400">+{evs.length - 2}</div>}
            </div>
          );
        })}
      </div>

      {/* Eventos do dia selecionado */}
      {selectedDay && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold text-[#8B6F47]">Eventos em {format(selectedDay, "dd/MM/yyyy")}</h4>
            <Button size="sm" onClick={() => openNew(selectedDay)} className="bg-[#8B6F47] text-white">
              <Plus className="w-3 h-3 mr-1" /> Adicionar
            </Button>
          </div>
          {eventosNoDia(selectedDay).length === 0 ? (
            <p className="text-sm text-[#A68A64]">Nenhum evento neste dia</p>
          ) : (
            <div className="space-y-2">
              {eventosNoDia(selectedDay).map((e) => {
                const cfg = tipoConfig[e.tipo] || tipoConfig.outro;
                return (
                  <Card key={e.id} className="border-[#D4C5B0] bg-white">
                    <CardContent className="p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Badge className={cfg.color}>{cfg.label}</Badge>
                        <div>
                          <p className="font-semibold text-[#8B6F47]">{e.titulo}</p>
                          <p className="text-xs text-gray-500">{e.data_inicio ? format(parseISO(e.data_inicio), "HH:mm") : ""}{e.local ? " · " + e.local : ""}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(e)}><Pencil className="w-4 h-4 text-[#8B6F47]" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => { if (confirm("Excluir?")) deleteMutation.mutate(e.id); }}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Lista de próximos eventos */}
      <div>
        <h4 className="font-bold text-[#8B6F47] mb-3">Eventos do mês ({eventosDoMes.length})</h4>
        <div className="space-y-2">
          {eventosDoMes.sort((a, b) => a.data_inicio?.localeCompare(b.data_inicio)).map((e) => {
            const cfg = tipoConfig[e.tipo] || tipoConfig.outro;
            return (
              <Card key={e.id} className="border-[#D4C5B0] bg-white">
                <CardContent className="p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="text-center min-w-[40px]">
                      <p className="text-xs text-gray-400">{e.data_inicio ? format(parseISO(e.data_inicio), "MMM", { locale: ptBR }) : ""}</p>
                      <p className="text-lg font-bold text-[#8B6F47]">{e.data_inicio ? format(parseISO(e.data_inicio), "dd") : "—"}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-[#8B6F47]">{e.titulo}</p>
                      <div className="flex gap-2 items-center">
                        <Badge className={cfg.color + " text-xs"}>{cfg.label}</Badge>
                        {e.local && <span className="text-xs text-gray-500">{e.local}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(e)}><Pencil className="w-4 h-4 text-[#8B6F47]" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => { if (confirm("Excluir?")) deleteMutation.mutate(e.id); }}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {eventosDoMes.length === 0 && <p className="text-sm text-[#A68A64] text-center py-4">Nenhum evento neste mês</p>}
        </div>
      </div>
    </div>
  );
}