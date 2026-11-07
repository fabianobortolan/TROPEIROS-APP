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
import { Plus, Guitar, Edit, Trash2, X, Save, Search, Filter, Star, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";


import ChordDiagram from "../components/chords/ChordDiagram";
import InteractiveChordEditor from "../components/chords/InteractiveChordEditor";

const categoryLabels = {
  maior: "Maior",
  menor: "Menor",
  setima: "Sétima",
  maior_com_setima: "Maior com 7ª",
  menor_com_setima: "Menor com 7ª",
  diminuto: "Diminuto",
  aumentado: "Aumentado",
  sus: "Sus",
  outros: "Outros"
};

const difficultyLabels = {
  facil: "Fácil",
  medio: "Médio",
  dificil: "Difícil",
  avancado: "Avançado"
};

const difficultyColors = {
  facil: "bg-green-100 text-green-800 border-green-200",
  medio: "bg-yellow-100 text-yellow-800 border-yellow-200",
  dificil: "bg-orange-100 text-orange-800 border-orange-200",
  avancado: "bg-red-100 text-red-800 border-red-200"
};

export default function Chords() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [showInteractiveEditor, setShowInteractiveEditor] = useState(false);
  const [editingChord, setEditingChord] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [instrumentFilter, setInstrumentFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    instrument: "violao",
    diagram: "",
    position: "",
    fingers: "",
    fret: "",
    strings: "",
    notes: "",
    difficulty: "medio",
    category: "maior",
    description: "",
    image_url: ""
  });

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
    initialData: null,
  });

  const isAdmin = currentUser?.role === "admin";
  const favoriteChords = currentUser?.favorite_chords || [];

  const isFavorite = (chord) =>
    favoriteChords.some(f => f.chord_id === chord.id && f.instrument === chord.instrument);

  const toggleFavorite = async (chord) => {
    const current = currentUser?.favorite_chords || [];
    const exists = current.find(f => f.chord_id === chord.id && f.instrument === chord.instrument);
    let updated;
    if (exists) {
      updated = current.filter(f => !(f.chord_id === chord.id && f.instrument === chord.instrument));
    } else {
      // Remove favorito anterior do mesmo nome+instrumento (para manter só 1 favorito por acorde)
      const filtered = current.filter(f => !(f.chord_name === chord.name && f.instrument === chord.instrument));
      updated = [...filtered, { chord_id: chord.id, chord_name: chord.name, instrument: chord.instrument }];
    }
    await base44.auth.updateMe({ favorite_chords: updated });
    queryClient.invalidateQueries({ queryKey: ["currentUser"] });
  };

  const { data: rawChords, isLoading } = useVisibleData('Chord');
  const chords = [...(rawChords || [])].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Chord.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chords'] });
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Chord.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chords'] });
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Chord.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chords'] });
    }
  });

  const resetForm = () => {
    setFormData({
      name: "",
      instrument: "violao",
      diagram: "",
      position: "",
      fingers: "",
      fret: "",
      strings: "",
      notes: "",
      difficulty: "medio",
      category: "maior",
      description: "",
      image_url: ""
    });
    setShowForm(false);
    setEditingChord(null);
  };

  const handleEdit = (chord) => {
    setEditingChord(chord);
    setFormData({
      name: chord.name || "",
      instrument: chord.instrument || "violao",
      diagram: chord.diagram || "",
      position: chord.position || "",
      fingers: chord.fingers || "",
      fret: chord.fret || "",
      strings: chord.strings?.join(", ") || "",
      notes: chord.notes?.join(", ") || "",
      difficulty: chord.difficulty || "medio",
      category: chord.category || "maior",
      description: chord.description || "",
      image_url: chord.image_url || ""
    });
    setShowForm(true);
  };

  const handleInteractiveEdit = (chord) => {
    setEditingChord(chord);
    setShowInteractiveEditor(true);
  };

  const handleInteractiveSave = async (updatedChord) => {
    const dataToSave = {
      name: updatedChord.name,
      instrument: updatedChord.instrument,
      strings: updatedChord.strings,
      fret: updatedChord.fret !== undefined ? updatedChord.fret : null,
      barre_fret: updatedChord.barre_fret || null,
      position: updatedChord.position || null,
      fingers: updatedChord.fingers || "",
      notes: updatedChord.notes || [],
      difficulty: updatedChord.difficulty || "medio",
      category: updatedChord.category || "maior",
      description: updatedChord.description || "",
      diagram: updatedChord.diagram || "",
      image_url: updatedChord.image_url || ""
    };

    try {
      let savedChordId;
      
      if (editingChord?.id) {
        await updateMutation.mutateAsync({ id: editingChord.id, data: dataToSave });
        savedChordId = editingChord.id;
      } else {
        const newChord = await createMutation.mutateAsync(dataToSave);
        savedChordId = newChord.id;
      }
      
      setShowInteractiveEditor(false);
      setEditingChord(null);
      
      await queryClient.invalidateQueries({ queryKey: ['chords'] });
      
      setTimeout(() => {
        const element = document.getElementById(`chord-${savedChordId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);
    } catch (error) {
      console.error("Erro ao salvar acorde:", error);
      alert("Erro ao salvar acorde. Verifique o console para detalhes.");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const dataToSave = {
      name: formData.name,
      instrument: formData.instrument,
      diagram: formData.diagram,
      position: formData.position ? Number(formData.position) : null,
      fingers: formData.fingers,
      fret: formData.fret ? Number(formData.fret) : null,
      strings: formData.strings ? formData.strings.split(",").map((s) => s.trim()).filter((s) => s) : [],
      notes: formData.notes ? formData.notes.split(",").map((n) => n.trim()).filter((n) => n) : [],
      difficulty: formData.difficulty,
      category: formData.category,
      description: formData.description,
      image_url: formData.image_url
    };

    if (editingChord) {
      updateMutation.mutate({ id: editingChord.id, data: dataToSave });
    } else {
      createMutation.mutate(dataToSave);
    }
  };

  const filteredChords = chords.filter((chord) => {
    const matchesSearch = chord.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesInstrument = instrumentFilter === "all" || chord.instrument === instrumentFilter;
    const matchesCategory = categoryFilter === "all" || chord.category === categoryFilter;
    const matchesFavorites = !favoritesOnly || isFavorite(chord);
    
    return matchesSearch && matchesInstrument && matchesCategory && matchesFavorites;
  });

  return (
    <div className="bg-amber-50 p-4 min-h-screen md:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8">

          <h1 className="text-4xl font-bold text-[#8B6F47] mb-2" style={{ letterSpacing: '0.5px' }}>
            Banco de Acordes
          </h1>
          <p className="text-[#A68A64]">Diagramação de acordes para violão e viola</p>
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
                placeholder="Buscar acordes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white border-[#D4C5B0] focus:border-[#8B6F47]" />

            </div>
            <div className="flex gap-3 flex-wrap">
              <Select value={instrumentFilter} onValueChange={setInstrumentFilter}>
                <SelectTrigger className="w-[150px] bg-white border-[#D4C5B0]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="violao">Violão</SelectItem>
                  <SelectItem value="viola">Viola</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant={favoritesOnly ? "default" : "outline"}
                onClick={() => setFavoritesOnly(prev => !prev)}
                className={favoritesOnly ? "bg-[#D4AF37] hover:bg-[#c9a42e] text-white border-[#D4AF37]" : "border-[#D4C5B0] text-[#8B6F47] hover:bg-[#D4AF37]/10"}
              >
                <Star className={`w-4 h-4 mr-2 ${favoritesOnly ? "fill-white" : ""}`} />
                Favoritos
              </Button>



              {isAdmin && (
                <>
                  <Button
                    onClick={() => {
                      setEditingChord(null);
                      setShowInteractiveEditor(true);
                    }}
                    className="bg-gradient-to-r from-[#9CAF88] to-[#8B6F47] hover:opacity-90 text-white shadow-lg">
                    <Guitar className="w-4 h-4 mr-2" />
                    Editor Visual
                  </Button>
                  <Button
                    onClick={() => setShowForm(true)}
                    className="bg-gradient-to-r from-[#8B6F47] to-[#A68A64] hover:from-[#A68A64] hover:to-[#8B6F47] text-white shadow-lg">
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Acorde
                  </Button>
                </>
              )}
            </div>
          </div>
        </motion.div>

        <AnimatePresence>
          {showInteractiveEditor && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowInteractiveEditor(false)}
            >
              <div 
                className="max-w-4xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <InteractiveChordEditor
                  chord={editingChord || { instrument: "violao", strings: [], name: "" }}
                  onSave={handleInteractiveSave}
                  onCancel={() => {
                    setShowInteractiveEditor(false);
                    setEditingChord(null);
                  }}
                />
              </div>
            </motion.div>
          )}
          
          {showForm &&
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-8">

              <Card className="border-[#D4C5B0] bg-white/80 backdrop-blur-sm shadow-xl">
                <CardHeader className="border-b border-[#D4C5B0]">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-[#8B6F47] flex items-center gap-2">
                      <Guitar className="w-6 h-6" />
                      {editingChord ? "Editar Acorde" : "Novo Acorde"}
                    </CardTitle>
                    <Button variant="ghost" size="icon" onClick={resetForm}>
                      <X className="w-5 h-5 text-[#A68A64]" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-[#8B6F47] font-medium">
                          Nome do Acorde *
                        </Label>
                        <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Ex: C, Am, G7, D#m"
                        className="border-[#D4C5B0] focus:border-[#8B6F47]"
                        required />

                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="instrument" className="text-[#8B6F47] font-medium">
                          Instrumento *
                        </Label>
                        <Select
                        value={formData.instrument}
                        onValueChange={(value) => setFormData({ ...formData, instrument: value })}>

                          <SelectTrigger className="border-[#D4C5B0] focus:border-[#8B6F47]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="violao">Violão (6 cordas)</SelectItem>
                            <SelectItem value="viola">Viola (10 cordas)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="position" className="text-[#8B6F47] font-medium">
                          Posição/Variação
                        </Label>
                        <Input
                        id="position"
                        type="number"
                        value={formData.position}
                        onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                        placeholder="Ex: 1, 2, 3"
                        className="border-[#D4C5B0] focus:border-[#8B6F47]" />

                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="category" className="text-[#8B6F47] font-medium">
                          Categoria
                        </Label>
                        <Select
                        value={formData.category}
                        onValueChange={(value) => setFormData({ ...formData, category: value })}>

                          <SelectTrigger className="border-[#D4C5B0] focus:border-[#8B6F47]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(categoryLabels).map(([key, label]) =>
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                          )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="difficulty" className="text-[#8B6F47] font-medium">
                          Dificuldade
                        </Label>
                        <Select
                        value={formData.difficulty}
                        onValueChange={(value) => setFormData({ ...formData, difficulty: value })}>

                          <SelectTrigger className="border-[#D4C5B0] focus:border-[#8B6F47]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(difficultyLabels).map(([key, label]) =>
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                          )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="fret" className="text-[#8B6F47] font-medium">
                          Casa/Traste Inicial
                        </Label>
                        <Input
                        id="fret"
                        type="number"
                        value={formData.fret}
                        onChange={(e) => setFormData({ ...formData, fret: e.target.value })}
                        placeholder="Ex: 0, 3, 5"
                        className="border-[#D4C5B0] focus:border-[#8B6F47]" />

                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="fingers" className="text-[#8B6F47] font-medium">
                          Dedilhado
                        </Label>
                        <Input
                        id="fingers"
                        value={formData.fingers}
                        onChange={(e) => setFormData({ ...formData, fingers: e.target.value })}
                        placeholder="Ex: 0-2-1-3"
                        className="border-[#D4C5B0] focus:border-[#8B6F47]" />

                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="image_url" className="text-[#8B6F47] font-medium">
                          URL da Imagem
                        </Label>
                        <Input
                        id="image_url"
                        value={formData.image_url}
                        onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                        placeholder="https://..."
                        className="border-[#D4C5B0] focus:border-[#8B6F47]" />

                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="strings" className="text-[#8B6F47] font-medium">
                          Estado das Cordas
                        </Label>
                        <Input
                        id="strings"
                        value={formData.strings}
                        onChange={(e) => setFormData({ ...formData, strings: e.target.value })}
                        placeholder="Ex: x, 0, 2, 2, 1, 0 (separado por vírgula)"
                        className="border-[#D4C5B0] focus:border-[#8B6F47]" />

                        <p className="text-xs text-[#A68A64]">x = não toca, 0 = corda solta, número = casa</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="notes" className="text-[#8B6F47] font-medium">
                          Notas do Acorde
                        </Label>
                        <Input
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Ex: C, E, G (separado por vírgula)"
                        className="border-[#D4C5B0] focus:border-[#8B6F47]" />

                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="diagram" className="text-[#8B6F47] font-medium">
                        Diagrama (Texto ou JSON)
                      </Label>
                      <Textarea
                      id="diagram"
                      value={formData.diagram}
                      onChange={(e) => setFormData({ ...formData, diagram: e.target.value })}
                      placeholder="Descreva o diagrama do acorde ou use formato JSON"
                      className="border-[#D4C5B0] focus:border-[#8B6F47] h-24 font-mono text-sm" />

                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-[#8B6F47] font-medium">
                        Descrição / Observações
                      </Label>
                      <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Dicas de uso, variações, contexto musical..."
                      className="border-[#D4C5B0] focus:border-[#8B6F47] h-24" />

                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                      <Button type="button" variant="outline" onClick={resetForm}>
                        Cancelar
                      </Button>
                      <Button
                      type="submit"
                      className="bg-gradient-to-r from-[#8B6F47] to-[#A68A64] hover:from-[#A68A64] hover:to-[#8B6F47] text-white">

                        <Save className="w-4 h-4 mr-2" />
                        {editingChord ? "Atualizar" : "Salvar"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          }
        </AnimatePresence>

        {isLoading ?
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(6).fill(0).map((_, i) =>
          <Card key={i} className="border-[#D4C5B0]">
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
          )}
          </div> :
        filteredChords.length === 0 ?
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-16">

            <div className="w-24 h-24 bg-[#9CAF88]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Guitar className="w-12 h-12 text-[#9CAF88]" />
            </div>
            <h3 className="text-xl font-bold text-[#8B6F47] mb-2">
              {searchQuery || instrumentFilter !== "all" || categoryFilter !== "all" ?
            "Nenhum acorde encontrado" :
            "Nenhum acorde cadastrado"}
            </h3>
            <p className="text-[#A68A64] mb-6">
              {searchQuery || instrumentFilter !== "all" || categoryFilter !== "all" ?
            "Tente ajustar os filtros de busca" :
            "Comece criando seu primeiro acorde"}
            </p>
            {!searchQuery && instrumentFilter === "all" && categoryFilter === "all" &&
          <Button
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-[#8B6F47] to-[#A68A64] hover:from-[#A68A64] hover:to-[#8B6F47] text-white">

                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Acorde
              </Button>
          }
          </motion.div> :

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredChords.map((chord, index) =>
          <motion.div
            key={chord.id}
            id={`chord-${chord.id}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}>

                <Card className="border-[#D4C5B0] bg-white/80 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <CardTitle className="text-2xl text-[#8B6F47] mb-2">
                          {chord.name}
                        </CardTitle>
                        <div className="flex flex-wrap gap-2">
                          <Badge className={chord.instrument === "violao" ? "bg-[#8B6F47] text-white" : "bg-[#9CAF88] text-white"}>
                            {chord.instrument === "violao" ? "Violão" : "Viola"}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleFavorite(chord)}
                          className={isFavorite(chord) ? "text-[#D4AF37] hover:bg-[#D4AF37]/10" : "text-gray-400 hover:bg-gray-100"}
                          title={isFavorite(chord) ? "Remover favorito (apostila)" : "Marcar como favorito para apostila"}>
                          <Star className={`w-4 h-4 ${isFavorite(chord) ? "fill-[#D4AF37]" : ""}`} />
                        </Button>
                        {isAdmin && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleInteractiveEdit(chord)}
                              className="text-[#9CAF88] hover:bg-[#9CAF88]/10"
                              title="Editor Visual Interativo">
                              <Guitar className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(chord)}
                              className="text-[#8B6F47] hover:bg-[#8B6F47]/10"
                              title="Editar Formulário">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (confirm(`Tem certeza que deseja excluir o acorde "${chord.name}"?`)) {
                                  deleteMutation.mutate(chord.id);
                                }
                              }}
                              className="text-red-600 hover:bg-red-50">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Diagrama visual */}
                    <div className="flex justify-center py-4">
                      <ChordDiagram chord={chord} />
                    </div>

                    {chord.notes && chord.notes.length > 0 &&
                <div>
                        <p className="text-xs text-[#A68A64] font-medium mb-2">Notas:</p>
                        <p className="text-sm text-[#8B6F47] font-medium">{chord.notes.join(", ")}</p>
                      </div>
                }
                  </CardContent>
                </Card>
              </motion.div>
          )}
          </div>
        }
      </div>
    </div>);

}