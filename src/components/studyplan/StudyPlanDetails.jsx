import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  X, Edit, Share2, Copy, Printer, Brain, Guitar, Music, 
  Calendar, Clock, CheckCircle, MessageCircle, Play, ChevronDown, ChevronUp
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Metronome from "../tools/Metronome";

const statusColors = {
  rascunho: "bg-gray-100 text-gray-700",
  ativo: "bg-green-100 text-green-700",
  concluido: "bg-blue-100 text-blue-700"
};

const categoryLabels = {
  palhetada: "Palhetada",
  dedilhado: "Dedilhado",
  acordes: "Acordes",
  ritmo: "Ritmo",
  velocidade: "Velocidade",
  transicao: "Transição"
};

export default function StudyPlanDetails({ plan, onClose, onEdit }) {
  const [expandedExercise, setExpandedExercise] = useState(null);

  const generateShareText = () => {
    let text = `📚 *PLANO DE ESTUDOS*\n`;
    text += `*${plan.name}*\n`;
    if (plan.week_start) {
      text += `📅 ${format(new Date(plan.week_start), "dd/MM/yyyy", { locale: ptBR })}`;
      if (plan.week_end) text += ` a ${format(new Date(plan.week_end), "dd/MM/yyyy", { locale: ptBR })}`;
      text += `\n`;
    }
    if (plan.description) {
      text += `\n${plan.description}\n`;
    }

    // Teoria
    if (plan.theory_topics?.length > 0) {
      text += `\n🧠 *TEORIA MUSICAL*\n`;
      plan.theory_topics.forEach((t, i) => {
        text += `${i + 1}. ${t.topic}`;
        if (t.key) text += ` (Tom: ${t.key})`;
        if (t.duration_minutes) text += ` - ${t.duration_minutes}min`;
        text += `\n`;
        if (t.notes) text += `   📝 ${t.notes}\n`;
      });
    }

    // Técnica
    if (plan.technique_exercises?.length > 0) {
      text += `\n🎸 *TÉCNICA*\n`;
      plan.technique_exercises.forEach((e, i) => {
        text += `${i + 1}. ${e.exercise}`;
        if (e.category) text += ` [${categoryLabels[e.category] || e.category}]`;
        text += `\n`;
        if (e.rhythm) text += `   Ritmo: ${e.rhythm}\n`;
        if (e.bpm_start && e.bpm_goal) text += `   BPM: ${e.bpm_start} → ${e.bpm_goal}\n`;
        if (e.duration_minutes) text += `   Tempo: ${e.duration_minutes}min\n`;
      });
    }

    // Repertório
    if (plan.repertoire_songs?.length > 0) {
      text += `\n🎵 *REPERTÓRIO*\n`;
      plan.repertoire_songs.forEach((s, i) => {
        text += `${i + 1}. ${s.song_title} - ${s.song_artist}\n`;
        if (s.key) text += `   Tom: ${s.key}`;
        if (s.rhythm) text += ` | Ritmo: ${s.rhythm}`;
        text += `\n`;
        if (s.focus && s.focus !== "Música completa") text += `   Foco: ${s.focus}\n`;
        if (s.notes) text += `   📝 ${s.notes}\n`;
      });
    }

    text += `\n🎯 Bons estudos! 🎶`;
    return text;
  };

  const handleCopy = () => {
    const text = generateShareText();
    navigator.clipboard.writeText(text);
    alert("Plano copiado para a área de transferência!");
  };

  const handleWhatsApp = () => {
    const text = generateShareText();
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  const handlePrint = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Plano de Estudos - ${plan.name}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
          h1 { color: #8B6F47; border-bottom: 3px solid #D4AF37; padding-bottom: 10px; }
          h2 { color: #8B6F47; margin-top: 25px; }
          .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
          .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; }
          .item { padding: 10px; margin: 8px 0; background: #f5f5f5; border-radius: 8px; border-left: 4px solid #8B6F47; }
          .item-theory { border-left-color: #8B6F47; }
          .item-technique { border-left-color: #D4AF37; }
          .item-repertoire { border-left-color: #9CAF88; }
          .meta { color: #666; font-size: 14px; }
          .notes { font-style: italic; color: #888; font-size: 13px; margin-top: 5px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📚 ${plan.name}</h1>
        </div>
        ${plan.week_start ? `<p class="meta">📅 ${format(new Date(plan.week_start), "dd/MM/yyyy", { locale: ptBR })}${plan.week_end ? ` a ${format(new Date(plan.week_end), "dd/MM/yyyy", { locale: ptBR })}` : ''}</p>` : ''}
        ${plan.description ? `<p>${plan.description}</p>` : ''}
        
        ${plan.theory_topics?.length > 0 ? `
          <h2>🧠 Teoria Musical</h2>
          ${plan.theory_topics.map((t, i) => `
            <div class="item item-theory">
              <strong>${i + 1}. ${t.topic}</strong>
              ${t.key ? ` <span class="meta">(Tom: ${t.key})</span>` : ''}
              ${t.duration_minutes ? ` <span class="meta">- ${t.duration_minutes}min</span>` : ''}
              ${t.notes ? `<p class="notes">📝 ${t.notes}</p>` : ''}
            </div>
          `).join('')}
        ` : ''}
        
        ${plan.technique_exercises?.length > 0 ? `
          <h2>🎸 Técnica</h2>
          ${plan.technique_exercises.map((e, i) => `
            <div class="item item-technique">
              <strong>${i + 1}. ${e.exercise}</strong>
              ${e.category ? ` <span class="meta">[${categoryLabels[e.category] || e.category}]</span>` : ''}
              <br/>
              ${e.rhythm ? `<span class="meta">Ritmo: ${e.rhythm} | </span>` : ''}
              ${e.bpm_start && e.bpm_goal ? `<span class="meta">BPM: ${e.bpm_start} → ${e.bpm_goal} | </span>` : ''}
              ${e.duration_minutes ? `<span class="meta">${e.duration_minutes}min</span>` : ''}
            </div>
          `).join('')}
        ` : ''}
        
        ${plan.repertoire_songs?.length > 0 ? `
          <h2>🎵 Repertório</h2>
          ${plan.repertoire_songs.map((s, i) => `
            <div class="item item-repertoire">
              <strong>${i + 1}. ${s.song_title}</strong> - ${s.song_artist}
              <br/>
              ${s.key ? `<span class="meta">Tom: ${s.key}</span>` : ''}
              ${s.rhythm ? `<span class="meta"> | Ritmo: ${s.rhythm}</span>` : ''}
              ${s.focus && s.focus !== "Música completa" ? `<span class="meta"> | Foco: ${s.focus}</span>` : ''}
              ${s.notes ? `<p class="notes">📝 ${s.notes}</p>` : ''}
            </div>
          `).join('')}
        ` : ''}
        
        <p style="margin-top: 30px; text-align: center; color: #8B6F47;">🎯 Bons estudos! 🎶</p>
      </body>
      </html>
    `;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8"
      >
        <div className="p-6 border-b border-[#D4C5B0]">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-[#8B6F47]">{plan.name}</h2>
                <Badge className={statusColors[plan.status || 'rascunho']}>
                  {plan.status === 'ativo' ? 'Ativo' : plan.status === 'concluido' ? 'Concluído' : 'Rascunho'}
                </Badge>
              </div>
              {plan.week_start && (
                <p className="text-[#A68A64] flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(plan.week_start), "dd 'de' MMMM", { locale: ptBR })}
                  {plan.week_end && ` a ${format(new Date(plan.week_end), "dd 'de' MMMM", { locale: ptBR })}`}
                </p>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {plan.description && (
            <p className="mt-3 text-gray-600">{plan.description}</p>
          )}

          <div className="flex gap-2 mt-4 flex-wrap">
            <Button size="sm" variant="outline" onClick={onEdit} className="border-[#D4C5B0]">
              <Edit className="w-4 h-4 mr-1" />
              Editar
            </Button>
            <Button size="sm" variant="outline" onClick={handleCopy} className="border-[#D4C5B0]">
              <Copy className="w-4 h-4 mr-1" />
              Copiar
            </Button>
            <Button size="sm" onClick={handleWhatsApp} className="bg-green-500 hover:bg-green-600 text-white">
              <MessageCircle className="w-4 h-4 mr-1" />
              WhatsApp
            </Button>
            <Button size="sm" variant="outline" onClick={handlePrint} className="border-[#D4C5B0]">
              <Printer className="w-4 h-4 mr-1" />
              Imprimir
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Teoria */}
          {plan.theory_topics?.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-[#8B6F47] flex items-center gap-2 mb-3">
                <Brain className="w-5 h-5" />
                Teoria Musical
              </h3>
              <div className="space-y-2">
                {plan.theory_topics.map((topic, i) => (
                  <Card key={i} className="border-l-4 border-l-[#8B6F47] border-[#D4C5B0]">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-[#8B6F47]">{topic.topic}</p>
                          <div className="flex gap-2 mt-1 flex-wrap">
                            {topic.key && (
                              <Badge variant="outline" className="text-xs">Tom: {topic.key}</Badge>
                            )}
                            {topic.duration_minutes && (
                              <Badge variant="outline" className="text-xs">
                                <Clock className="w-3 h-3 mr-1" />
                                {topic.duration_minutes}min
                              </Badge>
                            )}
                          </div>
                          {topic.notes && (
                            <p className="text-sm text-gray-500 mt-1">📝 {topic.notes}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Técnica */}
          {plan.technique_exercises?.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-[#D4AF37] flex items-center gap-2 mb-3">
                <Guitar className="w-5 h-5" />
                Técnica
              </h3>
              <div className="space-y-2">
                {plan.technique_exercises.map((exercise, i) => {
                  const isExpanded = expandedExercise === i;
                  const initialBpm = exercise.bpm_start || 60;
                  
                  return (
                    <Card key={i} className="border-l-4 border-l-[#D4AF37] border-[#D4C5B0]">
                      <CardContent className="p-3">
                        <div 
                          className="flex items-start justify-between cursor-pointer"
                          onClick={() => setExpandedExercise(isExpanded ? null : i)}
                        >
                          <div className="flex-1">
                            <p className="font-medium text-[#8B6F47]">{exercise.exercise}</p>
                            <div className="flex gap-2 mt-1 flex-wrap">
                              {exercise.category && (
                                <Badge className="bg-[#D4AF37]/20 text-[#8B6F47] text-xs">
                                  {categoryLabels[exercise.category] || exercise.category}
                                </Badge>
                              )}
                              {exercise.rhythm && (
                                <Badge variant="outline" className="text-xs">Ritmo: {exercise.rhythm}</Badge>
                              )}
                              {exercise.bpm_start && exercise.bpm_goal && (
                                <Badge variant="outline" className="text-xs">
                                  BPM: {exercise.bpm_start} → {exercise.bpm_goal}
                                </Badge>
                              )}
                              {exercise.duration_minutes && (
                                <Badge variant="outline" className="text-xs">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {exercise.duration_minutes}min
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-[#D4AF37] hover:bg-[#D4AF37]/10"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          </Button>
                        </div>
                        
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-4 pt-3 border-t border-[#D4C5B0]">
                                <p className="text-sm text-[#8B6F47] mb-2 font-medium">🎵 Metrônomo para praticar:</p>
                                <Metronome compact initialBpm={initialBpm} />
                                {exercise.bpm_goal && exercise.bpm_goal > initialBpm && (
                                  <p className="text-xs text-[#A68A64] mt-2 text-center">
                                    Meta: aumentar de {exercise.bpm_start} até {exercise.bpm_goal} BPM
                                  </p>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Repertório */}
          {plan.repertoire_songs?.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-[#9CAF88] flex items-center gap-2 mb-3">
                <Music className="w-5 h-5" />
                Repertório
              </h3>
              <div className="space-y-2">
                {plan.repertoire_songs.map((song, i) => (
                  <Card key={i} className="border-l-4 border-l-[#9CAF88] border-[#D4C5B0]">
                    <CardContent className="p-3">
                      <p className="font-medium text-[#8B6F47]">{song.song_title}</p>
                      <p className="text-sm text-[#A68A64]">{song.song_artist}</p>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        {song.key && (
                          <Badge variant="outline" className="text-xs">Tom: {song.key}</Badge>
                        )}
                        {song.rhythm && (
                          <Badge variant="outline" className="text-xs">Ritmo: {song.rhythm}</Badge>
                        )}
                        {song.focus && song.focus !== "Música completa" && (
                          <Badge className="bg-[#9CAF88]/20 text-[#8B6F47] text-xs">
                            Foco: {song.focus}
                          </Badge>
                        )}
                      </div>
                      {song.notes && (
                        <p className="text-sm text-gray-500 mt-1">📝 {song.notes}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}