import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Save, Loader2 } from "lucide-react";
import { revalidateAndPersist } from "@/utils/revalidateAudit";

export default function EditChordsModal({ song, onClose, onSaved }) {
  // Pega todos os acordes únicos das progressões reais
  const getRealChords = () => {
    const seen = new Set();
    const chords = [];
    (song.progressions || []).forEach(prog => {
      (Array.isArray(prog.chords) ? prog.chords : []).forEach(c => {
        if (c && !seen.has(c)) { seen.add(c); chords.push(c); }
      });
    });
    return chords.join(", ");
  };

  const [chordsText, setChordsText] = useState(getRealChords());
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Parseia os acordes do input
      const newChords = chordsText.split(/[\s,\-]+/).map(c => c.trim()).filter(Boolean);

      // Atualiza a primeira progressão com os novos acordes
      // e limpa as demais, consolidando numa única lista de acordes
      const updatedProgressions = (song.progressions || []).map((prog, i) => {
        if (i === 0) return { ...prog, chords: newChords };
        return { ...prog, chords: [] };
      });

      // Se não houver progressões, cria uma com os acordes
      const finalProgressions = updatedProgressions.length > 0
        ? updatedProgressions
        : [{ section: "Geral", chords: newChords, pattern: "", key: song.main_key || "" }];

      await base44.entities.Song.update(song.id, { progressions: finalProgressions });
      try {
        const revalidated = await revalidateAndPersist(song.id);
        if (revalidated) Object.assign(song, revalidated);
      } catch (e) {
        console.warn('Erro ao revalidar auditoria:', e);
      }
      onSaved({ ...song, progressions: finalProgressions });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-[#8B6F47] text-base">Editar Acordes</h3>
            <p className="text-xs text-[#A68A64] mt-0.5 truncate max-w-[220px]">{song.title}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <p className="text-xs text-[#A68A64]">
            Digite os acordes separados por vírgula, espaço ou hífen:
          </p>
          <Input
            value={chordsText}
            onChange={(e) => setChordsText(e.target.value)}
            placeholder="Ex: D, A7, G, Em"
            className="border-[#8B6F47] text-sm font-mono"
            autoFocus
          />
          <p className="text-[10px] text-gray-400">
            Exemplo: D, A7, G, Em ou D-A7-G-Em
          </p>
        </div>

        <div className="flex gap-2 mt-5">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 bg-[#8B6F47] text-white hover:bg-[#6B5437]"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Salvar
          </Button>
          <Button onClick={onClose} variant="outline" className="border-[#D4C5B0] text-[#8B6F47]">
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}