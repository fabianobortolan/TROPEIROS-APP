import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Wand2, Music } from "lucide-react";
import { motion } from "framer-motion";

const DIFFICULTIES = [
  { value: "iniciante", label: "🟢 Iniciante" },
  { value: "intermediario", label: "🟡 Intermediário" },
  { value: "avancado", label: "🔴 Avançado" },
  { value: "expert", label: "🔵 Expert" }
];

const FOCUS_OPTIONS = [
  { value: "palhetada", label: "🎸 Palhetada" },
  { value: "dedilhado", label: "👆 Dedilhado" },
  { value: "acordes", label: "🎵 Acordes" },
  { value: "ritmo", label: "🥁 Ritmo" },
  { value: "velocidade", label: "⚡ Velocidade" },
  { value: "transicao", label: "↔️ Transição entre Acordes" },
  { value: "tecnica_geral", label: "✨ Técnica Geral" }
];

export default function ExerciseForm({ onGenerate, isLoading }) {
  const [difficulty, setDifficulty] = useState("intermediario");
  const [selectedFocus, setSelectedFocus] = useState([]);
  const [songId, setSongId] = useState("");
  const [selectedChords, setSelectedChords] = useState([]);
  const [quantity, setQuantity] = useState(5);

  const { data: songs = [] } = useQuery({
    queryKey: ['songs'],
    queryFn: () => base44.fetchAllSongs(),
    initialData: []
  });

  const { data: chords = [] } = useQuery({
    queryKey: ['chords'],
    queryFn: () => base44.entities.Chord.list('-created_date', 30),
    initialData: []
  });

  const toggleFocus = (focus) => {
    setSelectedFocus(prev =>
      prev.includes(focus)
        ? prev.filter(f => f !== focus)
        : [...prev, focus]
    );
  };

  const toggleChord = (chordId) => {
    setSelectedChords(prev =>
      prev.includes(chordId)
        ? prev.filter(id => id !== chordId)
        : [...prev, chordId]
    );
  };

  const handleSubmit = () => {
    if (selectedFocus.length === 0) {
      alert('Selecione pelo menos um foco');
      return;
    }

    onGenerate({
      difficulty,
      focus: selectedFocus.join(', '),
      songId: songId || null,
      chordIds: selectedChords.length > 0 ? selectedChords : null,
      quantity
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6">

      <Card className="border-[#D4C5B0] bg-white/80">
        <CardHeader>
          <CardTitle className="text-[#8B6F47] flex items-center gap-2">
            <Wand2 className="w-5 h-5" />
            Configurar Exercícios
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Difficulty */}
          <div className="space-y-3">
            <Label className="text-[#8B6F47] font-semibold">Nível de Dificuldade</Label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger className="border-[#D4C5B0]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIFFICULTIES.map(d => (
                  <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Focus Selection */}
          <div className="space-y-3">
            <Label className="text-[#8B6F47] font-semibold">Foco (selecione um ou mais)</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {FOCUS_OPTIONS.map(option => (
                <motion.button
                  key={option.value}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => toggleFocus(option.value)}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    selectedFocus.includes(option.value)
                      ? 'border-[#8B6F47] bg-[#F5F1E8]'
                      : 'border-[#D4C5B0] hover:border-[#A68A64]'
                  }`}>
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedFocus.includes(option.value)}
                      onChange={() => {}}
                      className="cursor-pointer"
                    />
                    <span className="text-[#8B6F47] font-medium">{option.label}</span>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Song Selection */}
          <div className="space-y-3">
            <Label className="text-[#8B6F47] font-semibold">Música (opcional)</Label>
            <Select value={songId} onValueChange={setSongId}>
              <SelectTrigger className="border-[#D4C5B0]">
                <SelectValue placeholder="Selecione uma música..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Nenhuma</SelectItem>
                {songs.map(song => (
                  <SelectItem key={song.id} value={song.id}>
                    {song.title} - {song.artist}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Chords Selection */}
          {chords.length > 0 && (
            <div className="space-y-3">
              <Label className="text-[#8B6F47] font-semibold">Acordes para Trabalhar (opcional)</Label>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-2 p-3 rounded-lg bg-[#F5F1E8]/50">
                {chords.slice(0, 20).map(chord => (
                  <motion.button
                    key={chord.id}
                    whileHover={{ scale: 1.05 }}
                    onClick={() => toggleChord(chord.id)}
                    className={`py-2 px-3 rounded text-sm font-medium transition-all ${
                      selectedChords.includes(chord.id)
                        ? 'bg-[#8B6F47] text-white'
                        : 'bg-white border border-[#D4C5B0] text-[#8B6F47] hover:border-[#8B6F47]'
                    }`}>
                    {chord.name}
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div className="space-y-3">
            <Label className="text-[#8B6F47] font-semibold">
              Quantidade de Exercícios: <span className="text-[#D4AF37]">{quantity}</span>
            </Label>
            <input
              type="range"
              min="1"
              max="10"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Submit Button */}
          <motion.div
            whileHover={{ scale: 1.02 }}>
            <Button
              onClick={handleSubmit}
              disabled={isLoading || selectedFocus.length === 0}
              className="w-full bg-[#8B6F47] hover:bg-[#6B5437] text-white h-10">
              {isLoading ? (
                <>
                  <span className="animate-spin mr-2">⟳</span>
                  Gerando Exercícios...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Gerar {quantity} Exercício{quantity > 1 ? 's' : ''}
                </>
              )}
            </Button>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}