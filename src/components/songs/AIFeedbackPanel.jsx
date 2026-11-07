import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { ThumbsUp, ThumbsDown, MessageSquare, Loader2, Check, ChevronDown, ChevronUp } from "lucide-react";

export default function AIFeedbackPanel({ song, progressions, onFeedbackSaved }) {
  const [open, setOpen] = useState(false);
  const [feedbacks, setFeedbacks] = useState(() =>
    (progressions || []).map(() => ({ vote: null, comment: "" }))
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleVote = (index, vote) => {
    setFeedbacks((prev) =>
      prev.map((f, i) => (i === index ? { ...f, vote } : f))
    );
  };

  const handleComment = (index, comment) => {
    setFeedbacks((prev) =>
      prev.map((f, i) => (i === index ? { ...f, comment } : f))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (let i = 0; i < progressions.length; i++) {
        const fb = feedbacks[i];
        const prog = progressions[i];
        if (fb.vote === null && !fb.comment) continue;

        // Se corrigido (thumbsdown), registra no LearningPattern para treinar a IA
        if (fb.vote === 'down' && prog.progression_name) {
          try {
            const existing = await base44.entities.LearningPattern.filter({
              pattern: prog.pattern,
              progression_name: prog.progression_name,
            });
            if (existing.length > 0) {
              const ep = existing[0];
              await base44.entities.LearningPattern.update(ep.id, {
                times_corrected: (ep.times_corrected || 0) + 1,
                confidence: Math.max(0, (ep.confidence || 100) - 10),
                observations: fb.comment
                  ? `${ep.observations ? ep.observations + ' | ' : ''}Feedback negativo: ${fb.comment}`
                  : ep.observations,
              });
            } else if (prog.chords?.length > 0) {
              await base44.entities.LearningPattern.create({
                chords: prog.chords,
                key: prog.key || song.main_key || '',
                pattern: prog.pattern || '',
                progression_name: prog.progression_name,
                section_type: prog.section || '',
                times_seen: 1,
                times_corrected: 1,
                confidence: 50,
                source_songs: [song.id],
                last_used: new Date().toISOString().split('T')[0],
                observations: fb.comment ? `Feedback negativo: ${fb.comment}` : 'Marcado como incorreto pelo usuário',
              });
            }
          } catch (e) {
            console.warn('Erro ao registrar feedback negativo:', e);
          }
        }

        // Se aprovado (thumbsup), aumenta confiança no LearningPattern
        if (fb.vote === 'up' && prog.progression_name && prog.chords?.length > 0) {
          try {
            const existing = await base44.entities.LearningPattern.filter({
              pattern: prog.pattern,
              progression_name: prog.progression_name,
            });
            if (existing.length > 0) {
              const ep = existing[0];
              await base44.entities.LearningPattern.update(ep.id, {
                times_seen: (ep.times_seen || 1) + 1,
                confidence: Math.min(100, (ep.confidence || 80) + 5),
                last_used: new Date().toISOString().split('T')[0],
                source_songs: [...new Set([...(ep.source_songs || []), song.id])],
              });
            } else {
              await base44.entities.LearningPattern.create({
                chords: prog.chords,
                key: prog.key || song.main_key || '',
                pattern: prog.pattern || '',
                progression_name: prog.progression_name,
                section_type: prog.section || '',
                times_seen: 2,
                times_corrected: 0,
                confidence: 90,
                source_songs: [song.id],
                last_used: new Date().toISOString().split('T')[0],
                observations: fb.comment || 'Aprovado pelo usuário',
              });
            }
          } catch (e) {
            console.warn('Erro ao registrar feedback positivo:', e);
          }
        }
      }

      setSaved(true);
      setTimeout(() => { setSaved(false); setOpen(false); }, 2000);
      if (onFeedbackSaved) onFeedbackSaved();
    } finally {
      setSaving(false);
    }
  };

  const hasAnyFeedback = feedbacks.some((f) => f.vote !== null || f.comment);
  const analyzedProgs = progressions.filter((p) => p.progression_name);

  if (analyzedProgs.length === 0) return null;

  return (
    <div className="border border-[#D4C5B0] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[#F5F1E8] hover:bg-[#EDE4D3] transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[#8B6F47]" />
          <span className="text-sm font-semibold text-[#8B6F47]">
            Validar Análise da IA
          </span>
          <Badge variant="outline" className="text-xs border-[#D4C5B0] text-[#A68A64]">
            {analyzedProgs.length} progressões
          </Badge>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-[#A68A64]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[#A68A64]" />
        )}
      </button>

      {open && (
        <div className="p-4 space-y-4 bg-white">
          <p className="text-xs text-[#A68A64]">
            Seu feedback treina a IA para análises futuras mais precisas. 👍 confirma o acerto, 👎 registra um erro.
          </p>

          <div className="space-y-3">
            {progressions.map((prog, i) => {
              if (!prog.progression_name) return null;
              const fb = feedbacks[i];
              return (
                <div key={i} className="border border-[#D4C5B0] rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="text-xs text-[#A68A64] font-medium">{prog.section}</p>
                      <p className="text-sm font-bold text-[#8B6F47]">{prog.progression_name}</p>
                      {prog.pattern && (
                        <p className="text-xs text-[#A68A64] font-mono">{prog.pattern}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleVote(i, fb.vote === 'up' ? null : 'up')}
                        className={`p-2 rounded-lg transition-all border ${
                          fb.vote === 'up'
                            ? 'bg-green-500 text-white border-green-500'
                            : 'bg-white text-green-600 border-green-300 hover:bg-green-50'
                        }`}
                        title="Correto!"
                      >
                        <ThumbsUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleVote(i, fb.vote === 'down' ? null : 'down')}
                        className={`p-2 rounded-lg transition-all border ${
                          fb.vote === 'down'
                            ? 'bg-red-500 text-white border-red-500'
                            : 'bg-white text-red-500 border-red-300 hover:bg-red-50'
                        }`}
                        title="Incorreto"
                      >
                        <ThumbsDown className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {fb.vote === 'down' && (
                    <Textarea
                      placeholder="O que estava errado? (ex: deveria ser Progressão Terra, acorde G está incorreto...)"
                      value={fb.comment}
                      onChange={(e) => handleComment(i, e.target.value)}
                      className="text-xs min-h-[60px] border-red-200 focus:border-red-400"
                    />
                  )}
                </div>
              );
            })}
          </div>

          {hasAnyFeedback && (
            <Button
              onClick={handleSave}
              disabled={saving || saved}
              className="w-full bg-[#8B6F47] hover:bg-[#6B5437] text-white"
              size="sm"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando feedback...</>
              ) : saved ? (
                <><Check className="w-4 h-4 mr-2" />Feedback salvo! Obrigado!</>
              ) : (
                <><MessageSquare className="w-4 h-4 mr-2" />Enviar Feedback para IA</>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}