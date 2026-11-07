import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Tag, Loader2, Trash2, CheckCircle, Music2, Hand } from "lucide-react";
import { calculatePatternFromChords, normalizePattern } from "@/utils/progressionUtils";

const MARK_TYPES = [
  { value: "descida_cromatica", label: "Descida cromática", progName: "Descida Cromática" },
  { value: "subida_cromatica", label: "Subida cromática", progName: "Subida Cromática" },
  { value: "queda_melodica", label: "Queda melódica", progName: "Queda Melódica" },
];

export default function ManualPassageMarker({ onClose }) {
  const [songs, setSongs] = useState([]);
  const [markings, setMarkings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSongId, setSelectedSongId] = useState("");
  const [markType, setMarkType] = useState("descida_cromatica");
  const [selection, setSelection] = useState(null); // { sectionIndex, start, end }
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const loadData = async () => {
    const [songList, lpList] = await Promise.all([
      base44.fetchAllSongs(),
      base44.entities.LearningPattern.list('-updated_date', 500)
    ]);
    setSongs([...songList].sort((a, b) => (a.title || '').localeCompare(b.title || '', 'pt-BR')));
    const names = MARK_TYPES.map(t => t.progName);
    setMarkings(lpList.filter(lp => names.includes(lp.progression_name)));
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const song = songs.find(s => s.id === selectedSongId);
  const type = MARK_TYPES.find(t => t.value === markType);

  const getSectionChords = (prog) =>
    (Array.isArray(prog?.chords) ? prog.chords : (prog?.chords ? [prog.chords] : []))
      .filter(c => c && c.trim() !== '%');

  const handleChipClick = (sectionIndex, idx) => {
    setMessage(null);
    setSelection(prev => {
      if (!prev || prev.sectionIndex !== sectionIndex) return { sectionIndex, start: idx, end: idx };
      if (prev.start === idx && prev.end === idx) return null;
      if (idx < prev.start) return { sectionIndex, start: idx, end: prev.end };
      return { sectionIndex, start: prev.start, end: idx };
    });
  };

  const isChipSelected = (sectionIndex, idx) =>
    selection && selection.sectionIndex === sectionIndex && idx >= selection.start && idx <= selection.end;

  const handleMark = async () => {
    if (!song || !selection) return;
    setSaving(true);
    try {
      const prog = song.progressions?.[selection.sectionIndex];
      const chords = getSectionChords(prog).slice(
        Math.min(selection.start, selection.end),
        Math.max(selection.start, selection.end) + 1
      );
      if (chords.length === 0) return;

      const key = prog?.key || song.main_key || 'C';
      const pattern = calculatePatternFromChords(chords, key) || '';

      // Garante o registro na base de progressões (exigido pelo casamento de padrões)
      const allProgs = await base44.entities.Progression.list();
      if (!allProgs.some(p => p.name === type.progName)) {
        await base44.entities.Progression.create({
          name: type.progName,
          pattern: pattern || 'N/A',
          description: 'Condução marcada manualmente pelo usuário (não-funcional/passagem).'
        });
      }

      // Ensina o sistema (LearningPattern)
      const lps = await base44.entities.LearningPattern.list();
      const existing = lps.find(lp =>
        lp.progression_name === type.progName &&
        normalizePattern(lp.pattern) === normalizePattern(pattern)
      );
      if (existing) {
        await base44.entities.LearningPattern.update(existing.id, {
          chords, pattern,
          times_seen: (existing.times_seen || 1) + 1,
          confidence: Math.max(existing.confidence || 0, 100),
          source_songs: [...new Set([...(existing.source_songs || []), song.id])],
          section_type: prog?.section || existing.section_type || 'outros',
          last_used: new Date().toISOString().slice(0, 10)
        });
      } else {
        await base44.entities.LearningPattern.create({
          chords, pattern,
          progression_name: type.progName,
          section_type: prog?.section || 'outros',
          observations: `Marcado manualmente na música "${song.title}" (seção ${prog?.section || '—'}).`,
          times_seen: 1, times_corrected: 0, confidence: 100,
          source_songs: [song.id],
          last_used: new Date().toISOString().slice(0, 10)
        });
      }

      // Grava a anotação na própria música (aparece na view de progressões)
      const noteText = `${type.label}: ${chords.join(' - ')}`;
      const updated = (song.progressions || []).map((p, i) => {
        if (i !== selection.sectionIndex) return p;
        const current = p.notes || '';
        if (current.includes(noteText)) return p;
        return { ...p, notes: current ? `${current} | ${noteText}` : noteText };
      });
      await base44.entities.Song.update(song.id, { progressions: updated });

      setMessage({ ok: true, text: `✅ "${noteText}" marcado na seção ${prog?.section}. O sistema aprendeu o padrão.` });
      setSelection(null);
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (lp) => {
    await base44.entities.LearningPattern.delete(lp.id);
    setMarkings(prev => prev.filter(m => m.id !== lp.id));
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div
        className="bg-[#FAF7F0] rounded-2xl shadow-2xl w-full max-w-3xl my-8"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#D4C5B0] bg-white rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-[#8B6F47]" />
            <h3 className="font-bold text-[#8B6F47] text-lg">Marcar Passagens Cromáticas / Descendentes</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <p className="text-sm text-[#A68A64]">
            Selecione a música, clique no <strong>primeiro</strong> e no <strong>último</strong> acorde da passagem e marque o tipo.
            O sistema registra o padrão e passa a identificá-lo nas próximas análises.
          </p>

          {/* Seleções */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#8B6F47]">Música</label>
              <Select value={selectedSongId} onValueChange={(v) => { setSelectedSongId(v); setSelection(null); setMessage(null); }}>
                <SelectTrigger className="bg-white border-[#D4C5B0]"><SelectValue placeholder="Escolher música" /></SelectTrigger>
                <SelectContent className="z-[70]">
                  {songs.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.title} — {s.artist}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#8B6F47]">Tipo de condução</label>
              <Select value={markType} onValueChange={setMarkType}>
                <SelectTrigger className="bg-white border-[#D4C5B0]"><SelectValue /></SelectTrigger>
                <SelectContent className="z-[70]">
                  {MARK_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {message && (
            <div className={`text-sm px-4 py-3 rounded-xl border ${message.ok ? 'bg-green-50 border-green-300 text-green-800' : 'bg-red-50 border-red-300 text-red-800'}`}>
              {message.text}
            </div>
          )}

          {/* Seções da música */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-[#8B6F47]" />
            </div>
          )}
          {song && !loading && (
            <div className="space-y-3">
              {(song.progressions || []).map((prog, sectionIndex) => {
                const chords = getSectionChords(prog);
                return (
                  <div key={sectionIndex} className="bg-white border border-[#D4C5B0] rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Music2 className="w-4 h-4 text-[#9CAF88]" />
                      <span className="font-bold text-[#8B6F47] text-sm uppercase tracking-wide">{prog.section || 'Seção'}</span>
                      {prog.notes && <span className="text-[10px] text-[#A39682] truncate">({prog.notes})</span>}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {chords.map((chord, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleChipClick(sectionIndex, idx)}
                          className={`px-2.5 py-1 rounded-lg border text-xs font-mono font-semibold transition-all ${
                            isChipSelected(sectionIndex, idx)
                              ? 'bg-amber-400 border-amber-600 text-white shadow-md'
                              : 'bg-[#F5F1E8] border-[#D4C5B0] text-[#8B6F47] hover:bg-[#E8DCC4]'
                          }`}
                        >
                          {chord}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Ação */}
              <div className="flex items-center justify-between gap-3 bg-white border border-[#D4C5B0] rounded-xl px-4 py-3">
                <div className="text-xs text-[#A68A64] flex items-center gap-2">
                  <Hand className="w-4 h-4" />
                  {selection
                    ? `Selecionados: ${getSectionChords(song.progressions[selection.sectionIndex]).slice(selection.start, selection.end + 1).join(' - ')}`
                    : 'Nenhuma passagem selecionada'}
                </div>
                <Button
                  onClick={handleMark}
                  disabled={!selection || saving}
                  className="bg-[#8B6F47] hover:bg-[#6B5437] text-white gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Marcar e Ensinar
                </Button>
              </div>
            </div>
          )}
          {!song && !loading && (
            <div className="text-center py-4 text-sm text-[#A68A64]">Escolha uma música para começar</div>
          )}

          {/* Marcações registradas */}
          <div className="pt-2">
            <p className="text-xs font-semibold text-[#8B6F47] uppercase tracking-wide mb-2">
              Passagens ensinadas ao sistema ({markings.length})
            </p>
            {markings.length === 0 ? (
              <p className="text-xs text-[#A39682]">Nenhuma marcação registrada ainda.</p>
            ) : (
              <div className="space-y-2">
                {markings.map(lp => (
                  <div key={lp.id} className="flex items-center justify-between gap-3 bg-white border border-[#D4C5B0] rounded-xl px-4 py-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="bg-amber-100 border-amber-300 text-amber-800 text-[10px]">
                          {lp.progression_name}
                        </Badge>
                        <span className="text-xs text-[#8B6F47] font-mono">{(lp.chords || []).join(' - ')}</span>
                      </div>
                      <p className="text-[10px] text-[#A39682] mt-0.5">
                        {lp.section_type || '—'} · visto {lp.times_seen || 1}x · confiança {lp.confidence || 100}%
                      </p>
                    </div>
                    <button onClick={() => handleDelete(lp)} className="text-red-400 hover:text-red-600 p-1" title="Remover aprendizado">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}