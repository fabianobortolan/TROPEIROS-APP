import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BookOpen, Upload, FileText, Loader2, Trash2, ExternalLink, Search, Filter, Sparkles, CheckCircle, AlertCircle, X, Brain, Eye, Database, GraduationCap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const categoryLabels = {
  teoria_musical: "Teoria Musical",
  harmonia: "Harmonia",
  progressoes: "Progressões",
  musica_sertaneja: "Música Sertaneja",
  analise_musical: "Análise Musical",
  arranjo: "Arranjo",
  composicao: "Composição",
  historia_musical: "História Musical",
  tecnica_instrumental: "Técnica Instrumental",
  plano_aulas: "📖 Plano de Aulas",
  outro: "Outro"
};

const categoryColors = {
  teoria_musical: "bg-blue-100 text-blue-800 border-blue-200",
  harmonia: "bg-purple-100 text-purple-800 border-purple-200",
  progressoes: "bg-green-100 text-green-800 border-green-200",
  musica_sertaneja: "bg-amber-100 text-amber-800 border-amber-200",
  analise_musical: "bg-rose-100 text-rose-800 border-rose-200",
  arranjo: "bg-indigo-100 text-indigo-800 border-indigo-200",
  composicao: "bg-cyan-100 text-cyan-800 border-cyan-200",
  historia_musical: "bg-orange-100 text-orange-800 border-orange-200",
  tecnica_instrumental: "bg-teal-100 text-teal-800 border-teal-200",
  plano_aulas: "bg-violet-100 text-violet-800 border-violet-200",
  outro: "bg-gray-100 text-gray-800 border-gray-200"
};

export default function ReferenceLibrary() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [processing, setProcessing] = useState(false);
  const [processingAulas, setProcessingAulas] = useState(false);
  const [integrating, setIntegrating] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);

  const [formData, setFormData] = useState({
    title: "",
    author: "",
    category: "teoria_musical",
    description: "",
    tags: "",
    publication_year: "",
    language: "pt",
    file_url: null
  });

  const { data: documents, isLoading } = useQuery({
    queryKey: ['referenceLibrary'],
    queryFn: () => base44.entities.ReferenceLibrary.list('-created_date'),
    initialData: []
  });

  const { data: existingProgressions } = useQuery({
    queryKey: ['progressions'],
    queryFn: () => base44.entities.Progression.list(),
    initialData: []
  });

  const uploadMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.ReferenceLibrary.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referenceLibrary'] });
      setShowForm(false);
      setFormData({
        title: "",
        author: "",
        category: "teoria_musical",
        description: "",
        tags: "",
        publication_year: "",
        language: "pt",
        file_url: null
      });
      setUploading(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ReferenceLibrary.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referenceLibrary'] });
    }
  });

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const validTypes = ['.pdf', '.doc', '.docx', '.txt'];
    const fileExtension = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();

    if (!validTypes.includes(fileExtension)) {
      alert("Tipo de arquivo não suportado. Use PDF, DOC, DOCX ou TXT.");
      return;
    }

    setUploading(true);

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: selectedFile });
      
      setFormData(prev => ({
        ...prev,
        file_url,
        title: prev.title || selectedFile.name.replace(/\.[^/.]+$/, "")
      }));

      setUploading(false);
    } catch (err) {
      console.error("Erro ao fazer upload:", err);
      alert("Erro ao fazer upload do arquivo");
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.file_url) {
      alert("Por favor, faça upload de um arquivo");
      return;
    }

    const dataToSave = {
      ...formData,
      tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(t => t) : [],
      publication_year: formData.publication_year ? parseInt(formData.publication_year) : null
    };

    uploadMutation.mutate(dataToSave);
  };

  const handleProcessDocument = async (doc) => {
    if (confirm(`Processar e extrair conteúdo do documento "${doc.title}"?\n\nIsso pode levar alguns minutos.`)) {
      setProcessing(true);
      setSelectedDoc(doc);

      try {
        await base44.entities.ReferenceLibrary.update(doc.id, {
          processing_status: 'processing'
        });

        const extractionResult = await base44.integrations.Core.InvokeLLM({
          prompt: `Você é um especialista em teoria musical e música sertaneja.

Analise este documento e extraia:
1. Conceitos-chave mencionados
2. Progressões harmônicas citadas (com patterns em algarismos romanos)
3. Resumo do conteúdo relevante para análise musical

IMPORTANTE: Foque em informações práticas sobre harmonia, progressões, teoria musical aplicada.`,
          file_urls: [doc.file_url],
          response_json_schema: {
            type: "object",
            properties: {
              key_concepts: {
                type: "array",
                items: { type: "string" }
              },
              progressions_mentioned: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    pattern: { type: "string" },
                    context: { type: "string" }
                  }
                }
              },
              extracted_content: {
                type: "string"
              }
            }
          }
        });

        await base44.entities.ReferenceLibrary.update(doc.id, {
          key_concepts: extractionResult.key_concepts || [],
          progressions_mentioned: extractionResult.progressions_mentioned || [],
          extracted_content: extractionResult.extracted_content || "",
          indexed: true,
          processing_status: 'completed'
        });

        queryClient.invalidateQueries({ queryKey: ['referenceLibrary'] });
        alert("✅ Documento processado com sucesso!");
        setSelectedDoc(null);

      } catch (err) {
        console.error("Erro ao processar documento:", err);
        await base44.entities.ReferenceLibrary.update(doc.id, {
          processing_status: 'error'
        });
        alert("❌ Erro ao processar documento");
      } finally {
        setProcessing(false);
      }
    }
  };

  const handleProcessForAulas = async (doc) => {
    if (!confirm(`Processar "${doc.title}" como material pedagógico para o Plano de Aulas?\n\nA IA irá extrair técnicas, sequências de ensino e conteúdo didático.`)) return;

    setProcessingAulas(true);
    setSelectedDoc(doc);

    try {
      await base44.entities.ReferenceLibrary.update(doc.id, { processing_status: 'processing' });

      const resultado = await base44.integrations.Core.InvokeLLM({
        prompt: `Você é um professor especialista em viola caipira, violão e música sertaneja.

Analise este documento pedagógico e extraia TUDO que pode ser usado para estruturar um plano de aulas didático e progressivo:

1. Técnicas específicas de instrumento ensinadas (ex: palhetada alternada, pestana, dedilhado)
2. Sequência pedagógica recomendada pelo autor (do básico ao avançado)
3. Conceitos musicais teóricos abordados (teoria, harmonia, ritmo, cifras)
4. Exercícios e atividades práticas descritos
5. Objetivos de aprendizagem mencionados
6. Ritmos ensinados (guarânia, vanera, rancheira, sertanejo, etc.)
7. Conteúdo resumido de cada capítulo ou seção
8. Observações metodológicas importantes do autor

Seja detalhado e específico. Esse conteúdo será usado diretamente pela IA para gerar um plano de aulas.`,
        file_urls: [doc.file_url],
        response_json_schema: {
          type: "object",
          properties: {
            key_concepts: { type: "array", items: { type: "string" } },
            progressions_mentioned: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  pattern: { type: "string" },
                  context: { type: "string" }
                }
              }
            },
            extracted_content: { type: "string" },
            pedagogical_content: {
              type: "object",
              properties: {
                tecnicas: { type: "array", items: { type: "string" } },
                sequencia_pedagogica: { type: "array", items: { type: "string" } },
                exercicios_descritos: { type: "array", items: { type: "string" } },
                ritmos_ensinados: { type: "array", items: { type: "string" } },
                objetivos_aprendizagem: { type: "array", items: { type: "string" } },
                conteudo_por_capitulo: { type: "array", items: { type: "string" } },
                observacoes_metodologicas: { type: "string" }
              }
            }
          }
        },
        model: 'claude_sonnet_4_6'
      });

      const contentToSave = {
        key_concepts: resultado.key_concepts || [],
        progressions_mentioned: resultado.progressions_mentioned || [],
        extracted_content: resultado.extracted_content || "",
        indexed: true,
        processing_status: 'completed',
        tags: [
          ...(doc.tags || []),
          'plano_aulas',
          ...(resultado.pedagogical_content?.ritmos_ensinados || []).slice(0, 3)
        ].filter((v, i, arr) => arr.indexOf(v) === i)
      };

      // Anexa conteúdo pedagógico ao extracted_content para uso no gerador
      if (resultado.pedagogical_content) {
        const ped = resultado.pedagogical_content;
        const pedagogicalText = `\n\n=== CONTEÚDO PEDAGÓGICO EXTRAÍDO ===\n` +
          (ped.sequencia_pedagogica?.length ? `\nSEQUÊNCIA PEDAGÓGICA:\n${ped.sequencia_pedagogica.map(s => `- ${s}`).join('\n')}` : '') +
          (ped.tecnicas?.length ? `\n\nTÉCNICAS ENSINADAS:\n${ped.tecnicas.map(t => `- ${t}`).join('\n')}` : '') +
          (ped.exercicios_descritos?.length ? `\n\nEXERCÍCIOS:\n${ped.exercicios_descritos.map(e => `- ${e}`).join('\n')}` : '') +
          (ped.ritmos_ensinados?.length ? `\n\nRITMOS:\n${ped.ritmos_ensinados.map(r => `- ${r}`).join('\n')}` : '') +
          (ped.objetivos_aprendizagem?.length ? `\n\nOBJETIVOS:\n${ped.objetivos_aprendizagem.map(o => `- ${o}`).join('\n')}` : '') +
          (ped.conteudo_por_capitulo?.length ? `\n\nCAPÍTULOS/SEÇÕES:\n${ped.conteudo_por_capitulo.map(c => `- ${c}`).join('\n')}` : '') +
          (ped.observacoes_metodologicas ? `\n\nMETODOLOGIA:\n${ped.observacoes_metodologicas}` : '');

        contentToSave.extracted_content = (resultado.extracted_content || '') + pedagogicalText;
      }

      await base44.entities.ReferenceLibrary.update(doc.id, contentToSave);
      queryClient.invalidateQueries({ queryKey: ['referenceLibrary'] });
      alert("✅ Material pedagógico extraído com sucesso!\n\nEste documento agora será usado para enriquecer o Plano de Aulas.");
      setSelectedDoc(null);
    } catch (err) {
      console.error("Erro ao processar para aulas:", err);
      await base44.entities.ReferenceLibrary.update(doc.id, { processing_status: 'error' });
      alert("❌ Erro ao processar documento para aulas");
    } finally {
      setProcessingAulas(false);
    }
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

  const handleIntegrateToSystem = async (doc) => {
    if (!doc.indexed || !doc.progressions_mentioned || doc.progressions_mentioned.length === 0) {
      alert("❌ Documento precisa estar processado e ter progressões identificadas");
      return;
    }

    if (!confirm(`Integrar conhecimento de "${doc.title}" ao sistema?\n\nProgressões existentes serão enriquecidas com nomes alternativos e contextos.`)) {
      return;
    }

    setIntegrating(true);
    setSelectedDoc(doc);

    try {
      let updated = 0;
      let notFound = 0;

      for (const progData of doc.progressions_mentioned) {
        if (!progData.name || !progData.pattern) continue;

        const normalizedPattern = normalizePattern(progData.pattern);

        // Busca progressão existente por PATTERN (mais confiável que nome)
        let existing = existingProgressions.find(p => {
          const existingPattern = normalizePattern(p.pattern);
          return existingPattern === normalizedPattern;
        });

        // Se não encontrou por pattern, tenta por variações
        if (!existing) {
          existing = existingProgressions.find(p => {
            if (p.variations && Array.isArray(p.variations)) {
              return p.variations.some(v => 
                normalizePattern(v.pattern) === normalizedPattern
              );
            }
            return false;
          });
        }

        // Se não encontrou por pattern/variações, tenta por nome similar
        if (!existing) {
          existing = existingProgressions.find(p => 
            p.name?.toLowerCase().includes(progData.name.toLowerCase()) ||
            progData.name.toLowerCase().includes(p.name?.toLowerCase() || '')
          );
        }

        if (existing) {
          console.log(`🎯 MATCH! "${progData.name}" → "${existing.name}" (${existing.pattern})`);

          // Enriquece a progressão existente
          const newDescription = existing.description 
            ? `${existing.description}\n\n📚 ${doc.title}: ${progData.context || ''}\n💡 Também conhecida como: "${progData.name}"`
            : `📚 ${doc.title}: ${progData.context || 'Conhecimento extraído de material de referência'}\n💡 Também conhecida como: "${progData.name}"`;

          const newExamples = existing.examples || [];
          const sourceNote = `📖 ${doc.title}${doc.author ? ` - ${doc.author}` : ''} (${progData.name})`;
          if (!newExamples.some(ex => ex.includes(doc.title))) {
            newExamples.push(sourceNote);
          }

          // Adiciona como variação se o pattern for diferente do principal
          let newVariations = existing.variations || [];
          const hasThisVariation = newVariations.some(v => 
            normalizePattern(v.pattern) === normalizedPattern
          );
          
          if (!hasThisVariation && normalizePattern(existing.pattern) !== normalizedPattern) {
            newVariations.push({
              pattern: progData.pattern,
              description: progData.context || `Variação mencionada em ${doc.title}`,
              name: progData.name
            });
          }

          await base44.entities.Progression.update(existing.id, {
            description: newDescription,
            examples: newExamples,
            variations: newVariations
          });
          updated++;
        } else {
          console.log(`❌ NÃO ENCONTRADA: "${progData.name}" (${progData.pattern})`);
          notFound++;
        }
      }

      // Marca documento como integrado
      await base44.entities.ReferenceLibrary.update(doc.id, {
        system_integrated: true,
        integration_date: new Date().toISOString()
      });

      queryClient.invalidateQueries({ queryKey: ['referenceLibrary'] });
      queryClient.invalidateQueries({ queryKey: ['progressions'] });

      let message = `✅ Integração concluída!\n\n${updated} progressões enriquecidas com novos nomes e contextos`;
      if (notFound > 0) {
        message += `\n\n⚠️ ${notFound} progressões não encontradas no sistema`;
      }
      
      alert(message);
      setSelectedDoc(null);

    } catch (err) {
      console.error("Erro ao integrar:", err);
      alert("❌ Erro ao integrar conteúdo ao sistema");
    } finally {
      setIntegrating(false);
    }
  };

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = 
      doc.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.author?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = categoryFilter === "all" || doc.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="bg-amber-50 p-4 min-h-screen md:p-8">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-[#8B6F47] mb-2" style={{ letterSpacing: '0.5px' }}>
                📚 Biblioteca de Referências
              </h1>
              <p className="text-[#A68A64]">
                Material de estudo para aprimorar análises musicais do sistema
              </p>
            </div>
            <Button
              onClick={() => setShowForm(!showForm)}
              className="bg-gradient-to-r from-[#8B6F47] to-[#A68A64] hover:from-[#A68A64] hover:to-[#8B6F47] text-white shadow-lg"
            >
              <Upload className="w-5 h-5 mr-2" />
              Adicionar Documento
            </Button>
          </div>
        </motion.div>

        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="border-[#D4C5B0] bg-white/80 backdrop-blur-sm shadow-xl mb-8">
                <CardHeader className="border-b border-[#D4C5B0]">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-[#8B6F47] flex items-center gap-2">
                      <BookOpen className="w-6 h-6" />
                      Novo Documento
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowForm(false)}
                      className="text-[#A68A64]"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div
                      className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer ${
                        formData.file_url
                          ? 'border-[#9CAF88] bg-[#9CAF88]/5'
                          : 'border-[#D4C5B0] hover:border-[#8B6F47] hover:bg-[#8B6F47]/5'
                      }`}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx,.txt"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      {uploading ? (
                        <>
                          <Loader2 className="w-12 h-12 text-[#8B6F47] mx-auto mb-3 animate-spin" />
                          <p className="text-[#8B6F47] font-medium">Fazendo upload...</p>
                        </>
                      ) : formData.file_url ? (
                        <>
                          <CheckCircle className="w-12 h-12 text-[#9CAF88] mx-auto mb-3" />
                          <p className="text-[#8B6F47] font-medium">Arquivo enviado!</p>
                          <p className="text-sm text-[#A68A64] mt-2">
                            Clique para substituir
                          </p>
                        </>
                      ) : (
                        <>
                          <Upload className="w-12 h-12 text-[#A68A64] mx-auto mb-3" />
                          <p className="text-[#8B6F47] font-medium mb-1">
                            Clique para fazer upload
                          </p>
                          <p className="text-sm text-[#A68A64]">
                            PDF, DOC, DOCX ou TXT
                          </p>
                        </>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[#8B6F47]">Título</Label>
                        <Input
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          placeholder="Ex: Harmonia Funcional - Teoria e Prática"
                          className="border-[#D4C5B0]"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[#8B6F47]">Autor</Label>
                        <Input
                          value={formData.author}
                          onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                          placeholder="Ex: João Silva"
                          className="border-[#D4C5B0]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[#8B6F47]">Categoria</Label>
                        <Select
                          value={formData.category}
                          onValueChange={(value) => setFormData({ ...formData, category: value })}
                        >
                          <SelectTrigger className="border-[#D4C5B0]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(categoryLabels).map(([key, label]) => (
                              <SelectItem key={key} value={key}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[#8B6F47]">Ano</Label>
                        <Input
                          type="number"
                          value={formData.publication_year}
                          onChange={(e) => setFormData({ ...formData, publication_year: e.target.value })}
                          placeholder="Ex: 2020"
                          className="border-[#D4C5B0]"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[#8B6F47]">Idioma</Label>
                        <Select
                          value={formData.language}
                          onValueChange={(value) => setFormData({ ...formData, language: value })}
                        >
                          <SelectTrigger className="border-[#D4C5B0]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pt">Português</SelectItem>
                            <SelectItem value="en">Inglês</SelectItem>
                            <SelectItem value="es">Espanhol</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[#8B6F47]">Descrição</Label>
                      <Textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Breve descrição do conteúdo..."
                        className="border-[#D4C5B0] h-24"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[#8B6F47]">Tags (separadas por vírgula)</Label>
                      <Input
                        value={formData.tags}
                        onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                        placeholder="Ex: harmonia, progressões, teoria"
                        className="border-[#D4C5B0]"
                      />
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowForm(false)}
                        className="flex-1"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        disabled={uploadMutation.isPending || !formData.file_url}
                        className="flex-1 bg-gradient-to-r from-[#8B6F47] to-[#A68A64] text-white"
                      >
                        {uploadMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4 mr-2" />
                        )}
                        Salvar Documento
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <Card className="border-[#D4C5B0] bg-white/60 backdrop-blur-sm mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#A68A64]" />
                <Input
                  placeholder="Buscar documentos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white border-[#D4C5B0]"
                />
              </div>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full md:w-64 bg-white border-[#D4C5B0]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Categorias</SelectItem>
                  {Object.entries(categoryLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-12 h-12 text-[#8B6F47] mx-auto mb-4 animate-spin" />
            <p className="text-[#A68A64]">Carregando documentos...</p>
          </div>
        ) : filteredDocs.length === 0 ? (
          <Card className="border-[#D4C5B0] bg-white/60">
            <CardContent className="p-12 text-center">
              <BookOpen className="w-16 h-16 text-[#A68A64] mx-auto mb-4 opacity-30" />
              <h3 className="text-xl font-bold text-[#8B6F47] mb-2">
                Nenhum documento encontrado
              </h3>
              <p className="text-[#A68A64] mb-6">
                Adicione livros e artigos para aprimorar o sistema
              </p>
              <Button
                onClick={() => setShowForm(true)}
                className="bg-gradient-to-r from-[#8B6F47] to-[#A68A64] text-white"
              >
                <Upload className="w-4 h-4 mr-2" />
                Adicionar Primeiro Documento
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredDocs.map((doc) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="border-[#D4C5B0] bg-white/80 hover:shadow-xl transition-all duration-300">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg text-[#8B6F47] mb-2 flex items-center gap-2">
                          <FileText className="w-5 h-5 flex-shrink-0" />
                          <span className="truncate">{doc.title}</span>
                        </CardTitle>
                        {doc.author && (
                          <p className="text-sm text-[#A68A64]">
                            Por {doc.author}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm(`Excluir "${doc.title}"?`)) {
                            deleteMutation.mutate(doc.id);
                          }
                        }}
                        className="text-red-600 hover:bg-red-50 flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge className={`${categoryColors[doc.category]} border`}>
                        {categoryLabels[doc.category]}
                      </Badge>
                      {doc.indexed && (
                        <Badge className="bg-green-100 text-green-800 border-green-200">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Processado
                        </Badge>
                      )}
                      {doc.system_integrated && (
                        <Badge className="bg-gradient-to-r from-[#D4AF37] to-[#9CAF88] text-white border-none">
                          <Database className="w-3 h-3 mr-1" />
                          Integrado
                        </Badge>
                      )}
                      {doc.processing_status === 'processing' && (
                        <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Processando...
                        </Badge>
                      )}
                      {doc.processing_status === 'error' && (
                        <Badge className="bg-red-100 text-red-800 border-red-200">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Erro
                        </Badge>
                      )}
                    </div>

                    {doc.description && (
                      <p className="text-sm text-[#A68A64] line-clamp-2">
                        {doc.description}
                      </p>
                    )}

                    {doc.key_concepts && doc.key_concepts.length > 0 && (
                      <div className="bg-[#F5F1E8] rounded-lg p-3">
                        <p className="text-xs text-[#8B6F47] font-semibold mb-2">
                          🎯 Conceitos Extraídos:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {doc.key_concepts.slice(0, 5).map((concept, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {concept}
                            </Badge>
                          ))}
                          {doc.key_concepts.length > 5 && (
                            <Badge variant="outline" className="text-xs">
                              +{doc.key_concepts.length - 5}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {doc.progressions_mentioned && doc.progressions_mentioned.length > 0 && (
                      <div className="bg-[#D4AF37]/10 rounded-lg p-3">
                        <p className="text-xs text-[#8B6F47] font-semibold mb-2">
                          🎵 Progressões Mencionadas: {doc.progressions_mentioned.length}
                        </p>
                      </div>
                    )}

                    <div className="flex flex-col gap-2 pt-2">
                      <div className="flex gap-2">
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1"
                        >
                          <Button
                            variant="outline"
                            className="w-full border-[#8B6F47] text-[#8B6F47] hover:bg-[#8B6F47] hover:text-white"
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Abrir Arquivo
                          </Button>
                        </a>
                        {!doc.indexed && doc.processing_status !== 'processing' && (
                          <Button
                            onClick={() => handleProcessDocument(doc)}
                            disabled={processing && selectedDoc?.id === doc.id}
                            variant="outline"
                            className="flex-1 border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-white"
                          >
                            {processing && selectedDoc?.id === doc.id ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Brain className="w-4 h-4 mr-2" />
                            )}
                            Processar
                          </Button>
                        )}
                        {doc.extracted_content && (
                          <Button
                            onClick={() => setSelectedDoc(doc)}
                            variant="outline"
                            size="icon"
                            className="border-[#9CAF88] text-[#9CAF88] hover:bg-[#9CAF88] hover:text-white"
                            title="Ver conteúdo extraído"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      
                      {/* Botão: Processar para Plano de Aulas */}
                      {(doc.category === 'plano_aulas' || doc.tags?.includes('plano_aulas')) &&
                        (!doc.indexed || doc.processing_status === 'error') &&
                        doc.processing_status !== 'processing' && (
                        <Button
                          onClick={() => handleProcessForAulas(doc)}
                          disabled={processingAulas && selectedDoc?.id === doc.id}
                          className="w-full bg-gradient-to-r from-violet-600 to-purple-700 hover:from-purple-700 hover:to-violet-600 text-white shadow-lg"
                        >
                          {processingAulas && selectedDoc?.id === doc.id ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <GraduationCap className="w-4 h-4 mr-2" />
                          )}
                          Processar para Plano de Aulas
                        </Button>
                      )}

                      {/* Botão: Re-processar para Aulas (já processado) */}
                      {(doc.category === 'plano_aulas' || doc.tags?.includes('plano_aulas')) &&
                        doc.indexed && doc.processing_status === 'completed' && (
                        <Button
                          onClick={() => handleProcessForAulas(doc)}
                          disabled={processingAulas && selectedDoc?.id === doc.id}
                          variant="outline"
                          className="w-full border-violet-500 text-violet-700 hover:bg-violet-50"
                        >
                          {processingAulas && selectedDoc?.id === doc.id ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <GraduationCap className="w-4 h-4 mr-2" />
                          )}
                          Re-processar para Plano de Aulas
                        </Button>
                      )}

                      {doc.indexed && !doc.system_integrated && doc.progressions_mentioned?.length > 0 && (
                        <Button
                          onClick={() => handleIntegrateToSystem(doc)}
                          disabled={integrating && selectedDoc?.id === doc.id}
                          className="w-full bg-gradient-to-r from-[#D4AF37] to-[#9CAF88] hover:from-[#9CAF88] hover:to-[#D4AF37] text-white shadow-lg"
                        >
                          {integrating && selectedDoc?.id === doc.id ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Database className="w-4 h-4 mr-2" />
                          )}
                          Integrar ao Sistema
                        </Button>
                      )}

                      {doc.system_integrated && (
                        <Alert className="bg-gradient-to-r from-[#D4AF37]/10 to-[#9CAF88]/10 border-[#D4AF37]">
                          <CheckCircle className="h-4 w-4 text-[#D4AF37]" />
                          <AlertDescription className="text-xs text-[#8B6F47]">
                            ✅ Conhecimento integrado à base do sistema
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {selectedDoc && selectedDoc.extracted_content && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-y-auto p-4"
            onClick={() => setSelectedDoc(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="max-w-4xl mx-auto my-8"
              onClick={(e) => e.stopPropagation()}
            >
              <Card className="border-[#D4C5B0] bg-white shadow-2xl">
                <CardHeader className="border-b border-[#D4C5B0]">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-[#8B6F47]">
                      {selectedDoc.title} - Conteúdo Extraído
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedDoc(null)}
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6 max-h-[70vh] overflow-y-auto">
                  <div className="prose prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap font-sans text-sm text-[#2d1810] leading-relaxed">
                      {selectedDoc.extracted_content}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}