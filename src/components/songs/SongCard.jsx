import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Music2, Clock, Activity, Music4, Guitar, RotateCcw, CheckCircle2, Info } from "lucide-react";
import { motion } from "framer-motion";
import SongInfoModal from "./SongInfoModal";
import CifraAlertBadge from "./CifraAlertBadge";

const genreColors = {
  sertanejo_raiz: "bg-amber-100 text-amber-800 border-amber-200",
  sertanejo_universitario: "bg-blue-100 text-blue-800 border-blue-200",
  sertanejo_romantico: "bg-rose-100 text-rose-800 border-rose-200",
  sertanejo_moderno: "bg-purple-100 text-purple-800 border-purple-200",
  outro: "bg-gray-100 text-gray-800 border-gray-200"
};

const genreLabels = {
  sertanejo_raiz: "Raiz",
  sertanejo_universitario: "Universitário",
  sertanejo_romantico: "Romântico",
  sertanejo_moderno: "Moderno",
  outro: "Outro"
};

// Mapa cromático para transposição
import { transposeKey, transposeChords, preferFlatsForKey, FLAT_KEYS } from "@/utils/transposition";

export default function SongCard({ song, onClick }) {
  const [transpose, setTranspose] = useState(0);
  const [showInfo, setShowInfo] = useState(false);

  const transposedData = useMemo(() => {
    if (transpose === 0) {
      return {
        main_key: song.main_key,
        progressions: song.progressions
      };
    }
    
    const useFlats = song.main_key ? preferFlatsForKey(song.main_key) : false;
    
    return {
      main_key: song.main_key ? transposeKey(song.main_key, transpose, useFlats) : null,
      progressions: song.progressions?.map(prog => ({
        ...prog,
        chords: prog.chords ? transposeChords(prog.chords, transpose, useFlats) : []
      }))
    };
  }, [transpose, song.main_key, song.progressions]);

  const handleTransposeClick = (e, semitones) => {
    e.stopPropagation();
    setTranspose(semitones);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      <Card 
        className="cursor-pointer hover:shadow-2xl transition-all duration-300 border-[#D4C5B0] bg-white/80 backdrop-blur-sm overflow-hidden group relative"
        onClick={() => onClick(song)}
      >
        {/* Corda decorativa topo */}
        <div
          className="absolute top-0 left-0 right-0 h-[10px] z-10 pointer-events-none"
          style={{
            backgroundImage: `url('/img/8e685b908_generated_image.png')`,
            backgroundRepeat: 'repeat-x',
            backgroundSize: 'auto 10px',
          }}
        />
        {/* Corda decorativa base */}
        <div
          className="absolute bottom-0 left-0 right-0 h-[10px] z-10 pointer-events-none"
          style={{
            backgroundImage: `url('/img/8e685b908_generated_image.png')`,
            backgroundRepeat: 'repeat-x',
            backgroundSize: 'auto 10px',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#8B6F47]/5 to-[#9CAF88]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        <CardHeader className="pb-2 relative pt-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg text-[#8B6F47] truncate uppercase flex items-center gap-2" style={{ letterSpacing: '0.5px' }}>
                {song.is_fully_revised && (
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" title="Música totalmente revisada" />
                )}
                {song.title}
              </h3>
              <p className="text-sm text-[#A68A64] truncate flex items-center gap-2">
                <Music2 className="w-3.5 h-3.5" />
                {song.artist}
              </p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-[#D4AF37] to-[#9CAF88] rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
              <Activity className="w-6 h-6 text-white" />
            </div>
          </div>
        </CardHeader>

        <CardContent className="relative space-y-2 pb-3">
          <div className="flex flex-wrap gap-2">
            {song.genre_style && (
              <Badge className={`${genreColors[song.genre_style]} border text-xs font-medium`}>
                {genreLabels[song.genre_style]}
              </Badge>
            )}
            <CifraAlertBadge severity={song.validation_severity} issues={song.validation_issues} compact />
          </div>

          {/* Card de Transposição Compacto */}
          {song.main_key && (
            <div 
              className="bg-gradient-to-r from-[#9CAF88]/10 to-[#D4AF37]/10 rounded-lg p-2 border border-[#9CAF88]/30"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <Guitar className="w-4 h-4 text-[#9CAF88]" />
                  <span className="text-xs text-[#A68A64] font-medium">Tom:</span>
                  <span className="text-sm font-bold text-[#8B6F47]">{transposedData.main_key}</span>
                  {transpose !== 0 && (
                    <Badge className="bg-gradient-to-r from-[#D4AF37] to-[#9CAF88] text-white text-xs px-1.5 py-0.5">
                      {transpose > 0 ? '+' : ''}{transpose}
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => handleTransposeClick(e, transpose - 1)}
                  className="h-6 px-2 text-xs border-[#8B6F47] text-[#8B6F47] hover:bg-[#8B6F47] hover:text-white"
                >
                  -1
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => handleTransposeClick(e, 0)}
                  disabled={transpose === 0}
                  className="h-6 px-2 border-[#9CAF88] text-[#9CAF88] hover:bg-[#9CAF88] hover:text-white"
                  title="Resetar"
                >
                  <RotateCcw className="w-3 h-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => handleTransposeClick(e, transpose + 1)}
                  className="h-6 px-2 text-xs border-[#8B6F47] text-[#8B6F47] hover:bg-[#8B6F47] hover:text-white"
                >
                  +1
                </Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {song.rhythm_name && (
              <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-[#D4AF37]/10 to-[#9CAF88]/10 rounded-lg border border-[#D4AF37]/30">
                <Music4 className="w-4 h-4 text-[#D4AF37]" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[#A68A64] font-medium">Ritmo</p>
                  <p className="text-sm font-bold text-[#8B6F47] truncate">{song.rhythm_name}</p>
                </div>
              </div>
            )}
            {song.progressions && song.progressions.length > 0 && (
              <div className="flex items-center gap-2 p-2 bg-[#9CAF88]/10 rounded-lg border border-[#9CAF88]/30">
                <Activity className="w-4 h-4 text-[#9CAF88]" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[#A68A64] font-medium">Progressões</p>
                  <p className="text-sm font-bold text-[#8B6F47]">
                    {(() => {
                      const grouped = song.progressions.reduce((acc, prog) => {
                        const key = `${prog.pattern}-${prog.key}-${(Array.isArray(prog.chords) ? prog.chords.join(',') : prog.chords)}-${prog.progression_name || ''}`;
                        if (!acc[key]) acc[key] = true;
                        return acc;
                      }, {});
                      return Object.keys(grouped).length;
                    })()}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Quantidade de acordes (fora da intro) */}
          {song.chord_count > 0 && (
            <div className="flex items-center gap-2 p-2 bg-[#8B6F47]/10 rounded-lg border border-[#8B6F47]/20">
              <Guitar className="w-4 h-4 text-[#8B6F47]" />
              <div>
                <p className="text-xs text-[#A68A64] font-medium">Acordes (excl. intro)</p>
                <p className="text-sm font-bold text-[#8B6F47]">{song.chord_count} acordes</p>
              </div>
            </div>
          )}

          {/* Badge da progressão predominante */}
          {(song.predominant_progression || (song.progressions && song.progressions.length > 0 && (song.progressions[0].progression_name || song.progressions[0].pattern))) && (
            <div className="flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
              <Badge className="bg-[#F5F1E8] text-[#8B6F47] border border-[#D4C5B0] text-xs px-2 py-1">
                <span className="text-[#A68A64] mr-1">Prog.</span>
                {song.predominant_progression || song.progressions?.[0]?.progression_name || song.progressions?.[0]?.pattern}
              </Badge>
            </div>
          )}

          {transposedData.progressions && transposedData.progressions.length > 0 && transposedData.progressions[0].chords && (
            <div onClick={(e) => e.stopPropagation()}>
              <p className="text-xs text-[#A68A64] font-medium mb-1.5">Acordes:</p>
              <div className="flex flex-wrap gap-1.5">
                {transposedData.progressions[0].chords.slice(0, 6).map((chord, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="bg-[#8B6F47] text-white border-[#8B6F47] px-2 py-0.5 text-xs"
                  >
                    {chord}
                  </Badge>
                ))}
                {transposedData.progressions[0].chords.length > 6 && (
                  <Badge variant="outline" className="text-xs text-[#A68A64]">
                    +{transposedData.progressions[0].chords.length - 6}
                  </Badge>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-1">
            {song.tempo && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-[#8B6F47]" />
                <span className="text-[#8B6F47] font-medium">{song.tempo} BPM</span>
              </div>
            )}
          </div>

          {/* Botão de Informações Adicionais */}
          <div className="pt-1" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => { e.stopPropagation(); setShowInfo(true); }}
              className="w-full h-8 text-xs border-[#8B6F47]/40 text-[#8B6F47] hover:bg-[#8B6F47] hover:text-white gap-2"
            >
              <Info className="w-3.5 h-3.5" />
              Informações Adicionais
            </Button>
          </div>
        </CardContent>
      </Card>

      <SongInfoModal song={song} open={showInfo} onClose={() => setShowInfo(false)} />
    </motion.div>
  );
}