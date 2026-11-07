import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shuffle, Play, Copy, Save, Sparkles, Music2, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const SCALE_TYPES = {
  maior: {
    name: "Maior (Jônio)",
    intervals: [0, 2, 4, 5, 7, 9, 11],
    chordQualities: ["", "m", "m", "", "", "m", "°"],
    chordTypes: ["M", "m", "m", "M", "M", "m", "dim"]
  },
  menor: {
    name: "Menor Natural (Eólio)",
    intervals: [0, 2, 3, 5, 7, 8, 10],
    chordQualities: ["m", "°", "", "m", "m", "", ""],
    chordTypes: ["m", "dim", "M", "m", "m", "M", "M"]
  },
  dorico: {
    name: "Dórico",
    intervals: [0, 2, 3, 5, 7, 9, 10],
    chordQualities: ["m", "m", "", "", "m", "°", ""],
    chordTypes: ["m", "m", "M", "M", "m", "dim", "M"]
  },
  mixolidio: {
    name: "Mixolídio",
    intervals: [0, 2, 4, 5, 7, 9, 10],
    chordQualities: ["", "m", "°", "", "m", "m", ""],
    chordTypes: ["M", "m", "dim", "M", "m", "m", "M"]
  },
  frigio: {
    name: "Frígio",
    intervals: [0, 1, 3, 5, 7, 8, 10],
    chordQualities: ["m", "", "", "m", "°", "", "m"],
    chordTypes: ["m", "M", "M", "m", "dim", "M", "m"]
  },
  lidio: {
    name: "Lídio",
    intervals: [0, 2, 4, 6, 7, 9, 11],
    chordQualities: ["", "", "m", "°", "", "m", "m"],
    chordTypes: ["M", "M", "m", "dim", "M", "m", "m"]
  }
};

const PROGRESSION_TEMPLATES = {
  pop: {
    name: "Pop/Rock",
    patterns: [
      { degrees: [1, 5, 6, 4], name: "I-V-vi-IV (Pop)" },
      { degrees: [1, 4, 5, 1], name: "I-IV-V-I (Clássica)" },
      { degrees: [1, 6, 4, 5], name: "I-vi-IV-V (Anos 50)" },
      { degrees: [6, 4, 1, 5], name: "vi-IV-I-V (Triste)" }
    ]
  },
  sertanejo: {
    name: "Sertanejo",
    patterns: [
      { degrees: [1, 4, 5, 1], name: "I-IV-V-I (Terra)" },
      { degrees: [1, 5, 1, 4], name: "I-V-I-IV (Moda)" },
      { degrees: [1, 4, 1, 5], name: "I-IV-I-V (Caipira)" },
      { degrees: [2, 5, 1], name: "ii-V-I (Jazz)" }
    ]
  },
  blues: {
    name: "Blues",
    patterns: [
      { degrees: [1, 1, 1, 1, 4, 4, 1, 1, 5, 4, 1, 5], name: "12-Bar Blues" },
      { degrees: [1, 4, 1, 5], name: "Blues Básico" }
    ]
  },
  romantico: {
    name: "Romântico",
    patterns: [
      { degrees: [1, 5, 6, 3, 4, 1, 4, 5], name: "Canon de Pachelbel" },
      { degrees: [4, 5, 3, 6], name: "IV-V-iii-vi (Emotiva)" },
      { degrees: [1, 3, 4, 5], name: "I-iii-IV-V (Suave)" }
    ]
  }
};

export default function ProgressionGenerator() {
  const [selectedKey, setSelectedKey] = useState("C");
  const [selectedScale, setSelectedScale] = useState("maior");
  const [selectedGenre, setSelectedGenre] = useState("pop");
  const [generatedProgression, setGeneratedProgression] = useState(null);
  const [customProgression, setCustomProgression] = useState([]);
  const [copied, setCopied] = useState(false);

  const scaleInfo = SCALE_TYPES[selectedScale];

  // Gera acordes do campo harmônico
  const getFieldChords = () => {
    const rootIndex = NOTES.indexOf(selectedKey);
    return scaleInfo.intervals.map((interval, idx) => {
      const noteIndex = (rootIndex + interval) % 12;
      return {
        note: NOTES[noteIndex],
        quality: scaleInfo.chordQualities[idx],
        chord: NOTES[noteIndex] + scaleInfo.chordQualities[idx],
        degree: idx + 1,
        romanNumeral: ["I", "II", "III", "IV", "V", "VI", "VII"][idx] + 
          (scaleInfo.chordQualities[idx] === "m" ? "" : 
           scaleInfo.chordQualities[idx] === "°" ? "°" : "")
      };
    });
  };

  const fieldChords = getFieldChords();

  // Gera progressão baseada no template
  const generateProgression = (pattern) => {
    const chords = pattern.degrees.map(degree => fieldChords[degree - 1]);
    setGeneratedProgression({
      name: pattern.name,
      chords,
      pattern: pattern.degrees
    });
  };

  // Gera progressão aleatória
  const generateRandomProgression = () => {
    const lengths = [3, 4, 4, 4, 6, 8];
    const length = lengths[Math.floor(Math.random() * lengths.length)];
    const degrees = [];
    
    // Começa com I
    degrees.push(1);
    
    for (let i = 1; i < length - 1; i++) {
      // Probabilidades baseadas em teoria
      const weights = [0.1, 0.15, 0.1, 0.25, 0.25, 0.1, 0.05];
      const random = Math.random();
      let cumulative = 0;
      for (let j = 0; j < weights.length; j++) {
        cumulative += weights[j];
        if (random < cumulative) {
          degrees.push(j + 1);
          break;
        }
      }
    }
    
    // Termina com V ou I
    degrees.push(Math.random() > 0.5 ? 5 : 1);
    
    const chords = degrees.map(degree => fieldChords[degree - 1]);
    setGeneratedProgression({
      name: "Progressão Aleatória",
      chords,
      pattern: degrees
    });
  };

  // Adiciona acorde à progressão customizada
  const addToCustom = (chord) => {
    if (customProgression.length < 12) {
      setCustomProgression([...customProgression, chord]);
    }
  };

  const removeFromCustom = (index) => {
    setCustomProgression(customProgression.filter((_, i) => i !== index));
  };

  const copyProgression = () => {
    const text = generatedProgression 
      ? generatedProgression.chords.map(c => c.chord).join(" - ")
      : customProgression.map(c => c.chord).join(" - ");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-amber-50 p-4 min-h-screen md:p-8">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-[#8B6F47] mb-2 flex items-center gap-3">
            <Sparkles className="w-10 h-10 text-[#D4AF37]" />
            Gerador de Progressões
          </h1>
          <p className="text-[#A68A64]">
            Crie progressões harmônicas baseadas em escalas e modos
          </p>
        </motion.div>

        {/* Seletores */}
        <Card className="border-[#D4C5B0] bg-white/80 mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-[#8B6F47] mb-2 block">Tonalidade</label>
                <Select value={selectedKey} onValueChange={setSelectedKey}>
                  <SelectTrigger className="border-[#D4C5B0]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NOTES.map(note => (
                      <SelectItem key={note} value={note}>{note}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-[#8B6F47] mb-2 block">Escala/Modo</label>
                <Select value={selectedScale} onValueChange={setSelectedScale}>
                  <SelectTrigger className="border-[#D4C5B0]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SCALE_TYPES).map(([key, data]) => (
                      <SelectItem key={key} value={key}>{data.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-[#8B6F47] mb-2 block">Estilo</label>
                <Select value={selectedGenre} onValueChange={setSelectedGenre}>
                  <SelectTrigger className="border-[#D4C5B0]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PROGRESSION_TEMPLATES).map(([key, data]) => (
                      <SelectItem key={key} value={key}>{data.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Campo Harmônico */}
        <Card className="border-[#D4C5B0] bg-white/80 mb-6">
          <CardHeader>
            <CardTitle className="text-[#8B6F47] flex items-center gap-2">
              <Music2 className="w-5 h-5" />
              Campo Harmônico de {selectedKey} {scaleInfo.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[#A68A64] mb-4">
              Clique nos acordes para montar sua progressão customizada
            </p>
            <div className="grid grid-cols-4 md:grid-cols-7 gap-3">
              {fieldChords.map((chord, idx) => (
                <motion.button
                  key={idx}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => addToCustom(chord)}
                  className={`p-4 rounded-xl text-center border-2 transition-all hover:shadow-lg ${
                    idx === 0 
                      ? "bg-gradient-to-br from-[#8B6F47] to-[#A68A64] text-white border-[#8B6F47]" 
                      : idx === 4
                      ? "bg-gradient-to-br from-[#D4AF37] to-[#E5C04B] text-white border-[#D4AF37]"
                      : idx === 3
                      ? "bg-gradient-to-br from-[#9CAF88] to-[#A8BB94] text-white border-[#9CAF88]"
                      : "bg-white border-[#D4C5B0] hover:border-[#8B6F47]"
                  }`}
                >
                  <p className="text-xl font-bold">{chord.chord}</p>
                  <Badge variant="outline" className="mt-1 text-xs">
                    {chord.romanNumeral}
                  </Badge>
                </motion.button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Templates de Progressão */}
        <Card className="border-[#D4C5B0] bg-white/80 mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-[#8B6F47]">
                Progressões de {PROGRESSION_TEMPLATES[selectedGenre].name}
              </CardTitle>
              <Button
                onClick={generateRandomProgression}
                className="bg-gradient-to-r from-[#D4AF37] to-[#9CAF88] text-white"
              >
                <Shuffle className="w-4 h-4 mr-2" />
                Aleatória
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {PROGRESSION_TEMPLATES[selectedGenre].patterns.map((pattern, idx) => (
                <motion.button
                  key={idx}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => generateProgression(pattern)}
                  className="p-4 bg-[#F5F1E8] rounded-xl border border-[#D4C5B0] text-left hover:border-[#8B6F47] transition-all"
                >
                  <p className="font-bold text-[#8B6F47] mb-1">{pattern.name}</p>
                  <div className="flex gap-2 flex-wrap">
                    {pattern.degrees.map((d, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {fieldChords[d - 1]?.chord}
                      </Badge>
                    ))}
                  </div>
                </motion.button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Progressão Gerada */}
        <AnimatePresence>
          {generatedProgression && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="border-[#D4AF37] bg-gradient-to-r from-[#D4AF37]/10 to-white mb-6">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-[#8B6F47] flex items-center gap-2">
                      <Play className="w-5 h-5 text-[#D4AF37]" />
                      {generatedProgression.name}
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={copyProgression}>
                        <Copy className="w-4 h-4 mr-1" />
                        {copied ? "Copiado!" : "Copiar"}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setGeneratedProgression(null)}>
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-3 flex-wrap">
                    {generatedProgression.chords.map((chord, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: idx * 0.1 }}
                        className="w-20 h-20 bg-gradient-to-br from-[#8B6F47] to-[#A68A64] rounded-xl flex flex-col items-center justify-center text-white shadow-lg"
                      >
                        <p className="text-2xl font-bold">{chord.chord}</p>
                        <p className="text-xs opacity-80">{chord.romanNumeral}</p>
                      </motion.div>
                    ))}
                  </div>
                  <p className="text-sm text-[#A68A64] mt-4">
                    Pattern: {generatedProgression.chords.map(c => c.romanNumeral).join(" → ")}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progressão Customizada */}
        {customProgression.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Card className="border-[#9CAF88] bg-gradient-to-r from-[#9CAF88]/10 to-white">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[#8B6F47]">
                    Sua Progressão ({customProgression.length} acordes)
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={copyProgression}>
                      <Copy className="w-4 h-4 mr-1" />
                      Copiar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setCustomProgression([])}>
                      Limpar
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 flex-wrap">
                  {customProgression.map((chord, idx) => (
                    <motion.button
                      key={idx}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      onClick={() => removeFromCustom(idx)}
                      className="w-16 h-16 bg-[#9CAF88] rounded-lg flex flex-col items-center justify-center text-white hover:bg-red-500 transition-colors"
                      title="Clique para remover"
                    >
                      <p className="text-lg font-bold">{chord.chord}</p>
                      <p className="text-[10px] opacity-80">{chord.romanNumeral}</p>
                    </motion.button>
                  ))}
                </div>
                <p className="text-sm text-[#A68A64] mt-3">
                  {customProgression.map(c => c.romanNumeral).join(" → ")}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}