import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RotateCcw, Save, X as XIcon, Guitar } from "lucide-react";

export default function InteractiveChordEditor({ chord, onSave, onCancel }) {
  const [instrument, setInstrument] = useState(chord.instrument || "violao");
  const isViola = instrument === "viola";
  const numDisplayStrings = isViola ? 5 : 6;
  const numFrets = 12;
  
  // Estado local do diagrama (array de strings)
  const [strings, setStrings] = useState(
    chord.strings && chord.strings.length > 0 
      ? [...chord.strings] 
      : Array(isViola ? 10 : 6).fill('x')
  );
  
  const [chordName, setChordName] = useState(chord.name || "");
  const [startFret, setStartFret] = useState(chord.fret || 0);
  const [barreFret, setBarreFret] = useState(chord.barre_fret || null); // Traste da pestana

  // Quando muda o instrumento, reseta as cordas
  const handleInstrumentChange = (newInstrument) => {
    setInstrument(newInstrument);
    const newIsViola = newInstrument === "viola";
    setStrings(Array(newIsViola ? 10 : 6).fill('x'));
    setBarreFret(null);
  };

  // Para viola, pega apenas as cordas ímpares para visualização
  const displayStrings = isViola 
    ? strings.filter((_, i) => i % 2 === 0)
    : strings;

  // Atualiza string quando clicado
  const handleStringClick = (stringIndex, fret) => {
    const newStrings = [...strings];
    
    if (isViola) {
      // Para viola, atualiza ambas as cordas do par
      const pairIndex = stringIndex * 2;
      newStrings[pairIndex] = fret.toString();
      newStrings[pairIndex + 1] = fret.toString();
    } else {
      newStrings[stringIndex] = fret.toString();
    }
    
    setStrings(newStrings);
  };

  // Marca corda como não tocada (x)
  const handleMarkMuted = (stringIndex) => {
    const newStrings = [...strings];
    
    if (isViola) {
      const pairIndex = stringIndex * 2;
      newStrings[pairIndex] = 'x';
      newStrings[pairIndex + 1] = 'x';
    } else {
      newStrings[stringIndex] = 'x';
    }
    
    setStrings(newStrings);
  };

  // Marca corda solta (0)
  const handleMarkOpen = (stringIndex) => {
    const newStrings = [...strings];
    
    if (isViola) {
      const pairIndex = stringIndex * 2;
      newStrings[pairIndex] = '0';
      newStrings[pairIndex + 1] = '0';
    } else {
      newStrings[stringIndex] = '0';
    }
    
    setStrings(newStrings);
  };

  const handleReset = () => {
    const newIsViola = instrument === "viola";
    setStrings(Array(newIsViola ? 10 : 6).fill('x'));
    setStartFret(0);
    setBarreFret(null);
  };

  const handleSave = () => {
    const chordData = {
      name: chordName,
      instrument: instrument,
      strings: strings,
      fret: startFret,
      barre_fret: barreFret,
      fingers: barreFret ? `Pestana na casa ${barreFret}` : (chord.fingers || ""),
      category: chord.category,
      difficulty: chord.difficulty,
      description: chord.description || "",
      notes: chord.notes || []
    };
    
    // Se está editando, inclui o ID
    if (chord.id) {
      chordData.id = chord.id;
    }
    
    onSave(chordData);
  };

  const handleToggleBarre = (fret) => {
    if (barreFret === fret) {
      setBarreFret(null); // Remove pestana
    } else {
      setBarreFret(fret); // Define pestana
      
      // Marca todas as cordas naquela casa
      const newStrings = [...strings];
      if (isViola) {
        for (let i = 0; i < 10; i += 2) {
          const currentVal = getStringValue(strings[i]);
          if (currentVal !== 'x') { // Não sobrescreve cordas mutadas
            newStrings[i] = fret.toString();
            newStrings[i + 1] = fret.toString();
          }
        }
      } else {
        for (let i = 0; i < 6; i++) {
          const currentVal = getStringValue(strings[i]);
          if (currentVal !== 'x') {
            newStrings[i] = fret.toString();
          }
        }
      }
      setStrings(newStrings);
    }
  };

  const violaPairNames = ['B', 'E', 'G#', 'B', 'E'];
  const stringSpacing = 50;
  const fretHeight = 50;
  const startX = 80;
  const startY = 100;
  const width = startX + (numDisplayStrings - 1) * stringSpacing + 100;
  const height = startY + numFrets * fretHeight + 100;

  const getStringValue = (stringValue) => {
    if (stringValue === 'x' || stringValue === 'X') return 'x';
    if (stringValue === '0' || stringValue === 'o' || stringValue === 'O') return '0';
    return parseInt(stringValue);
  };

  return (
    <Card className="border-[#D4C5B0] bg-white/90 backdrop-blur-sm">
      <CardHeader className="border-b border-[#D4C5B0]">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[#8B6F47]">
            Editor Interativo - {isViola ? "Viola Caipira" : "Violão"}
          </CardTitle>
          <div className="flex gap-2">
            <Button 
              onClick={handleSave}
              disabled={!chordName.trim()}
              className="bg-gradient-to-r from-[#8B6F47] to-[#A68A64] text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              Salvar Acorde
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Limpar
            </Button>
            <Button variant="outline" size="sm" onClick={onCancel}>
              <XIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-[#8B6F47]">Instrumento</Label>
            <Select value={instrument} onValueChange={handleInstrumentChange}>
              <SelectTrigger className="border-[#D4C5B0]">
                <Guitar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="violao">Violão (6 cordas)</SelectItem>
                <SelectItem value="viola">Viola Caipira (5 pares)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-[#8B6F47]">Nome do Acorde</Label>
            <Input
              value={chordName}
              onChange={(e) => setChordName(e.target.value)}
              placeholder="Ex: C, Am, G7"
              className="border-[#D4C5B0]"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[#8B6F47]">Casa Inicial</Label>
            <Input
              type="number"
              value={startFret}
              onChange={(e) => setStartFret(parseInt(e.target.value) || 0)}
              min="0"
              max="12"
              className="border-[#D4C5B0]"
            />
          </div>
        </div>

        <div className="bg-[#F5F1E8] rounded-lg p-6 overflow-x-auto">
          <div className="mb-4 space-y-2">
            <p className="text-sm text-[#A68A64] text-center font-medium">
              ✨ Clique nas intersecções entre cordas e trastes para marcar onde tocar
            </p>
            {barreFret && (
              <div className="flex items-center justify-center gap-2 bg-[#D4AF37]/20 rounded-lg p-2 border border-[#D4AF37]">
                <Badge className="bg-[#D4AF37] text-white">
                  🎸 Pestana na casa {barreFret}
                </Badge>
                <p className="text-xs text-[#8B6F47]">
                  Clique no botão "P" ao lado do traste para remover
                </p>
              </div>
            )}
          </div>
          
          <div className="flex justify-center">
            <svg width={width} height={height} className="bg-white/50 rounded-lg">
              {/* Título */}
              <text
                x={width / 2}
                y={40}
                textAnchor="middle"
                className="text-2xl font-bold fill-[#8B6F47]"
              >
                {chordName || "Clique para editar"}
              </text>

              {/* Cordas verticais */}
              {Array.from({ length: numDisplayStrings }).map((_, i) => {
                const x = startX + i * stringSpacing;
                
                if (isViola) {
                  return (
                    <g key={`string-pair-${i}`}>
                      <line
                        x1={x - 2}
                        y1={startY}
                        x2={x - 2}
                        y2={startY + numFrets * fretHeight}
                        stroke="#8B6F47"
                        strokeWidth={2}
                      />
                      <line
                        x1={x + 2}
                        y1={startY}
                        x2={x + 2}
                        y2={startY + numFrets * fretHeight}
                        stroke="#8B6F47"
                        strokeWidth={2}
                      />
                      <text
                        x={x}
                        y={startY + numFrets * fretHeight + 25}
                        textAnchor="middle"
                        className="text-sm font-bold fill-[#9CAF88]"
                      >
                        {violaPairNames[i]}
                      </text>
                    </g>
                  );
                } else {
                  return (
                    <line
                      key={`string-${i}`}
                      x1={x}
                      y1={startY}
                      x2={x}
                      y2={startY + numFrets * fretHeight}
                      stroke="#8B6F47"
                      strokeWidth={2}
                    />
                  );
                }
              })}

              {/* Trastes */}
              {Array.from({ length: numFrets + 1 }).map((_, i) => (
                <line
                  key={`fret-${i}`}
                  x1={startX}
                  y1={startY + i * fretHeight}
                  x2={startX + (numDisplayStrings - 1) * stringSpacing}
                  y2={startY + i * fretHeight}
                  stroke="#8B6F47"
                  strokeWidth={i === 0 ? 4 : 2}
                />
              ))}

              {/* Visualização da Pestana */}
              {barreFret && (() => {
                const adjustedFret = startFret > 0 ? barreFret - startFret : barreFret;
                if (adjustedFret >= 1 && adjustedFret <= numFrets) {
                  const y = startY + (adjustedFret - 0.5) * fretHeight;
                  return (
                    <rect
                      x={startX - 8}
                      y={y - 10}
                      width={(numDisplayStrings - 1) * stringSpacing + 16}
                      height={20}
                      rx={10}
                      fill="#D4AF37"
                      opacity={0.7}
                      stroke="#8B6F47"
                      strokeWidth={2}
                    />
                  );
                }
              })()}

              {/* Áreas clicáveis para corda solta (0) e não tocar (x) */}
              {Array.from({ length: numDisplayStrings }).map((_, stringIdx) => {
                const x = startX + stringIdx * stringSpacing;
                const y = startY - 25;
                
                return (
                  <g key={`clickable-top-${stringIdx}`}>
                    {/* Área para marcar corda solta (0) */}
                    <circle
                      cx={x - 12}
                      cy={y}
                      r={10}
                      fill="transparent"
                      className="cursor-pointer hover:fill-[#2E7D32]/20 transition-all"
                      onClick={() => handleMarkOpen(stringIdx)}
                    />
                    {/* Área para marcar não tocar (x) */}
                    <circle
                      cx={x + 12}
                      cy={y}
                      r={10}
                      fill="transparent"
                      className="cursor-pointer hover:fill-[#D32F2F]/20 transition-all"
                      onClick={() => handleMarkMuted(stringIdx)}
                    />
                  </g>
                );
              })}

              {/* Áreas clicáveis (trastes) */}
              {Array.from({ length: numFrets }).map((_, fretIdx) => (
                Array.from({ length: numDisplayStrings }).map((_, stringIdx) => {
                  const x = startX + stringIdx * stringSpacing;
                  const y = startY + (fretIdx + 0.5) * fretHeight;
                  const fretNumber = startFret + fretIdx + 1;
                  
                  return (
                    <circle
                      key={`clickable-${stringIdx}-${fretIdx}`}
                      cx={x}
                      cy={y}
                      r={15}
                      fill="transparent"
                      className="cursor-pointer hover:fill-[#8B6F47]/20 transition-all"
                      onClick={() => handleStringClick(stringIdx, fretNumber)}
                    />
                  );
                })
              ))}

              {/* Marcações atuais */}
              {displayStrings.map((stringValue, i) => {
                const value = getStringValue(stringValue);
                const x = startX + i * stringSpacing;
                
                if (value === 'x') {
                  return (
                    <g key={`mark-${i}`}>
                      <line
                        x1={x - 8}
                        y1={startY - 25 - 8}
                        x2={x + 8}
                        y2={startY - 25 + 8}
                        stroke="#D32F2F"
                        strokeWidth={3}
                        strokeLinecap="round"
                      />
                      <line
                        x1={x - 8}
                        y1={startY - 25 + 8}
                        x2={x + 8}
                        y2={startY - 25 - 8}
                        stroke="#D32F2F"
                        strokeWidth={3}
                        strokeLinecap="round"
                      />
                    </g>
                  );
                } else if (value === '0') {
                  return (
                    <circle
                      key={`mark-${i}`}
                      cx={x}
                      cy={startY - 25}
                      r={10}
                      fill="none"
                      stroke="#2E7D32"
                      strokeWidth={3}
                    />
                  );
                } else if (typeof value === 'number' && value > 0) {
                  const adjustedFret = startFret > 0 ? value - startFret : value;
                  
                  if (adjustedFret >= 1 && adjustedFret <= numFrets) {
                    const y = startY + (adjustedFret - 0.5) * fretHeight;
                    
                    return (
                      <circle
                        key={`mark-${i}`}
                        cx={x}
                        cy={y}
                        r={isViola ? 14 : 12}
                        fill="#8B6F47"
                        stroke="#D4AF37"
                        strokeWidth={2}
                      />
                    );
                  }
                }
                return null;
              })}

              {/* Numeração dos trastes + Botão Pestana */}
              {Array.from({ length: numFrets }).map((_, i) => {
                const fretNumber = startFret + i + 1;
                const isPestanaHere = barreFret === fretNumber;
                return (
                  <g key={`fret-controls-${i}`}>
                    <text
                      x={startX - 30}
                      y={startY + (i + 0.5) * fretHeight + 5}
                      textAnchor="middle"
                      className="text-sm font-bold fill-[#A68A64]"
                    >
                      {fretNumber}
                    </text>
                    
                    {/* Botão para pestana */}
                    <g
                      className="cursor-pointer"
                      onClick={() => handleToggleBarre(fretNumber)}
                    >
                      <rect
                        x={startX + (numDisplayStrings - 1) * stringSpacing + 15}
                        y={startY + (i + 0.5) * fretHeight - 10}
                        width={30}
                        height={20}
                        rx={4}
                        fill={isPestanaHere ? "#D4AF37" : "#E8DCC4"}
                        stroke={isPestanaHere ? "#8B6F47" : "#D4C5B0"}
                        strokeWidth={2}
                        className="hover:opacity-80 transition-opacity"
                      />
                      <text
                        x={startX + (numDisplayStrings - 1) * stringSpacing + 30}
                        y={startY + (i + 0.5) * fretHeight + 4}
                        textAnchor="middle"
                        className="text-xs font-bold"
                        fill={isPestanaHere ? "#fff" : "#8B6F47"}
                        style={{ pointerEvents: 'none' }}
                      >
                        P
                      </text>
                    </g>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Preview dos valores */}
        <div className="bg-[#E8DCC4] rounded-lg p-4">
          <p className="text-xs text-[#A68A64] font-medium mb-2">PREVIEW (formato salvo):</p>
          <div className="flex gap-2 flex-wrap">
            {strings.map((val, idx) => (
              <Badge key={idx} variant="outline" className="font-mono text-xs">
                {isViola ? `${idx % 2 === 0 ? violaPairNames[Math.floor(idx / 2)] : ''}: ${val}` : `${idx + 1}: ${val}`}
              </Badge>
            ))}
          </div>
        </div>


      </CardContent>
    </Card>
  );
}