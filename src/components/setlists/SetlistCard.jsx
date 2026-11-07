import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Music, Edit, Trash2, FileText, Download, BookOpen } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function SetlistCard({ setlist, songs, onView, onEdit, onDelete, onStageView, onApostila }) {
  const setlistSongs = setlist.songs?.map(id => songs.find(s => s.id === id)).filter(Boolean) || [];
  
  const totalDuration = setlistSongs.reduce((acc, song) => {
    if (song.duration) {
      const [min, sec] = song.duration.split(':').map(Number);
      return acc + (min * 60) + sec;
    }
    return acc;
  }, 0);

  const formatTotalDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleExport = (e) => {
    e.stopPropagation();
    const escapeHtml = (text) => {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    };

    let indexHtml = '<div style="page-break-after: always; margin-bottom: 40pt;"><h2 style="color: #8B6F47; font-size: 18pt; font-weight: bold; margin-bottom: 20pt; text-align: center; border-bottom: 2pt solid #8B6F47; padding-bottom: 10pt;">ÍNDICE</h2><div style="margin: 0 auto; max-width: 600pt;">';
    setlistSongs.forEach((song, index) => {
      indexHtml += `<div style="display: flex; justify-content: space-between; padding: 8pt 10pt; border-bottom: 1pt solid #ddd; margin-bottom: 5pt;"><div style="flex: 1;"><span style="color: #8B6F47; font-weight: bold; margin-right: 10pt;">#${index + 1}</span><span style="color: #000;">${escapeHtml(song.title || 'Sem título')}</span><span style="color: #666; font-size: 11pt; margin-left: 8pt;">- ${escapeHtml(song.artist || 'Sem artista')}</span></div>${song.main_key ? `<span style="color: #8B6F47; font-weight: bold; min-width: 40pt; text-align: right;">${escapeHtml(song.main_key)}</span>` : ''}</div>`;
    });
    indexHtml += '</div></div>';

    let songsHtml = '';
    setlistSongs.forEach((song, index) => {
      let cifra = song.cifra_text || 'Cifra não disponível';
      if (cifra !== 'Cifra não disponível') {
        cifra = cifra.replace(/(\[Refr[ãa]o[^\]]*\][^\[]*)/gi, '<span style="font-weight: 900;">$1</span>');
      }
      songsHtml += `<div style="page-break-after: always; margin-bottom: 40pt;"><h2 style="color: #000000; font-size: 16pt; font-weight: bold; margin-bottom: 2pt; text-align: center;">#${index + 1} - ${escapeHtml(song.title || 'Sem título')}</h2><h3 style="color: #000000; font-size: 14pt; font-weight: normal; margin-bottom: 2pt; margin-top: 2pt; text-align: center;">${escapeHtml(song.artist || 'Sem artista')}</h3>${song.main_key ? `<p style="margin: 2pt 0; text-align: center;"><strong>Tom:</strong> ${escapeHtml(song.main_key)}</p>` : ''}<div style="white-space: pre; font-family: 'Courier New', monospace; font-size: 15pt; line-height: 1.4; font-weight: bold; margin-top: 10pt;">${cifra}</div></div>`;
    });

    const htmlContent = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${escapeHtml(setlist.name || 'Repertório')}</title><style>* { margin: 0; padding: 0; } @page { margin: 2cm; } body { font-family: 'Courier New', monospace; font-size: 15pt; line-height: 1.4; margin: 0; padding: 20pt; } h1 { color: #000000; font-size: 20pt; font-weight: bold; margin-bottom: 10pt; text-align: center; padding-bottom: 10pt; border-bottom: 2pt solid #8B6F47; } .info { text-align: center; margin-bottom: 30pt; color: #666; font-size: 12pt; } h2 { page-break-before: always; } h2:first-of-type { page-break-before: auto; }</style></head><body><h1>${escapeHtml(setlist.name || 'Repertório')}</h1><div class="info">${setlist.event_date ? `<p>Data: ${new Date(setlist.event_date).toLocaleDateString('pt-BR')}</p>` : ''}${setlist.location ? `<p>Local: ${escapeHtml(setlist.location)}</p>` : ''}<p>Total de músicas: ${setlistSongs.length}</p></div>${indexHtml}${songsHtml}</body></html>`;
    
    const blob = new Blob([htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${setlist.name || 'repertorio'}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div whileHover={{ y: -4, transition: { duration: 0.2 } }}>
      <Card
        className="cursor-pointer hover:shadow-2xl transition-all duration-300 border-[#D4C5B0] bg-white/80 backdrop-blur-sm overflow-hidden group h-full"
        onClick={onView}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#8B6F47]/5 to-[#9CAF88]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <CardHeader className="pb-3 relative">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg text-[#8B6F47] truncate mb-2" style={{ letterSpacing: '0.3px' }}>
                {setlist.name}
              </h3>
              {setlist.description && (
                <p className="text-sm text-[#A68A64] line-clamp-2 mb-2">{setlist.description}</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-2">
            {setlist.event_date && (
              <Badge variant="outline" className="bg-[#9CAF88]/10 text-[#9CAF88] border-[#9CAF88]/30">
                <Calendar className="w-3 h-3 mr-1" />
                {format(new Date(setlist.event_date), "d 'de' MMM", { locale: ptBR })}
              </Badge>
            )}
            {setlist.location && (
              <Badge variant="outline" className="bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/30">
                <MapPin className="w-3 h-3 mr-1" />
                {setlist.location}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="relative space-y-3">
          <div className="flex items-center justify-between p-3 bg-[#8B6F47]/5 rounded-lg">
            <div className="flex items-center gap-2">
              <Music className="w-4 h-4 text-[#8B6F47]" />
              <span className="text-sm font-medium text-[#8B6F47]">
                {setlistSongs.length} {setlistSongs.length === 1 ? 'música' : 'músicas'}
              </span>
            </div>
            {totalDuration > 0 && (
              <span className="text-sm text-[#A68A64]">{formatTotalDuration(totalDuration)}</span>
            )}
          </div>

          {setlistSongs.length > 0 && (
            <div className="space-y-1">
              {setlistSongs.slice(0, 3).map((song, index) => (
                <div key={song.id} className="flex items-start gap-2 text-sm">
                  <span className="text-[#A68A64] font-medium min-w-[20px]">{index + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#8B6F47] truncate">{song.title}</p>
                  </div>
                </div>
              ))}
              {setlistSongs.length > 3 && (
                <p className="text-xs text-[#A68A64] pl-6">+ {setlistSongs.length - 3} mais...</p>
              )}
            </div>
          )}

          {/* Linha 1: Palco | Apostila | Exportar */}
          <div className="grid grid-cols-3 gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
            <Button variant="outline" size="sm" onClick={onStageView}
              className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-white min-h-[44px] touch-manipulation">
              <FileText className="w-4 h-4 mr-1" />Palco
            </Button>
            <Button variant="outline" size="sm" onClick={onApostila}
              className="border-[#8B6F47] text-[#8B6F47] hover:bg-[#8B6F47] hover:text-white min-h-[44px] touch-manipulation">
              <BookOpen className="w-4 h-4 mr-1" />Apostila
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}
              className="border-[#9CAF88] text-[#9CAF88] hover:bg-[#9CAF88] hover:text-white min-h-[44px] touch-manipulation">
              <Download className="w-4 h-4 mr-1" />Exportar
            </Button>
          </div>

          {/* Linha 2: Editar | Excluir */}
          <div className="grid grid-cols-2 gap-2" onClick={(e) => e.stopPropagation()}>
            <Button variant="outline" size="sm" onClick={onEdit}
              className="border-[#8B6F47] text-[#8B6F47] hover:bg-[#8B6F47] hover:text-white min-h-[44px] touch-manipulation">
              <Edit className="w-4 h-4 mr-1" />Editar
            </Button>
            <Button variant="outline" size="sm" onClick={onDelete}
              className="border-red-300 text-red-600 hover:bg-red-50 min-h-[44px] touch-manipulation">
              <Trash2 className="w-4 h-4 mr-1" />Excluir
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}