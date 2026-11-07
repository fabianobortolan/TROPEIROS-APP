import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  X, Save, Plus, Trash2, Brain, Guitar, Music, Calendar, Loader2 
} from "lucide-react";
import { motion } from "framer-motion";

const THEORY_TOPICS = [
  "Escala Maior", "Escala Menor Natural", "Escala Menor Harmônica", "Escala Pentatônica",
  "Campo Harmônico Maior", "Campo Harmônico Menor", "Modos Gregos",
  "Intervalos", "Formação de Acordes", "Progressões Harmônicas",
  "Cadências", "Modulação", "Harmonia Funcional"
];

const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const TECHNIQUE_CATEGORIES = [
  { value: "palhetada", label: "Palhetada" },
  { value: "dedilhado", label: "Dedilhado" },
  { value: "acordes", label: "Acordes" },
  { value: "ritmo", label: "Ritmo" },
  { value: "velocidade", label: "Velocidade" },
  { value: "transicao", label: "Transição" }
];

const FOCUS_OPTIONS = [
  "Música completa", "Intro", "Verso", "Pré-refrão", "Refrão", "Ponte", "Solo", "Outro"
];

export default function StudyPlanForm({ plan, onClose }) {
  const queryClient = useQueryClient();
  const isEditing = !!plan?.id;

  const [formData, setFormData] = useState({
    name: plan?.name || "",
    week_start: plan?.week_start || "",
    week_end: plan?.week_end || "",
    description: plan?.description || "",
    status: plan?.status || "rascunho",
    theory_topics: plan?.theory_topics || [],
    technique_exercises: plan?.technique_exercises || [],
    repertoire_songs: plan?.repertoire_songs || [],
    daily_schedule: plan?.daily_schedule || {},
    total_hours: plan?.total_hours || 0
  });

  const { data: songs } = useQuery({
    queryKey: ['songs'],
    queryFn: () => base44.fetchAllSongs(),
    initialData: []
  });

  const { data: rhythms } = useQuery({
    queryKey: ['rhythms'],
    queryFn: () => base44.entities.Rhythm.list(),
    initialData: []
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.StudyPlan.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-plans'] });
      onClose();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.StudyPlan.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-plans'] });
      onClose();
    }
  });

  const handleSubmit = () => {
    if (isEditing) {
      updateMutation.mutate({ id: plan.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  // Teoria
  const addTheoryTopic = () => {
    setFormData(prev => ({
      ...prev,
      theory_topics: [...prev.theory_topics, { topic: "", key: "C", duration_minutes: 15, notes: "" }]
    }));
  };

  const updateTheoryTopic = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      theory_topics: prev.theory_topics.map((t, i) => i === index ? { ...t, [field]: value } : t)
    }));
  };

  const removeTheoryTopic = (index) => {
    setFormData(prev => ({
      ...prev,
      theory_topics: prev.theory_topics.filter((_, i) => i !== index)
    }));
  };

  // Técnica
  const addTechniqueExercise = () => {
    setFormData(prev => ({
      ...prev,
      technique_exercises: [...prev.technique_exercises, { 
        exercise: "", category: "ritmo", rhythm: "", bpm_start: 60, bpm_goal: 100, duration_minutes: 15, notes: "" 
      }]
    }));
  };

  const updateTechniqueExercise = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      technique_exercises: prev.technique_exercises.map((t, i) => i === index ? { ...t, [field]: value } : t)
    }));
  };

  const removeTechniqueExercise = (index) => {
    setFormData(prev => ({
      ...prev,
      technique_exercises: prev.technique_exercises.filter((_, i) => i !== index)
    }));
  };

  // Repertório
  const addRepertoireSong = () => {
    setFormData(prev => ({
      ...prev,
      repertoire_songs: [...prev.repertoire_songs, { 
        song_id: "", song_title: "", song_artist: "", focus: "Música completa", key: "", rhythm: "", notes: "" 
      }]
    }));
  };

  const updateRepertoireSong = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      repertoire_songs: prev.repertoire_songs.map((s, i) => i === index ? { ...s, [field]: value } : s)
    }));
  };

  const selectSong = (index, songId) => {
    const song = songs.find(s => s.id === songId);
    if (song) {
      setFormData(prev => ({
        ...prev,
        repertoire_songs: prev.repertoire_songs.map((s, i) => i === index ? {
          ...s,
          song_id: song.id,
          song_title: song.title,
          song_artist: song.artist,
          key: song.main_key || "",
          rhythm: song.rhythm_name || ""
        } : s)
      }));
    }
  };

  const removeRepertoireSong = (index) => {
    setFormData(prev => ({
      ...prev,
      repertoire_songs: prev.repertoire_songs.filter((_, i) => i !== index)
    }));
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-8"
      >
        <div className="p-6 border-b border-[#D4C5B0] flex items-center justify-between">
          <h2 className="text-2xl font-bold text-[#8B6F47]">
            {isEditing ? "Editar Plano" : "Novo Plano de Estudos"}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Info Básica */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome do Plano *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Semana 1 - Iniciante"
                className="border-[#D4C5B0]"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}
              >
                <SelectTrigger className="border-[#D4C5B0]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rascunho">Rascunho</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data Início</Label>
              <Input
                type="date"
                value={formData.week_start}
                onChange={(e) => setFormData(prev => ({ ...prev, week_start: e.target.value }))}
                className="border-[#D4C5B0]"
              />
            </div>
            <div className="space-y-2">
              <Label>Data Fim</Label>
              <Input
                type="date"
                value={formData.week_end}
                onChange={(e) => setFormData(prev => ({ ...prev, week_end: e.target.value }))}
                className="border-[#D4C5B0]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Objetivos e observações gerais do plano..."
              className="border-[#D4C5B0]"
            />
          </div>

          {/* Tabs para cada seção */}
          <Tabs defaultValue="theory" className="w-full">
            <TabsList className="w-full bg-[#E8DCC4]">
              <TabsTrigger value="theory" className="flex-1 data-[state=active]:bg-[#8B6F47] data-[state=active]:text-white">
                <Brain className="w-4 h-4 mr-2" />
                Teoria ({formData.theory_topics.length})
              </TabsTrigger>
              <TabsTrigger value="technique" className="flex-1 data-[state=active]:bg-[#D4AF37] data-[state=active]:text-white">
                <Guitar className="w-4 h-4 mr-2" />
                Técnica ({formData.technique_exercises.length})
              </TabsTrigger>
              <TabsTrigger value="repertoire" className="flex-1 data-[state=active]:bg-[#9CAF88] data-[state=active]:text-white">
                <Music className="w-4 h-4 mr-2" />
                Repertório ({formData.repertoire_songs.length})
              </TabsTrigger>
            </TabsList>

            {/* TEORIA */}
            <TabsContent value="theory" className="mt-4 space-y-4">
              {formData.theory_topics.map((topic, index) => (
                <Card key={index} className="border-[#D4C5B0]">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="md:col-span-2">
                        <Label className="text-xs">Tópico</Label>
                        <Select
                          value={topic.topic}
                          onValueChange={(v) => updateTheoryTopic(index, 'topic', v)}
                        >
                          <SelectTrigger className="border-[#D4C5B0]">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            {THEORY_TOPICS.map(t => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Tonalidade</Label>
                        <Select
                          value={topic.key}
                          onValueChange={(v) => updateTheoryTopic(index, 'key', v)}
                        >
                          <SelectTrigger className="border-[#D4C5B0]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {KEYS.map(k => (
                              <SelectItem key={k} value={k}>{k}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <Label className="text-xs">Minutos</Label>
                          <Input
                            type="number"
                            value={topic.duration_minutes}
                            onChange={(e) => updateTheoryTopic(index, 'duration_minutes', parseInt(e.target.value) || 0)}
                            className="border-[#D4C5B0]"
                          />
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-red-500"
                          onClick={() => removeTheoryTopic(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-2">
                      <Input
                        placeholder="Observações..."
                        value={topic.notes}
                        onChange={(e) => updateTheoryTopic(index, 'notes', e.target.value)}
                        className="border-[#D4C5B0] text-sm"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Button
                variant="outline"
                onClick={addTheoryTopic}
                className="w-full border-dashed border-[#8B6F47] text-[#8B6F47]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Tópico de Teoria
              </Button>
            </TabsContent>

            {/* TÉCNICA */}
            <TabsContent value="technique" className="mt-4 space-y-4">
              {formData.technique_exercises.map((exercise, index) => (
                <Card key={index} className="border-[#D4C5B0]">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="md:col-span-2">
                        <Label className="text-xs">Exercício</Label>
                        <Input
                          value={exercise.exercise}
                          onChange={(e) => updateTechniqueExercise(index, 'exercise', e.target.value)}
                          placeholder="Nome do exercício"
                          className="border-[#D4C5B0]"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Categoria</Label>
                        <Select
                          value={exercise.category}
                          onValueChange={(v) => updateTechniqueExercise(index, 'category', v)}
                        >
                          <SelectTrigger className="border-[#D4C5B0]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TECHNIQUE_CATEGORIES.map(c => (
                              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Ritmo</Label>
                        <Select
                          value={exercise.rhythm}
                          onValueChange={(v) => updateTechniqueExercise(index, 'rhythm', v)}
                        >
                          <SelectTrigger className="border-[#D4C5B0]">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            {rhythms.map(r => (
                              <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mt-3">
                      <div>
                        <Label className="text-xs">BPM Inicial</Label>
                        <Input
                          type="number"
                          value={exercise.bpm_start}
                          onChange={(e) => updateTechniqueExercise(index, 'bpm_start', parseInt(e.target.value) || 0)}
                          className="border-[#D4C5B0]"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">BPM Meta</Label>
                        <Input
                          type="number"
                          value={exercise.bpm_goal}
                          onChange={(e) => updateTechniqueExercise(index, 'bpm_goal', parseInt(e.target.value) || 0)}
                          className="border-[#D4C5B0]"
                        />
                      </div>
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <Label className="text-xs">Minutos</Label>
                          <Input
                            type="number"
                            value={exercise.duration_minutes}
                            onChange={(e) => updateTechniqueExercise(index, 'duration_minutes', parseInt(e.target.value) || 0)}
                            className="border-[#D4C5B0]"
                          />
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-red-500"
                          onClick={() => removeTechniqueExercise(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Button
                variant="outline"
                onClick={addTechniqueExercise}
                className="w-full border-dashed border-[#D4AF37] text-[#D4AF37]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Exercício Técnico
              </Button>
            </TabsContent>

            {/* REPERTÓRIO */}
            <TabsContent value="repertoire" className="mt-4 space-y-4">
              {formData.repertoire_songs.map((song, index) => (
                <Card key={index} className="border-[#D4C5B0]">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="md:col-span-2">
                        <Label className="text-xs">Música</Label>
                        <Select
                          value={song.song_id}
                          onValueChange={(v) => selectSong(index, v)}
                        >
                          <SelectTrigger className="border-[#D4C5B0]">
                            <SelectValue placeholder="Selecione uma música..." />
                          </SelectTrigger>
                          <SelectContent>
                            {songs.map(s => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.title} - {s.artist}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Foco do Estudo</Label>
                        <Select
                          value={song.focus}
                          onValueChange={(v) => updateRepertoireSong(index, 'focus', v)}
                        >
                          <SelectTrigger className="border-[#D4C5B0]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FOCUS_OPTIONS.map(f => (
                              <SelectItem key={f} value={f}>{f}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {song.song_id && (
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {song.key && (
                          <Badge className="bg-[#9CAF88]/20 text-[#8B6F47]">Tom: {song.key}</Badge>
                        )}
                        {song.rhythm && (
                          <Badge className="bg-[#D4AF37]/20 text-[#8B6F47]">Ritmo: {song.rhythm}</Badge>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Input
                        placeholder="Observações..."
                        value={song.notes}
                        onChange={(e) => updateRepertoireSong(index, 'notes', e.target.value)}
                        className="border-[#D4C5B0] text-sm flex-1"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-red-500"
                        onClick={() => removeRepertoireSong(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Button
                variant="outline"
                onClick={addRepertoireSong}
                className="w-full border-dashed border-[#9CAF88] text-[#9CAF88]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Música do Repertório
              </Button>
            </TabsContent>
          </Tabs>
        </div>

        <div className="p-6 border-t border-[#D4C5B0] flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} className="border-[#D4C5B0]">
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!formData.name || isLoading}
            className="bg-gradient-to-r from-[#8B6F47] to-[#A68A64] text-white"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {isEditing ? "Salvar Alterações" : "Criar Plano"}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}