import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Music2, Info, ArrowRight, Play, Guitar, Hand } from "lucide-react";
import { motion } from "framer-motion";
import FretboardView from "@/components/scales/FretboardView";

const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const NOTES_PT = ["Dó", "Dó#", "Ré", "Ré#", "Mi", "Fá", "Fá#", "Sol", "Sol#", "Lá", "Lá#", "Si"];

const SCALE_FORMULAS = {
  maior: {
    name: "Escala Maior",
    intervals: [2, 2, 1, 2, 2, 2, 1],
    description: "A escala maior é a mais comum na música ocidental. Som alegre e brilhante.",
    pattern: "Tom - Tom - Semitom - Tom - Tom - Tom - Semitom",
    degrees: ["I", "II", "III", "IV", "V", "VI", "VII"],
    degreesNames: ["Tônica", "Supertônica", "Mediante", "Subdominante", "Dominante", "Superdominante", "Sensível"],
    example: "Dó Maior: C D E F G A B"
  },
  menor_natural: {
    name: "Escala Menor Natural",
    intervals: [2, 1, 2, 2, 1, 2, 2],
    description: "Som melancólico e introspectivo. Base para a música menor.",
    pattern: "Tom - Semitom - Tom - Tom - Semitom - Tom - Tom",
    degrees: ["I", "II", "♭III", "IV", "V", "♭VI", "♭VII"],
    degreesNames: ["Tônica", "Supertônica", "Mediante", "Subdominante", "Dominante", "Superdominante", "Subtônica"],
    example: "Lá Menor: A B C D E F G"
  },
  menor_harmonica: {
    name: "Escala Menor Harmônica",
    intervals: [2, 1, 2, 2, 1, 3, 1],
    description: "Som oriental e dramático. Usa sensível para resolução forte.",
    pattern: "Tom - Semitom - Tom - Tom - Semitom - Tom e meio - Semitom",
    degrees: ["I", "II", "♭III", "IV", "V", "♭VI", "VII"],
    degreesNames: ["Tônica", "Supertônica", "Mediante", "Subdominante", "Dominante", "Superdominante", "Sensível"],
    example: "Lá Menor Harmônica: A B C D E F G#"
  },
  menor_melodica: {
    name: "Escala Menor Melódica",
    intervals: [2, 1, 2, 2, 2, 2, 1],
    description: "Ascendente como maior, descendente como menor natural. Som suave.",
    pattern: "Tom - Semitom - Tom - Tom - Tom - Tom - Semitom (ascendente)",
    degrees: ["I", "II", "♭III", "IV", "V", "VI", "VII"],
    degreesNames: ["Tônica", "Supertônica", "Mediante", "Subdominante", "Dominante", "Superdominante", "Sensível"],
    example: "Lá Menor Melódica: A B C D E F# G# (subindo)"
  },
  pentatonica_maior: {
    name: "Escala Pentatônica Maior",
    intervals: [2, 2, 3, 2, 3],
    description: "5 notas. Som consonante e agradável. Muito usada no Blues e Rock.",
    pattern: "Tom - Tom - Tom e meio - Tom - Tom e meio",
    degrees: ["I", "II", "III", "V", "VI"],
    degreesNames: ["Tônica", "Supertônica", "Mediante", "Dominante", "Superdominante"],
    example: "Dó Pentatônica Maior: C D E G A"
  },
  pentatonica_menor: {
    name: "Escala Pentatônica Menor",
    intervals: [3, 2, 2, 3, 2],
    description: "5 notas. Som bluesy e emotivo. Base do Blues e Rock.",
    pattern: "Tom e meio - Tom - Tom - Tom e meio - Tom",
    degrees: ["I", "♭III", "IV", "V", "♭VII"],
    degreesNames: ["Tônica", "Mediante", "Subdominante", "Dominante", "Subtônica"],
    example: "Lá Pentatônica Menor: A C D E G"
  },
  blues: {
    name: "Escala Blues",
    intervals: [3, 2, 1, 1, 3, 2],
    description: "Pentatônica menor + blue note (♭5). Som característico do Blues.",
    pattern: "Tom e meio - Tom - Semitom - Semitom - Tom e meio - Tom",
    degrees: ["I", "♭III", "IV", "♭V", "V", "♭VII"],
    degreesNames: ["Tônica", "Mediante", "Subdominante", "Blue Note", "Dominante", "Subtônica"],
    example: "Lá Blues: A C D D# E G"
  },
  cromatica: {
    name: "Escala Cromática",
    intervals: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    description: "Todas as 12 notas. Sem tonalidade específica. Som tenso e moderno.",
    pattern: "Semitom - Semitom - Semitom... (12 vezes)",
    degrees: ["I", "♭II", "II", "♭III", "III", "IV", "♭V", "V", "♭VI", "VI", "♭VII", "VII"],
    degreesNames: Array(12).fill("Grau cromático"),
    example: "Dó Cromática: C C# D D# E F F# G G# A A# B"
  }
};

export default function Scales() {
  const [selectedKey, setSelectedKey] = useState("C");
  const [selectedScale, setSelectedScale] = useState("maior");
  const [showThirds, setShowThirds] = useState(false);
  const [showSixths, setShowSixths] = useState(false);
  const [showFretboard, setShowFretboard] = useState(false);
  const [leftHanded, setLeftHanded] = useState(false);

  const buildScale = (rootNote, scaleType) => {
    const rootIndex = NOTES.indexOf(rootNote);
    const intervals = SCALE_FORMULAS[scaleType].intervals;
    const scale = [rootNote];
    let currentIndex = rootIndex;

    intervals.forEach(interval => {
      currentIndex = (currentIndex + interval) % 12;
      scale.push(NOTES[currentIndex]);
    });

    return scale;
  };

  const buildThirds = (scale) => {
    const thirds = [];
    for (let i = 0; i < scale.length - 1; i++) {
      thirds.push([scale[i], scale[i + 2] || scale[(i + 2) % (scale.length - 1)]]);
    }
    return thirds;
  };

  const buildSixths = (scale) => {
    const sixths = [];
    for (let i = 0; i < scale.length - 1; i++) {
      sixths.push([scale[i], scale[i + 5] || scale[(i + 5) % (scale.length - 1)]]);
    }
    return sixths;
  };

  const scale = buildScale(selectedKey, selectedScale);
  const scaleInfo = SCALE_FORMULAS[selectedScale];
  const thirds = buildThirds(scale);
  const sixths = buildSixths(scale);

  // Construção dos acordes da escala (campo harmônico)
  const buildScaleChords = () => {
    if (selectedScale === "cromatica" || selectedScale.includes("pentatonica") || selectedScale === "blues") {
      return null; // Escalas sem campo harmônico tradicional
    }
    
    const chordQualities = selectedScale === "maior" 
      ? ["", "m", "m", "", "", "m", "°"]
      : selectedScale === "menor_natural"
      ? ["m", "°", "", "m", "m", "", ""]
      : selectedScale === "menor_harmonica"
      ? ["m", "°", "+", "m", "", "", "°"]
      : selectedScale === "menor_melodica"
      ? ["m", "m", "+", "", "", "°", "°"]
      : null;
    
    if (!chordQualities) return null;
    
    const degrees = ["I", "II", "III", "IV", "V", "VI", "VII"];
    
    return scale.slice(0, 7).map((note, idx) => ({
      note,
      quality: chordQualities[idx],
      chord: note + chordQualities[idx],
      degree: degrees[idx] + (chordQualities[idx] === "m" ? "" : chordQualities[idx] === "°" ? "°" : ""),
      function: idx === 0 ? "Tônica" : idx === 3 ? "Subdominante" : idx === 4 ? "Dominante" : ""
    }));
  };

  const scaleChords = buildScaleChords();

  return (
    <div className="bg-amber-50 p-4 min-h-screen md:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8">
          <h1 className="text-4xl font-bold text-[#8B6F47] mb-2" style={{ letterSpacing: '0.5px' }}>
            🎼 Escalas Musicais
          </h1>
          <p className="text-[#A68A64]">Aprenda sobre escalas e sua construção</p>
        </motion.div>

        {/* Seleção de Tonalidade e Escala */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-[#D4C5B0] shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium text-[#8B6F47] mb-2 block">
                Escolha a Tonalidade
              </label>
              <Select value={selectedKey} onValueChange={setSelectedKey}>
                <SelectTrigger className="bg-white border-[#D4C5B0]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NOTES.map((note, idx) => (
                    <SelectItem key={note} value={note}>
                      {note} ({NOTES_PT[idx]})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-[#8B6F47] mb-2 block">
                Escolha a Escala
              </label>
              <Select value={selectedScale} onValueChange={setSelectedScale}>
                <SelectTrigger className="bg-white border-[#D4C5B0]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SCALE_FORMULAS).map(([key, data]) => (
                    <SelectItem key={key} value={key}>
                      {data.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              variant={showFretboard ? "default" : "outline"}
              onClick={() => setShowFretboard(!showFretboard)}
              className={showFretboard ? "bg-[#8B6F47] hover:bg-[#6B5437]" : ""}>
              <Guitar className="w-4 h-4 mr-1" />
              Braço do Violão
            </Button>
            <Button
              variant={showThirds ? "default" : "outline"}
              onClick={() => setShowThirds(!showThirds)}
              className={showThirds ? "bg-[#9CAF88] hover:bg-[#8B9E77]" : ""}>
              Terças
            </Button>
            <Button
              variant={showSixths ? "default" : "outline"}
              onClick={() => setShowSixths(!showSixths)}
              className={showSixths ? "bg-[#D4AF37] hover:bg-[#C39F27]" : ""}>
              Sextas
            </Button>
          </div>
        </motion.div>

        <div className="space-y-6">
          {/* Visualização da Escala em largura total */}
          <div className="space-y-6">
            {/* Escala Construída */}
            <Card className="border-[#D4C5B0] bg-white/80 backdrop-blur-sm">
              <CardHeader className="border-b border-[#D4C5B0]">
                <CardTitle className="text-[#8B6F47] flex items-center gap-2">
                  <Music2 className="w-5 h-5" />
                  {scaleInfo.name} em {selectedKey}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex flex-wrap gap-3 mb-6">
                  {scale.map((note, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex flex-col items-center">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold ${
                        idx === 0 
                          ? "bg-gradient-to-br from-[#8B6F47] to-[#A68A64] text-white shadow-lg" 
                          : "bg-[#F5F1E8] text-[#8B6F47] border-2 border-[#D4C5B0]"
                      }`}>
                        {note}
                      </div>
                      <Badge className="mt-2" variant="outline">
                        {scaleInfo.degrees[idx]}
                      </Badge>
                      <span className="text-xs text-gray-600 mt-1">
                        {scaleInfo.degreesNames[idx]}
                      </span>
                    </motion.div>
                  ))}
                </div>

                {/* Visualização dos Intervalos */}
                <div className="bg-[#F5F1E8] p-4 rounded-lg">
                  <p className="text-sm font-medium text-[#8B6F47] mb-3">Intervalos entre as notas:</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {scaleInfo.intervals.map((interval, idx) => (
                      <React.Fragment key={idx}>
                        <Badge className="bg-[#9CAF88] text-white">
                          {scale[idx]}
                        </Badge>
                        <div className="flex items-center gap-1 px-2 py-1 bg-white rounded text-xs">
                          <ArrowRight className="w-3 h-3 text-[#D4AF37]" />
                          <span className="font-bold text-[#D4AF37]">
                            {interval === 1 ? "½" : interval === 2 ? "1" : interval === 3 ? "1½" : interval}T
                          </span>
                        </div>
                      </React.Fragment>
                    ))}
                    <Badge className="bg-[#9CAF88] text-white">
                      {scale[scale.length - 1]}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Braço do Violão */}
            {showFretboard && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}>
                <Card className="border-[#8B6F47] bg-white/80 backdrop-blur-sm">
                  <CardHeader className="border-b border-[#D4C5B0] flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-[#8B6F47] flex items-center gap-2">
                      <Guitar className="w-5 h-5" />
                      Braço do Violão — {scaleInfo.name} em {selectedKey}
                    </CardTitle>
                    <Button
                      variant={leftHanded ? "default" : "outline"}
                      onClick={() => setLeftHanded(!leftHanded)}
                      className={leftHanded ? "bg-[#8B6F47] hover:bg-[#6B5437]" : "border-[#D4C5B0] text-[#8B6F47] hover:bg-[#8B6F47]/10"}
                    >
                      <Hand className="w-4 h-4 mr-1" />
                      {leftHanded ? "Canhoto (espelhado)" : "Modo Canhoto"}
                    </Button>
                  </CardHeader>
                  <CardContent className="p-6">
                    <FretboardView scale={scale} scaleInfo={scaleInfo} leftHanded={leftHanded} />
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Terças */}
            {showThirds && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}>
                <Card className="border-[#9CAF88] bg-white/80 backdrop-blur-sm">
                  <CardHeader className="border-b border-[#9CAF88]">
                    <CardTitle className="text-[#8B6F47] flex items-center gap-2">
                      <Play className="w-5 h-5 text-[#9CAF88]" />
                      Escalas em Terças
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <p className="text-sm text-gray-700 mb-4">
                      Terças são intervalos de 3 graus. Tocá-las juntas cria harmonia e é ótimo para improvisação.
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {thirds.map((pair, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: idx * 0.05 }}
                          className="bg-[#F5F1E8] p-3 rounded-lg border-2 border-[#9CAF88] text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span className="text-lg font-bold text-[#8B6F47]">{pair[0]}</span>
                            <span className="text-[#9CAF88]">+</span>
                            <span className="text-lg font-bold text-[#8B6F47]">{pair[1]}</span>
                          </div>
                          <span className="text-xs text-gray-600">Terça {idx + 1}</span>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Sextas */}
            {showSixths && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}>
                <Card className="border-[#D4AF37] bg-white/80 backdrop-blur-sm">
                  <CardHeader className="border-b border-[#D4AF37]">
                    <CardTitle className="text-[#8B6F47] flex items-center gap-2">
                      <Play className="w-5 h-5 text-[#D4AF37]" />
                      Escalas em Sextas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <p className="text-sm text-gray-700 mb-4">
                      Sextas são intervalos de 6 graus. Som mais aberto e brilhante, muito usado em melodias.
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {sixths.map((pair, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: idx * 0.05 }}
                          className="bg-[#F5F1E8] p-3 rounded-lg border-2 border-[#D4AF37] text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span className="text-lg font-bold text-[#8B6F47]">{pair[0]}</span>
                            <span className="text-[#D4AF37]">+</span>
                            <span className="text-lg font-bold text-[#8B6F47]">{pair[1]}</span>
                          </div>
                          <span className="text-xs text-gray-600">Sexta {idx + 1}</span>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Campo Harmônico - Acordes da Escala */}
            {scaleChords && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}>
                <Card className="border-[#8B6F47] bg-gradient-to-br from-white to-[#F5F1E8]">
                  <CardHeader className="border-b border-[#D4C5B0]">
                    <CardTitle className="text-[#8B6F47] flex items-center gap-2">
                      🎸 Campo Harmônico - Acordes de {selectedKey} {scaleInfo.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <p className="text-sm text-gray-700 mb-4">
                      Estes são os acordes formados a partir de cada grau da escala. Use-os para criar progressões harmônicas!
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                      {scaleChords.map((chord, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ scale: 0, rotate: -10 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ delay: idx * 0.08 }}
                          className={`p-4 rounded-xl text-center border-2 transition-all hover:shadow-lg ${
                            chord.function === "Tônica" 
                              ? "bg-gradient-to-br from-[#8B6F47] to-[#A68A64] text-white border-[#8B6F47]" 
                              : chord.function === "Dominante"
                              ? "bg-gradient-to-br from-[#D4AF37] to-[#E5C04B] text-white border-[#D4AF37]"
                              : chord.function === "Subdominante"
                              ? "bg-gradient-to-br from-[#9CAF88] to-[#A8BB94] text-white border-[#9CAF88]"
                              : "bg-white border-[#D4C5B0]"
                          }`}>
                          <p className="text-2xl font-bold mb-1">{chord.chord}</p>
                          <Badge 
                            variant="outline" 
                            className={`text-xs mb-2 ${
                              chord.function ? "border-white/50 text-current" : "border-[#D4C5B0]"
                            }`}>
                            {chord.degree}
                          </Badge>
                          {chord.function && (
                            <p className={`text-xs font-medium ${
                              chord.function ? "text-current opacity-90" : "text-[#8B6F47]"
                            }`}>
                              {chord.function}
                            </p>
                          )}
                          <p className={`text-xs mt-1 ${
                            chord.function ? "text-current opacity-75" : "text-gray-500"
                          }`}>
                            {chord.quality === "" ? "Maior" : chord.quality === "m" ? "Menor" : chord.quality === "°" ? "Diminuto" : chord.quality === "+" ? "Aumentado" : ""}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                    
                    <div className="mt-6 p-4 bg-[#F5F1E8] rounded-lg border border-[#D4C5B0]">
                      <p className="text-sm font-medium text-[#8B6F47] mb-2">💡 Progressões Comuns:</p>
                      <div className="flex flex-wrap gap-2">
                        <Badge className="bg-[#8B6F47] text-white">I - IV - V - I</Badge>
                        <Badge className="bg-[#9CAF88] text-white">I - V - vi - IV</Badge>
                        <Badge className="bg-[#D4AF37] text-white">ii - V - I</Badge>
                        <Badge variant="outline" className="text-[#8B6F47]">I - vi - IV - V</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

          </div>

          {/* Material Didático e Informações da Escala */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Coluna 1 e 2: Material Didático */}
            <div className="lg:col-span-2">
              <Card className="border-[#D4C5B0] bg-gradient-to-br from-[#F5F1E8] to-white">
                <CardHeader className="border-b border-[#D4C5B0]">
                  <CardTitle className="text-[#8B6F47]">
                    📚 O que são Escalas Musicais?
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
                    <p>
                      <strong className="text-[#8B6F47]">Escala Musical</strong> é uma sequência de notas organizadas em ordem de altura, 
                      do grave para o agudo, servindo como base para melodia e harmonia.
                    </p>
                    
                    <div className="bg-white p-4 rounded-lg border-l-4 border-[#8B6F47]">
                      <h4 className="font-bold text-[#8B6F47] mb-2">🎵 Intervalos</h4>
                      <p className="text-xs">
                        As distâncias entre notas são medidas em <strong>tons (T)</strong> e <strong>semitons (½T)</strong>. 
                        No piano, um semitom é a distância entre uma tecla e a próxima (incluindo pretas).
                      </p>
                    </div>

                    <div className="bg-white p-4 rounded-lg border-l-4 border-[#9CAF88]">
                      <h4 className="font-bold text-[#8B6F47] mb-2">🎼 Função na Música</h4>
                      <p className="text-xs">
                        Escalas são a base para criar <strong>melodias</strong> (notas em sequência) e 
                        <strong> acordes</strong> (notas simultâneas). Definem a tonalidade da música.
                      </p>
                    </div>

                    <div className="bg-white p-4 rounded-lg border-l-4 border-[#D4AF37]">
                      <h4 className="font-bold text-[#8B6F47] mb-2">🎯 Tônica</h4>
                      <p className="text-xs">
                        A <strong>tônica</strong> (primeiro grau) é a nota mais importante da escala, 
                        dá nome à tonalidade e é o centro tonal para onde a música tende a resolver.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Coluna 3: Informações da Escala */}
            <div className="lg:col-span-1">
              <Card className="border-[#D4C5B0] bg-white/80 backdrop-blur-sm">
                <CardHeader className="border-b border-[#D4C5B0]">
                  <CardTitle className="text-[#8B6F47] flex items-center gap-2">
                    <Info className="w-5 h-5" />
                    Sobre a Escala
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div>
                    <h3 className="font-bold text-[#8B6F47] mb-2">{scaleInfo.name}</h3>
                    <p className="text-sm text-gray-700 leading-relaxed">{scaleInfo.description}</p>
                  </div>

                  <div className="bg-[#F5F1E8] p-3 rounded-lg">
                    <p className="text-xs font-medium text-[#8B6F47] mb-1">Padrão de Intervalos:</p>
                    <p className="text-xs text-gray-700 leading-relaxed">{scaleInfo.pattern}</p>
                  </div>

                  <div className="bg-[#E8DCC4] p-3 rounded-lg">
                    <p className="text-xs font-medium text-[#8B6F47] mb-2">Exemplo:</p>
                    <p className="text-xs text-gray-700 font-mono">{scaleInfo.example}</p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-[#8B6F47] mb-2">Graus da Escala:</p>
                    <div className="space-y-1">
                      {scaleInfo.degrees.slice(0, scaleInfo.intervals.length).map((degree, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs">
                          <Badge variant="outline" className="font-mono w-12 justify-center">
                            {degree}
                          </Badge>
                          <span className="text-gray-700">{scaleInfo.degreesNames[idx]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}