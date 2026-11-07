import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Plus, Trash2, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function PrepareCifra() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    titulo: "",
    artista: "",
    tom: "",
    bpm: "",
    ritmo: "none",
    genero: "sertanejo_universitario"
  });

  const [secoes, setSecoes] = useState([
    { id: 1, nome: "Intro", conteudo: "" },
    { id: 2, nome: "Verso 1", conteudo: "" },
    { id: 3, nome: "Refrão", conteudo: "" }
  ]);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState({});
  const [analysisError, setAnalysisError] = useState(null);

  const { data: rhythms = [] } = useQuery({
    queryKey: ['rhythms'],
    queryFn: () => base44.entities.Rhythm.list(),
    initialData: []
  });

  const { data: knownProgressions = [], isLoading: progressionsLoading } = useQuery({
    queryKey: ['progressions'],
    queryFn: () => base44.entities.Progression.list(),
    initialData: []
  });

  const createSongMutation = useMutation({
    mutationFn: (songData) => base44.entities.Song.create(songData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['songs'] });
      setTimeout(() => {
        navigate(createPageUrl("Library"));
      }, 1500);
    }
  });

  const adicionarSecao = () => {
    setSecoes([...secoes, { 
      id: Date.now(), 
      nome: "Nova Seção", 
      conteudo: "" 
    }]);
  };

  const removerSecao = (id) => {
    if (secoes.length <= 1) {
      alert("Precisa ter pelo menos 1 seção!");
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
      const ritmo = rhythms.find(r => r.id === formData.ritmo);
      if (ritmo) cifra += `Ritmo: ${ritmo.name}\n`;
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
    if (!formData.titulo.trim()) newErrors.titulo = "Título obrigatório";
    if (!formData.artista.trim()) newErrors.artista = "Artista obrigatório";
    const temConteudo = secoes.some(s => s.conteudo.trim());
    if (!temConteudo) newErrors.secoes = "Preencha pelo menos 1 seção";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const normalizePattern = (pattern) => {
    if (!pattern) return "";
    return pattern
      .toString()
      .trim()
      .replace(/\s+/g, '')
      .replace(/[-–—_]/g, '-')
      .replace(/[,;.]/g, '-')
      .replace(/\(/g, '')
      .replace(/\)/g, '')
      .replace(/\//g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toUpperCase();
  };

  const findProgressionMatch = (pattern, knownProgressions) => {
    if (!pattern || !knownProgressions || knownProgressions.length === 0) {
      return null;
    }

    const normalizedInput = normalizePattern(pattern);

    // Match Exato
    for (const prog of knownProgressions) {
      if (!prog.pattern) continue;
      const normalizedKnown = normalizePattern(prog.pattern);
      if (normalizedKnown === normalizedInput) {
        return prog.name;
      }
    }

    // Match em Variações
    for (const prog of knownProgressions) {
      if (!prog.variations || !Array.isArray(prog.variations)) continue;
      for (const variation of prog.variations) {
        if (!variation.pattern) continue;
        const normalizedVariation = normalizePattern(variation.pattern);
        if (normalizedVariation === normalizedInput) {
          return prog.name;
        }
      }
    }

    return null;
  };

  const determinePredominantProgression = (progressions) => {
    if (!progressions || progressions.length === 0) return null;

    const sectionWeights = {
      'refrão': 3,
      'refrao': 3,
      'chorus': 3,
      'verso': 2,
      'verse': 2,
      'pré-refrão': 1.5,
      'pre-refrão': 1.5,
      'ponte': 1.5,
      'bridge': 1.5,
      'intro': 1,
      'outro': 1,
      'solo': 1
    };

    const progressionScores = {};

    progressions.forEach((prog) => {
      if (!prog.progression_name) return;

      const section = prog.section.toLowerCase();
      let weight = 1;
      
      for (const [key, value] of Object.entries(sectionWeights)) {
        if (section.includes(key)) {
          weight = value;
          break;
        }
      }

      if (!progressionScores[prog.progression_name]) {
        progressionScores[prog.progression_name] = {
          score: 0,
          pattern: prog.pattern
        };
      }
      
      progressionScores[prog.progression_name].score += weight;
    });

    let predominant = null;
    let maxScore = 0;

    for (const [name, data] of Object.entries(progressionScores)) {
      if (data.score > maxScore) {
        maxScore = data.score;
        predominant = { name, pattern: data.pattern };
      }
    }

    return predominant;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (progressionsLoading) {
      setAnalysisError("Carregando banco de progressões... Tente novamente em alguns segundos.");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    setProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 5, 85));
      }, 200);

      const cifraCompleta = gerarCifraCompleta();

      const progressionsList = knownProgressions
        .map(prog => `• ${prog.name}: ${prog.pattern}`)
        .join('\n');

      const analysisPrompt = `Você é um especialista em teoria musical e análise harmônica, com profundo conhecimento em música sertaneja brasileira.

MÚSICA: "${formData.titulo}" de ${formData.artista}
${formData.genero ? `ESTILO: ${formData.genero}` : ''}

╔═══════════════════════════════════════════════════════════════════════╗
║  ⚠️  PROGRESSÕES CONHECIDAS NO BANCO DE DADOS  ⚠️                    ║
╚═══════════════════════════════════════════════════════════════════════╝

${progressionsList || "Nenhuma progressão cadastrada ainda"}

╔═══════════════════════════════════════════════════════════════════════╗
║  🎯 ANÁLISE INDIVIDUAL POR SEÇÃO - OBRIGATÓRIO  🎯                   ║
╚═══════════════════════════════════════════════════════════════════════╝

⚠️ INSTRUÇÕES CRÍTICAS:

1. ANALISE CADA SEÇÃO SEPARADAMENTE (NÃO AGRUPE):
   • Intro/Introdução → 1 entrada
   • Verso 1 → 1 entrada
   • Verso 2 → 1 entrada
   • Verso 3 → 1 entrada
   • Pré-Refrão/Ponte → 1 entrada
   • Refrão → 1 entrada (mesmo se repetir)
   • Solo → 1 entrada
   • Outro/Final → 1 entrada

2. ❌ NÃO AGRUPE SEÇÕES COM MESMA PROGRESSÃO

3. PARA CADA SEÇÃO, IDENTIFIQUE:
   • Nome exato da seção
   • Acordes utilizados
   • Pattern em algarismos romanos (OBRIGATÓRIO!)
   • Tonalidade específica

4. NUNCA RETORNE pattern: null
   • SEMPRE analise e retorne o pattern
   • Use APENAS hífen (-) como separador
   • Formato: I-V-vi-IV

⚠️ CIFRA FORNECIDA:
${cifraCompleta}

Analise com precisão técnica máxima.`;

      setProgress(60);

      const analysisResultData = await base44.integrations.Core.InvokeLLM({
        prompt: analysisPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            artist: { type: "string" },
            main_key: { type: "string" },
            tempo: { type: "number" },
            duration: { type: "string" },
            progressions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  section: { type: "string" },
                  chords: { type: "array", items: { type: "string" } },
                  pattern: { type: "string" },
                  key: { type: "string" }
                },
                required: ["pattern"]
              }
            }
          }
        }
      });

      clearInterval(progressInterval);
      setProgress(90);

      console.log("📊 RESULTADO DA IA:", analysisResultData);

      const progressionsWithNames = (analysisResultData.progressions || []).map((prog) => {
        const matchedName = findProgressionMatch(prog.pattern, knownProgressions);
        return {
          ...prog,
          progression_name: matchedName
        };
      });

      const predominant = determinePredominantProgression(progressionsWithNames);

      const selectedRhythm = formData.ritmo !== "none" ? rhythms.find((r) => r.id === formData.ritmo) : null;

      const songData = {
        title: formData.titulo,
        artist: formData.artista,
        genre_style: formData.genero,
        rhythm_id: formData.ritmo !== "none" ? formData.ritmo : undefined,
        rhythm_name: selectedRhythm ? selectedRhythm.name : undefined,
        cifra_text: cifraCompleta,
        input_type: "cifra",
        main_key: analysisResultData.main_key || formData.tom,
        tempo: analysisResultData.tempo || (formData.bpm ? parseInt(formData.bpm) : undefined),
        duration: analysisResultData.duration,
        progressions: progressionsWithNames,
        predominant_progression: predominant ? predominant.name : null,
        predominant_progression_pattern: predominant ? predominant.pattern : null
      };

      console.log("💾 SALVANDO MÚSICA:", songData);

      await createSongMutation.mutateAsync(songData);
      setProgress(100);

      console.log("✅ MÚSICA SALVA COM SUCESSO!");

    } catch (err) {
      setAnalysisError("Erro ao analisar a música. Tente novamente.");
      console.error("❌ ERRO NA ANÁLISE:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (isAnalyzing) {
    return (
      <div className="bg-amber-50 p-6 min-h-screen flex items-center justify-center">
        <Card className="border-[#D4C5B0] bg-white/80 backdrop-blur-sm shadow-xl max-w-2xl w-full">
          <CardContent className="p-12 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-[#8B6F47] to-[#A68A64] rounded-full flex items-center justify-center mx-auto mb-6">
              <Loader2 className="w-10 h-10 text-white animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-[#8B6F47] mb-4">Analisando Música...</h2>
            <p className="text-[#A68A64] mb-6">
              Identificando progressões harmônicas por seção
            </p>
            <Progress value={progress} className="h-3 mb-4" />
            <p className="text-sm text-[#A68A64]">{progress}% concluído</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (progress === 100) {
    return (
      <div className="bg-amber-50 p-6 min-h-screen flex items-center justify-center">
        <Card className="border-[#9CAF88] bg-white/80 backdrop-blur-sm shadow-xl max-w-2xl w-full">
          <CardContent className="p-12 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-[#9CAF88] to-[#8B6F47] rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-[#8B6F47] mb-2">Análise Concluída!</h2>
            <p className="text-[#A68A64]">Música salva na biblioteca com sucesso</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-amber-50 p-6 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(createPageUrl("Analyze"))}
          className="mb-4 text-[#8B6F47] hover:text-[#A68A64] hover:bg-[#8B6F47]/10"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        <h1 className="text-3xl font-bold text-[#8B6F47] mb-2">
          Preparar Cifra
        </h1>
        <p className="text-[#A68A64] mb-8">
          Preencha os dados e monte sua cifra seção por seção
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {analysisError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{analysisError}</AlertDescription>
            </Alert>
          )}

          {/* DADOS BÁSICOS */}
          <Card className="border-[#D4C5B0] bg-white/80 backdrop-blur-sm shadow-xl">
            <CardHeader className="border-b border-[#D4C5B0]">
              <CardTitle className="text-[#8B6F47]">Dados da Música</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[#8B6F47] font-medium">Título *</Label>
                  <Input
                    value={formData.titulo}
                    onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                    placeholder="Nome da música"
                    className={`border-[#D4C5B0] focus:border-[#8B6F47] ${errors.titulo ? 'border-red-500' : ''}`}
                  />
                </div>
                <div>
                  <Label className="text-[#8B6F47] font-medium">Artista *</Label>
                  <Input
                    value={formData.artista}
                    onChange={(e) => setFormData({ ...formData, artista: e.target.value })}
                    placeholder="Nome do artista"
                    className={`border-[#D4C5B0] focus:border-[#8B6F47] ${errors.artista ? 'border-red-500' : ''}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div>
                  <Label className="text-[#8B6F47] font-medium">Tom</Label>
                  <Input
                    value={formData.tom}
                    onChange={(e) => setFormData({ ...formData, tom: e.target.value })}
                    placeholder="C"
                    className="border-[#D4C5B0] focus:border-[#8B6F47]"
                  />
                </div>
                <div>
                  <Label className="text-[#8B6F47] font-medium">BPM</Label>
                  <Input
                    type="number"
                    value={formData.bpm}
                    onChange={(e) => setFormData({ ...formData, bpm: e.target.value })}
                    placeholder="120"
                    className="border-[#D4C5B0] focus:border-[#8B6F47]"
                  />
                </div>
                <div>
                  <Label className="text-[#8B6F47] font-medium">Ritmo</Label>
                  <Select value={formData.ritmo} onValueChange={(v) => setFormData({ ...formData, ritmo: v })}>
                    <SelectTrigger className="border-[#D4C5B0] focus:border-[#8B6F47]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-</SelectItem>
                      {rhythms.map((r) => (
                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[#8B6F47] font-medium">Estilo</Label>
                  <Select value={formData.genero} onValueChange={(v) => setFormData({ ...formData, genero: v })}>
                    <SelectTrigger className="border-[#D4C5B0] focus:border-[#8B6F47]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sertanejo_raiz">Raiz</SelectItem>
                      <SelectItem value="sertanejo_universitario">Universitário</SelectItem>
                      <SelectItem value="sertanejo_romantico">Romântico</SelectItem>
                      <SelectItem value="sertanejo_moderno">Moderno</SelectItem>
                      <SelectItem value="sertanejo_modao">🪗 Modão</SelectItem>
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

          {/* SEÇÕES */}
          <Card className="border-[#D4C5B0] bg-white/80 backdrop-blur-sm shadow-xl">
            <CardHeader className="border-b border-[#D4C5B0]">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[#8B6F47]">Seções da Música</CardTitle>
                <Button 
                  type="button" 
                  onClick={adicionarSecao} 
                  size="sm"
                  className="bg-gradient-to-r from-[#9CAF88] to-[#8B6F47] hover:opacity-90 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Seção
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {errors.secoes && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errors.secoes}</AlertDescription>
                </Alert>
              )}

              {secoes.map((secao, index) => (
                <div key={secao.id} className="border border-[#D4C5B0] rounded-lg p-4 bg-gradient-to-r from-white to-[#F5F1E8]">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-sm font-medium text-[#A68A64]">#{index + 1}</span>
                    <Input
                      value={secao.nome}
                      onChange={(e) => atualizarSecao(secao.id, 'nome', e.target.value)}
                      placeholder="Nome da seção"
                      className="flex-1 border-[#D4C5B0] focus:border-[#8B6F47]"
                    />
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
                    placeholder={`Exemplo:\n    C              G\nQuando eu digo que deixei\n    Am             F\nDe amar você`}
                    className="h-32 font-mono text-sm border-[#D4C5B0] focus:border-[#8B6F47]"
                  />
                  
                  {secao.conteudo.trim() && (
                    <p className="text-xs text-[#9CAF88] mt-2 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      {secao.conteudo.split('\n').filter(l => l.trim()).length} linhas
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* BOTÕES */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(createPageUrl("Analyze"))}
              className="flex-1 border-[#D4C5B0] text-[#8B6F47] hover:bg-[#8B6F47] hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-[#8B6F47] to-[#A68A64] hover:from-[#A68A64] hover:to-[#8B6F47] text-white shadow-lg"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Analisar e Salvar na Biblioteca
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}