import React from "react";
import { Dialog, DialogContent, DialogTitle, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, ExternalLink, Play, Square, FileText } from "lucide-react";
import PinchZoomIframe from "@/components/instrumental/PinchZoomIframe";

export default function PdfViewer({ partitura, open, onClose }) {
  const [playing, setPlaying] = React.useState(false);
  const audioRef = React.useRef(null);

  React.useEffect(() => {
    setPlaying(false);
  }, [open, partitura]);

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

  if (!partitura) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="!max-w-none w-screen h-screen p-0 flex flex-col overflow-hidden !rounded-none !border-0 !left-0 !top-0 !translate-x-0 !translate-y-0 [&>button:last-child]:hidden">
        {/* Header do visualizador */}
        <DialogHeader className="px-4 py-3 border-b border-[#D4C5B0] bg-gradient-to-r from-[#8B6F47] to-[#A68A64] flex-row items-center justify-between space-y-0 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <FileText className="w-5 h-5 text-white flex-shrink-0" />
            <DialogTitle className="text-white text-base font-bold truncate">
              {partitura.title}
            </DialogTitle>
            {partitura.composer && (
              <span className="text-white/70 text-sm hidden sm:inline truncate">
                — {partitura.composer}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {partitura.playback_url && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={togglePlayback}
                className="bg-white/20 text-white hover:bg-white/30 border-white/30"
              >
                {playing ? (
                  <>
                    <Square className="w-3.5 h-3.5 mr-1" />
                    Pausar
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 mr-1" />
                    Playback
                  </>
                )}
              </Button>
            )}
            <a href={partitura.pdf_url} target="_blank" rel="noopener noreferrer">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="bg-white/20 text-white hover:bg-white/30 border-white/30"
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1" />
                Abrir
              </Button>
            </a>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              className="bg-white/20 text-white hover:bg-white/30 border-white/30 h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Área do PDF */}
        {partitura.pdf_url ? (
          <PinchZoomIframe
            src={`${partitura.pdf_url}#view=FitH&toolbar=1`}
            title={`Partitura - ${partitura.title}`}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-stone-400">
            <FileText className="w-16 h-16 mb-4" />
            <p className="text-sm">Nenhum PDF disponível para esta partitura.</p>
          </div>
        )}

        {partitura.playback_url && (
          <audio
            ref={audioRef}
            src={partitura.playback_url}
            onEnded={() => setPlaying(false)}
            className="hidden"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}