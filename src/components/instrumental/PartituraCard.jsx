import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Edit, Trash2, Music2, Play, Square, Eye } from "lucide-react";
import PdfViewer from "@/components/instrumental/PdfViewer";

const difficultyConfig = {
  facil: { label: "Fácil", className: "bg-green-100 text-green-800 border border-green-200" },
  intermediario: { label: "Interm.", className: "bg-amber-100 text-amber-800 border border-amber-200" },
  avancado: { label: "Avançado", className: "bg-rose-100 text-rose-800 border border-rose-200" },
};

const ROPE_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6900add80614fb22512134a9/bfcd67933_image.png";

export default function PartituraCard({ partitura, onEdit, onDelete, isAdmin }) {
  const diff = difficultyConfig[partitura.difficulty_level] || difficultyConfig.intermediario;
  const [playing, setPlaying] = React.useState(false);
  const [showPdf, setShowPdf] = React.useState(false);
  const audioRef = React.useRef(null);

  const togglePlayback = (e) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play();
      setPlaying(true);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="cursor-default hover:shadow-xl transition-all duration-300 border-[#D4C5B0] bg-white/80 backdrop-blur-sm overflow-hidden group relative">
        {/* Corda decorativa topo */}
        <div className="absolute top-0 left-0 right-0 h-[10px] z-10 pointer-events-none"
          style={{
            backgroundImage: `url('${ROPE_URL}')`,
            backgroundRepeat: 'repeat-x',
            backgroundSize: 'auto 10px',
          }}
        />
        {/* Corda decorativa base */}
        <div className="absolute bottom-0 left-0 right-0 h-[10px] z-10 pointer-events-none"
          style={{
            backgroundImage: `url('${ROPE_URL}')`,
            backgroundRepeat: 'repeat-x',
            backgroundSize: 'auto 10px',
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#8B6F47]/5 to-[#9CAF88]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <CardContent className="p-3 pt-4 pb-4 relative">
          <div className="flex flex-col gap-1.5">
            {/* Linha do título */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => partitura.pdf_url && setShowPdf(true)}
                disabled={!partitura.pdf_url}
                title={partitura.pdf_url ? "Ver partitura" : "Sem PDF"}
                className={`w-8 h-8 rounded-lg flex items-center justify-center shadow flex-shrink-0 transition-all ${partitura.pdf_url ? "bg-gradient-to-br from-[#D4AF37] to-[#9CAF88] hover:scale-110 cursor-pointer" : "bg-gray-300 cursor-not-allowed"}`}
              >
                <FileText className="w-5 h-5 text-white" />
              </button>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-base text-[#8B6F47] uppercase flex items-center gap-1.5" style={{ letterSpacing: '0.5px' }}>
                  <span className="truncate">{partitura.title}</span>
                </h3>
                <p className="text-sm text-[#A68A64] truncate flex items-center gap-1">
                  <Music2 className="w-3 h-3" />
                  {partitura.composer || "—"}
                </p>
              </div>
              {/* Dificuldade - canto superior direito */}
              <div className="flex-shrink-0 flex flex-col items-center justify-center px-2 py-0.5 rounded-lg text-center min-w-[50px]">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${diff.className}`}>
                  {diff.label}
                </span>
              </div>
            </div>

            {/* Info boxes em linha */}
            <div className="grid grid-cols-5 gap-1">
              {/* Instrumento */}
              <div className={`flex flex-col items-center justify-center px-1 py-0.5 rounded-lg text-center ${partitura.instrument ? "bg-gradient-to-r from-[#8B6F47] to-[#A68A64] border border-[#8B6F47] shadow" : "bg-gray-100 border border-gray-300"}`}>
                <p className={`text-[9px] leading-none ${partitura.instrument ? "text-white/90" : "text-gray-500"}`}>Instrumento</p>
                <p className={`text-[10px] font-bold truncate w-full text-center ${partitura.instrument ? "text-white" : "text-gray-500"}`}>
                  {partitura.instrument || "N/A"}
                </p>
              </div>

              {/* Tom */}
              <div className={`flex flex-col items-center justify-center px-1 py-0.5 rounded-lg text-center ${partitura.key ? "bg-[#9CAF88]/10 border border-[#9CAF88]/30" : "bg-gray-100 border border-gray-300"}`}>
                <p className={`text-[9px] leading-none ${partitura.key ? "text-[#A68A64]" : "text-gray-500"}`}>Tom</p>
                <p className={`text-[10px] font-bold truncate w-full text-center ${partitura.key ? "text-[#8B6F47]" : "text-gray-500"}`}>
                  {partitura.key || "N/A"}
                </p>
              </div>

              {/* Gênero */}
              <div className={`flex flex-col items-center justify-center px-1 py-0.5 rounded-lg text-center ${partitura.genre ? "bg-gradient-to-r from-[#D4AF37]/20 to-[#9CAF88]/20 border border-[#D4AF37]/50" : "bg-gray-100 border border-gray-300"}`}>
                <p className={`text-[9px] leading-none ${partitura.genre ? "text-[#A68A64]" : "text-gray-500"}`}>Gênero</p>
                <p className={`text-[10px] font-bold truncate w-full text-center ${partitura.genre ? "text-[#8B6F47]" : "text-gray-500"}`}>
                  {partitura.genre || "N/A"}
                </p>
              </div>

              {/* Playback */}
              <div
                className={`flex flex-col items-center justify-center px-1 py-0.5 rounded-lg text-center cursor-pointer transition-colors ${partitura.playback_url ? "bg-amber-50 border border-orange-400 hover:bg-orange-500 group/pb" : "bg-gray-100 border border-gray-300"}`}
                onClick={togglePlayback}
                title={partitura.playback_url ? "Tocar playback" : "Sem playback"}
              >
                <p className={`text-[9px] leading-none ${partitura.playback_url ? "text-orange-600 group-hover/pb:text-white" : "text-gray-500"}`}>Playback</p>
                <p className={`text-[10px] font-bold flex items-center justify-center gap-0.5 ${partitura.playback_url ? "text-orange-700 group-hover/pb:text-white" : "text-gray-500"}`}>
                  {partitura.playback_url ? (playing ? <Square className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />) : "N/A"}
                </p>
              </div>

              {/* Ver Partitura / Ações */}
              <div className="flex items-center gap-1 justify-center">
                {partitura.pdf_url && (
                  <a href={partitura.pdf_url} target="_blank" rel="noopener noreferrer" className="flex-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-7 text-[9px] border-[#8B6F47]/40 text-[#8B6F47] hover:bg-[#8B6F47] hover:text-white"
                    >
                      <FileText className="w-3 h-3 mr-0.5" />
                      Baixar
                    </Button>
                  </a>
                )}
                {isAdmin && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(partitura)}
                      className="h-7 w-7 p-0 border-[#8B6F47]/40 text-[#8B6F47] hover:bg-[#8B6F47] hover:text-white"
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDelete(partitura)}
                      className="h-7 w-7 p-0 border-red-300 text-red-600 hover:bg-red-500 hover:text-white hover:border-red-500"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
        {partitura.playback_url && (
          <audio
            ref={audioRef}
            src={partitura.playback_url}
            onEnded={() => setPlaying(false)}
            className="hidden"
          />
        )}
      </Card>

      {showPdf && (
        <PdfViewer
          partitura={partitura}
          open={showPdf}
          onClose={() => setShowPdf(false)}
        />
      )}
    </motion.div>
  );
}