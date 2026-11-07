import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, Trash2, Star, FileText, Video, Headphones,
  Link2, Image, File, Upload
} from "lucide-react";

const tipoIcone = {
  pdf: <FileText className="w-4 h-4 text-red-500" />,
  video: <Video className="w-4 h-4 text-blue-500" />,
  audio: <Headphones className="w-4 h-4 text-purple-500" />,
  link: <Link2 className="w-4 h-4 text-green-500" />,
  imagem: <Image className="w-4 h-4 text-yellow-500" />,
  outro: <File className="w-4 h-4 text-gray-500" />,
};

const emptyForm = {
  titulo: "", descricao: "", tipo: "pdf", file_url: "",
  turma_id: "", turma_nome: "", professor_nome: "", tags: [], destaque: false,
};

export default function AdminMateriais() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);

  const { data: materiais = [] } = useQuery({
    queryKey: ["materiais-admin"],
    queryFn: () => base44.entities.MaterialDidatico.list("-created_date", 100),
  });

  const { data: turmas = [] } = useQuery({
    queryKey: ["turmas-admin-mat"],
    queryFn: () => base44.entities.Turma.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.MaterialDidatico.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materiais-admin"] });
      setForm(emptyForm);
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MaterialDidatico.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["materiais-admin"] }),
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm((f) => ({ ...f, file_url }));
    setUploading(false);
  };

  const handleTurmaChange = (val) => {
    if (val === "todos") {
      setForm((f) => ({ ...f, turma_id: "", turma_nome: "" }));
    } else {
      const t = turmas.find((t) => t.id === val);
      setForm((f) => ({ ...f, turma_id: val, turma_nome: t?.nome || "" }));
    }
  };

  const handleSave = () => {
    if (!form.titulo || !form.file_url) return;
    createMutation.mutate(form);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[#8B6F47]">Materiais Didáticos</h2>
        <Button onClick={() => setShowForm(!showForm)} className="bg-[#8B6F47] hover:bg-[#6B5437] text-white">
          <Plus className="w-4 h-4 mr-1" /> Novo Material
        </Button>
      </div>

      {showForm && (
        <Card className="border-amber-300 bg-amber-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-[#8B6F47] text-base">Adicionar Material</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Título do material *"
              value={form.titulo}
              onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
            />
            <Input
              placeholder="Descrição"
              value={form.descricao}
              onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <Select value={form.tipo} onValueChange={(v) => setForm((f) => ({ ...f, tipo: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="video">Vídeo</SelectItem>
                  <SelectItem value="audio">Áudio</SelectItem>
                  <SelectItem value="link">Link</SelectItem>
                  <SelectItem value="imagem">Imagem</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
              <Select value={form.turma_id || "todos"} onValueChange={handleTurmaChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Turma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas as turmas</SelectItem>
                  {turmas.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input
              placeholder="Nome do professor"
              value={form.professor_nome}
              onChange={(e) => setForm((f) => ({ ...f, professor_nome: e.target.value }))}
            />
            {form.tipo === "link" ? (
              <Input
                placeholder="URL do link *"
                value={form.file_url}
                onChange={(e) => setForm((f) => ({ ...f, file_url: e.target.value }))}
              />
            ) : (
              <div className="space-y-2">
                <Input
                  placeholder="URL do arquivo (ou faça upload abaixo)"
                  value={form.file_url}
                  onChange={(e) => setForm((f) => ({ ...f, file_url: e.target.value }))}
                />
                <label className="flex items-center gap-2 cursor-pointer text-sm text-[#8B6F47] hover:text-[#6B5437]">
                  <Upload className="w-4 h-4" />
                  {uploading ? "Enviando..." : "Fazer upload do arquivo"}
                  <input type="file" className="hidden" onChange={handleFileUpload} />
                </label>
              </div>
            )}
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600">
              <input
                type="checkbox"
                checked={form.destaque}
                onChange={(e) => setForm((f) => ({ ...f, destaque: e.target.checked }))}
                className="rounded"
              />
              <Star className="w-4 h-4 text-[#D4AF37]" /> Marcar como destaque
            </label>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button
                onClick={handleSave}
                disabled={createMutation.isPending || uploading}
                className="bg-[#8B6F47] hover:bg-[#6B5437] text-white"
              >
                {createMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {materiais.length === 0 ? (
        <Card className="border-amber-200">
          <CardContent className="p-8 text-center text-gray-400">
            Nenhum material cadastrado ainda.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {materiais.map((mat) => (
            <Card key={mat.id} className="border-amber-200 hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex-shrink-0">{tipoIcone[mat.tipo] || tipoIcone.outro}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-800 text-sm">{mat.titulo}</p>
                    {mat.destaque && <Star className="w-3.5 h-3.5 fill-[#D4AF37] text-[#D4AF37]" />}
                    <Badge variant="outline" className="text-xs capitalize">{mat.tipo}</Badge>
                    {mat.turma_nome ? (
                      <Badge className="text-xs bg-amber-100 text-amber-800 border-amber-200">{mat.turma_nome}</Badge>
                    ) : (
                      <Badge className="text-xs bg-green-100 text-green-800 border-green-200">Todas as turmas</Badge>
                    )}
                  </div>
                  {mat.descricao && <p className="text-xs text-gray-500 mt-0.5">{mat.descricao}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <a href={mat.file_url} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-[#8B6F47] hover:underline">
                    Abrir
                  </a>
                  <Button
                    variant="ghost" size="icon"
                    className="text-red-400 hover:text-red-600 hover:bg-red-50"
                    onClick={() => deleteMutation.mutate(mat.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}