import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Repertorios } from "@/lib/repertorioStore";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Save, Plus, Trash2, GripVertical } from "lucide-react";
import { motion } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

export default function SetlistForm({ setlist, songs, onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: setlist?.name || "",
    description: setlist?.description || "",
    event_date: setlist?.event_date || "",
    location: setlist?.location || "",
    songs: setlist?.songs || [],
    notes: setlist?.notes || ""
  });

  const [selectedSongId, setSelectedSongId] = useState("");

  const createMutation = useMutation({
    mutationFn: (data) => Repertorios.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setlists'] });
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => Repertorios.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setlists'] });
      onClose();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (setlist) {
      updateMutation.mutate({ id: setlist.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleAddSong = () => {
    if (selectedSongId && !formData.songs.includes(selectedSongId)) {
      setFormData({
        ...formData,
        songs: [...formData.songs, selectedSongId]
      });
      setSelectedSongId("");
    }
  };

  const handleRemoveSong = (index) => {
    const newSongs = formData.songs.filter((_, i) => i !== index);
    setFormData({ ...formData, songs: newSongs });
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(formData.songs);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setFormData({ ...formData, songs: items });
  };

  const getSongById = (id) => songs.find(s => s.id === id);

  const availableSongs = songs.filter(song => !formData.songs.includes(song.id));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-[#F5F1E8] rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-gradient-to-r from-[#8B6F47] to-[#A68A64] p-6 rounded-t-2xl z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">
              {setlist ? "Editar Setlist" : "Novo Setlist"}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full min-w-[44px] min-h-[44px] touch-manipulation"
            >
              <X className="w-6 h-6" />
            </Button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-[#8B6F47] font-medium">
                Nome do Setlist *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Show Sertanejo Acústico"
                className="border-[#D4C5B0] focus:border-[#8B6F47]"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="event_date" className="text-[#8B6F47] font-medium">
                Data do Evento
              </Label>
              <Input
                id="event_date"
                type="date"
                value={formData.event_date}
                onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                className="border-[#D4C5B0] focus:border-[#8B6F47]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location" className="text-[#8B6F47] font-medium">
                Local
              </Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Ex: Arena Shows SP"
                className="border-[#D4C5B0] focus:border-[#8B6F47]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-[#8B6F47] font-medium">
                Descrição
              </Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Ex: Repertório especial de fim de ano"
                className="border-[#D4C5B0] focus:border-[#8B6F47]"
              />
            </div>
          </div>

          <Card className="border-[#D4C5B0] bg-white/60">
            <CardHeader>
              <CardTitle className="text-[#8B6F47] text-lg">
                Músicas do Setlist
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Select value={selectedSongId} onValueChange={setSelectedSongId}>
                  <SelectTrigger className="flex-1 border-[#D4C5B0]">
                    <SelectValue placeholder="Selecione uma música..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSongs.map((song) => (
                      <SelectItem key={song.id} value={song.id}>
                        {song.title} - {song.artist}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  onClick={handleAddSong}
                  disabled={!selectedSongId}
                  className="bg-[#9CAF88] hover:bg-[#8B6F47] text-white"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {formData.songs.length === 0 ? (
                <p className="text-center text-[#A68A64] py-8">
                  Nenhuma música adicionada ainda
                </p>
              ) : (
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="songs">
                    {(provided) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="space-y-2"
                      >
                        {formData.songs.map((songId, index) => {
                          const song = getSongById(songId);
                          if (!song) return null;
                          
                          return (
                            <Draggable key={songId} draggableId={songId} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className={`flex items-center gap-3 p-3 bg-white rounded-lg border ${
                                    snapshot.isDragging 
                                      ? 'border-[#8B6F47] shadow-lg' 
                                      : 'border-[#D4C5B0]'
                                  }`}
                                >
                                  <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                                    <GripVertical className="w-5 h-5 text-[#A68A64]" />
                                  </div>
                                  <span className="font-bold text-[#8B6F47] min-w-[24px]">
                                    {index + 1}.
                                  </span>
                                  <div className="flex-1">
                                    <p className="font-medium text-[#8B6F47]">{song.title}</p>
                                    <p className="text-sm text-[#A68A64]">{song.artist}</p>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemoveSong(index)}
                                    className="text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              )}
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-[#8B6F47] font-medium">
              Notas / Observações
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Anotações sobre o setlist, mudanças de tom, observações..."
              className="border-[#D4C5B0] focus:border-[#8B6F47] h-24"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-[#8B6F47] to-[#A68A64] hover:from-[#A68A64] hover:to-[#8B6F47] text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              {setlist ? "Atualizar" : "Criar Setlist"}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}