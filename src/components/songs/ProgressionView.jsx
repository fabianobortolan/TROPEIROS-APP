import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Music2, Award, RefreshCw, Edit2, Check, X } from "lucide-react";
import HarmonicFieldStrip from "./HarmonicFieldStrip";
import ProgressionPrintButton from "./ProgressionPrintButton";
import { MotorSectionDetails, MotorSongHeader } from "./MotorAnalysisDetails";
import { motion, AnimatePresence } from "framer-motion";

function EditChordsModal({ prog, onSave, onClose }) {
  const [chordsText, setChordsText] = useState(
    Array.isArray(prog.chords) ? prog.chords.join(", ") : (prog.chords || "")
  );
  const [patternText, setPatternText] = useState(prog.pattern || "");

  const handleSave = () => {
    const newChords = chordsText.split(/[,\s]+/).map(c => c.trim()).filter(Boolean);
    onSave({ chords: newChords, pattern: patternText });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-[#8B6F47] text-lg">
            Editar: <span className="text-[#A68A64]">{prog.section || "Seção"}</span>
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-[#8B6F47] font-semibold">Acordes (separados por vírgula ou espaço)</Label>
            <Input
              value={chordsText}
              onChange={e => setChordsText(e.target.value)}
              placeholder="Ex: C, Am, F, G"
              className="border-[#D4C5B0] focus:border-[#8B6F47] font-mono"
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-[#8B6F47] font-semibold">Padrão (graus romanos)</Label>
            <Input
              value={patternText}
              onChange={e => setPatternText(e.target.value)}
              placeholder="Ex: I-IV-V-I"
              className="border-[#D4C5B0] focus:border-[#8B6F47] font-mono"
            />
          </div>

          <div className="bg-[#F5F1E8] rounded-lg p-3 text-xs text-[#8B6F47]">
            💡 Suas correções manuais são registradas e ensinam o sistema a identificar melhor as progressões.
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-5">
          <Button variant="outline" onClick={onClose} className="border-[#D4C5B0] text-[#8B6F47]">
            Cancelar
          </Button>
          <Button onClick={handleSave} className="bg-[#8B6F47] hover:bg-[#6B5437] text-white">
            <Check className="w-4 h-4 mr-2" />
            Salvar Correção
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

function ProgressionRow({ prog, index, onEdit }) {
  const [showEditModal, setShowEditModal] = useState(false);
  const chords = Array.isArray(prog.chords) ? prog.chords : [];
  const fromMotor = Array.isArray(prog.degrees) && prog.degrees.length > 0;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.04 }}
        className="bg-white/80 border border-[#D4C5B0] rounded-xl overflow-hidden hover:shadow-md transition-all duration-200"
      >
        <div className="flex items-center gap-3 px-4 py-3 flex-wrap">
          {/* Seção */}
          <div className="flex items-center gap-2 min-w-[110px]">
            <Music2 className="w-4 h-4 text-[#9CAF88] flex-shrink-0" />
            <span className="font-bold text-[#8B6F47] text-sm uppercase tracking-wide">
              {prog.section || 'Seção'}
            </span>
          </div>

          <div className="h-8 w-px bg-[#D4C5B0] hidden sm:block" />

          {/* Nome da progressão */}
          <div className="flex items-center gap-1.5 flex-1">
            <Award className="w-4 h-4 text-[#D4AF37] flex-shrink-0" />
            <span className="font-semibold text-[#6B5437] text-sm">
              {prog.progression_name
                ? prog.progression_name.toUpperCase()
                : <span className="text-[#A68A64] italic text-xs">Não identificada</span>}
            </span>
            {prog.variation_name && (
              <span className="text-xs text-[#A68A64]">({prog.variation_name})</span>
            )}
          </div>

          {/* Padrão (no motor, os graus aparecem coloridos logo abaixo) */}
          {prog.pattern && !fromMotor && (
            <div className="px-3 py-1 bg-[#9CAF88]/15 rounded-lg border border-[#9CAF88]/40">
              <span className="text-xs text-[#A68A64] font-medium mr-1">Padrão:</span>
              <span className="text-sm font-bold text-[#8B6F47]">{prog.pattern}</span>
            </div>
          )}

          {/* Queda melódica / Subida cromática / Descida cromática (análises antigas) */}
          {!fromMotor && prog.notes && (prog.notes.includes('Queda melódica') || prog.notes.includes('cromática')) && (
            <div className="px-3 py-1 bg-orange-50 rounded-lg border border-orange-300">
              <span className="text-xs text-orange-700 font-semibold">🎵 {prog.notes}</span>
            </div>
          )}

          {/* Tom */}
          {prog.key && (
            <div className="px-3 py-1 bg-[#D4AF37]/15 rounded-lg border border-[#D4AF37]/40">
              <span className="text-xs text-[#A68A64] font-medium mr-1">Tom:</span>
              <span className="text-sm font-bold text-[#8B6F47]">{prog.key}</span>
            </div>
          )}

          {/* Modulação */}
          {prog.modulated_key && (
            <div className="flex items-center gap-1 px-3 py-1 bg-orange-50 rounded-lg border border-orange-300">
              <RefreshCw className="w-3 h-3 text-orange-500" />
              <span className="text-xs text-orange-600 font-medium mr-1">Mod:</span>
              <span className="text-sm font-bold text-orange-700">{prog.modulated_key}</span>
            </div>
          )}

          {/* Botão editar acordes */}
          {onEdit && (
            <button
              onClick={() => setShowEditModal(true)}
              className="flex items-center gap-1 text-xs text-[#8B6F47] hover:text-[#6B5437] transition-colors px-2 py-1 rounded-lg hover:bg-[#8B6F47]/10 border border-[#D4C5B0]"
              title="Editar acordes desta seção"
            >
              <Edit2 className="w-3 h-3" />
              Editar
            </button>
          )}
        </div>

        {/* Acordes da seção — sempre visíveis abaixo do título */}
        {chords.length > 0 && (
          <div className="px-4 py-2 flex flex-wrap items-center gap-1.5 border-t border-[#D4C5B0]/50 bg-[#FAF7F0]/50">
            <span className="text-[10px] font-semibold text-[#A39682] uppercase tracking-wide mr-0.5">
              Acordes:
            </span>
            {chords.map((chord, i) => (
              <Badge
                key={i}
                variant="outline"
                className="bg-[#8B6F47] text-white border-[#8B6F47] px-2 py-0.5 text-xs font-semibold"
              >
                {chord}
              </Badge>
            ))}
          </div>
        )}

        {/* Graus, preparações, caídas/subidas e cadências (Motor Harmônico) */}
        <MotorSectionDetails prog={prog} />

        {/* Campo harmônico da tonalidade identificada nesta seção */}
        {prog.key && (
          <HarmonicFieldStrip
            keyName={prog.key}
            chords={chords}
            className="px-4 py-2 border-t border-[#D4C5B0]/50 bg-[#FAF7F0]/50"
          />
        )}
        {prog.modulated_key && (
          <HarmonicFieldStrip
            keyName={prog.modulated_key}
            chords={chords}
            note="modulação"
            className="px-4 py-2 border-t border-[#D4C5B0]/50 bg-orange-50/60"
          />
        )}
      </motion.div>

      <AnimatePresence>
        {showEditModal && (
          <EditChordsModal
            prog={prog}
            onSave={(data) => onEdit(index, data)}
            onClose={() => setShowEditModal(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

export default function ProgressionView({ progressions, onEditProgression, song }) {
  if (!progressions || progressions.length === 0) {
    return (
      <div className="text-center py-8 text-[#A68A64]">
        {song && <MotorSongHeader song={song} />}
        Nenhuma progressão harmônica identificada
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {song && <MotorSongHeader song={song} />}
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <p className="text-xs text-[#A68A64]">
          📋 {progressions.length} {progressions.length === 1 ? 'seção' : 'seções'} — clique em "Editar" para corrigir os acordes
        </p>
        <ProgressionPrintButton progressions={progressions} song={song} />
      </div>
      {progressions.map((prog, index) => (
        <ProgressionRow
          key={prog._tempId || index}
          prog={prog}
          index={index}
          onEdit={onEditProgression || null}
        />
      ))}
    </div>
  );
}
