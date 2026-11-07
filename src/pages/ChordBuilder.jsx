import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Music2, Piano, RotateCcw, Info, Guitar, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const CHORD_TYPES = {
  'Maior': { intervals: [0, 4, 7], symbol: '', description: 'Tríade maior - som alegre e estável' },
  'Menor': { intervals: [0, 3, 7], symbol: 'm', description: 'Tríade menor - som melancólico' },
  'Diminuto': { intervals: [0, 3, 6], symbol: '°', description: 'Tríade diminuta - som tenso e instável' },
  'Aumentado': { intervals: [0, 4, 8], symbol: '+', description: 'Tríade aumentada - som misterioso' },
  'Maior com 7ª': { intervals: [0, 4, 7, 11], symbol: '7M', description: 'Tétrade maior com 7ª maior - som sofisticado' },
  'Menor com 7ª': { intervals: [0, 3, 7, 10], symbol: 'm7', description: 'Tétrade menor com 7ª menor - som suave' },
  'Dominante (7)': { intervals: [0, 4, 7, 10], symbol: '7', description: 'Tétrade dominante - cria tensão para resolver' },
  'Meio-diminuto': { intervals: [0, 3, 6, 10], symbol: 'm7(b5)', description: 'Tétrade meio-diminuta - usado no VII grau' },
  'Diminuto com 7ª': { intervals: [0, 3, 6, 9], symbol: '°7', description: 'Tétrade diminuta - tensão extrema' },
  'Sus2': { intervals: [0, 2, 7], symbol: 'sus2', description: 'Suspensa com 2ª - som aberto' },
  'Sus4': { intervals: [0, 5, 7], symbol: 'sus4', description: 'Suspensa com 4ª - cria expectativa' },
  'Add9': { intervals: [0, 4, 7, 14], symbol: 'add9', description: 'Maior com 9ª adicionada - som brilhante' },
  '6ª': { intervals: [0, 4, 7, 9], symbol: '6', description: 'Maior com 6ª - som doce e nostálgico' },
  'm6': { intervals: [0, 3, 7, 9], symbol: 'm6', description: 'Menor com 6ª - som dramático' },
  '9': { intervals: [0, 4, 7, 10, 14], symbol: '9', description: 'Dominante com 9ª - som rico e jazzístico' },
};

const INTERVAL_NAMES = {
  0: 'Fundamental (1)',
  1: '2ª menor (b2)',
  2: '2ª maior (2)',
  3: '3ª menor (b3)',
  4: '3ª maior (3)',
  5: '4ª justa (4)',
  6: '4ª aumentada / 5ª diminuta (b5)',
  7: '5ª justa (5)',
  8: '5ª aumentada (#5)',
  9: '6ª maior (6)',
  10: '7ª menor (b7)',
  11: '7ª maior (7)',
  12: 'Oitava (8)',
  13: '9ª menor (b9)',
  14: '9ª maior (9)',
};

export default function ChordBuilder() {
  const [selectedRoot, setSelectedRoot] = useState('C');
  const [selectedType, setSelectedType] = useState('Maior');
  const [showFlats, setShowFlats] = useState(false);
  const [inversionIndex, setInversionIndex] = useState(0);
  const [violaVariationIndex, setViolaVariationIndex] = useState(0);
  const [guitarVariationIndex, setGuitarVariationIndex] = useState(0);

  // Busca acordes de viola do banco de dados
  const { data: violaChords, isLoading: loadingViola } = useQuery({
    queryKey: ['viola-chords'],
    queryFn: () => base44.entities.Chord.filter({ instrument: 'viola' }),
    initialData: []
  });

  // Busca acordes de violão do banco de dados
  const { data: guitarChords, isLoading: loadingGuitar } = useQuery({
    queryKey: ['guitar-chords'],
    queryFn: () => base44.entities.Chord.filter({ instrument: 'violao' }),
    initialData: []
  });

  const notes = showFlats ? NOTES_FLAT : NOTES;
  const chordType = CHORD_TYPES[selectedType];

  // Calcula as notas do acorde
  const getChordNotes = () => {
    const rootIndex = NOTES.indexOf(selectedRoot) !== -1 
      ? NOTES.indexOf(selectedRoot) 
      : NOTES_FLAT.indexOf(selectedRoot);
    
    return chordType.intervals.map(interval => {
      const noteIndex = (rootIndex + (interval % 12)) % 12;
      return {
        note: notes[noteIndex],
        interval: interval,
        intervalName: INTERVAL_NAMES[interval] || `Intervalo ${interval}`
      };
    });
  };

  const chordNotes = getChordNotes();

  // Gera inversões
  const getInversion = (index) => {
    if (index === 0) return chordNotes;
    const inverted = [...chordNotes];
    for (let i = 0; i < index; i++) {
      const first = inverted.shift();
      inverted.push(first);
    }
    return inverted;
  };

  const currentInversion = getInversion(inversionIndex);

  const inversionNames = ['Estado Fundamental', '1ª Inversão', '2ª Inversão', '3ª Inversão', '4ª Inversão'];

  // Cores do sistema para cada nota do acorde
  const NOTE_COLORS = [
    { bg: 'bg-[#8B6F47]', text: 'text-white', label: 'Fundamental' },      // 1ª nota - Marrom principal
    { bg: 'bg-[#D4AF37]', text: 'text-white', label: '3ª' },              // 2ª nota - Dourado
    { bg: 'bg-[#9CAF88]', text: 'text-white', label: '5ª' },             // 3ª nota - Verde
    { bg: 'bg-[#A68A64]', text: 'text-white', label: '7ª' },            // 4ª nota - Marrom claro
    { bg: 'bg-[#6B5437]', text: 'text-white', label: '9ª' },            // 5ª nota - Marrom escuro
  ];

  // Representação no teclado (2 oitavas) com voicings
  const renderPiano = () => {
    const whiteKeys = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    const blackKeys = { 'C': 'C#', 'D': 'D#', 'F': 'F#', 'G': 'G#', 'A': 'A#' };
    const blackKeysFlat = { 'C': 'Db', 'D': 'Eb', 'F': 'Gb', 'G': 'Ab', 'A': 'Bb' };
    
    // Notas ativas baseadas na inversão atual
    const activeNotes = currentInversion.map(n => n.note);
    const blacks = showFlats ? blackKeysFlat : blackKeys;

    // Mapeia índice da nota na inversão para cor
    const getNoteStyle = (note) => {
      const idx = chordNotes.findIndex(n => n.note === note); // Usa chordNotes para manter cores consistentes
      if (idx === -1) return null;
      return NOTE_COLORS[idx] || NOTE_COLORS[0];
    };

    return (
      <div className="space-y-4">
        {/* Legenda */}
        <div className="flex justify-center gap-4 flex-wrap">
          {chordNotes.map((note, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded ${NOTE_COLORS[idx]?.bg}`}></div>
              <span className="text-sm text-[#8B6F47] font-medium">
                {note.note} ({NOTE_COLORS[idx]?.label || `${idx + 1}ª`})
              </span>
            </div>
          ))}
        </div>

        {/* Teclado */}
        <div className="flex justify-center">
          <div className="relative flex">
            {[0, 1].map(octave => (
              <div key={octave} className="flex relative">
                {whiteKeys.map((key, i) => {
                  const isActive = activeNotes.includes(key);
                  const noteStyle = getNoteStyle(key);
                  return (
                    <div
                      key={`${octave}-${key}`}
                      className={`w-12 h-36 border-2 rounded-b-lg flex items-end justify-center pb-2 text-sm font-bold transition-all ${
                        isActive && noteStyle
                          ? `${noteStyle.bg} ${noteStyle.text} border-[#D4C5B0] shadow-xl scale-105 z-20` 
                          : 'bg-[#F5F1E8] text-[#8B6F47] border-[#D4C5B0] hover:bg-[#E8DCC4]'
                      }`}
                    >
                      {key}
                    </div>
                  );
                })}
                {/* Teclas pretas */}
                <div className="absolute top-0 left-0 flex">
                  {whiteKeys.map((key, i) => {
                    if (!blacks[key]) return <div key={i} className="w-12" />;
                    const blackNote = blacks[key];
                    const isActive = activeNotes.includes(blackNote);
                    const noteStyle = getNoteStyle(blackNote);
                    return (
                      <div key={`${octave}-${blackNote}`} className="relative w-12">
                        <div
                          className={`absolute left-1/2 transform -translate-x-1/2 w-8 rounded-b-lg flex items-end justify-center pb-1 text-[10px] font-bold z-10 transition-all ${
                            isActive && noteStyle
                              ? `${noteStyle.bg} ${noteStyle.text} shadow-xl scale-105 border-2 border-[#F5F1E8]` 
                              : 'bg-[#6B5437] text-[#D4C5B0] hover:bg-[#8B6F47]'
                          }`}
                          style={{ height: '5.5rem' }}
                        >
                          {blackNote}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Voicings comuns
  const COMMON_VOICINGS = {
    'Maior': [
      { name: 'Root Position', notes: [0, 4, 7] },
      { name: 'Close Voicing', notes: [0, 4, 7, 12] },
      { name: 'Open Voicing', notes: [0, 7, 16] },
      { name: 'Drop 2', notes: [0, 7, 12, 16] }
    ],
    'Menor': [
      { name: 'Root Position', notes: [0, 3, 7] },
      { name: 'Close Voicing', notes: [0, 3, 7, 12] },
      { name: 'Open Voicing', notes: [0, 7, 15] }
    ],
    'Dominante (7)': [
      { name: 'Root Position', notes: [0, 4, 7, 10] },
      { name: 'Shell Voicing', notes: [0, 4, 10] },
      { name: 'Rootless', notes: [4, 7, 10, 14] }
    ]
  };

  const getVoicingNotes = (voicing) => {
    const rootIndex = NOTES.indexOf(selectedRoot);
    return voicing.notes.map(interval => {
      const noteIndex = (rootIndex + interval) % 12;
      return notes[noteIndex];
    });
  };

  // Renderiza violão usando dados do banco de dados - 6 cordas
  const renderGuitar = () => {
    // Monta o nome do acorde para buscar
    const chordSymbol = chordType.symbol;
    const searchName = selectedRoot + chordSymbol;
    
    // Busca TODOS os acordes que correspondem (várias posições/variações)
    const foundChords = guitarChords.filter(c => {
      const name = c.name?.toLowerCase();
      const search = searchName.toLowerCase();
      return name === search || name === search.replace('m', 'm');
    });
    
    const foundChord = foundChords[guitarVariationIndex] || foundChords[0];

    // Afinação padrão do violão
    const strings = ['E', 'A', 'D', 'G', 'B', 'E'];
    
    if (loadingGuitar) {
      return (
        <div className="text-center py-8">
          <Loader2 className="w-12 h-12 text-[#8B6F47] mx-auto mb-4 animate-spin" />
          <p className="text-[#A68A64]">Carregando acordes...</p>
        </div>
      );
    }

    if (!foundChord) {
      return (
        <div className="text-center py-8">
          <Guitar className="w-16 h-16 text-[#A68A64] mx-auto mb-4" />
          <p className="text-[#A68A64]">
            Diagrama não encontrado para {selectedRoot}{chordType.symbol}
          </p>
          <p className="text-sm text-[#A68A64]/70 mt-2">
            Cadastre este acorde na página de Acordes para visualizá-lo aqui.
          </p>
          <p className="text-xs text-[#A68A64]/50 mt-4">
            Acordes disponíveis: {guitarChords.map(c => c.name).join(', ') || 'Nenhum'}
          </p>
        </div>
      );
    }

    const positions = foundChord.strings || [];
    const startFret = foundChord.fret || 0;
    
    // Calcula frets a mostrar
    const allPositions = positions.filter(p => p !== 'x' && p !== null).map(p => parseInt(p) || 0);
    const maxFret = Math.max(...allPositions, 0);
    const minFret = Math.min(...allPositions.filter(p => p > 0), maxFret || 1);
    const displayStartFret = minFret > 0 ? minFret : 1;
    const numFrets = 5;
    const frets = Array.from({ length: numFrets }, (_, i) => displayStartFret + i);

    return (
      <div className="space-y-6">
        {/* Info da afinação */}
        <div className="text-center">
          <Badge className="bg-[#8B6F47] text-white text-sm px-4 py-1">
            Afinação: Padrão (E A D G B E)
          </Badge>
        </div>

        {/* Legenda das cores */}
        <div className="flex justify-center gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-[#8B6F47]"></div>
            <span className="text-sm text-[#8B6F47] font-medium">Fundamental (F)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-[#D4AF37]"></div>
            <span className="text-sm text-[#8B6F47] font-medium">Terça (3ª)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-[#9CAF88]"></div>
            <span className="text-sm text-[#8B6F47] font-medium">Quinta (5ª)</span>
          </div>
        </div>

        {/* Braço do violão */}
        <div className="flex justify-center">
          <div className="relative bg-[#F5F1E8] p-4 rounded-xl border-2 border-[#D4C5B0]">
            {/* Número da casa inicial */}
            {displayStartFret > 1 && (
              <div className="absolute -left-10 top-16 text-[#8B6F47] font-bold text-xl">
                {displayStartFret}ª
              </div>
            )}

            {/* Nomes das cordas (cabeçalho) */}
            <div className="flex mb-2">
              {strings.map((str, i) => (
                <div key={i} className="w-12 text-center">
                  <span className="text-xs font-bold text-[#8B6F47]">{str}</span>
                </div>
              ))}
            </div>
            
            {/* Pestana (nut) - indicadores de corda solta ou muda */}
            <div className={`flex ${displayStartFret <= 1 ? 'border-b-4 border-[#6B5437]' : 'border-b-2 border-[#A68A64]'} pb-1 mb-1`}>
              {positions.map((pos, i) => {
                const posVal = pos !== 'x' && pos !== null ? parseInt(pos) : null;
                const isMuted = pos === 'x' || pos === null;
                const isOpen = posVal === 0;
                
                return (
                  <div key={i} className="w-12 h-8 flex items-center justify-center">
                    {isMuted ? (
                      <span className="text-red-500 font-bold text-lg">✕</span>
                    ) : isOpen ? (
                      <div className="w-6 h-6 rounded-full border-3 border-[#9CAF88] bg-white flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-[#9CAF88]"></div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {/* Trastes */}
            {frets.map((fret, fretIdx) => (
              <div key={fret} className="flex border-b-2 border-[#D4C5B0]">
                {positions.map((pos, stringIdx) => {
                  const posValue = pos !== 'x' && pos !== null ? parseInt(pos) : null;
                  const isActive = posValue === fret;
                  
                  // Cor baseada na função harmônica
                  const noteColors = [
                    'bg-[#8B6F47]',  // Fundamental
                    'bg-[#D4AF37]',  // 3ª
                    'bg-[#9CAF88]',  // 5ª
                  ];
                  
                  return (
                    <div 
                      key={stringIdx} 
                      className="w-12 h-14 flex items-center justify-center relative border-r border-[#A68A64]/30"
                    >
                      {/* Corda */}
                      <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[2px] bg-gradient-to-b from-[#C0A080] to-[#8B6F47]"></div>
                      
                      {/* Marcador de dedo */}
                      {isActive && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className={`w-10 h-10 rounded-full ${noteColors[stringIdx % 3]} flex items-center justify-center text-white font-bold text-sm z-10 shadow-xl border-2 border-white`}
                        >
                          <div className="text-center">
                            <div className="text-sm font-bold">{chordNotes[stringIdx % chordNotes.length]?.note || ''}</div>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  );
                })}
                {/* Número do traste */}
                <div className="w-8 flex items-center justify-center text-xs text-[#A68A64] font-medium">
                  {fret}ª
                </div>
              </div>
            ))}

            {/* Afinação das cordas */}
            <div className="flex mt-3 pt-2 border-t border-[#D4C5B0]">
              {strings.map((str, i) => (
                <div key={i} className="w-12 text-center">
                  <span className="text-xs text-[#A68A64] font-medium">{i + 1}ª corda</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Seletor de variações */}
        {foundChords.length > 1 && (
          <div className="flex justify-center gap-2 flex-wrap">
            {foundChords.map((chord, idx) => (
              <Button
                key={idx}
                variant={guitarVariationIndex === idx ? "default" : "outline"}
                size="sm"
                onClick={() => setGuitarVariationIndex(idx)}
                className={guitarVariationIndex === idx 
                  ? 'bg-gradient-to-r from-[#8B6F47] to-[#A68A64] text-white' 
                  : 'border-[#D4C5B0] text-[#8B6F47]'
                }
              >
                Posição {idx + 1} {chord.fret > 0 ? `(${chord.fret}ª casa)` : '(aberta)'}
              </Button>
            ))}
          </div>
        )}

        {/* Info do acorde */}
        <div className="text-center space-y-1">
          <p className="text-lg font-bold text-[#8B6F47]">
            {foundChord.name} no Violão
          </p>
          <p className="text-sm text-[#A68A64]">
            {displayStartFret === 1 ? 'Posição aberta' : `A partir da ${displayStartFret}ª casa`}
            {foundChords.length > 1 && ` • Variação ${guitarVariationIndex + 1} de ${foundChords.length}`}
          </p>
          {foundChord.description && (
            <p className="text-xs text-[#A68A64]/70">{foundChord.description}</p>
          )}
        </div>
      </div>
    );
  };

  // Renderiza viola usando dados do banco de dados - 5 PARES de cordas
  const renderViola = () => {
    // Monta o nome do acorde para buscar
    const chordSymbol = chordType.symbol;
    const searchName = selectedRoot + chordSymbol;
    
    // Busca TODOS os acordes que correspondem (várias posições/variações)
    const foundChords = violaChords.filter(c => {
      const name = c.name?.toLowerCase();
      const search = searchName.toLowerCase();
      return name === search || name === search.replace('m', 'm');
    });
    
    const foundChord = foundChords[violaVariationIndex] || foundChords[0];

    // Afinação cebolão em Mi - 5 PARES
    const stringPairs = ['5º par', '4º par', '3º par', '2º par', '1º par'];
    const tuningPairs = ['E-E', 'B-B', 'G#-G#', 'E-E', 'B-B'];
    
    if (loadingViola) {
      return (
        <div className="text-center py-8">
          <Loader2 className="w-12 h-12 text-[#8B6F47] mx-auto mb-4 animate-spin" />
          <p className="text-[#A68A64]">Carregando acordes...</p>
        </div>
      );
    }

    if (!foundChord) {
      return (
        <div className="text-center py-8">
          <Guitar className="w-16 h-16 text-[#A68A64] mx-auto mb-4" />
          <p className="text-[#A68A64]">
            Diagrama não encontrado para {selectedRoot}{chordType.symbol}
          </p>
          <p className="text-sm text-[#A68A64]/70 mt-2">
            Cadastre este acorde na página de Acordes para visualizá-lo aqui.
          </p>
          <p className="text-xs text-[#A68A64]/50 mt-4">
            Acordes disponíveis: {violaChords.map(c => c.name).join(', ') || 'Nenhum'}
          </p>
        </div>
      );
    }

    // Agrupa as 10 cordas em 5 pares
    const positions = foundChord.strings || [];
    const pairPositions = [];
    for (let i = 0; i < positions.length; i += 2) {
      pairPositions.push({
        pos1: positions[i],
        pos2: positions[i + 1] || positions[i]
      });
    }

    const startFret = foundChord.fret || 0;
    
    // Calcula frets a mostrar
    const allPositions = positions.filter(p => p !== 'x' && p !== null).map(p => parseInt(p) || 0);
    const maxFret = Math.max(...allPositions, 0);
    const minFret = Math.min(...allPositions.filter(p => p > 0), maxFret || 1);
    const displayStartFret = minFret > 0 ? minFret : 1;
    const numFrets = 5;
    const frets = Array.from({ length: numFrets }, (_, i) => displayStartFret + i);

    // Determina qual nota do acorde cada par representa
    const getNoteLabel = (pairIdx) => {
      // Baseado na posição do par, retorna a função harmônica
      const labels = ['F', '3ª', '5ª', 'F', '3ª']; // Padrão para cebolão
      return labels[pairIdx] || '';
    };

    return (
      <div className="space-y-6">
        {/* Info da afinação */}
        <div className="text-center">
          <Badge className="bg-[#D4AF37] text-white text-sm px-4 py-1">
            Afinação: Cebolão em Mi (E G# B E G# B E G# B E)
          </Badge>
        </div>

        {/* Legenda das cores */}
        <div className="flex justify-center gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-[#8B6F47]"></div>
            <span className="text-sm text-[#8B6F47] font-medium">Fundamental (F)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-[#D4AF37]"></div>
            <span className="text-sm text-[#8B6F47] font-medium">Terça (3ª)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-[#9CAF88]"></div>
            <span className="text-sm text-[#8B6F47] font-medium">Quinta (5ª)</span>
          </div>
        </div>

        {/* Braço da viola - 5 PARES */}
        <div className="flex justify-center">
          <div className="relative bg-[#F5F1E8] p-4 rounded-xl border-2 border-[#D4C5B0]">
            {/* Número da casa inicial */}
            {displayStartFret > 1 && (
              <div className="absolute -left-10 top-16 text-[#8B6F47] font-bold text-xl">
                {displayStartFret}ª
              </div>
            )}

            {/* Nomes dos pares (cabeçalho) */}
            <div className="flex mb-2">
              {stringPairs.map((pair, i) => (
                <div key={i} className="w-16 text-center">
                  <span className="text-xs font-bold text-[#8B6F47]">{pair}</span>
                </div>
              ))}
            </div>
            
            {/* Pestana (nut) - indicadores de corda solta ou muda */}
            <div className={`flex ${displayStartFret <= 1 ? 'border-b-4 border-[#6B5437]' : 'border-b-2 border-[#A68A64]'} pb-1 mb-1`}>
              {pairPositions.map((pair, i) => {
                const pos = pair.pos1 !== 'x' ? parseInt(pair.pos1) : null;
                const isMuted = pair.pos1 === 'x' || pair.pos1 === null;
                const isOpen = pos === 0;
                
                return (
                  <div key={i} className="w-16 h-8 flex items-center justify-center">
                    {isMuted ? (
                      <span className="text-red-500 font-bold text-lg">✕</span>
                    ) : isOpen ? (
                      <div className="w-6 h-6 rounded-full border-3 border-[#9CAF88] bg-white flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-[#9CAF88]"></div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {/* Trastes */}
            {frets.map((fret, fretIdx) => (
              <div key={fret} className="flex border-b-2 border-[#D4C5B0]">
                {pairPositions.map((pair, pairIdx) => {
                  const pos = pair.pos1 !== 'x' && pair.pos1 !== null ? parseInt(pair.pos1) : null;
                  const isActive = pos === fret;
                  
                  // Cor baseada na função harmônica
                  const noteColors = [
                    'bg-[#8B6F47]',  // 5º par - Fundamental
                    'bg-[#D4AF37]',  // 4º par - 3ª
                    'bg-[#9CAF88]',  // 3º par - 5ª
                    'bg-[#8B6F47]',  // 2º par - Fundamental
                    'bg-[#D4AF37]',  // 1º par - 3ª
                  ];
                  
                  return (
                    <div 
                      key={pairIdx} 
                      className="w-16 h-14 flex items-center justify-center relative border-r border-[#A68A64]/30"
                    >
                      {/* Par de cordas */}
                      <div className="absolute inset-y-0 left-1/2 -translate-x-3 w-[2px] bg-gradient-to-b from-[#C0A080] to-[#8B6F47]"></div>
                      <div className="absolute inset-y-0 left-1/2 translate-x-2 w-[2px] bg-gradient-to-b from-[#C0A080] to-[#8B6F47]"></div>
                      
                      {/* Marcador de dedo */}
                      {isActive && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className={`w-11 h-11 rounded-full ${noteColors[pairIdx]} flex items-center justify-center text-white font-bold text-sm z-10 shadow-xl border-2 border-white`}
                        >
                          <div className="text-center">
                            <div className="text-sm font-bold">{chordNotes[pairIdx % chordNotes.length]?.note || ''}</div>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  );
                })}
                {/* Número do traste */}
                <div className="w-8 flex items-center justify-center text-xs text-[#A68A64] font-medium">
                  {fret}ª
                </div>
              </div>
            ))}

            {/* Afinação dos pares */}
            <div className="flex mt-3 pt-2 border-t border-[#D4C5B0]">
              {tuningPairs.map((tuning, i) => (
                <div key={i} className="w-16 text-center">
                  <span className="text-xs text-[#A68A64] font-medium">{tuning}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Seletor de variações */}
        {foundChords.length > 1 && (
          <div className="flex justify-center gap-2 flex-wrap">
            {foundChords.map((chord, idx) => (
              <Button
                key={idx}
                variant={violaVariationIndex === idx ? "default" : "outline"}
                size="sm"
                onClick={() => setViolaVariationIndex(idx)}
                className={violaVariationIndex === idx 
                  ? 'bg-gradient-to-r from-[#8B6F47] to-[#A68A64] text-white' 
                  : 'border-[#D4C5B0] text-[#8B6F47]'
                }
              >
                Posição {idx + 1} {chord.fret > 0 ? `(${chord.fret}ª casa)` : '(aberta)'}
              </Button>
            ))}
          </div>
        )}

        {/* Info do acorde */}
        <div className="text-center space-y-1">
          <p className="text-lg font-bold text-[#8B6F47]">
            {foundChord.name} na Viola Caipira
          </p>
          <p className="text-sm text-[#A68A64]">
            {displayStartFret === 1 ? 'Posição aberta' : `A partir da ${displayStartFret}ª casa`}
            {foundChords.length > 1 && ` • Variação ${violaVariationIndex + 1} de ${foundChords.length}`}
          </p>
          {foundChord.description && (
            <p className="text-xs text-[#A68A64]/70">{foundChord.description}</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-amber-50 p-4 min-h-screen md:p-8">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-[#8B6F47] mb-2">
            Formação de Acordes
          </h1>
          <p className="text-[#A68A64]">
            Visualize a estrutura, notas e inversões de qualquer acorde
          </p>
        </motion.div>

        {/* Seletores */}
        <Card className="border-[#D4C5B0] bg-white/80 mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-[#8B6F47] mb-2 block">Nota Fundamental</label>
                <Select value={selectedRoot} onValueChange={(v) => { setSelectedRoot(v); setViolaVariationIndex(0); setGuitarVariationIndex(0); }}>
                  <SelectTrigger className="border-[#D4C5B0]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {notes.map(note => (
                      <SelectItem key={note} value={note}>{note}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-[#8B6F47] mb-2 block">Tipo de Acorde</label>
                <Select value={selectedType} onValueChange={(v) => { setSelectedType(v); setInversionIndex(0); setViolaVariationIndex(0); setGuitarVariationIndex(0); }}>
                  <SelectTrigger className="border-[#D4C5B0]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(CHORD_TYPES).map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowFlats(!showFlats)}
                  className="border-[#8B6F47] text-[#8B6F47]"
                >
                  {showFlats ? '# Sustenidos' : 'b Bemóis'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setInversionIndex(0)}
                  className="border-[#9CAF88] text-[#9CAF88]"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Nome do Acorde */}
        <motion.div
          key={`${selectedRoot}-${selectedType}`}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center mb-6"
        >
          <h2 className="text-5xl font-bold text-[#8B6F47]">
            {selectedRoot}{chordType.symbol}
          </h2>
          <p className="text-[#A68A64] mt-2">{chordType.description}</p>
        </motion.div>

        {/* Visualização no Piano e Violão */}
        <Card className="border-[#D4C5B0] bg-white/80 mb-6">
          <CardHeader>
            <CardTitle className="text-[#8B6F47] flex items-center gap-2">
              <Piano className="w-5 h-5" />
              Visualização do Acorde
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="piano" className="w-full">
              <TabsList className="mb-4 bg-[#E8DCC4]">
                <TabsTrigger value="piano" className="data-[state=active]:bg-[#8B6F47] data-[state=active]:text-white">
                  <Piano className="w-4 h-4 mr-2" />
                  Teclado
                </TabsTrigger>
                <TabsTrigger value="guitar" className="data-[state=active]:bg-[#8B6F47] data-[state=active]:text-white">
                  <Guitar className="w-4 h-4 mr-2" />
                  Violão
                </TabsTrigger>
                <TabsTrigger value="viola" className="data-[state=active]:bg-[#8B6F47] data-[state=active]:text-white">
                  <Guitar className="w-4 h-4 mr-2" />
                  Viola Caipira
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="piano">
                {renderPiano()}
              </TabsContent>
              
              <TabsContent value="guitar">
                {renderGuitar()}
              </TabsContent>
              
              <TabsContent value="viola">
                {renderViola()}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Notas e Intervalos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card className="border-[#D4C5B0] bg-white/80">
            <CardHeader>
              <CardTitle className="text-[#8B6F47] flex items-center gap-2">
                <Music2 className="w-5 h-5" />
                Notas Constituintes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {chordNotes.map((note, i) => (
                  <motion.div
                    key={i}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center justify-between p-3 bg-gradient-to-r from-[#F5F1E8] to-white rounded-lg border border-[#D4C5B0]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#D4AF37] to-[#9CAF88] rounded-full flex items-center justify-center text-white font-bold">
                        {note.note}
                      </div>
                      <div>
                        <p className="font-medium text-[#8B6F47]">{note.intervalName}</p>
                      </div>
                    </div>
                    <Badge className="bg-[#8B6F47]/10 text-[#8B6F47]">
                      {i === 0 ? 'Fundamental' : `${i + 1}ª nota`}
                    </Badge>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Inversões */}
          <Card className="border-[#D4C5B0] bg-white/80">
            <CardHeader>
              <CardTitle className="text-[#8B6F47] flex items-center gap-2">
                <RotateCcw className="w-5 h-5" />
                Inversões
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 mb-4">
                {chordNotes.map((_, i) => (
                  <Button
                    key={i}
                    variant={inversionIndex === i ? "default" : "outline"}
                    onClick={() => setInversionIndex(i)}
                    className={`w-full justify-start ${
                      inversionIndex === i 
                        ? 'bg-gradient-to-r from-[#8B6F47] to-[#A68A64] text-white' 
                        : 'border-[#D4C5B0] text-[#8B6F47]'
                    }`}
                  >
                    {inversionNames[i] || `${i}ª Inversão`}
                  </Button>
                ))}
              </div>

              <div className="p-4 bg-[#9CAF88]/10 rounded-lg border border-[#9CAF88]/30">
                <p className="text-sm font-medium text-[#8B6F47] mb-2">
                  {inversionNames[inversionIndex]}:
                </p>
                <div className="flex gap-2 flex-wrap">
                  {currentInversion.map((note, i) => (
                    <Badge 
                      key={i}
                      className={`text-lg px-3 py-1 ${
                        i === 0 
                          ? 'bg-gradient-to-r from-[#D4AF37] to-[#9CAF88] text-white' 
                          : 'bg-[#8B6F47]/20 text-[#8B6F47]'
                      }`}
                    >
                      {note.note}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-[#A68A64] mt-2">
                  Baixo: <strong>{currentInversion[0]?.note}</strong>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Voicings Comuns */}
        {COMMON_VOICINGS[selectedType] && (
          <Card className="border-[#9CAF88] bg-white/80 mb-6">
            <CardHeader>
              <CardTitle className="text-[#8B6F47] flex items-center gap-2">
                <Piano className="w-5 h-5 text-[#9CAF88]" />
                Voicings de {selectedRoot}{chordType.symbol}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[#A68A64] mb-4">
                Voicings são diferentes formas de distribuir as notas do acorde no teclado
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {COMMON_VOICINGS[selectedType].map((voicing, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="p-4 bg-[#F5F1E8] rounded-xl border border-[#D4C5B0] text-center"
                  >
                    <p className="font-bold text-[#8B6F47] mb-2">{voicing.name}</p>
                    <div className="flex justify-center gap-1 flex-wrap">
                      {getVoicingNotes(voicing).map((note, i) => (
                        <Badge 
                          key={i}
                          className={`text-xs ${
                            i === 0 
                              ? "bg-[#D4AF37] text-white" 
                              : "bg-[#9CAF88]/20 text-[#8B6F47]"
                          }`}
                        >
                          {note}
                        </Badge>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dica Teórica */}
        <Card className="border-[#D4AF37] bg-gradient-to-r from-[#D4AF37]/10 to-white">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Info className="w-6 h-6 text-[#D4AF37] flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-[#8B6F47] mb-2">Dica de Teoria</h3>
                <p className="text-sm text-[#A68A64]">
                  As <strong>inversões</strong> mudam qual nota está no baixo (a nota mais grave). 
                  No <strong>estado fundamental</strong>, a fundamental está no baixo. 
                  Na <strong>1ª inversão</strong>, a terça está no baixo. 
                  Na <strong>2ª inversão</strong>, a quinta está no baixo.
                  <strong> Voicings</strong> são distribuições específicas das notas no registro, 
                  criando diferentes texturas sonoras (aberto, fechado, drop 2, etc).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}