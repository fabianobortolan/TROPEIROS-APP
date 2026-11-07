import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Target, Plus, BookOpen, CheckCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function ManualTraining() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    chords: "",
    key: "",
    pattern: "",
    progression_name: "",
    section_type: "verso",
    observations: "",
    example_song: ""
  });

  const { data: progressions } = useQuery({
    queryKey: ['progressions'],
    queryFn: () => base44.entities.Progression.list(),
    initialData: []
  });

  const createPatternMutation = useMutation({
    mutationFn: async (data) => {
      // Extrai regras das observações
      const extractedRules = [];
      const obs = data.observations.toLowerCase();

      if (obs.includes('refrão') || obs.includes('refrao')) {
        extractedRules.push({ type: 'section_preference', value: 'refrão', context: data.observations });
      }
      if (obs.includes('verso')) {
        extractedRules.push({ type: 'section_preference', value: 'verso', context: data.observations });
      }
      if (obs.includes('romântic') || obs.includes('romantico')) {
        extractedRules.push({ type: 'style_hint', value: 'romantico', context: data.observations });
      }
      if (obs.includes('moderno')) {
        extractedRules.push({ type: 'style_hint', value: 'moderno', context: data.observations });
      }
      if (obs.includes('raiz')) {
        extractedRules.push({ type: 'style_hint', value: 'raiz', context: data.observations });
      }
      if (obs.includes('sempre') || obs.includes('geralmente')) {
        extractedRules.push({ type: 'frequency_high', context: data.observations });
      }

      const patternData = {
        chords: data.chords.split(',').map(c => c.trim()).filter(c => c),
        key: data.key,
        pattern: data.pattern,
        progression_name: data.progression_name,
        section_type: data.section_type,
        observations: data.observations,
        extracted_rules: extractedRules,
        times_seen: 1,
        times_corrected: 0,
        confidence: 100, // Confiança inicial alta para treino manual
        source_songs: [],
        last_used: new Date().toISOString().split('T')[0]
      };

      return await base44.entities.LearningPattern.create(patternData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learningPatterns'] });
      setFormData({
        chords: "",
        key: "",
        pattern: "",
        progression_name: "",
        section_type: "verso",
        observations: "",
        example_song: ""
      });
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.chords || !formData.key || !formData.pattern || !formData.progression_name) {
      alert("⚠️ Preencha os campos obrigatórios: acordes, tonalidade, padrão e nome da progressão");
      return;
    }
    await createPatternMutation.mutateAsync(formData);
  };

  return (
    <div className="space-y-6">
      <Card className="border-[#8B6F47]">
        <CardHeader className="bg-gradient-to-r from-[#8B6F47] to-[#A68A64] text-white">
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Treinar IA com Exemplos Específicos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-[#A68A64] mb-6">
            Use este formulário para ensinar manualmente à IA padrões específicos ou nichos que você deseja que o sistema reconheça melhor.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#8B6F47] font-medium">
                  Acordes * <span className="text-xs text-[#A68A64]">(separados por vírgula)</span>
                </Label>
                <Input
                  value={formData.chords}
                  onChange={(e) => setFormData({ ...formData, chords: e.target.value })}
                  placeholder="Ex: C, Am, F, G"
                  className="border-[#D4C5B0] focus:border-[#8B6F47]"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[#8B6F47] font-medium">Tonalidade *</Label>
                <Input
                  value={formData.key}
                  onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                  placeholder="Ex: C, G, D"
                  className="border-[#D4C5B0] focus:border-[#8B6F47]"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#8B6F47] font-medium">Padrão (Algarismos Romanos) *</Label>
                <Input
                  value={formData.pattern}
                  onChange={(e) => setFormData({ ...formData, pattern: e.target.value })}
                  placeholder="Ex: I-vi-IV-V"
                  className="border-[#D4C5B0] focus:border-[#8B6F47]"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[#8B6F47] font-medium">Nome da Progressão *</Label>
                <Select
                  value={formData.progression_name}
                  onValueChange={(value) => setFormData({ ...formData, progression_name: value })}
                >
                  <SelectTrigger className="border-[#D4C5B0] focus:border-[#8B6F47]">
                    <SelectValue placeholder="Selecione ou digite..." />
                  </SelectTrigger>
                  <SelectContent>
                    {progressions.map((prog) => (
                      <SelectItem key={prog.id} value={prog.name}>
                        {prog.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#8B6F47] font-medium">Tipo de Seção</Label>
                <Select
                  value={formData.section_type}
                  onValueChange={(value) => setFormData({ ...formData, section_type: value })}
                >
                  <SelectTrigger className="border-[#D4C5B0] focus:border-[#8B6F47]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="intro">Intro</SelectItem>
                    <SelectItem value="verso">Verso</SelectItem>
                    <SelectItem value="pre-refrão">Pré-Refrão</SelectItem>
                    <SelectItem value="refrão">Refrão</SelectItem>
                    <SelectItem value="ponte">Ponte</SelectItem>
                    <SelectItem value="solo">Solo</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[#8B6F47] font-medium">Música de Exemplo (Opcional)</Label>
                <Input
                  value={formData.example_song}
                  onChange={(e) => setFormData({ ...formData, example_song: e.target.value })}
                  placeholder="Ex: Evidências - Chitãozinho & Xororó"
                  className="border-[#D4C5B0] focus:border-[#8B6F47]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[#8B6F47] font-medium">
                Observações e Orientações para a IA
              </Label>
              <Textarea
                value={formData.observations}
                onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                placeholder="Ex: Esta progressão é muito comum em refrões de sertanejo romântico moderno. Sempre aparece em músicas emotivas. A variação mais comum inclui um acorde de sétima no segundo grau..."
                className="h-24 border-[#D4C5B0] focus:border-[#8B6F47]"
              />
              <p className="text-xs text-[#A68A64]">
                💡 Dica: Inclua palavras-chave como "sempre", "geralmente", "refrão", "verso", "romântico", "moderno", etc. A IA extrairá regras automaticamente.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormData({
                  chords: "",
                  key: "",
                  pattern: "",
                  progression_name: "",
                  section_type: "verso",
                  observations: "",
                  example_song: ""
                })}
                className="border-[#D4C5B0]"
              >
                Limpar
              </Button>
              <Button
                type="submit"
                disabled={createPatternMutation.isPending}
                className="bg-gradient-to-r from-[#8B6F47] to-[#A68A64] text-white"
              >
                {createPatternMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Padrão
                  </>
                )}
              </Button>
            </div>
          </form>

          {createPatternMutation.isSuccess && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2"
            >
              <CheckCircle className="w-5 h-5 text-green-600" />
              <p className="text-green-800 font-medium">
                ✓ Padrão adicionado com sucesso! A IA agora reconhecerá este padrão.
              </p>
            </motion.div>
          )}
        </CardContent>
      </Card>

      <Card className="border-[#9CAF88]">
        <CardHeader>
          <CardTitle className="text-[#8B6F47] flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Dicas para Treinamento Eficaz
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-3 bg-[#F5F1E8] rounded-lg">
            <p className="font-medium text-[#8B6F47] mb-1">🎯 Seja Específico</p>
            <p className="text-sm text-[#8B6F47]">
              Quanto mais detalhadas forem suas observações, melhor a IA aprenderá o contexto de uso da progressão.
            </p>
          </div>
          <div className="p-3 bg-[#F5F1E8] rounded-lg">
            <p className="font-medium text-[#8B6F47] mb-1">🔄 Use Palavras-Chave</p>
            <p className="text-sm text-[#8B6F47]">
              Termos como "sempre", "raramente", "refrão", "verso", "romântico" ajudam o sistema a criar regras automáticas.
            </p>
          </div>
          <div className="p-3 bg-[#F5F1E8] rounded-lg">
            <p className="font-medium text-[#8B6F47] mb-1">📝 Documente Exceções</p>
            <p className="text-sm text-[#8B6F47]">
              Se um padrão tem variações importantes ou contextos específicos de uso, mencione nas observações.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}