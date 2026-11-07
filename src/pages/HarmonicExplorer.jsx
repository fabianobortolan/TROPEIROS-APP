import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Music2, ArrowRight, Link2, Layers, GitBranch } from "lucide-react";
import { motion } from "framer-motion";

const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const MODES = {
  jonio: { name: "Jônio (Maior)", intervals: [0, 2, 4, 5, 7, 9, 11], character: "Alegre, brilhante", color: "#8B6F47" },
  dorico: { name: "Dórico", intervals: [0, 2, 3, 5, 7, 9, 10], character: "Menor com 6ª maior, jazzístico", color: "#9CAF88" },
  frigio: { name: "Frígio", intervals: [0, 1, 3, 5, 7, 8, 10], character: "Espanhol, tenso", color: "#D4AF37" },
  lidio: { name: "Lídio", intervals: [0, 2, 4, 6, 7, 9, 11], character: "Sonhador, etéreo", color: "#A68A64" },
  mixolidio: { name: "Mixolídio", intervals: [0, 2, 4, 5, 7, 9, 10], character: "Bluesy, dominante", color: "#6B8E4E" },
  eolio: { name: "Eólio (Menor)", intervals: [0, 2, 3, 5, 7, 8, 10], character: "Melancólico, triste", color: "#7B6B47" },
  locrio: { name: "Lócrio", intervals: [0, 1, 3, 5, 6, 8, 10], character: "Instável, diminuto", color: "#8B4747" }
};

const CHORD_QUALITIES = {
  jonio: ["", "m", "m", "", "", "m", "°"],
  dorico: ["m", "m", "", "", "m", "°", ""],
  frigio: ["m", "", "", "m", "°", "", "m"],
  lidio: ["", "", "m", "°", "", "m", "m"],
  mixolidio: ["", "m", "°", "", "m", "m", ""],
  eolio: ["m", "°", "", "m", "m", "", ""],
  locrio: ["°", "", "m", "m", "", "", "m"]
};

export default function HarmonicExplorer() {
  const [selectedKey, setSelectedKey] = useState("C");
  const [selectedMode, setSelectedMode] = useState("jonio");
  const [compareMode, setCompareMode] = useState(null);

  const getScaleNotes = (key, mode) => {
    const rootIndex = NOTES.indexOf(key);
    return MODES[mode].intervals.map(interval => NOTES[(rootIndex + interval) % 12]);
  };

  const getFieldChords = (key, mode) => {
    const notes = getScaleNotes(key, mode);
    const qualities = CHORD_QUALITIES[mode];
    const romanNumerals = ["I", "II", "III", "IV", "V", "VI", "VII"];
    
    return notes.map((note, idx) => ({
      note,
      quality: qualities[idx],
      chord: note + qualities[idx],
      degree: romanNumerals[idx] + (qualities[idx] === "m" ? "" : qualities[idx] === "°" ? "°" : "")
    }));
  };

  const getRelativeKeys = () => {
    const rootIndex = NOTES.indexOf(selectedKey);
    return {
      relativeMajor: selectedMode === "eolio" ? NOTES[(rootIndex + 3) % 12] : null,
      relativeMinor: selectedMode === "jonio" ? NOTES[(rootIndex + 9) % 12] : null,
      parallelMajor: selectedMode !== "jonio" ? selectedKey : null,
      parallelMinor: selectedMode === "jonio" ? selectedKey : null
    };
  };

  const getParentScale = () => {
    // Encontra qual escala maior gerou este modo
    const modeOffsets = {
      jonio: 0, dorico: 10, frigio: 8, lidio: 7, mixolidio: 5, eolio: 3, locrio: 1
    };
    const rootIndex = NOTES.indexOf(selectedKey);
    const parentIndex = (rootIndex + modeOffsets[selectedMode]) % 12;
    return NOTES[parentIndex];
  };

  const getModeFromDegree = (parentKey, degree) => {
    const modeNames = ["jonio", "dorico", "frigio", "lidio", "mixolidio", "eolio", "locrio"];
    const parentIndex = NOTES.indexOf(parentKey);
    const intervals = [0, 2, 4, 5, 7, 9, 11];
    const modeRoot = NOTES[(parentIndex + intervals[degree]) % 12];
    return { root: modeRoot, mode: modeNames[degree] };
  };

  const scaleNotes = getScaleNotes(selectedKey, selectedMode);
  const fieldChords = getFieldChords(selectedKey, selectedMode);
  const modeInfo = MODES[selectedMode];
  const relatives = getRelativeKeys();
  const parentScale = getParentScale();

  // Modos derivados da mesma escala mãe
  const siblingModes = [0, 1, 2, 3, 4, 5, 6].map(degree => getModeFromDegree(parentScale, degree));

  return (
    <div className="bg-amber-50 p-4 min-h-screen md:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-[#8B6F47] mb-2 flex items-center gap-3">
            <GitBranch className="w-10 h-10 text-[#9CAF88]" />
            Explorador Harmônico
          </h1>
          <p className="text-[#A68A64]">
            Descubra as relações entre escalas, modos e campos harmônicos
          </p>
        </motion.div>

        {/* Seletores */}
        <Card className="border-[#D4C5B0] bg-white/80 mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-[#8B6F47] mb-2 block">Nota Base</label>
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
                <label className="text-sm font-medium text-[#8B6F47] mb-2 block">Modo</label>
                <Select value={selectedMode} onValueChange={setSelectedMode}>
                  <SelectTrigger className="border-[#D4C5B0]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(MODES).map(([key, data]) => (
                      <SelectItem key={key} value={key}>{data.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-white/60 border border-[#D4C5B0]">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="modes">Modos Relacionados</TabsTrigger>
            <TabsTrigger value="compare">Comparar</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Modo Atual */}
              <Card className="border-[#D4C5B0] bg-white/80">
                <CardHeader>
                  <CardTitle className="text-[#8B6F47] flex items-center gap-2">
                    <Music2 className="w-5 h-5" />
                    {selectedKey} {modeInfo.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-3 rounded-lg" style={{ backgroundColor: modeInfo.color + "20" }}>
                      <p className="text-sm font-medium" style={{ color: modeInfo.color }}>
                        Caráter: {modeInfo.character}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-[#A68A64] mb-2">Notas da Escala:</p>
                      <div className="flex gap-2 flex-wrap">
                        {scaleNotes.map((note, idx) => (
                          <Badge 
                            key={idx}
                            className={`text-lg px-3 py-1 ${
                              idx === 0 
                                ? "bg-gradient-to-r from-[#8B6F47] to-[#A68A64] text-white" 
                                : "bg-[#F5F1E8] text-[#8B6F47] border border-[#D4C5B0]"
                            }`}
                          >
                            {note}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-[#A68A64] mb-2">Escala Mãe:</p>
                      <Badge className="bg-[#9CAF88] text-white text-lg px-4 py-2">
                        {parentScale} Maior
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Campo Harmônico */}
              <Card className="border-[#D4C5B0] bg-white/80">
                <CardHeader>
                  <CardTitle className="text-[#8B6F47] flex items-center gap-2">
                    <Layers className="w-5 h-5" />
                    Campo Harmônico
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-2">
                    {fieldChords.map((chord, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        className={`p-3 rounded-lg text-center border-2 ${
                          idx === 0 
                            ? "bg-gradient-to-br from-[#8B6F47] to-[#A68A64] text-white border-[#8B6F47]" 
                            : idx === 4
                            ? "bg-gradient-to-br from-[#D4AF37] to-[#E5C04B] text-white border-[#D4AF37]"
                            : "bg-white border-[#D4C5B0]"
                        }`}
                      >
                        <p className="text-lg font-bold">{chord.chord}</p>
                        <p className="text-xs opacity-80">{chord.degree}</p>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Relações */}
              <Card className="border-[#D4C5B0] bg-white/80 lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-[#8B6F47] flex items-center gap-2">
                    <Link2 className="w-5 h-5" />
                    Tonalidades Relacionadas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {relatives.relativeMajor && (
                      <div className="p-4 bg-[#9CAF88]/10 rounded-lg border border-[#9CAF88]/30 text-center">
                        <p className="text-xs text-[#9CAF88] mb-1">Relativo Maior</p>
                        <p className="text-2xl font-bold text-[#8B6F47]">{relatives.relativeMajor}</p>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => { setSelectedKey(relatives.relativeMajor); setSelectedMode("jonio"); }}
                          className="mt-2 text-xs"
                        >
                          Explorar <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      </div>
                    )}
                    
                    {relatives.relativeMinor && (
                      <div className="p-4 bg-[#8B6F47]/10 rounded-lg border border-[#8B6F47]/30 text-center">
                        <p className="text-xs text-[#8B6F47] mb-1">Relativo Menor</p>
                        <p className="text-2xl font-bold text-[#8B6F47]">{relatives.relativeMinor}m</p>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => { setSelectedKey(relatives.relativeMinor); setSelectedMode("eolio"); }}
                          className="mt-2 text-xs"
                        >
                          Explorar <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      </div>
                    )}
                    
                    {relatives.parallelMinor && (
                      <div className="p-4 bg-[#D4AF37]/10 rounded-lg border border-[#D4AF37]/30 text-center">
                        <p className="text-xs text-[#D4AF37] mb-1">Paralelo Menor</p>
                        <p className="text-2xl font-bold text-[#8B6F47]">{selectedKey}m</p>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setSelectedMode("eolio")}
                          className="mt-2 text-xs"
                        >
                          Explorar <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      </div>
                    )}

                    {relatives.parallelMajor && (
                      <div className="p-4 bg-[#D4AF37]/10 rounded-lg border border-[#D4AF37]/30 text-center">
                        <p className="text-xs text-[#D4AF37] mb-1">Paralelo Maior</p>
                        <p className="text-2xl font-bold text-[#8B6F47]">{selectedKey}</p>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setSelectedMode("jonio")}
                          className="mt-2 text-xs"
                        >
                          Explorar <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      </div>
                    )}

                    <div className="p-4 bg-purple-100 rounded-lg border border-purple-200 text-center">
                      <p className="text-xs text-purple-600 mb-1">Dominante</p>
                      <p className="text-2xl font-bold text-[#8B6F47]">{NOTES[(NOTES.indexOf(selectedKey) + 7) % 12]}</p>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setSelectedKey(NOTES[(NOTES.indexOf(selectedKey) + 7) % 12])}
                        className="mt-2 text-xs"
                      >
                        Explorar <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </div>

                    <div className="p-4 bg-blue-100 rounded-lg border border-blue-200 text-center">
                      <p className="text-xs text-blue-600 mb-1">Subdominante</p>
                      <p className="text-2xl font-bold text-[#8B6F47]">{NOTES[(NOTES.indexOf(selectedKey) + 5) % 12]}</p>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setSelectedKey(NOTES[(NOTES.indexOf(selectedKey) + 5) % 12])}
                        className="mt-2 text-xs"
                      >
                        Explorar <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="modes">
            <Card className="border-[#D4C5B0] bg-white/80">
              <CardHeader>
                <CardTitle className="text-[#8B6F47]">
                  7 Modos de {parentScale} Maior
                </CardTitle>
                <p className="text-sm text-[#A68A64]">
                  Todos derivados das mesmas notas, começando em graus diferentes
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {siblingModes.map((mode, idx) => {
                    const modeData = MODES[mode.mode];
                    const isActive = mode.root === selectedKey && mode.mode === selectedMode;
                    
                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          isActive 
                            ? "border-[#8B6F47] bg-gradient-to-r from-[#8B6F47]/10 to-white" 
                            : "border-[#D4C5B0] hover:border-[#8B6F47]/50"
                        }`}
                        onClick={() => { setSelectedKey(mode.root); setSelectedMode(mode.mode); }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div 
                              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                              style={{ backgroundColor: modeData.color }}
                            >
                              {mode.root}
                            </div>
                            <div>
                              <p className="font-bold text-[#8B6F47]">
                                {mode.root} {modeData.name}
                              </p>
                              <p className="text-sm text-[#A68A64]">
                                {modeData.character}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline">
                            Grau {["I", "II", "III", "IV", "V", "VI", "VII"][idx]}
                          </Badge>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="compare">
            <Card className="border-[#D4C5B0] bg-white/80">
              <CardHeader>
                <CardTitle className="text-[#8B6F47]">Comparar Modos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <label className="text-sm font-medium text-[#8B6F47] mb-2 block">Comparar com:</label>
                  <Select value={compareMode || ""} onValueChange={setCompareMode}>
                    <SelectTrigger className="border-[#D4C5B0] w-64">
                      <SelectValue placeholder="Selecione um modo" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(MODES).filter(([k]) => k !== selectedMode).map(([key, data]) => (
                        <SelectItem key={key} value={key}>{data.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {compareMode && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 bg-[#8B6F47]/10 rounded-xl">
                      <h4 className="font-bold text-[#8B6F47] mb-3">{selectedKey} {MODES[selectedMode].name}</h4>
                      <div className="flex gap-2 flex-wrap mb-3">
                        {getScaleNotes(selectedKey, selectedMode).map((note, idx) => (
                          <Badge key={idx} className="bg-[#8B6F47] text-white">{note}</Badge>
                        ))}
                      </div>
                      <p className="text-sm text-[#A68A64]">{MODES[selectedMode].character}</p>
                    </div>

                    <div className="p-4 bg-[#9CAF88]/10 rounded-xl">
                      <h4 className="font-bold text-[#9CAF88] mb-3">{selectedKey} {MODES[compareMode].name}</h4>
                      <div className="flex gap-2 flex-wrap mb-3">
                        {getScaleNotes(selectedKey, compareMode).map((note, idx) => {
                          const isCommon = getScaleNotes(selectedKey, selectedMode).includes(note);
                          return (
                            <Badge 
                              key={idx} 
                              className={isCommon ? "bg-[#9CAF88] text-white" : "bg-red-500 text-white"}
                            >
                              {note}
                            </Badge>
                          );
                        })}
                      </div>
                      <p className="text-sm text-[#A68A64]">{MODES[compareMode].character}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}