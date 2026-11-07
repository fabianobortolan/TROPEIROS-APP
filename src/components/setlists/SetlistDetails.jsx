import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Music2, Calendar, MapPin, Clock, X, Edit, Printer, Share2, Copy, Mail, Loader2, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function SetlistDetails({ setlist, songs, onClose, onEdit, onApostila }) {
  const setlistSongs = setlist.songs?.map(id => songs.find(s => s.id === id)).filter(Boolean) || [];
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  
  const totalDuration = setlistSongs.reduce((acc, song) => {
    if (song.duration) {
      const [min, sec] = song.duration.split(':').map(Number);
      return acc + (min * 60) + sec;
    }
    return acc;
  }, 0);

  const formatTotalDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    
    if (hours > 0) {
      return `${hours}h ${remainingMins}min`;
    }
    return `${mins} min`;
  };

  const handleCopySetlist = () => {
    const textToCopy = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${setlist.name.toUpperCase()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${setlist.description ? `${setlist.description}\n\n` : ''}${setlist.event_date ? `📅 ${format(new Date(setlist.event_date), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}\n` : ''}${setlist.location ? `📍 ${setlist.location}\n` : ''}🎵 ${setlistSongs.length} músicas • ⏱️ ${formatTotalDuration(totalDuration)}

REPERTÓRIO:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${setlistSongs.map((song, index) => `
${index + 1}. ${song.title}
   ${song.artist}
   ${song.main_key ? `Tom: ${song.main_key}` : ''}${song.rhythm_name ? ` • ${song.rhythm_name}` : ''}${song.tempo ? ` • ${song.tempo} BPM` : ''}
`).join('\n')}

${setlist.notes ? `\nOBSERVAÇÕES:\n${setlist.notes}\n` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tropeiros do Bebedouro
    `.trim();

    navigator.clipboard.writeText(textToCopy).then(() => {
      alert('✅ Setlist copiado! Cole no WhatsApp ou Telegram.');
      setShowShareMenu(false);
    }).catch(() => {
      alert('❌ Erro ao copiar. Tente novamente.');
    });
  };

  const handleShareByEmail = async () => {
    if (!shareEmail || !shareEmail.includes('@')) {
      alert('Por favor, digite um email válido');
      return;
    }

    setSendingEmail(true);
    
    try {
      const emailBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #fff;
      padding: 20px;
      max-width: 900px;
      margin: 0 auto;
    }
    .header {
      border-bottom: 3px solid #8B6F47;
      padding-bottom: 15px;
      margin-bottom: 20px;
    }
    .title {
      font-size: 28px;
      font-weight: bold;
      color: #8B6F47;
      margin-bottom: 8px;
    }
    .description {
      font-size: 16px;
      color: #666;
      margin-bottom: 15px;
    }
    .info-row {
      display: flex;
      gap: 30px;
      flex-wrap: wrap;
      margin-top: 10px;
    }
    .info-item {
      font-size: 14px;
    }
    .info-label {
      color: #999;
      font-weight: bold;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.5px;
    }
    .info-value {
      color: #8B6F47;
      font-weight: bold;
      font-size: 16px;
      margin-top: 2px;
    }
    .songs-section {
      margin-top: 30px;
    }
    .section-title {
      font-size: 20px;
      font-weight: bold;
      color: #8B6F47;
      margin-bottom: 15px;
      border-bottom: 2px solid #D4C5B0;
      padding-bottom: 8px;
    }
    .song-item {
      background: #f9f9f9;
      border-left: 4px solid #8B6F47;
      padding: 15px;
      margin-bottom: 12px;
      border-radius: 4px;
    }
    .song-number {
      font-weight: bold;
      color: #8B6F47;
      font-size: 18px;
      display: inline-block;
      min-width: 35px;
    }
    .song-title {
      font-weight: bold;
      color: #000;
      font-size: 16px;
      margin-bottom: 4px;
    }
    .song-artist {
      color: #666;
      font-size: 14px;
      margin-bottom: 8px;
    }
    .song-details {
      font-size: 13px;
      color: #888;
      display: flex;
      gap: 15px;
      flex-wrap: wrap;
      font-family: 'Courier New', Courier, monospace;
    }
    .song-highlight {
      background: linear-gradient(to right, #D4AF37, #9CAF88);
      color: white;
      padding: 2px 8px;
      border-radius: 4px;
      font-weight: bold;
    }
    .notes-section {
      margin-top: 25px;
      padding: 15px;
      background: #fffef0;
      border: 2px solid #D4AF37;
      border-radius: 8px;
    }
    .notes-title {
      font-weight: bold;
      color: #8B6F47;
      margin-bottom: 10px;
    }
    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 2px solid #ddd;
      text-align: center;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">${setlist.name.toUpperCase()}</div>
    ${setlist.description ? `<div class="description">${setlist.description}</div>` : ''}
    
    <div class="info-row">
      ${setlist.event_date ? `
        <div class="info-item">
          <div class="info-label">📅 Data</div>
          <div class="info-value">${format(new Date(setlist.event_date), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}</div>
        </div>
      ` : ''}
      
      ${setlist.location ? `
        <div class="info-item">
          <div class="info-label">📍 Local</div>
          <div class="info-value">${setlist.location}</div>
        </div>
      ` : ''}
      
      <div class="info-item">
        <div class="info-label">🎵 Total</div>
        <div class="info-value">${setlistSongs.length} ${setlistSongs.length === 1 ? 'música' : 'músicas'}</div>
      </div>
      
      ${totalDuration > 0 ? `
        <div class="info-item">
          <div class="info-label">⏱️ Duração</div>
          <div class="info-value">${formatTotalDuration(totalDuration)}</div>
        </div>
      ` : ''}
    </div>
  </div>

  <div class="songs-section">
    <div class="section-title">REPERTÓRIO COMPLETO</div>
    
    ${setlistSongs.map((song, index) => `
      <div class="song-item">
        <div>
          <span class="song-number">${String(index + 1).padStart(2, '0')}.</span>
          <span class="song-title">${song.title}</span>
        </div>
        <div class="song-artist">${song.artist}</div>
        <div class="song-details">
          ${song.main_key ? `<span>Tom: ${song.main_key}</span>` : ''}
          ${song.rhythm_name ? `<span class="song-highlight">🎵 ${song.rhythm_name}</span>` : ''}
          ${song.tempo ? `<span>${song.tempo} BPM</span>` : ''}
          ${song.progressions && song.progressions.length > 0 ? `<span>${song.progressions.length} progressões</span>` : ''}
          ${song.duration ? `<span>${song.duration}</span>` : ''}
        </div>
      </div>
    `).join('')}
  </div>

  ${setlist.notes ? `
    <div class="notes-section">
      <div class="notes-title">📝 NOTAS E OBSERVAÇÕES:</div>
      <div style="white-space: pre-wrap;">${setlist.notes}</div>
    </div>
  ` : ''}

  <div class="footer">
    <p><strong>Compartilhado via Tropeiros do Bebedouro</strong></p>
    <p>${new Date().toLocaleDateString('pt-BR')}</p>
  </div>
</body>
</html>
      `;

      await base44.integrations.Core.SendEmail({
        from_name: "Tropeiros do Bebedouro",
        to: shareEmail,
        subject: `🎸 Setlist: ${setlist.name}`,
        body: emailBody
      });

      alert('✅ Email enviado com sucesso!');
      setShareEmail("");
      setShowShareMenu(false);
    } catch (error) {
      console.error("Erro ao enviar email:", error);
      alert('❌ Erro ao enviar email. Tente novamente.');
    } finally {
      setSendingEmail(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>${setlist.name.toUpperCase()}</title>
          <style>
            @page {
              margin: 2cm;
            }
            
            body {
              font-family: 'Arial', sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
            }
            
            .header {
              border-bottom: 3px solid #8B6F47;
              padding-bottom: 20px;
              margin-bottom: 30px;
              page-break-after: avoid;
            }
            
            .title {
              font-size: 32px;
              font-weight: bold;
              color: #8B6F47;
              margin-bottom: 8px;
              text-transform: uppercase;
            }
            
            .description {
              font-size: 16px;
              color: #A68A64;
              margin-bottom: 15px;
              text-transform: uppercase;
            }
            
            .info-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 15px;
              margin-top: 15px;
            }
            
            .info-item {
              font-size: 14px;
            }
            
            .info-label {
              color: #A68A64;
              font-weight: bold;
              text-transform: uppercase;
              font-size: 11px;
              letter-spacing: 0.5px;
            }
            
            .info-value {
              color: #8B6F47;
              font-weight: bold;
              font-size: 16px;
              margin-top: 3px;
              text-transform: uppercase;
            }
            
            .songs-list {
              margin-top: 30px;
              page-break-after: always;
            }
            
            .songs-title {
              font-size: 20px;
              font-weight: bold;
              color: #8B6F47;
              margin-bottom: 20px;
              border-bottom: 2px solid #D4C5B0;
              padding-bottom: 10px;
              text-transform: uppercase;
            }
            
            .song-item {
              display: flex;
              align-items: baseline;
              padding: 12px;
              margin-bottom: 8px;
              background-color: #F5F1E8;
              border: 1px solid #D4C5B0;
              border-radius: 6px;
              page-break-inside: avoid;
            }
            
            .song-number {
              font-weight: bold;
              color: #8B6F47;
              margin-right: 15px;
              min-width: 30px;
            }
            
            .song-details {
              flex: 1;
            }
            
            .song-title {
              font-weight: bold;
              color: #8B6F47;
              font-size: 16px;
              text-transform: uppercase;
            }
            
            .song-artist {
              color: #A68A64;
              font-size: 14px;
              text-transform: uppercase;
            }
            
            .song-info {
              display: flex;
              gap: 15px;
              margin-top: 5px;
              font-size: 12px;
              color: #A68A64;
              text-transform: uppercase;
            }

            .song-info-highlight {
              background: linear-gradient(to right, #D4AF37, #9CAF88);
              color: white;
              padding: 2px 8px;
              border-radius: 8px;
              font-weight: bold;
              text-transform: uppercase;
            }

            .cifras-section {
              margin-top: 40px;
            }

            .cifra-page {
              page-break-before: always;
              page-break-after: always;
              padding: 10px 0;
              max-height: calc(297mm * 2 - 4cm);
              overflow: hidden;
            }

            .cifra-header {
              background: linear-gradient(to right, #8B6F47, #A68A64);
              color: white;
              padding: 12px 20px;
              border-radius: 6px;
              margin-bottom: 12px;
              page-break-inside: avoid;
              page-break-after: avoid;
            }

            .cifra-title {
              font-size: 20px;
              font-weight: bold;
              margin-bottom: 4px;
              text-transform: uppercase;
            }

            .cifra-artist {
              font-size: 14px;
              opacity: 0.9;
              text-transform: uppercase;
            }

            .cifra-info {
              display: flex;
              gap: 15px;
              flex-wrap: wrap;
              margin-top: 8px;
              font-size: 12px;
            }

            .cifra-content {
              background: white;
              border: 2px solid #D4C5B0;
              border-radius: 6px;
              padding: 15px;
              font-family: 'Courier New', Courier, monospace;
              font-size: 15px;
              line-height: 1.5;
              white-space: pre-wrap;
              color: #000;
              page-break-inside: auto;
              max-height: calc(297mm * 2 - 140px);
              overflow: hidden;
            }
            
            .notes {
              margin-top: 30px;
              padding: 15px;
              background-color: #F5F1E8;
              border: 1px solid #D4C5B0;
              border-radius: 6px;
              page-break-before: always;
            }
            
            .notes-title {
              font-weight: bold;
              color: #8B6F47;
              margin-bottom: 10px;
              text-transform: uppercase;
            }

            .notes-content {
              text-transform: uppercase;
            }
            
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 2px solid #D4C5B0;
              text-align: center;
              color: #A68A64;
              font-size: 12px;
              text-transform: uppercase;
              page-break-before: always;
            }
            
            @media print {
              body {
                padding: 0;
              }
              .cifra-page {
                page-break-before: always;
                page-break-after: always;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">${setlist.name.toUpperCase()}</div>
            ${setlist.description ? `<div class="description">${setlist.description.toUpperCase()}</div>` : ''}
            
            <div class="info-grid">
              ${setlist.event_date ? `
                <div class="info-item">
                  <div class="info-label">DATA</div>
                  <div class="info-value">${format(new Date(setlist.event_date), "d 'de' MMMM 'de' yyyy", { locale: ptBR }).toUpperCase()}</div>
                </div>
              ` : ''}
              
              ${setlist.location ? `
                <div class="info-item">
                  <div class="info-label">LOCAL</div>
                  <div class="info-value">${setlist.location.toUpperCase()}</div>
                </div>
              ` : ''}
              
              <div class="info-item">
                <div class="info-label">DURAÇÃO TOTAL</div>
                <div class="info-value">${formatTotalDuration(totalDuration).toUpperCase()}</div>
              </div>
            </div>
          </div>
          
          <div class="songs-list">
            <div class="songs-title">REPERTÓRIO (${setlistSongs.length} ${setlistSongs.length === 1 ? 'MÚSICA' : 'MÚSICAS'})</div>
            
            ${setlistSongs.map((song, index) => `
              <div class="song-item">
                <div class="song-number">${index + 1}.</div>
                <div class="song-details">
                  <div class="song-title">${song.title.toUpperCase()}</div>
                  <div class="song-artist">${song.artist.toUpperCase()}</div>
                  <div class="song-info">
                    ${song.main_key ? `<span>TOM: ${song.main_key.toUpperCase()}</span>` : ''}
                    ${song.rhythm_name ? `<span class="song-info-highlight">🎵 ${song.rhythm_name.toUpperCase()}</span>` : ''}
                    ${song.progressions && song.progressions.length > 0 ? `<span>${song.progressions.length} ${song.progressions.length === 1 ? 'PROGRESSÃO' : 'PROGRESSÕES'}</span>` : song.tempo ? `<span>${song.tempo} BPM</span>` : ''}
                    ${song.duration ? `<span>${song.duration}</span>` : ''}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>

          ${setlist.notes ? `
            <div class="notes">
              <div class="notes-title">NOTAS / OBSERVAÇÕES:</div>
              <div class="notes-content">${setlist.notes.toUpperCase().replace(/\n/g, '<br>')}</div>
            </div>
          ` : ''}

          <div class="cifras-section">
            ${setlistSongs.map((song, index) => `
              <div class="cifra-page">
                <div class="cifra-header">
                  <div class="cifra-title">${index + 1}. ${song.title.toUpperCase()}</div>
                  <div class="cifra-artist">${song.artist.toUpperCase()}</div>
                  <div class="cifra-info">
                    ${song.main_key ? `<span>🎵 TOM: ${song.main_key.toUpperCase()}</span>` : ''}
                    ${song.rhythm_name ? `<span>🎸 ${song.rhythm_name.toUpperCase()}</span>` : ''}
                    ${song.tempo ? `<span>⏱️ ${song.tempo} BPM</span>` : ''}
                    ${song.duration ? `<span>⏰ ${song.duration}</span>` : ''}
                  </div>
                </div>
                <div class="cifra-content">${song.cifra_text || 'Cifra não disponível'}</div>
              </div>
            `).join('')}
          </div>
          
          <div class="footer">
            <p>SETLIST GERADO POR TROPEIROS DO BEBEDOURO - ${new Date().toLocaleDateString('pt-BR').toUpperCase()}</p>
          </div>
          
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-[#F5F1E8] rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 bg-gradient-to-r from-[#8B6F47] to-[#A68A64] p-6 rounded-t-2xl z-10">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white mb-2" style={{ letterSpacing: '0.5px' }}>
                  {setlist.name}
                </h2>
                {setlist.description && (
                  <p className="text-[#F5F1E8]">{setlist.description}</p>
                )}
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowShareMenu(!showShareMenu)}
                    className="text-white hover:bg-white/20 rounded-full"
                    title="Compartilhar setlist"
                  >
                    <Share2 className="w-5 h-5" />
                  </Button>
                  
                  {showShareMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 top-12 bg-white rounded-xl shadow-2xl p-4 w-80 z-20"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <h3 className="font-bold text-[#8B6F47] mb-3 flex items-center gap-2">
                        <Share2 className="w-4 h-4" />
                        Compartilhar Setlist
                      </h3>
                      
                      <div className="space-y-3">
                        <Button
                          onClick={handleCopySetlist}
                          variant="outline"
                          className="w-full justify-start border-[#8B6F47] text-[#8B6F47] hover:bg-[#8B6F47] hover:text-white"
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Copiar para WhatsApp
                        </Button>

                        <div className="border-t border-[#D4C5B0] pt-3">
                          <Label htmlFor="share-email-input" className="text-xs text-[#8B6F47] mb-2 block">
                            Enviar por Email
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              id="share-email-input"
                              type="email"
                              placeholder="email@exemplo.com"
                              value={shareEmail}
                              onChange={(e) => setShareEmail(e.target.value)}
                              className="flex-1 border-[#D4C5B0]"
                              disabled={sendingEmail}
                            />
                            <Button
                              onClick={handleShareByEmail}
                              disabled={sendingEmail || !shareEmail}
                              className="bg-[#8B6F47] hover:bg-[#A68A64] text-white"
                            >
                              {sendingEmail ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Mail className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowShareMenu(false)}
                        className="w-full mt-3 text-[#A68A64]"
                      >
                        Fechar
                      </Button>
                    </motion.div>
                  )}
                </div>

                {onApostila && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onApostila}
                    className="text-white hover:bg-white/20 rounded-full"
                    title="Gerar apostila completa com cifras (PDF)"
                  >
                    <BookOpen className="w-5 h-5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePrint}
                  className="text-white hover:bg-white/20 rounded-full"
                  title="Imprimir lista de músicas"
                >
                  <Printer className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onEdit}
                  className="text-white hover:bg-white/20 rounded-full"
                  title="Editar setlist"
                >
                  <Edit className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="text-white hover:bg-white/20 rounded-full"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              {setlist.event_date && (
                <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
                  <Calendar className="w-3 h-3 mr-1" />
                  {format(new Date(setlist.event_date), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </Badge>
              )}
              {setlist.location && (
                <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
                  <MapPin className="w-3 h-3 mr-1" />
                  {setlist.location}
                </Badge>
              )}
              <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
                <Music2 className="w-3 h-3 mr-1" />
                {setlistSongs.length} {setlistSongs.length === 1 ? 'música' : 'músicas'}
              </Badge>
              {totalDuration > 0 && (
                <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
                  <Clock className="w-3 h-3 mr-1" />
                  {formatTotalDuration(totalDuration)}
                </Badge>
              )}
            </div>
          </div>

          <div className="p-6 space-y-6">
            <Card className="border-[#D4C5B0] bg-white/60">
              <CardHeader>
                <CardTitle className="text-[#8B6F47] flex items-center gap-2">
                  <Music2 className="w-5 h-5" />
                  Repertório
                </CardTitle>
              </CardHeader>
              <CardContent>
                {setlistSongs.length === 0 ? (
                  <p className="text-center text-[#A68A64] py-8">
                    Nenhuma música no setlist
                  </p>
                ) : (
                  <div className="space-y-3">
                    {setlistSongs.map((song, index) => (
                      <motion.div
                        key={song.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-start gap-3 p-3 bg-white rounded-lg border border-[#D4C5B0] hover:shadow-md transition-shadow"
                      >
                        <span className="font-bold text-[#8B6F47] text-lg min-w-[32px]">
                          {index + 1}.
                        </span>
                        <div className="flex-1">
                          <h4 className="font-bold text-[#8B6F47]">{song.title}</h4>
                          <p className="text-sm text-[#A68A64]">{song.artist}</p>
                          <div className="flex flex-wrap gap-3 mt-2 text-xs">
                            {song.main_key && (
                              <span className="text-[#9CAF88]">Tom: ${song.main_key}</span>
                            )}
                            {song.rhythm_name && (
                                <span className="bg-gradient-to-r from-[#D4AF37] to-[#9CAF88] text-white px-2 py-1 rounded-md font-bold">
                                🎵 ${song.rhythm_name}
                                </span>
                            )}
                            {song.progressions && song.progressions.length > 0 ? (
                                <span className="text-[#D4AF37]">${song.progressions.length} progressões</span>
                            ) : song.tempo && (
                                <span className="text-[#D4AF37]">${song.tempo} BPM</span>
                            )}
                            {song.duration && (
                              <span className="text-[#A68A64]">${song.duration}</span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {setlist.notes && (
              <Card className="border-[#D4C5B0] bg-white/60">
                <CardHeader>
                  <CardTitle className="text-[#8B6F47]">Notas / Observações</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-[#8B6F47] whitespace-pre-wrap">{setlist.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}