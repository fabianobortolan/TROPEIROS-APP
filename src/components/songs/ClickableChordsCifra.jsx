import React, { useState, useEffect } from "react";
import { quebrarCifra } from "@/components/palco/cifraPalco";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Music, X, Guitar, Star, ZoomIn, ZoomOut, WrapText } from "lucide-react";
import ChordDiagram from "../chords/ChordDiagram";
import { isChordLine, extractChords, chordStartIndex } from "@/utils/transposition";

export default function ClickableChordsCifra({ cifraText, className = "", highlightLine = null }) {
  const [selectedChord, setSelectedChord] = useState(null);
  const [chordVariations, setChordVariations] = useState({});
  const [favoriteChords, setFavoriteChords] = useState([]);
  const [fontSize, setFontSize] = useState(14);
  // No celular a quebra de linha já vem ligada (acorde e letra quebram juntos)
  const [wrapText, setWrapText] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  const caixaRef = React.useRef(null);
  const [largura, setLargura] = useState(0);
  useEffect(() => {
    const el = caixaRef.current;
    if (!el) return;
    const medir = () => setLargura(el.clientWidth);
    medir();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(medir) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, []);

  const { data: chords = [] } = useQuery({
    queryKey: ['chords-cifra'],
    queryFn: async () => {
      const results = await base44.entities.Chord.list('name', 500);
      console.log('CHORDS LOADED:', results?.length, results?.[0]);
      return results || [];
    },
  });

  const { data: currentUser, refetch: refetchUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    initialData: null
  });

  // Carrega favoritos do usuário
  useEffect(() => {
    if (currentUser?.favorite_chords) {
      setFavoriteChords(currentUser.favorite_chords);
    }
  }, [currentUser]);

  if (!cifraText) {
    return <p className="text-sm text-[#A68A64] italic">Cifra não disponível</p>;
  }

  // Buscar TODAS as variações de um acorde
  const findAllChordVariations = (chordName) => {
    if (!chordName) return [];
    
    const normalizedChord = chordName.split('/')[0].trim();
    
    // Busca todas as variações do acorde (todas posições e instrumentos)
    let variations = chords.filter(c => c.name === normalizedChord);
    
    // Se não encontrou, tenta sem tensões
    if (variations.length === 0) {
      const withoutTensions = normalizedChord.replace(/9|11|13/g, '');
      variations = chords.filter(c => c.name === withoutTensions);
    }
    
    return variations;
  };

  // Função para marcar/desmarcar favorito POR INSTRUMENTO
  const toggleFavorite = async (chordName, chordId, instrument) => {
    // Verifica se já existe favorito para esta combinação de acorde + instrumento
    const existingIndex = favoriteChords.findIndex(
      fav => fav.chord_name === chordName && fav.instrument === instrument
    );
    
    let newFavorites;

    if (existingIndex >= 0) {
      // Remove favorito específico deste instrumento
      newFavorites = favoriteChords.filter((_, i) => i !== existingIndex);
    } else {
      // Adiciona favorito (remove favorito anterior deste acorde+instrumento se existir)
      newFavorites = [
        ...favoriteChords.filter(fav => !(fav.chord_name === chordName && fav.instrument === instrument)),
        { chord_name: chordName, chord_id: chordId, instrument }
      ];
    }

    try {
      await base44.auth.updateMe({ favorite_chords: newFavorites });
      setFavoriteChords(newFavorites);
      refetchUser();
    } catch (err) {
      console.error("Erro ao salvar favorito:", err);
    }
  };

  // Renderiza uma linha com acordes clicáveis
  const renderLine = (line, lineIndex) => {
    // Se for marcação de seção [...] seguida de acordes na mesma linha
    const startIdx = chordStartIndex(line);
    if (startIdx > 0 && isChordLine(line)) {
      const tag = line.slice(0, startIdx);
      const rest = line.slice(startIdx);
      const chordMatches = extractChords(rest);

      if (chordMatches.length === 0) {
        return (
          <div key={lineIndex} className="font-bold text-[#8B6F47] my-2">{line}</div>
        );
      }

      let lastIndex = 0;
      const parts = [];
      // Prefixo da tag como texto destacado
      parts.push(
        <span key={`tag-${lineIndex}`} className="font-bold text-[#8B6F47]">{tag}</span>
      );

      chordMatches.forEach((match, idx) => {
        if (match.index > lastIndex) {
          parts.push(
            <span key={`text-${idx}`}>{rest.substring(lastIndex, match.index)}</span>
          );
        }
        parts.push(
          <span key={`chord-${idx}`} className="font-bold cursor-pointer hover:bg-[#D4AF37]/30 px-1 rounded transition-colors inline-block" style={{ color: '#8B6F47' }} onClick={(e) => { e.stopPropagation(); setSelectedChord(match.chord); }}>
            {match.chord}
          </span>
        );
        lastIndex = match.index + match.length;
      });
      if (lastIndex < rest.length) {
        parts.push(<span key={`text-end`}>{rest.substring(lastIndex)}</span>);
      }
      return <div key={lineIndex}>{parts}</div>;
    }

    // Se for apenas marcação de seção [...] (sem acordes na mesma linha)
    if (line.trim().startsWith('[')) {
      return (
        <div key={lineIndex} className="font-bold text-[#8B6F47] my-2">
          {line}
        </div>
      );
    }

    // Se for linha de acordes
    if (isChordLine(line)) {
      const chordMatches = extractChords(line);
      
      if (chordMatches.length === 0) {
        return <div key={lineIndex}>{line}</div>;
      }

      // Divide a linha em partes: texto entre acordes + acordes clicáveis
      let lastIndex = 0;
      const parts = [];

      chordMatches.forEach((match, idx) => {
        // Adiciona texto antes do acorde
        if (match.index > lastIndex) {
          parts.push(
            <span key={`text-${idx}`}>
              {line.substring(lastIndex, match.index)}
            </span>
          );
        }

        // Adiciona acorde clicável com seletor de variações
        const variations = findAllChordVariations(match.chord);
        const chordKey = `${match.chord}-${lineIndex}-${idx}`;
        
        // Organiza variações por instrumento FORA do JSX
        let violaoVariations = variations.filter(v => v.instrument === 'violao').sort((a, b) => (a.position || 1) - (b.position || 1));
        let violaVariations = variations.filter(v => v.instrument === 'viola').sort((a, b) => (a.position || 1) - (b.position || 1));
        
        // PRIORIZA FAVORITOS - move favorito para primeira posição de cada instrumento
        const favoriteViolao = favoriteChords.find(fav => fav.chord_name === match.chord && fav.instrument === 'violao');
        if (favoriteViolao) {
          const favIndex = violaoVariations.findIndex(v => v.id === favoriteViolao.chord_id);
          if (favIndex > 0) {
            const [fav] = violaoVariations.splice(favIndex, 1);
            violaoVariations.unshift(fav);
          }
        }
        
        const favoriteViola = favoriteChords.find(fav => fav.chord_name === match.chord && fav.instrument === 'viola');
        if (favoriteViola) {
          const favIndex = violaVariations.findIndex(v => v.id === favoriteViola.chord_id);
          if (favIndex > 0) {
            const [fav] = violaVariations.splice(favIndex, 1);
            violaVariations.unshift(fav);
          }
        }
        
        // Seleção atual com fallback inteligente - PRIORIZA FAVORITO do instrumento selecionado
        const defaultInstrument = favoriteViolao ? 'violao' : (favoriteViola ? 'viola' : 'violao');
        const defaultFavorite = defaultInstrument === 'violao' ? favoriteViolao : favoriteViola;
        const defaultId = defaultFavorite?.chord_id || null;
        
        const currentSelection = chordVariations[chordKey] || { 
          instrument: defaultInstrument, 
          position: 1, 
          selectedId: defaultId 
        };
        const filteredVariations = currentSelection.instrument === 'violao' ? violaoVariations : violaVariations;
        
        // Se tem ID selecionado, usa o ID. Senão, busca pela posição
        const currentChord = currentSelection.selectedId 
          ? filteredVariations.find(v => v.id === currentSelection.selectedId)
          : filteredVariations[0];
        
        // Fallback final
        const finalChord = currentChord || filteredVariations[0] || variations[0];
        const isFavorite = finalChord && favoriteChords.some(fav => fav.chord_id === finalChord.id && fav.instrument === finalChord.instrument);
        
        parts.push(
          <Popover key={`chord-${idx}`}>
            <PopoverTrigger asChild>
              <span
                className="font-bold cursor-pointer hover:bg-[#D4AF37]/30 px-1 rounded transition-colors inline-block"
                style={{ color: '#8B6F47' }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedChord(match.chord);
                }}
              >
                {match.chord}
              </span>
            </PopoverTrigger>
            <PopoverContent 
              key={`${chordKey}-${currentSelection.instrument}-${currentSelection.selectedId || 'default'}`}
              className="w-auto p-1 bg-white border border-[#8B6F47] max-w-[160px]"
              onClick={(e) => e.stopPropagation()}
              align="start"
              side="top"
              sideOffset={5}
            >
              {(() => {

                return variations.length > 0 ? (
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between mb-0.5">
                      <h4 className="font-bold text-[#8B6F47] text-[10px]">{match.chord}</h4>
                      {finalChord && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleFavorite(match.chord, finalChord.id, currentSelection.instrument)}
                          className="h-5 w-5 p-0 hover:bg-[#D4AF37]/20"
                          title={isFavorite ? "Remover favorito" : "Marcar como favorito"}
                        >
                          <Star className={`w-3 h-3 ${isFavorite ? 'fill-[#D4AF37] text-[#D4AF37]' : 'text-[#A68A64]'}`} />
                        </Button>
                      )}
                    </div>
                    {isFavorite && (
                      <Badge className="bg-[#D4AF37] text-white text-[8px] px-1 py-0 mb-0.5">
                        ⭐ Favorito
                      </Badge>
                    )}
                    
                    {/* Seletor de Instrumento */}
                    <div className="flex gap-0.5 pb-0.5 border-b border-[#D4C5B0]">
                      <Button
                        size="sm"
                        variant={currentSelection.instrument === 'violao' ? 'default' : 'outline'}
                        onClick={() => {
                          setChordVariations(prev => ({
                            ...prev,
                            [chordKey]: { 
                              instrument: 'violao', 
                              position: 1,
                              selectedId: violaoVariations[0]?.id
                            }
                          }));
                        }}
                        disabled={violaoVariations.length === 0}
                        className={`text-[8px] h-5 px-1 flex-1 ${currentSelection.instrument === 'violao' 
                          ? 'bg-[#8B6F47] text-white hover:bg-[#6B5437]' 
                          : 'border-[#8B6F47] text-[#8B6F47] hover:bg-[#8B6F47] hover:text-white'}`}
                      >
                        🎸 {violaoVariations.length || 0}
                      </Button>
                      <Button
                        size="sm"
                        variant={currentSelection.instrument === 'viola' ? 'default' : 'outline'}
                        onClick={() => {
                          setChordVariations(prev => ({
                            ...prev,
                            [chordKey]: { 
                              instrument: 'viola', 
                              position: 1,
                              selectedId: violaVariations[0]?.id
                            }
                          }));
                        }}
                        disabled={violaVariations.length === 0}
                        className={`text-[8px] h-5 px-1 flex-1 ${currentSelection.instrument === 'viola' 
                          ? 'bg-[#8B6F47] text-white hover:bg-[#6B5437]' 
                          : 'border-[#8B6F47] text-[#8B6F47] hover:bg-[#8B6F47] hover:text-white'}`}
                      >
                        🎻 {violaVariations.length || 0}
                      </Button>
                    </div>

                    {/* Seletor de Posição */}
                    {filteredVariations.length > 1 && (
                      <div className="space-y-0.5 pb-0.5 border-b border-[#D4C5B0]">
                        <label className="text-[8px] font-semibold text-[#8B6F47]">
                          Pos. ({filteredVariations.length}):
                        </label>
                        <div className="flex flex-wrap gap-0.5">
                          {filteredVariations.map((variation, idx) => {
                            // Usa o ID como identificador único ao invés de position
                            const isSelected = currentChord?.id === variation.id;
                            return (
                              <Button
                                key={variation.id}
                                size="sm"
                                variant={isSelected ? 'default' : 'outline'}
                                onClick={() => {
                                  setChordVariations(prev => ({
                                    ...prev,
                                    [chordKey]: { 
                                      instrument: currentSelection.instrument, 
                                      position: variation.position || (idx + 1),
                                      selectedId: variation.id
                                    }
                                  }));
                                }}
                                className={`text-[8px] h-4 px-1 ${isSelected
                                  ? 'bg-[#D4AF37] text-white hover:bg-[#B89330]' 
                                  : 'border-[#D4C5B0] text-[#8B6F47] hover:bg-[#D4AF37] hover:text-white'}`}
                              >
                                {variation.fret || (idx + 1)}
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    {/* Diagrama do Acorde */}
                    {finalChord && (
                      <div className="bg-[#F5F1E8] p-0.5 rounded">
                        <ChordDiagram chord={finalChord} size="sm" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-3">
                    <Music className="w-8 h-8 text-[#A68A64] mx-auto mb-2 opacity-30" />
                    <p className="text-sm text-[#8B6F47] font-medium mb-1">
                      Acorde: {match.chord}
                    </p>
                    <p className="text-xs text-[#A68A64]">
                      Diagrama não disponível na biblioteca
                    </p>
                  </div>
                );
              })()}
            </PopoverContent>
          </Popover>
        );

        lastIndex = match.index + match.length;
      });

      // Adiciona texto restante após o último acorde
      if (lastIndex < line.length) {
        parts.push(
          <span key={`text-end`}>
            {line.substring(lastIndex)}
          </span>
        );
      }

      return <div key={lineIndex}>{parts}</div>;
    }

    // Linha de letra ou outra
    return <div key={lineIndex}>{line}</div>;
  };

  const lines = cifraText.split('\n');
  const colunas = wrapText && largura ? Math.floor(largura / (fontSize * 0.6)) - 1 : 0;
  const pedacos = colunas ? quebrarCifra(lines, colunas, isChordLine) : lines.map((texto, origem) => ({ texto, origem }));

  return (
    <div className={`text-[#2d1810] ${className}`}>
      {/* Controles de zoom e quebra de linha */}
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#D4C5B0]">
        <span className="text-xs text-[#A68A64] font-medium">Zoom:</span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setFontSize(s => Math.max(8, s - 2))}
          className="h-6 w-6 p-0 border-[#8B6F47] text-[#8B6F47] hover:bg-[#8B6F47] hover:text-white"
          title="Diminuir texto"
        >
          <ZoomOut className="w-3 h-3" />
        </Button>
        <span className="text-xs font-bold text-[#8B6F47] min-w-[28px] text-center">{fontSize}px</span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setFontSize(s => Math.min(32, s + 2))}
          className="h-6 w-6 p-0 border-[#8B6F47] text-[#8B6F47] hover:bg-[#8B6F47] hover:text-white"
          title="Aumentar texto"
        >
          <ZoomIn className="w-3 h-3" />
        </Button>
        <div className="w-px h-4 bg-[#D4C5B0] mx-1" />
        <Button
          size="sm"
          variant={wrapText ? "default" : "outline"}
          onClick={() => setWrapText(w => !w)}
          className={`h-6 px-2 text-xs gap-1 ${wrapText ? 'bg-[#8B6F47] text-white hover:bg-[#6B5437]' : 'border-[#8B6F47] text-[#8B6F47] hover:bg-[#8B6F47] hover:text-white'}`}
          title="Quebra automática de linha"
        >
          <WrapText className="w-3 h-3" />
          Quebra de linha
        </Button>
        <span className="text-xs text-[#A68A64] hidden md:block">
          {wrapText ? "ativada" : "desativada"}
        </span>
      </div>

      <pre ref={caixaRef} style={{ 
        fontFamily: "'Courier New', Courier, monospace",
        fontSize: `${fontSize}px`,
        lineHeight: "1.8",
        whiteSpace: "pre",
        overflowX: wrapText ? "hidden" : "auto",
        margin: 0,
        padding: 0
      }}>
        {pedacos.map(({ texto: line, origem: index }, k) => {
          const isHl = highlightLine != null && highlightLine - 1 === index;
          const primeiro = k === 0 || pedacos[k - 1].origem !== index;
          return (
            <div
              key={`wrap-${k}`}
              id={primeiro ? `cifra-line-${index}` : undefined}
              className={`rounded ${isHl ? 'bg-[#FFE08A] ring-2 ring-[#D4AF37]' : ''}`}
            >
              {renderLine(line, index)}
            </div>
          );
        })}
      </pre>
    </div>
  );
}