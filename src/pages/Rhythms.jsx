import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useVisibleData } from "../components/utils/useVisibleData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Music4, Edit, Trash2, X, Save, Search, Upload, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import RhythmCard from "../components/rhythms/RhythmCard";

export default function Rhythms() {
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
    initialData: null,
  });
  const isAdmin = currentUser?.role === "admin";

  const [showForm, setShowForm] = useState(false);
  const [editingRhythm, setEditingRhythm] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [uploadingBacking, setUploadingBacking] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    pattern: "",
    sound: "",
    diagram_pattern: "",
    description: "",
    time_signature: "4/4",
    audio_url: "",
    backing_track_url: "",
    backing_track_bpm: 100,
    examples: ""
  });

  const { data: rhythms, isLoading } = useVisibleData('Rhythm', { sort: '-created_date' });

  const { data: songs } = useQuery({
    queryKey: ['songs'],
    queryFn: () => base44.fetchAllSongs(),
    initialData: []
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Rhythm.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rhythms'] });
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Rhythm.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rhythms'] });
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Rhythm.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rhythms'] });
    }
  });

  const handleBackingTrackUpload = async (rhythm, file) => {
    setUploadingBacking(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.Rhythm.update(rhythm.id, { backing_track_url: file_url });
      queryClient.invalidateQueries({ queryKey: ['rhythms'] });
    } catch (error) {
      console.error("Erro ao fazer upload da backing track:", error);
      alert("Erro ao fazer upload da backing track. Tente novamente.");
    } finally {
      setUploadingBacking(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      pattern: "",
      sound: "",
      diagram_pattern: "",
      description: "",
      time_signature: "4/4",
      audio_url: "",
      backing_track_url: "",
      backing_track_bpm: 100,
      examples: ""
    });
    setShowForm(false);
    setEditingRhythm(null);
  };

  const handleEdit = (rhythm) => {
    setEditingRhythm(rhythm);
    setFormData({
      name: rhythm.name || "",
      pattern: rhythm.pattern || "",
      sound: rhythm.sound || "",
      diagram_pattern: rhythm.diagram_pattern || "",
      description: rhythm.description || "",
      time_signature: rhythm.time_signature || "4/4",
      audio_url: rhythm.audio_url || "",
      backing_track_url: rhythm.backing_track_url || "",
      backing_track_bpm: rhythm.backing_track_bpm || 100,
      examples: rhythm.examples?.join(", ") || ""
    });
    setShowForm(true);
  };

  const handleAudioUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAudio(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, audio_url: file_url });
    } catch (error) {
      console.error("Erro ao fazer upload do áudio:", error);
      alert("Erro ao fazer upload do áudio. Tente novamente.");
    } finally {
      setUploadingAudio(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const dataToSave = {
      name: formData.name,
      pattern: formData.pattern,
      sound: formData.sound,
      diagram_pattern: formData.diagram_pattern,
      description: formData.description,
      time_signature: formData.time_signature,
      audio_url: formData.audio_url,
      backing_track_url: formData.backing_track_url || null,
      backing_track_bpm: formData.backing_track_bpm || null,
      examples: formData.examples ? formData.examples.split(",").map((ex) => ex.trim()).filter((ex) => ex) : []
    };

    if (editingRhythm) {
      updateMutation.mutate({ id: editingRhythm.id, data: dataToSave });
    } else {
      createMutation.mutate(dataToSave);
    }
  };

  const filteredRhythms = rhythms.filter((rhythm) =>
    rhythm.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rhythm.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getSongsForRhythm = (rhythmName) => {
    return songs.filter(song => song.rhythm_name === rhythmName);
  };

  return (
    <div className="bg-amber-50 p-4 min-h-screen md:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8">
          <h1 className="text-4xl font-bold text-[#8B6F47] mb-2" style={{ letterSpacing: '0.5px' }}>
            Ritmos Musicais
          </h1>
          <p className="text-[#A68A64]">Banco de ritmos para análise e classificação</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-[#D4C5B0] shadow-lg">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#A68A64]" />
              <Input
                placeholder="Buscar ritmos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white border-[#D4C5B0] focus:border-[#8B6F47]"
              />
            </div>
            {isAdmin && (
              <Button
                onClick={() => setShowForm(true)}
                className="bg-gradient-to-r from-[#8B6F47] to-[#A68A64] hover:from-[#A68A64] hover:to-[#8B6F47] text-white shadow-lg">
                <Plus className="w-4 h-4 mr-2" />
                Novo Ritmo
              </Button>
            )}
          </div>
        </motion.div>

        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-8">
              <Card className="border-[#D4C5B0] bg-white/80 backdrop-blur-sm shadow-xl">
                <CardHeader className="border-b border-[#D4C5B0]">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-[#8B6F47] flex items-center gap-2">
                      <Music4 className="w-6 h-6" />
                      {editingRhythm ? "Editar Ritmo" : "Novo Ritmo"}
                    </CardTitle>
                    <Button variant="ghost" size="icon" onClick={resetForm}>
                      <X className="w-5 h-5 text-[#A68A64]" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-[#8B6F47] font-medium">
                          Nome do Ritmo *
                        </Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Ex: Guarânia, Vanera, Rancheira"
                          className="border-[#D4C5B0] focus:border-[#8B6F47]"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="time_signature" className="text-[#8B6F47] font-medium">
                          Fórmula de Compasso
                        </Label>
                        <Select
                          value={formData.time_signature}
                          onValueChange={(value) => setFormData({ ...formData, time_signature: value })}>
                          <SelectTrigger className="border-[#D4C5B0] focus:border-[#8B6F47]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="2/4">2/4</SelectItem>
                            <SelectItem value="3/4">3/4</SelectItem>
                            <SelectItem value="4/4">4/4</SelectItem>
                            <SelectItem value="6/8">6/8</SelectItem>
                            <SelectItem value="outro">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="pattern" className="text-[#8B6F47] font-medium">
                          Padrão Rítmico
                        </Label>
                        <Input
                          id="pattern"
                          value={formData.pattern}
                          onChange={(e) => setFormData({ ...formData, pattern: e.target.value })}
                          placeholder="Ex: x.x..x.x..x."
                          className="border-[#D4C5B0] focus:border-[#8B6F47]"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="sound" className="text-[#8B6F47] font-medium">
                          Som do Ritmo
                        </Label>
                        <Input
                          id="sound"
                          value={formData.sound}
                          onChange={(e) => setFormData({ ...formData, sound: e.target.value })}
                          placeholder="Ex: tum-tá-tum-tá ou pá-pá-pum-pá"
                          className="border-[#D4C5B0] focus:border-[#8B6F47]"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="diagram_pattern" className="text-[#8B6F47] font-medium">
                        Padrão do Diagrama
                      </Label>
                      <Input
                        id="diagram_pattern"
                        value={formData.diagram_pattern}
                        onChange={(e) => setFormData({ ...formData, diagram_pattern: e.target.value })}
                        placeholder="Ex: B A B A ou ↓ ↑ ↓ ↑ (B=baixo, A=alto, X=abafado, L=leque)"
                        className="border-[#D4C5B0] focus:border-[#8B6F47]"
                      />
                      <p className="text-xs text-[#A68A64]">
                        💡 Use: B (baixo), A (alto), X (abafado), L (leque)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-[#8B6F47] font-medium">
                        Descrição
                      </Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Características, origem, quando usar..."
                        className="border-[#D4C5B0] focus:border-[#8B6F47] h-24"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="examples" className="text-[#8B6F47] font-medium">
                        Exemplos de Músicas
                      </Label>
                      <Input
                        id="examples"
                        value={formData.examples}
                        onChange={(e) => setFormData({ ...formData, examples: e.target.value })}
                        placeholder="Ex: Chamamé, Mercedita (separar por vírgula)"
                        className="border-[#D4C5B0] focus:border-[#8B6F47]"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[#8B6F47] font-medium">Áudio do Ritmo (demonstração)</Label>
                      <div className="flex gap-3 items-center">
                        <Input
                          type="file"
                          accept="audio/*"
                          onChange={handleAudioUpload}
                          className="border-[#D4C5B0] focus:border-[#8B6F47]"
                          disabled={uploadingAudio}
                        />
                        {uploadingAudio && (
                          <Badge variant="outline" className="flex items-center gap-2">
                            <Upload className="w-3 h-3 animate-pulse" />
                            Enviando...
                          </Badge>
                        )}
                        {formData.audio_url && !uploadingAudio && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700 whitespace-nowrap"
                            onClick={() => setFormData(prev => ({ ...prev, audio_url: "" }))}
                          >
                            <X className="w-4 h-4 mr-1" /> Remover
                          </Button>
                        )}
                      </div>
                      {formData.audio_url && (
                        <audio controls className="w-full mt-2">
                          <source src={formData.audio_url} />
                        </audio>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[#8B6F47] font-medium">🥁 Backing Track (base rítmica para estudo)</Label>
                      <p className="text-xs text-[#A68A64]">Upload de uma backing track completa que o aluno pode tocar junto para estudar o ritmo.</p>
                      <div className="flex gap-3 items-center">
                        <Input
                          type="file"
                          accept="audio/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setUploadingBacking(true);
                            try {
                              const { file_url } = await base44.integrations.Core.UploadFile({ file });
                              setFormData(prev => ({ ...prev, backing_track_url: file_url }));
                            } catch (err) {
                              alert("Erro ao fazer upload. Tente novamente.");
                            } finally {
                              setUploadingBacking(false);
                            }
                          }}
                          className="border-[#D4C5B0] focus:border-[#8B6F47]"
                          disabled={uploadingBacking}
                        />
                        {uploadingBacking && (
                          <Badge variant="outline" className="flex items-center gap-2">
                            <Upload className="w-3 h-3 animate-pulse" />
                            Enviando...
                          </Badge>
                        )}
                        {formData.backing_track_url && !uploadingBacking && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700 whitespace-nowrap"
                            onClick={() => setFormData(prev => ({ ...prev, backing_track_url: "" }))}
                          >
                            <X className="w-4 h-4 mr-1" /> Remover
                          </Button>
                        )}
                      </div>
                      {formData.backing_track_url && (
                        <audio controls className="w-full mt-2">
                          <source src={formData.backing_track_url} />
                        </audio>
                      )}
                      <div className="space-y-1 pt-1">
                        <Label className="text-[#8B6F47] text-sm">BPM padrão da backing track</Label>
                        <Input
                          type="number"
                          min={40}
                          max={240}
                          value={formData.backing_track_bpm}
                          onChange={(e) => setFormData(prev => ({ ...prev, backing_track_bpm: parseInt(e.target.value) || 100 }))}
                          className="border-[#D4C5B0] focus:border-[#8B6F47] w-32"
                          placeholder="100"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                      <Button type="button" variant="outline" onClick={resetForm}>
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        className="bg-gradient-to-r from-[#8B6F47] to-[#A68A64] hover:from-[#A68A64] hover:to-[#8B6F47] text-white">
                        <Save className="w-4 h-4 mr-2" />
                        {editingRhythm ? "Atualizar" : "Salvar"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(6).fill(0).map((_, i) => (
              <Card key={i} className="border-[#D4C5B0]">
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredRhythms.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16">
            <div className="w-24 h-24 bg-[#9CAF88]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Music4 className="w-12 h-12 text-[#9CAF88]" />
            </div>
            <h3 className="text-xl font-bold text-[#8B6F47] mb-2">
              {searchQuery ? "Nenhum ritmo encontrado" : "Nenhum ritmo cadastrado"}
            </h3>
            <p className="text-[#A68A64] mb-6">
              {searchQuery ? "Tente ajustar sua busca" : "Comece criando seu primeiro ritmo"}
            </p>
            {!searchQuery && (
              <Button
                onClick={() => setShowForm(true)}
                className="bg-gradient-to-r from-[#8B6F47] to-[#A68A64] hover:from-[#A68A64] hover:to-[#8B6F47] text-white">
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Ritmo
              </Button>
            )}
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredRhythms.map((rhythm, index) => {
              const associatedSongs = getSongsForRhythm(rhythm.name);
              return (
                <motion.div
                  key={rhythm.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}>
                  <RhythmCard
                    rhythm={rhythm}
                    associatedSongs={associatedSongs}
                    isAdmin={isAdmin}
                    onEdit={handleEdit}
                    onBackingTrackUpload={handleBackingTrackUpload}
                    onDelete={(r) => {
                      if (confirm(`Tem certeza que deseja excluir "${r.name}"?`)) {
                        deleteMutation.mutate(r.id);
                      }
                    }}
                  />
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}