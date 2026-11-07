import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useVisibleData } from "../components/utils/useVisibleData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Palette, Edit, Trash2, X, Save, Search, Music, MapPin, Calendar, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

export default function Styles() {
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
    initialData: null,
  });
  const isAdmin = currentUser?.role === "admin";

  const [showForm, setShowForm] = useState(false);
  const [editingStyle, setEditingStyle] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    characteristics: "",
    typical_instruments: "",
    typical_rhythms: "",
    origin: "",
    period: "",
    representative_artists: "",
    example_songs: "",
    icon: "",
    color: "#8B6F47"
  });

  const { data: styles, isLoading } = useVisibleData('Style', { sort: '-created_date' });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Style.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['styles'] });
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Style.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['styles'] });
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Style.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['styles'] });
    }
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      characteristics: "",
      typical_instruments: "",
      typical_rhythms: "",
      origin: "",
      period: "",
      representative_artists: "",
      example_songs: "",
      icon: "",
      color: "#8B6F47"
    });
    setShowForm(false);
    setEditingStyle(null);
  };

  const handleEdit = (style) => {
    setEditingStyle(style);
    setFormData({
      name: style.name || "",
      description: style.description || "",
      characteristics: style.characteristics?.join(", ") || "",
      typical_instruments: style.typical_instruments?.join(", ") || "",
      typical_rhythms: style.typical_rhythms?.join(", ") || "",
      origin: style.origin || "",
      period: style.period || "",
      representative_artists: style.representative_artists?.join(", ") || "",
      example_songs: style.example_songs?.join(", ") || "",
      icon: style.icon || "",
      color: style.color || "#8B6F47"
    });
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const dataToSave = {
      name: formData.name,
      description: formData.description,
      characteristics: formData.characteristics ? formData.characteristics.split(",").map((c) => c.trim()).filter((c) => c) : [],
      typical_instruments: formData.typical_instruments ? formData.typical_instruments.split(",").map((i) => i.trim()).filter((i) => i) : [],
      typical_rhythms: formData.typical_rhythms ? formData.typical_rhythms.split(",").map((r) => r.trim()).filter((r) => r) : [],
      origin: formData.origin,
      period: formData.period,
      representative_artists: formData.representative_artists ? formData.representative_artists.split(",").map((a) => a.trim()).filter((a) => a) : [],
      example_songs: formData.example_songs ? formData.example_songs.split(",").map((s) => s.trim()).filter((s) => s) : [],
      icon: formData.icon,
      color: formData.color
    };

    if (editingStyle) {
      updateMutation.mutate({ id: editingStyle.id, data: dataToSave });
    } else {
      createMutation.mutate(dataToSave);
    }
  };

  const filteredStyles = styles.filter((style) =>
    style.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    style.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-amber-50 p-4 min-h-screen md:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8">
          <h1 className="text-4xl font-bold text-[#8B6F47] mb-2" style={{ letterSpacing: '0.5px' }}>
            Estilos Musicais
          </h1>
          <p className="text-[#A68A64]">Categorização e características dos diferentes estilos</p>
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
                placeholder="Buscar estilos..."
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
                Novo Estilo
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
                      <Palette className="w-6 h-6" />
                      {editingStyle ? "Editar Estilo" : "Novo Estilo"}
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
                          Nome do Estilo *
                        </Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Ex: Sertanejo Raiz, Sertanejo Universitário"
                          className="border-[#D4C5B0] focus:border-[#8B6F47]"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="icon" className="text-[#8B6F47] font-medium">
                          Ícone/Emoji
                        </Label>
                        <Input
                          id="icon"
                          value={formData.icon}
                          onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                          placeholder="Ex: 🎸, 🪕, 🎻"
                          className="border-[#D4C5B0] focus:border-[#8B6F47]"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-[#8B6F47] font-medium">
                        Descrição
                      </Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Descrição detalhada do estilo..."
                        className="border-[#D4C5B0] focus:border-[#8B6F47] h-24"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="characteristics" className="text-[#8B6F47] font-medium">
                        Características
                      </Label>
                      <Input
                        id="characteristics"
                        value={formData.characteristics}
                        onChange={(e) => setFormData({ ...formData, characteristics: e.target.value })}
                        placeholder="Ex: Melódico, Nostálgico, Tradicional (separar por vírgula)"
                        className="border-[#D4C5B0] focus:border-[#8B6F47]"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="typical_instruments" className="text-[#8B6F47] font-medium">
                          Instrumentos Típicos
                        </Label>
                        <Input
                          id="typical_instruments"
                          value={formData.typical_instruments}
                          onChange={(e) => setFormData({ ...formData, typical_instruments: e.target.value })}
                          placeholder="Ex: Viola Caipira, Violão, Sanfona (separar por vírgula)"
                          className="border-[#D4C5B0] focus:border-[#8B6F47]"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="typical_rhythms" className="text-[#8B6F47] font-medium">
                          Ritmos Típicos
                        </Label>
                        <Input
                          id="typical_rhythms"
                          value={formData.typical_rhythms}
                          onChange={(e) => setFormData({ ...formData, typical_rhythms: e.target.value })}
                          placeholder="Ex: Guarânia, Vanera, Pagode (separar por vírgula)"
                          className="border-[#D4C5B0] focus:border-[#8B6F47]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="origin" className="text-[#8B6F47] font-medium">
                          Origem
                        </Label>
                        <Input
                          id="origin"
                          value={formData.origin}
                          onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                          placeholder="Ex: Interior de São Paulo"
                          className="border-[#D4C5B0] focus:border-[#8B6F47]"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="period" className="text-[#8B6F47] font-medium">
                          Período/Época
                        </Label>
                        <Input
                          id="period"
                          value={formData.period}
                          onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                          placeholder="Ex: Anos 80-90"
                          className="border-[#D4C5B0] focus:border-[#8B6F47]"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="color" className="text-[#8B6F47] font-medium">
                          Cor
                        </Label>
                        <Input
                          id="color"
                          type="color"
                          value={formData.color}
                          onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                          className="border-[#D4C5B0] focus:border-[#8B6F47] h-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="representative_artists" className="text-[#8B6F47] font-medium">
                        Artistas Representativos
                      </Label>
                      <Input
                        id="representative_artists"
                        value={formData.representative_artists}
                        onChange={(e) => setFormData({ ...formData, representative_artists: e.target.value })}
                        placeholder="Ex: Tonico e Tinoco, Almir Sater (separar por vírgula)"
                        className="border-[#D4C5B0] focus:border-[#8B6F47]"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="example_songs" className="text-[#8B6F47] font-medium">
                        Músicas Exemplo
                      </Label>
                      <Input
                        id="example_songs"
                        value={formData.example_songs}
                        onChange={(e) => setFormData({ ...formData, example_songs: e.target.value })}
                        placeholder="Ex: Chalana, Chico Mineiro (separar por vírgula)"
                        className="border-[#D4C5B0] focus:border-[#8B6F47]"
                      />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                      <Button type="button" variant="outline" onClick={resetForm}>
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        className="bg-gradient-to-r from-[#8B6F47] to-[#A68A64] hover:from-[#A68A64] hover:to-[#8B6F47] text-white">
                        <Save className="w-4 h-4 mr-2" />
                        {editingStyle ? "Atualizar" : "Salvar"}
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
        ) : filteredStyles.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16">
            <div className="w-24 h-24 bg-[#9CAF88]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Palette className="w-12 h-12 text-[#9CAF88]" />
            </div>
            <h3 className="text-xl font-bold text-[#8B6F47] mb-2">
              {searchQuery ? "Nenhum estilo encontrado" : "Nenhum estilo cadastrado"}
            </h3>
            <p className="text-[#A68A64] mb-6">
              {searchQuery ? "Tente ajustar sua busca" : "Comece criando seu primeiro estilo"}
            </p>
            {!searchQuery && (
              <Button
                onClick={() => setShowForm(true)}
                className="bg-gradient-to-r from-[#8B6F47] to-[#A68A64] hover:from-[#A68A64] hover:to-[#8B6F47] text-white">
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Estilo
              </Button>
            )}
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStyles.map((style, index) => (
              <motion.div
                key={style.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}>
                <Card className="border-[#D4C5B0] bg-white/80 backdrop-blur-sm hover:shadow-lg transition-all duration-300 h-full flex flex-col">
                  <CardHeader className="pb-3" style={{ backgroundColor: style.color ? `${style.color}10` : undefined }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <CardTitle className="text-xl text-[#8B6F47] mb-2 flex items-center gap-2">
                          {style.icon && <span className="text-2xl">{style.icon}</span>}
                          {style.name}
                        </CardTitle>
                        {style.period && (
                          <Badge variant="outline" className="text-xs">
                            <Calendar className="w-3 h-3 mr-1" />
                            {style.period}
                          </Badge>
                        )}
                      </div>
                      {isAdmin && (
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(style)}
                            className="text-[#8B6F47] hover:bg-[#8B6F47]/10">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm(`Tem certeza que deseja excluir "${style.name}"?`)) {
                                deleteMutation.mutate(style.id);
                              }
                            }}
                            className="text-red-600 hover:bg-red-50">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 flex-1">
                    {style.description && (
                      <p className="text-sm text-[#8B6F47]">{style.description}</p>
                    )}

                    {style.origin && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-[#9CAF88] mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-[#A68A64] font-medium">Origem:</p>
                          <p className="text-sm text-[#8B6F47]">{style.origin}</p>
                        </div>
                      </div>
                    )}

                    {style.characteristics && style.characteristics.length > 0 && (
                      <div>
                        <p className="text-xs text-[#A68A64] font-medium mb-1">Características:</p>
                        <div className="flex flex-wrap gap-1">
                          {style.characteristics.slice(0, 3).map((char, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs bg-[#9CAF88]/10 text-[#9CAF88] border-[#9CAF88]/30">
                              {char}
                            </Badge>
                          ))}
                          {style.characteristics.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{style.characteristics.length - 3}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {style.typical_instruments && style.typical_instruments.length > 0 && (
                      <div>
                        <p className="text-xs text-[#A68A64] font-medium mb-1">Instrumentos:</p>
                        <p className="text-xs text-[#8B6F47]">
                          {style.typical_instruments.slice(0, 2).join(", ")}
                          {style.typical_instruments.length > 2 && ` +${style.typical_instruments.length - 2}`}
                        </p>
                      </div>
                    )}

                    {style.typical_rhythms && style.typical_rhythms.length > 0 && (
                      <div>
                        <p className="text-xs text-[#A68A64] font-medium mb-1">Ritmos típicos:</p>
                        <p className="text-xs text-[#8B6F47]">
                          {style.typical_rhythms.slice(0, 2).join(", ")}
                          {style.typical_rhythms.length > 2 && ` +${style.typical_rhythms.length - 2}`}
                        </p>
                      </div>
                    )}

                    {style.representative_artists && style.representative_artists.length > 0 && (
                      <div>
                        <p className="text-xs text-[#A68A64] font-medium mb-1 flex items-center gap-1">
                          <Music className="w-3 h-3" />
                          Artistas:
                        </p>
                        <p className="text-xs text-[#8B6F47]">
                          {style.representative_artists.slice(0, 2).join(", ")}
                          {style.representative_artists.length > 2 && ` +${style.representative_artists.length - 2}`}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}