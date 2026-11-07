import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Save, Plus, Trash2, FileText, Clock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import HarmonicAnalysisCard from "./HarmonicAnalysisCard";

export default function ManualNotes({ song }) {
  const queryClient = useQueryClient();
  const [manualNotes, setManualNotes] = useState(song.manual_notes || "");
  const [newAnnotation, setNewAnnotation] = useState({ section: "", note: "" });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Song.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['songs'] });
      setSaving(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
  });

  const handleSaveNotes = () => {
    setSaving(true);
    updateMutation.mutate({
      id: song.id,
      data: { manual_notes: manualNotes }
    });
  };

  const handleAddAnnotation = () => {
    if (!newAnnotation.section || !newAnnotation.note) return;

    const annotations = song.annotations || [];
    const updatedAnnotations = [
      ...annotations,
      {
        section: newAnnotation.section,
        note: newAnnotation.note,
        timestamp: new Date().toISOString()
      }
    ];

    setSaving(true);
    updateMutation.mutate({
      id: song.id,
      data: { annotations: updatedAnnotations }
    });

    setNewAnnotation({ section: "", note: "" });
  };

  const handleRemoveAnnotation = (index) => {
    const annotations = song.annotations || [];
    const updatedAnnotations = annotations.filter((_, i) => i !== index);

    updateMutation.mutate({
      id: song.id,
      data: { annotations: updatedAnnotations }
    });
  };

  return (
    <div className="space-y-6">
      {/* Análise Harmônica */}
      <HarmonicAnalysisCard song={song} />

      {/* Anotações por Seção */}
      <Card className="border-[#D4C5B0] bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-[#D4C5B0]">
          <CardTitle className="text-[#8B6F47] flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Anotações por Seção
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {/* Adicionar nova anotação */}
          <div className="bg-[#F5F1E8] rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input
                value={newAnnotation.section}
                onChange={(e) => setNewAnnotation({ ...newAnnotation, section: e.target.value })}
                placeholder="Seção (ex: Verso 1, Refrão)"
                className="border-[#D4C5B0]"
              />
              <div className="md:col-span-2">
                <Input
                  value={newAnnotation.note}
                  onChange={(e) => setNewAnnotation({ ...newAnnotation, note: e.target.value })}
                  placeholder="Sua anotação..."
                  className="border-[#D4C5B0]"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddAnnotation()}
                />
              </div>
            </div>
            <Button
              onClick={handleAddAnnotation}
              size="sm"
              className="bg-[#9CAF88] text-white hover:bg-[#8B6F47]"
              disabled={!newAnnotation.section || !newAnnotation.note}
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Anotação
            </Button>
          </div>

          {/* Lista de anotações */}
          <div className="space-y-2">
            {song.annotations && song.annotations.length > 0 ? (
              song.annotations.map((annotation, index) => (
                <div
                  key={index}
                  className="bg-white border border-[#D4C5B0] rounded-lg p-3 flex items-start justify-between hover:shadow-md transition-shadow"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-[#8B6F47] text-white">
                        {annotation.section}
                      </Badge>
                      {annotation.timestamp && (
                        <span className="text-xs text-[#A68A64] flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(annotation.timestamp).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[#8B6F47]">{annotation.note}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveAnnotation(index)}
                    className="text-red-600 hover:bg-red-50 ml-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-sm text-[#A68A64] text-center py-8">
                Nenhuma anotação por seção ainda. Adicione observações específicas para cada parte da música.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}