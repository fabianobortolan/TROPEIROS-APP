import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";
import { Upload, Loader2, FileText, CheckCircle2, Music2 } from "lucide-react";

const emptyForm = {
  title: "", composer: "", instrument: "", pdf_url: "", audio_url: "", playback_url: "",
  key: "", difficulty_level: "intermediario", genre: "", description: ""
};

export default function PartituraForm({ open, onClose, onSave, partitura }) {
  const [formData, setFormData] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [uploadingPlayback, setUploadingPlayback] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFormData(partitura ? { ...emptyForm, ...partitura } : emptyForm);
  }, [partitura, open]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      handleChange("pdf_url", file_url);
    } catch (err) {
      alert("Erro ao fazer upload do PDF. Tente novamente.");
    } finally {
      setUploading(false);
    }
  };

  const handlePlaybackUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPlayback(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      handleChange("playback_url", file_url);
    } catch (err) {
      alert("Erro ao fazer upload do playback. Tente novamente.");
    } finally {
      setUploadingPlayback(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.pdf_url) {
      alert("Título e PDF da partitura são obrigatórios.");
      return;
    }
    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{partitura ? "Editar Partitura" : "Nova Partitura Instrumental"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleChange("title", e.target.value)}
              placeholder="Ex: Asa Branca (Instrumental)"
              required
            />
          </div>

          <div>
            <Label htmlFor="composer">Compositor</Label>
            <Input
              id="composer"
              value={formData.composer}
              onChange={(e) => handleChange("composer", e.target.value)}
              placeholder="Ex: Luiz Gonzaga"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="instrument">Instrumento</Label>
              <Input
                id="instrument"
                value={formData.instrument}
                onChange={(e) => handleChange("instrument", e.target.value)}
                placeholder="Ex: Violão"
              />
            </div>
            <div>
              <Label htmlFor="key">Tonalidade</Label>
              <Input
                id="key"
                value={formData.key}
                onChange={(e) => handleChange("key", e.target.value)}
                placeholder="Ex: C, Dm, G"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="genre">Gênero Instrumental</Label>
              <Input
                id="genre"
                value={formData.genre}
                onChange={(e) => handleChange("genre", e.target.value)}
                placeholder="Ex: Choro, Clássico"
              />
            </div>
            <div>
              <Label htmlFor="difficulty_level">Nível</Label>
              <Select
                value={formData.difficulty_level}
                onValueChange={(val) => handleChange("difficulty_level", val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="facil">Fácil</SelectItem>
                  <SelectItem value="intermediario">Intermediário</SelectItem>
                  <SelectItem value="avancado">Avançado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Partitura (PDF) *</Label>
            {formData.pdf_url ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span className="text-sm text-green-800 flex-1 truncate">PDF carregado</span>
                <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById("pdf-upload").click()}>
                  Trocar
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-lg border-2 border-dashed border-stone-300 cursor-pointer hover:border-[#8B6F47] hover:bg-amber-50 transition-colors">
                {uploading ? (
                  <>
                    <Loader2 className="w-8 h-8 text-[#8B6F47] animate-spin" />
                    <span className="text-sm text-stone-500">Enviando PDF...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-stone-400" />
                    <span className="text-sm text-stone-500">Clique para selecionar o PDF</span>
                  </>
                )}
                <input
                  id="pdf-upload"
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={handleUpload}
                  disabled={uploading}
                />
              </label>
            )}
          </div>

          <div>
            <Label>Playback / Base para tocar junto</Label>
            {formData.playback_url ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
                <Music2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span className="text-sm text-green-800 flex-1 truncate">Playback carregado</span>
                <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById("playback-upload").click()}>
                  Trocar
                </Button>
                <Button type="button" variant="ghost" size="sm" className="text-red-500" onClick={() => handleChange("playback_url", "")}>
                  Remover
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed border-stone-300 cursor-pointer hover:border-[#8B6F47] hover:bg-amber-50 transition-colors">
                {uploadingPlayback ? (
                  <>
                    <Loader2 className="w-6 h-6 text-[#8B6F47] animate-spin" />
                    <span className="text-sm text-stone-500">Enviando playback...</span>
                  </>
                ) : (
                  <>
                    <Music2 className="w-6 h-6 text-stone-400" />
                    <span className="text-sm text-stone-500">Clique para selecionar o áudio do playback</span>
                  </>
                )}
                <input
                  id="playback-upload"
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={handlePlaybackUpload}
                  disabled={uploadingPlayback}
                />
              </label>
            )}
          </div>

          <div>
            <Label htmlFor="description">Observações</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Anotações sobre a peça, técnica, etc."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || uploading || !formData.title || !formData.pdf_url}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}