import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function HarmonicFunctionDiagram({ progressions, mainKey }) {
  const [selectedChord, setSelectedChord] = useState(null);

  if (!progressions || progressions.length === 0 || !mainKey) {
    return null;
  }

  // Mapeamento de funções harmônicas básicas
  const keyIndex = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"].indexOf(mainKey);
  
  const circleOfFifths = ["C", "G", "D", "A", "E", "B", "F#", "C#", "G#", "D#", "A#", "F"];
  const majorScale = ["C", "D", "E", "F", "G", "A", "B"];
  
  // Coleta todos os acordes únicos
  const allChords = [...new Set(progressions.flatMap((p) => p.chords || []))];

  // Classifica acordes por função
  const classifyChord = (chord) => {
    const root = chord.replace(/m|7|9|sus|dim|aug|\+|-|°/g, "");
    const isMinor = chord.includes("m");
    
    if (root === mainKey) {
      return { function: "Tônica (I)", color: "bg-blue-500 text-white", description: "Centro tonal, repouso" };
    }
    
    // Dominante (V) - quinta justa acima
    const dominantIndex = (keyIndex + 7) % 12;
    const dominantNote = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"][dominantIndex];
    if (root === dominantNote) {
      return { function: "Dominante (V)", color: "bg-red-500 text-white", description: "Tensão que resolve na tônica" };
    }
    
    // Subdominante (IV) - quarta justa acima
    const subdominantIndex = (keyIndex + 5) % 12;
    const subdominantNote = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"][subdominantIndex];
    if (root === subdominantNote) {
      return { function: "Subdominante (IV)", color: "bg-green-500 text-white", description: "Preparação, movimento" };
    }
    
    // Relativa menor (vi)
    const relativeMinorIndex = (keyIndex + 9) % 12;
    const relativeMinorNote = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"][relativeMinorIndex];
    if (root === relativeMinorNote && isMinor) {
      return { function: "Relativa Menor (vi)", color: "bg-purple-500 text-white", description: "Contraste menor" };
    }
    
    // Supertônica (ii)
    const supertonicIndex = (keyIndex + 2) % 12;
    const supertonicNote = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"][supertonicIndex];
    if (root === supertonicNote && isMinor) {
      return { function: "Supertônica (ii)", color: "bg-indigo-500 text-white", description: "Preparação para dominante" };
    }
    
    if (chord.includes("7")) {
      return { function: "Dominante Secundário", color: "bg-orange-500 text-white", description: "Preparação cromática" };
    }
    
    return { function: "Outro", color: "bg-gray-400 text-white", description: "Função especial" };
  };

  // Agrupa acordes por função
  const chordsByFunction = {};
  allChords.forEach((chord) => {
    const { function: func } = classifyChord(chord);
    if (!chordsByFunction[func]) {
      chordsByFunction[func] = [];
    }
    chordsByFunction[func].push(chord);
  });

  return (
    <Card className="border-[#D4C5B0] bg-white/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-[#8B6F47] flex items-center gap-2">
          ⚡ Diagrama de Funções Harmônicas
        </CardTitle>
        <p className="text-sm text-[#A68A64]">Tom: <span className="font-bold text-[#8B6F47]">{mainKey}</span></p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Círculo de funções */}
        <div className="relative w-full aspect-square max-w-md mx-auto">
          <svg viewBox="0 0 400 400" className="w-full h-full">
            {/* Círculo externo */}
            <circle cx="200" cy="200" r="180" fill="none" stroke="#D4C5B0" strokeWidth="2" />
            <circle cx="200" cy="200" r="140" fill="none" stroke="#E8DCC4" strokeWidth="1" strokeDasharray="5,5" />
            <circle cx="200" cy="200" r="100" fill="none" stroke="#F5F1E8" strokeWidth="1" strokeDasharray="5,5" />
            
            {/* Centro - Tônica */}
            <circle cx="200" cy="200" r="40" fill="#3B82F6" />
            <text x="200" y="200" textAnchor="middle" dy="5" className="fill-white font-bold text-2xl">
              {mainKey}
            </text>
            <text x="200" y="220" textAnchor="middle" className="fill-white text-xs">
              I
            </text>
            
            {/* Dominante - Direita */}
            <circle cx="300" cy="200" r="35" fill="#EF4444" />
            <text x="300" y="200" textAnchor="middle" dy="5" className="fill-white font-bold text-lg">
              V
            </text>
            <line x1="240" y1="200" x2="265" y2="200" stroke="#8B6F47" strokeWidth="3" markerEnd="url(#arrowhead)" />
            
            {/* Subdominante - Esquerda */}
            <circle cx="100" cy="200" r="35" fill="#22C55E" />
            <text x="100" y="200" textAnchor="middle" dy="5" className="fill-white font-bold text-lg">
              IV
            </text>
            <line x1="135" y1="200" x2="160" y2="200" stroke="#8B6F47" strokeWidth="3" markerEnd="url(#arrowhead)" />
            
            {/* Relativa menor - Baixo */}
            <circle cx="200" cy="300" r="30" fill="#A855F7" />
            <text x="200" y="300" textAnchor="middle" dy="5" className="fill-white font-bold text-sm">
              vi
            </text>
            <line x1="200" y1="240" x2="200" y2="270" stroke="#8B6F47" strokeWidth="2" strokeDasharray="3,3" />
            
            {/* Supertônica - Cima */}
            <circle cx="200" cy="100" r="30" fill="#6366F1" />
            <text x="200" y="100" textAnchor="middle" dy="5" className="fill-white font-bold text-sm">
              ii
            </text>
            <line x1="200" y1="130" x2="200" y2="160" stroke="#8B6F47" strokeWidth="2" strokeDasharray="3,3" />
            
            {/* Definição de seta */}
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                <polygon points="0 0, 10 3, 0 6" fill="#8B6F47" />
              </marker>
            </defs>
          </svg>
        </div>

        {/* Lista de acordes por função */}
        <div className="space-y-4">
          {Object.entries(chordsByFunction).map(([func, chords]) => {
            const { color, description } = classifyChord(chords[0]);
            return (
              <div key={func} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-[#8B6F47]">{func}</h4>
                  <p className="text-xs text-[#A68A64] italic">{description}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {chords.map((chord) => (
                    <button
                      key={chord}
                      onClick={() => setSelectedChord(chord === selectedChord ? null : chord)}
                      className={`px-4 py-2 rounded-lg font-bold text-sm shadow-md transition-all hover:scale-110 ${color} ${selectedChord === chord ? 'ring-4 ring-[#D4AF37]' : ''}`}
                    >
                      {chord}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {selectedChord && (
          <div className="mt-4 p-4 bg-[#F5F1E8] rounded-lg border-2 border-[#D4AF37]">
            <h4 className="font-bold text-[#8B6F47] mb-2">📌 {selectedChord}</h4>
            <p className="text-sm text-[#A68A64]">
              Função: <span className="font-bold">{classifyChord(selectedChord).function}</span>
            </p>
            <p className="text-sm text-[#A68A64] mt-1">
              {classifyChord(selectedChord).description}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}