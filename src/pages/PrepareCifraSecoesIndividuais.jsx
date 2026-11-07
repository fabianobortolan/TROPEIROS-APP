import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Music, CheckCircle, AlertCircle, Plus, Trash2, Eye, EyeOff, GripVertical } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const secoesPadrao = [
  { id: 1, nome: "Intro", conteudo: "" },
  { id: 2, nome: "Verso 1", conteudo: "" },
  { id: 3, nome: "Pré-Refrão", conteudo: "" },
  { id: 4, nome: "Refrão", conteudo: "" },
  { id: 5, nome: "Verso 2", conteudo: "" },
];

export default function PrepareCifraSecoesIndividuais() {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    titulo: "",
    artista: "",
    tom: "",
    bpm: "",
    ritmo: "none",
    genero: "sertanejo_universitario"
  });

  const [secoes, setSecoes] = useState(secoesPadrao);
  const [showPreview, setShowPreview] = useState(false);
  const [errors, setErrors] = useState({});

  const { data: rhythms = [] } = useQuery({
    queryKey: ['rhythms'],
    queryFn: () => base44.entities.Rhythm.list(),
    initialData: []
  });

  const adicionarSecao = () => {
    const novaSecao = {
      id: Date.now(),
      nome: "Nova Seção",
      conteudo: ""
    };
    setSecoes([...secoes, novaSecao]);
  };

  const removerSecao = (id) => {
    if (secoes.length <= 1) {
      alert("Você precisa ter pelo menos uma seção!");
      return;
    }
    setSecoes(secoes.filter(s => s.id !== id));
  };

  const atualizarSecao = (id, campo, valor) => {
    setSecoes(secoes.map(s => 
      s.id === id ? { ...s, [campo]: valor } : s
    ));
  };

  const gerarCifraCompleta = () => {
    let cifra = `[Intro]\n`;
    if (formData.tom) cifra += `Tom: ${formData.tom}\n`;
    if (formData.bpm) cifra += `BPM: ${formData.bpm}\n`;
    if (formData.ritmo && formData.ritmo !== "none") {
      const ritmoSelecionado = rhythms.find(r => r.id === formData.ritmo);
      if (ritmoSelecionado) cifra += `Ritmo: ${ritmoSelecionado.name}\n`;
    }
    cifra += `\n`;

    secoes.forEach((secao) => {
      if (secao.conteudo.trim()) {
        cifra += `[${secao.nome}]\n`;
        cifra += secao.conteudo.trim() + `\n\n`;
      }
    });

    return cifra.trim();
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.titulo.trim()) {
      newErrors.titulo = "Título é obrigatório";
    }

    if (!formData.artista.trim()) {
      newErrors.artista = "Artista é obrigatório";
    }

    const temConteudo = secoes.some(s => s.conteudo.trim());
    if (!temConteudo) {
      newErrors.secoes = "Adicione conteúdo em pelo menos uma seção";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const cifraCompleta = gerarCifraCompleta();

    localStorage.setItem('cifra_preparada', cifraCompleta);
    localStorage.setItem('cifra_metadata', JSON.stringify({
      titulo: formData.titulo,
      artista: formData.artista,
      tom: formData.tom,
      bpm: formData.bpm,
      ritmo: formData.ritmo === "none" ? null : formData.ritmo,
      genero: formData.genero
    }));

    navigate(createPageUrl("Analyze"));
  };

  return (
    <div className="bg-amber-50 p-4 min-h-screen md:p-8">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl("Analyze"))}
            className="mb-4 text-[#8B6F47] hover:text-[#A68A64] hover:bg-[#8B6F47]/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          
          <h1 className="text-4xl font-bold text-[#8B6F47] mb-2" style={{ letterSpacing: '0.5px' }}>
            📝 Montar Cifra por Seções (VERSÃO BACKUP)
          </h1>
          <p className="text-[#A68A64]">
            Construa sua cifra parte por parte - cada seção será analisada individualmente pela IA!
          </p>
        </motion.div>

        {/* INFORMAÇÕES GERAIS */}
        <Card className="border-[#D4C5B0] bg-white/80 backdrop-blur-sm shadow-xl mb-6">
          <CardHeader className="bg-gradient-to-r from-[#8B6F47] to-[#A68A64] text-white">
            <CardTitle className="flex items-center gap-2">
              <Music className="w-6 h-6" />
              Informações da Música
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="titulo" className="text-[#8B6F47] font-medium">
                  Título da Música *
                </Label>
                <Input
                  id="titulo"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  placeholder="Ex: Evidências"
                  className={`border-[#D4C5B0] focus:border-[#8B6F47] ${errors.titulo ? 'border-red-500' : ''}`}
                />
                {errors.titulo && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.titulo}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="artista" className="text-[#8B6F47] font-medium">
                  Artista/Dupla *
                </Label>
                <Input
                  id="artista"
                  value={formData.artista}
                  onChange={(e) => setFormData({ ...formData, artista: e.target.value })}
                  placeholder="Ex: Chitãozinho & Xororó"
                  className={`border-[#D4C5B0] focus:border-[#8B6F47] ${errors.artista ? 'border-red-500' : ''}`}
                />
                {errors.artista && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.artista}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="tom" className="text-[#8B6F47] font-medium">
                  Tom
                </Label>
                <Input
                  id="tom"
                  value={formData.tom}
                  onChange={(e) => setFormData({ ...formData, tom: e.target.value })}
                  placeholder="Ex: C, G, D"
                  className="border-[#D4C5B0] focus:border-[#8B6F47]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bpm" className="text-[#8B6F47] font-medium">
                  BPM
                </Label>
                <Input
                  id="bpm"
                  type="number"
                  value={formData.bpm}
                  onChange={(e) => setFormData({ ...formData, bpm: e.target.value })}
                  placeholder="Ex: 120"
                  className="border-[#D4C5B0] focus:border-[#8B6F47]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ritmo" className="text-[#8B6F47] font-medium">
                  Ritmo
                </Label>
                <Select
                  value={formData.ritmo}
                  onValueChange={(value) => setFormData({ ...formData, ritmo: value })}
                >
                  <SelectTrigger className="border-[#D4C5B0] focus:border-[#8B6F47]">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {rhythms.map((rhythm) => (
                      <SelectItem key={rhythm.id} value={rhythm.id}>
                        {rhythm.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="genero" className="text-[#8B6F47] font-medium">
                  Gênero/Estilo
                </Label>
                <Select
                  value={formData.genero}
                  onValueChange={(value) => setFormData({ ...formData, genero: value })}
                >
                  <SelectTrigger className="border-[#D4C5B0] focus:border-[#8B6F47]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sertanejo_raiz">Sertanejo Raiz</SelectItem>
                    <SelectItem value="sertanejo_universitario">Sertanejo Universitário</SelectItem>
                    <SelectItem value="sertanejo_romantico">Sertanejo Romântico</SelectItem>
                    <SelectItem value="sertanejo_moderno">Sertanejo Moderno</SelectItem>
                    <SelectItem value="mpb">🎶 MPB</SelectItem>
                    <SelectItem value="samba">🥁 Samba</SelectItem>
                    <SelectItem value="forro">🪗 Forró</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Alert className="mb-6 border-[#9CAF88] bg-[#9CAF88]/10">
          <CheckCircle className="h-5 w-5 text-[#9CAF88]" />
          <AlertDescription className="text-[#8B6F47]">
            <strong>💡 Como usar:</strong> Preencha cada seção com os acordes e letra. Use 4 espaços antes dos acordes para alinhar. Exemplo:<br/>
            <code className="bg-white px-2 py-0.5 rounded mt-1 inline-block">    C              G</code><br/>
            <code className="bg-white px-2 py-0.5 rounded">Quando eu digo que deixei</code>
          </AlertDescription>
        </Alert>

        {errors.secoes && (
          <Alert className="mb-6 border-red-500 bg-red-50">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <AlertDescription className="text-red-800">
              {errors.secoes}
            </AlertDescription>
          </Alert>
        )}

        <Card className="border-[#D4C5B0] bg-white/80 backdrop-blur-sm shadow-xl mb-6">
          <CardHeader className="border-b border-[#D4C5B0]">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[#8B6F47] flex items-center gap-2">
                🎵 Seções da Música
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  variant="outline"
                  className="border-[#9CAF88] text-[#9CAF88]"
                >
                  {showPreview ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                  {showPreview ? "Ocultar" : "Visualizar"} Cifra
                </Button>
                <Button
                  type="button"
                  onClick={adicionarSecao}
                  className="bg-gradient-to-r from-[#9CAF88] to-[#8B6F47] text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Seção
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <AnimatePresence>
                {secoes.map((secao, index) => (
                  <motion.div
                    key={secao.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="border border-[#D4C5B0] rounded-lg p-4 bg-gradient-to-r from-white to-[#F5F1E8]"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <GripVertical className="w-5 h-5 text-[#A68A64]" />
                      <Input
                        value={secao.nome}
                        onChange={(e) => atualizarSecao(secao.id, 'nome', e.target.value)}
                        className="flex-1 font-bold text-[#8B6F47] border-[#D4C5B0]"
                        placeholder="Nome da seção"
                      />
                      <div className="flex items-center gap-1 text-sm text-[#A68A64] bg-white px-3 py-1 rounded-full border border-[#D4C5B0]">
                        <span className="font-semibold">#{index + 1}</span>
                      </div>
                      {secoes.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removerSecao(secao.id)}
                          className="text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    
                    <Textarea
                      value={secao.conteudo}
                      onChange={(e) => atualizarSecao(secao.id, 'conteudo', e.target.value)}
                      placeholder={`Cole os acordes e letra da seção "${secao.nome}" aqui...\n\nExemplo:\n    C              G\nQuando eu digo que deixei\n    Am             F\nÉ porque eu te amo`}
                      className="h-32 font-mono text-sm border-[#D4C5B0] focus:border-[#8B6F47] resize-none"
                    />
                    
                    {secao.conteudo.trim() && (
                      <div className="mt-2 text-xs text-[#9CAF88] flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        {secao.conteudo.split('\n').filter(l => l.trim()).length} linhas
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>

        <AnimatePresence>
          {showPreview && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6"
            >
              <Card className="border-[#D4AF37] bg-white/80 backdrop-blur-sm shadow-xl">
                <CardHeader className="bg-gradient-to-r from-[#D4AF37] to-[#9CAF88] text-white">
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="w-6 h-6" />
                    Pré-visualização da Cifra Completa
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="bg-[#1e1e1e] text-[#d4d4d4] p-6 rounded-lg font-mono text-sm overflow-x-auto max-h-[500px] overflow-y-auto">
                    <pre className="whitespace-pre-wrap">{gerarCifraCompleta()}</pre>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(createPageUrl("Analyze"))}
            className="flex-1 border-[#D4C5B0] text-[#8B6F47]"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex-1 bg-gradient-to-r from-[#8B6F47] to-[#A68A64] hover:from-[#A68A64] hover:to-[#8B6F47] text-white shadow-lg h-12 text-base font-semibold"
          >
            <CheckCircle className="w-5 h-5 mr-2" />
            Analisar Esta Cifra Agora
          </Button>
        </div>
      </div>
    </div>
  );
}