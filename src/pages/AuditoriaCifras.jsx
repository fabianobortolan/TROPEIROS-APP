import React, { useState, useMemo, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2, Music, Search, ShieldCheck, ShieldAlert, AlertTriangle, AlertCircle,
  CheckCircle2, ChevronDown, ChevronUp, Download, FileText, ListFilter, Pause, Play, RefreshCw, Save, Award
} from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { validarCifra, computeValidationScore, findDuplicateSongs } from "@/utils/cifraValidator";
import { isIssueIgnored } from "@/utils/revalidateAudit";
import CifraAlertBadge from "@/components/songs/CifraAlertBadge";
import { jsPDF } from "jspdf";

const GENRE_LABELS = {
  sertanejo_raiz: "Raiz",
  sertanejo_universitario: "Universitário",
  sertanejo_romantico: "Romântico",
  sertanejo_moderno: "Moderno",
  sertanejo_modao: "Modão",
  pop_rock: "Pop/Rock",
  religioso: "Religioso",
  mpb: "MPB",
  samba: "Samba",
  forro: "Forró",
};

const TYPE_LABELS = {
  acorde_invalido: "Grafia inválida",
  acorde_invalido_progressoes: "Acorde não reconhecido",
  enarmonico: "Enarmônicos",
  tom_detectado: "Tom detectado",
  tom_errado: "Tom errado",
  modulacao: "Modulação",
  inconsistencia: "Seções divergentes",
  acorde_além_do_fim: "Desalinhado da letra",
  acordes_colados: "Acordes colados",
  secao_nao_marcada: "Sem marcação de seção",
  intro_ausente: "Intro ausente",
  marcador_secao: "Marcador malformado",
  chord_count: "Nº de acordes",
  metadados: "Metadados faltando",
  custom_cifra_desatualizada: "Cifra da apostila",
  original_key_incoerente: "Tom original incoerente",
  tonica_ausente: "Tônica ausente",
  duplicata: "Duplicata",
};

const SEVERITY_ORDER = { critico: 0, suspeito: 1, atencao: 2, ok: 3 };
const BATCH_OPTIONS = [
  { key: 'all', label: 'Todas as músicas' },
  { key: 'never', label: 'Só nunca auditadas' },
  { key: 'changed', label: 'Só alteradas desde a última auditoria' },
];

function isChangedAfterAudit(s) {
  if (!s.validation_date) return true;
  return new Date(s.updated_date) > new Date(s.validation_date);
}

export default function AuditoriaCifras() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [fSeverity, setFSeverity] = useState("all");
  const [fType, setFType] = useState("all");
  const [fGenre, setFGenre] = useState("all");
  const [fRhythm, setFRhythm] = useState("all");
  const [fKey, setFKey] = useState("all");
  const [fRevised, setFRevised] = useState("all");
  const [sortMode, setSortMode] = useState("gravidade");
  const [expanded, setExpanded] = useState({});
  const [selected, setSelected] = useState({});
  const [batchOption, setBatchOption] = useState('all');
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchPaused, setBatchPaused] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchDone, setBatchDone] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const pausedRef = useRef(false);
  const runningRef = useRef(false);

  const { data: songs = [], isLoading: songsLoading, refetch } = useQuery({
    queryKey: ['songs'],
    queryFn: () => base44.fetchAllSongs(),
  });

  // Duplicatas do acervo (mesmo título + artista)
  const duplicateKeySet = useMemo(() => {
    const dups = findDuplicateSongs(songs);
    const set = new Set();
    for (const g of dups) for (const s of g) set.add(s.id);
    return set;
  }, [songs]);

  // Auditoria de cada música (cliente, instantâneo) — alertas ignorados filtrados
  const audit = useMemo(() => {
    return songs.map((s) => {
      const r = validarCifra(s);
      const ignoredList = s.validation_ignored || [];
      const issues = (r.issues || []).filter((i) => !isIssueIgnored(i, ignoredList));
      if (duplicateKeySet.has(s.id) && !issues.some((i) => i.type === 'duplicata')) {
        issues.push({
          type: 'duplicata', section: '(acervo)', line: null, severity: 'medio',
          message: 'Possível duplicata: mesma música (título + artista) cadastrada mais de uma vez no acervo.',
          detail: {}
        });
      }
      const severity = issues.length === 0 ? 'ok' : r.severity === 'ok' ? 'atencao' : r.severity;
      return {
        id: s.id,
        song: s,
        title: s.title,
        artist: s.artist,
        main_key: s.main_key,
        rhythm_name: s.rhythm_name,
        genre_style: s.genre_style,
        severity,
        issues,
        score: computeValidationScore(issues),
        stored_score: s.validation_score,
        stored_severity: s.validation_severity,
        neverAudited: !s.validation_date,
        changedAfterAudit: isChangedAfterAudit(s),
        isFullyRevised: !!s.is_fully_revised,
        validation_date: s.validation_date,
      };
    });
  }, [songs, duplicateKeySet]);

  const stats = useMemo(() => {
    const out = {
      total: audit.length, critico: 0, suspeito: 0, atencao: 0, ok: 0,
      neverAudited: 0, changed: 0, revised: 0,
    };
    audit.forEach((a) => {
      out[a.severity] = (out[a.severity] || 0) + 1;
      if (a.neverAudited) out.neverAudited++;
      if (a.changedAfterAudit) out.changed++;
      if (a.isFullyRevised) out.revised++;
    });
    out.revisedPct = out.total ? Math.round((out.revised / out.total) * 100) : 0;
    return out;
  }, [audit]);

  // Ranking dos tipos de problema mais frequentes
  const typeRanking = useMemo(() => {
    const counts = {};
    audit.forEach((a) => a.issues.forEach((i) => { counts[i.type] = (counts[i.type] || 0) + 1; }));
    return Object.entries(counts)
      .map(([type, count]) => ({ type, count, label: TYPE_LABELS[type] || type }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [audit]);

  const keysList = useMemo(
    () => Array.from(new Set(audit.map((a) => a.main_key).filter(Boolean))).sort(),
    [audit]
  );
  const rhythmsList = useMemo(
    () => Array.from(new Set(audit.map((a) => a.rhythm_name).filter(Boolean))).sort(),
    [audit]
  );
  const typesList = useMemo(() => Array.from(new Set(audit.flatMap((a) => a.issues.map((i) => i.type)))), [audit]);

  const filtered = useMemo(() => {
    let out = audit.filter((a) => {
      if (fSeverity !== 'all' && a.severity !== fSeverity) return false;
      if (fType !== 'all' && !a.issues.some((i) => i.type === fType)) return false;
      if (fGenre !== 'all' && a.genre_style !== fGenre) return false;
      if (fRhythm !== 'all' && a.rhythm_name !== fRhythm) return false;
      if (fKey !== 'all' && a.main_key !== fKey) return false;
      if (fRevised === 'true' && !a.isFullyRevised) return false;
      if (fRevised === 'false' && a.isFullyRevised) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!a.title?.toLowerCase().includes(q) && !a.artist?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
    out = [...out].sort((a, b) => {
      if (sortMode === 'nota') return a.score - b.score;
      return SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || a.score - b.score;
    });
    return out;
  }, [audit, fSeverity, fType, fGenre, fRhythm, fKey, fRevised, search, sortMode]);

  // Grava o resultado da auditoria de um conjunto de músicas no banco
  const persistRecords = async (rows) => {
    const now = new Date().toISOString();
    const records = rows.map((a) => {
      const s = a.song;
      const r = validarCifra(s);
      const ignoredList = s.validation_ignored || [];
      const issues = (r.issues || []).filter((i) => !isIssueIgnored(i, ignoredList));
      const score = computeValidationScore(issues);
      return {
        id: a.id,
        validation_severity: issues.length === 0 ? 'ok' : r.severity,
        validation_issues: issues.length ? issues : null,
        validation_score: score,
        validation_date: now,
        validation_main_key: r.mainKey || null,
        validation_foreign_ratio: r.foreignRatio || 0,
      };
    });
    let saved = 0;
    for (let i = 0; i < records.length; i += 500) {
      await base44.entities.Song.bulkUpdate(records.slice(i, i + 500));
      saved += records.slice(i, i + 500).length;
      setBatchProgress(Math.round((saved / records.length) * 100));
      while (pausedRef.current) {
        await new Promise((res) => setTimeout(res, 300));
      }
    }
    return saved;
  };

  const runBatch = async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setBatchRunning(true); setBatchPaused(false); pausedRef.current = false;
    setBatchProgress(0); setBatchDone(null);
    try {
      const res = await refetch();
      const fresh = res.data || [];
      const freshDups = findDuplicateSongs(fresh);
      const dupSet = new Set();
      for (const g of freshDups) for (const s of g) dupSet.add(s.id);
      const targets = fresh
        .map((s) => ({
          id: s.id, song: s,
          title: s.title, artist: s.artist,
          main_key: s.main_key, rhythm_name: s.rhythm_name, genre_style: s.genre_style,
          validation_date: s.validation_date,
        }))
        .filter((a) => {
          if (batchOption === 'never') return !a.validation_date;
          if (batchOption === 'changed') return isChangedAfterAudit(a.song);
          return true;
        })
        .map((a) => {
          const r = validarCifra(a.song);
          const ignoredList = a.song.validation_ignored || [];
          const issues = (r.issues || []).filter((i) => !isIssueIgnored(i, ignoredList));
          if (dupSet.has(a.id) && !issues.some((i) => i.type === 'duplicata')) {
            issues.push({
              type: 'duplicata', section: '(acervo)', line: null, severity: 'medio',
              message: 'Possível duplicata: mesma música (título + artista) cadastrada mais de uma vez no acervo.',
              detail: {}
            });
          }
          return { ...a, severity: issues.length === 0 ? 'ok' : r.severity, issues, score: computeValidationScore(issues) };
        });
      setBatchProgress(5);
      const saved = await persistRecords(targets);
      setBatchProgress(100);
      setBatchDone({ ok: true, saved, total: targets.length });
      queryClient.invalidateQueries({ queryKey: ['songs'] });
    } catch (err) {
      setBatchDone({ ok: false, error: err.message || 'Erro ao processar auditoria' });
    } finally {
      runningRef.current = false;
      setBatchRunning(false);
      setBatchPaused(false);
      pausedRef.current = false;
    }
  };

  const togglePause = () => {
    pausedRef.current = !pausedRef.current;
    setBatchPaused(pausedRef.current);
  };

  const reauditSelected = async () => {
    const ids = Object.keys(selected).filter((id) => selected[id]);
    if (!ids.length) return;
    const rows = audit.filter((a) => ids.includes(a.id));
    try {
      const saved = await persistRecords(rows);
      setFeedback({ ok: true, msg: `Reauditadas e salvas: ${saved} música(s).` });
      queryClient.invalidateQueries({ queryKey: ['songs'] });
    } catch (err) {
      setFeedback({ ok: false, msg: err.message || 'Erro ao reauditar.' });
    }
    setTimeout(() => setFeedback(null), 5000);
  };

  const markSelectedRevised = async () => {
    const ids = Object.keys(selected).filter((id) => selected[id]);
    if (!ids.length) return;
    try {
      await base44.entities.Song.bulkUpdate(ids.map((id) => ({ id, is_fully_revised: true })));
      setFeedback({ ok: true, msg: `${ids.length} música(s) marcada(s) como totalmente revisadas.` });
      queryClient.invalidateQueries({ queryKey: ['songs'] });
      setSelected({});
    } catch (err) {
      setFeedback({ ok: false, msg: err.message || 'Erro ao marcar.' });
    }
    setTimeout(() => setFeedback(null), 5000);
  };

  const exportCSV = () => {
    const header = ['Título', 'Artista', 'Tom', 'Ritmo', 'Gênero', 'Severidade', 'Nota', 'Alertas', 'Tipos de alerta', 'Revisada', 'Última auditoria'];
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = filtered.map((a) => [
      a.title, a.artist, a.main_key, a.rhythm_name, GENRE_LABELS[a.genre_style] || a.genre_style || '',
      a.severity, a.score, a.issues.length,
      a.issues.map((i) => TYPE_LABELS[i.type] || i.type).join('; '),
      a.isFullyRevised ? 'Sim' : 'Não',
      a.validation_date ? new Date(a.validation_date).toLocaleString('pt-BR') : 'Nunca auditada',
    ]);
    const csv = '\uFEFF' + [header, ...rows].map((r) => r.map(esc).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auditoria-geral-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    let y = 16;
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('Relatório de Auditoria Geral de Cifras', 14, y);
    y += 6;
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')} • ${filtered.length} música(s) no filtro atual`, 14, y);
    y += 8;
    filtered.forEach((a) => {
      if (y > 275) { doc.addPage(); y = 16; }
      doc.setFont(undefined, 'bold');
      doc.setFontSize(10);
      doc.text(`${a.title} — ${a.artist}`, 14, y);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);
      y += 4;
      const line2 = `Severidade: ${a.severity} | Nota: ${a.score}/100 | Tom: ${a.main_key || '—'} | Ritmo: ${a.rhythm_name || '—'} | ${a.isFullyRevised ? 'Revisada' : 'Não revisada'}`;
      const types = a.issues.map((i) => TYPE_LABELS[i.type] || i.type).join(', ') || 'sem alertas';
      doc.text(doc.splitTextToSize(line2, 182), 14, y); y += 4;
      doc.setTextColor(160, 60, 30);
      doc.text(doc.splitTextToSize(`Alertas: ${types}`, 182), 14, y);
      doc.setTextColor(30, 30, 30);
      y += 6;
    });
    doc.save(`auditoria-geral-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const allVisibleSelected = filtered.length > 0 && filtered.every((a) => selected[a.id]);

  const StatCard = ({ label, value, tone }) => (
    <div className={`rounded-xl p-3 border ${tone}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs font-medium opacity-80 mt-0.5">{label}</p>
    </div>
  );

  return (
    <div className="bg-amber-50 min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <Button variant="ghost" onClick={() => navigate(createPageUrl("Library"))}
            className="mb-3 text-[#8B6F47] hover:text-[#A68A64] hover:bg-[#8B6F47]/10">
            ← Voltar para Biblioteca
          </Button>
          <h1 className="text-3xl md:text-4xl font-bold text-[#8B6F47] mb-1 flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-[#D4AF37]" />
            Auditoria Geral
          </h1>
          <p className="text-[#A68A64]">
            Visão completa da saúde do acervo: grafia, enarmônicos, tonalidade, campo harmônico, seções, alinhamento, metadados e duplicatas.
          </p>
        </motion.div>

        {/* Resumo */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
          <StatCard label="Total na base" value={stats.total} tone="bg-slate-100 border-slate-200 text-slate-700" />
          <StatCard label="Crítico" value={stats.critico} tone="bg-red-50 border-red-200 text-red-700" />
          <StatCard label="Suspeito" value={stats.suspeito} tone="bg-orange-50 border-orange-200 text-orange-700" />
          <StatCard label="Atenção" value={stats.atencao} tone="bg-amber-50 border-amber-200 text-amber-700" />
          <StatCard label="Sem alerta" value={stats.ok} tone="bg-green-50 border-green-200 text-green-700" />
          <StatCard label="Nunca auditadas" value={stats.neverAudited} tone="bg-stone-50 border-stone-200 text-stone-600" />
          <StatCard label="Alteradas pós-auditoria" value={stats.changed} tone="bg-indigo-50 border-indigo-200 text-indigo-700" />
          <StatCard label="Totalmente revisadas" value={`${stats.revisedPct}%`} tone="bg-emerald-50 border-emerald-200 text-emerald-700" />
        </div>

        {/* Auditoria em lote */}
        <Card className="border-[#D4AF37] bg-gradient-to-r from-[#8B6F47]/5 to-[#D4AF37]/10 mb-6">
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
              <div className="flex items-start gap-2">
                <Play className="w-5 h-5 text-[#8B6F47] mt-0.5" />
                <div>
                  <p className="font-semibold text-[#8B6F47] text-sm">Auditar em lote</p>
                  <p className="text-xs text-[#A68A64]">
                    Reexecuta o validador em todas as músicas selecionadas e grava o resultado (severidade, nota e alertas) — alimentando os selos da Biblioteca.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={batchOption} onValueChange={setBatchOption}>
                  <SelectTrigger className="w-56 h-9 border-[#D4C5B0] bg-white text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BATCH_OPTIONS.map((o) => (
                      <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={runBatch} disabled={batchRunning || songsLoading}
                  className="bg-gradient-to-r from-[#8B6F47] to-[#A68A64] hover:from-[#6B5437] hover:to-[#8B6F47] text-white gap-2">
                  {batchRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  {batchRunning ? 'Processando...' : 'Iniciar lote'}
                </Button>
                {batchRunning && (
                  <Button onClick={togglePause} variant="outline" size="icon"
                    className="border-[#8B6F47] text-[#8B6F47] hover:bg-[#8B6F47] hover:text-white">
                    {batchPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                  </Button>
                )}
              </div>
            </div>
            {batchRunning && (
              <div>
                <Progress value={batchProgress} className="h-2" />
                <p className="text-xs text-[#A68A64] mt-1.5">
                  {batchPaused ? 'Pausado — clique em ▶ para continuar.' : `Gravando auditoria... ${batchProgress}%`}
                </p>
              </div>
            )}
            {batchDone && (
              <Alert className={batchDone.ok ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}>
                <AlertDescription className={batchDone.ok ? 'text-green-700' : 'text-red-700'}>
                  {batchDone.ok
                    ? `✅ Auditoria gravada para ${batchDone.saved} de ${batchDone.total} música(s) do lote.`
                    : `❌ ${batchDone.error}`}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Ranking de problemas */}
        {typeRanking.length > 0 && (
          <Card className="border-[#D4C5B0] bg-white mb-6">
            <CardHeader className="pb-2 border-b border-[#D4C5B0]">
              <CardTitle className="text-[#8B6F47] flex items-center gap-2 text-lg">
                <Award className="w-5 h-5 text-[#D4AF37]" /> Tipos de problema mais frequentes no acervo
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-1.5">
              {typeRanking.map((r, i) => {
                const max = typeRanking[0].count || 1;
                return (
                  <button
                    key={r.type}
                    onClick={() => setFType(r.type)}
                    className="w-full flex items-center gap-3 text-left group"
                  >
                    <span className="w-6 text-xs text-[#A68A64] font-bold">{i + 1}º</span>
                    <span className="w-52 text-sm font-medium text-[#8B6F47] group-hover:underline truncate">{r.label}</span>
                    <div className="flex-1 h-4 bg-[#F5F1E8] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#8B6F47] to-[#D4AF37] rounded-full"
                        style={{ width: `${(r.count / max) * 100}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-xs font-bold text-[#8B6F47]">{r.count}</span>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        )}

        {feedback && (
          <Alert className={`mb-4 ${feedback.ok ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
            <AlertDescription className={feedback.ok ? 'text-green-700' : 'text-red-700'}>{feedback.msg}</AlertDescription>
          </Alert>
        )}

        {/* Filtros */}
        <Card className="border-[#D4C5B0] bg-white shadow-md mb-4">
          <CardHeader className="border-b border-[#D4C5B0] pb-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="text-[#8B6F47] flex items-center gap-2 text-lg">
                <ListFilter className="w-5 h-5" /> Filtros e exportação
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A68A64]" />
                  <Input placeholder="Buscar título ou artista..." value={search} onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 border-[#D4C5B0] focus:border-[#8B6F47]" />
                </div>
                <Select value={sortMode} onValueChange={setSortMode}>
                  <SelectTrigger className="w-32 h-9 border-[#D4C5B0] text-xs bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gravidade">Ordenar: gravidade</SelectItem>
                    <SelectItem value="nota">Ordenar: nota</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" onClick={exportCSV}
                  className="border-[#8B6F47] text-[#8B6F47] hover:bg-[#8B6F47] hover:text-white text-xs gap-1.5">
                  <Download className="w-3.5 h-3.5" /> CSV
                </Button>
                <Button size="sm" variant="outline" onClick={exportPDF}
                  className="border-[#8B6F47] text-[#8B6F47] hover:bg-[#8B6F47] hover:text-white text-xs gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> PDF
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mt-3">
              <Select value={fSeverity} onValueChange={setFSeverity}>
                <SelectTrigger className="h-8 border-[#D4C5B0] text-xs bg-white"><SelectValue placeholder="Severidade" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Severidade: todas</SelectItem>
                  <SelectItem value="critico">Crítico ({stats.critico})</SelectItem>
                  <SelectItem value="suspeito">Suspeito ({stats.suspeito})</SelectItem>
                  <SelectItem value="atencao">Atenção ({stats.atencao})</SelectItem>
                  <SelectItem value="ok">Sem alerta ({stats.ok})</SelectItem>
                </SelectContent>
              </Select>
              <Select value={fType} onValueChange={setFType}>
                <SelectTrigger className="h-8 border-[#D4C5B0] text-xs bg-white"><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tipo de alerta: todos</SelectItem>
                  {typesList.map((t) => (
                    <SelectItem key={t} value={t}>{TYPE_LABELS[t] || t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={fGenre} onValueChange={setFGenre}>
                <SelectTrigger className="h-8 border-[#D4C5B0] text-xs bg-white"><SelectValue placeholder="Gênero" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Gênero: todos</SelectItem>
                  {Object.entries(GENRE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={fRhythm} onValueChange={setFRhythm}>
                <SelectTrigger className="h-8 border-[#D4C5B0] text-xs bg-white"><SelectValue placeholder="Ritmo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Ritmo: todos</SelectItem>
                  {rhythmsList.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={fKey} onValueChange={setFKey}>
                <SelectTrigger className="h-8 border-[#D4C5B0] text-xs bg-white"><SelectValue placeholder="Tom" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tom: todos</SelectItem>
                  {keysList.map((k) => (
                    <SelectItem key={k} value={k}>{k}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={fRevised} onValueChange={setFRevised}>
                <SelectTrigger className="h-8 border-[#D4C5B0] text-xs bg-white"><SelectValue placeholder="Revisão" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Revisão: todas</SelectItem>
                  <SelectItem value="true">Totalmente revisadas</SelectItem>
                  <SelectItem value="false">Não revisadas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          {/* Ações em massa */}
          <div className="px-4 py-2 border-b border-[#E8DCC4] flex flex-wrap items-center gap-2 bg-[#F5F1E8]/40">
            <label className="flex items-center gap-2 text-xs font-semibold text-[#8B6F47] cursor-pointer">
              <Checkbox
                checked={allVisibleSelected}
                onCheckedChange={(c) => {
                  const next = { ...selected };
                  filtered.forEach((a) => { next[a.id] = !!c; });
                  setSelected(next);
                }}
              />
              Selecionar todas ({filtered.length})
            </label>
            {Object.values(selected).some(Boolean) && (
              <>
                <span className="text-xs text-[#A68A64]">{Object.values(selected).filter(Boolean).length} selecionada(s)</span>
                <Button size="sm" onClick={reauditSelected}
                  className="h-7 bg-[#8B6F47] hover:bg-[#6B5437] text-white text-xs gap-1.5">
                  <RefreshCw className="w-3 h-3" /> Reauditar selecionadas
                </Button>
                <Button size="sm" onClick={markSelectedRevised}
                  className="h-7 bg-green-600 hover:bg-green-700 text-white text-xs gap-1.5">
                  <CheckCircle2 className="w-3 h-3" /> Marcar como revisadas
                </Button>
              </>
            )}
          </div>

          {/* Tabela */}
          <CardContent className="p-0">
            {songsLoading ? (
              <div className="p-12 flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#8B6F47]" />
                <p className="text-[#A68A64]">Carregando músicas...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center p-12 text-[#A68A64]">
                <Music className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Nenhuma música neste filtro.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#E8DCC4]">
                {filtered.map((a) => {
                  const open = !!expanded[a.id];
                  const staleScore = a.stored_score != null && a.stored_score !== a.score;
                  return (
                    <div key={a.id} className="px-4 py-3 flex flex-col gap-2">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={!!selected[a.id]}
                          onCheckedChange={(c) => setSelected((p) => ({ ...p, [a.id]: !!c }))}
                        />
                        <div
                          className="flex-1 min-w-0 flex items-center gap-3 cursor-pointer"
                          onClick={() => setExpanded((p) => ({ ...p, [a.id]: !p[a.id] }))}
                        >
                          <div className="flex-shrink-0">
                            <CifraAlertBadge severity={a.severity} issues={a.issues} compact />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-800 truncate flex items-center gap-2">
                              {a.title}
                              {a.neverAudited && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-500 border border-stone-200 font-bold">nunca auditada</span>}
                              {a.changedAfterAudit && !a.neverAudited && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200 font-bold">alterada após auditoria</span>}
                            </p>
                            <p className="text-sm text-[#A68A64] truncate">{a.artist}</p>
                          </div>
                          <div className="hidden md:flex items-center gap-1.5 shrink-0">
                            <span className={`text-xs font-extrabold px-2 py-1 rounded-lg ${a.score >= 90 ? 'bg-green-100 text-green-700' : a.score >= 70 ? 'bg-amber-100 text-amber-700' : a.score >= 50 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                              {a.score}/100
                            </span>
                            {a.main_key && <Badge variant="outline" className="text-xs">Tom: {a.main_key}</Badge>}
                            {a.rhythm_name && <Badge variant="outline" className="text-xs">{a.rhythm_name}</Badge>}
                            {a.genre_style && <Badge className="bg-[#E8DCC4] text-[#8B6F47] text-xs">{GENRE_LABELS[a.genre_style] || a.genre_style}</Badge>}
                            {a.isFullyRevised && <Badge className="bg-green-100 text-green-700 border-green-300 text-xs">✓ revisada</Badge>}
                          </div>
                          <div className="shrink-0">
                            {open ? <ChevronUp className="w-4 h-4 text-[#A68A64]" /> : <ChevronDown className="w-4 h-4 text-[#A68A64]" />}
                          </div>
                        </div>
                      </div>

                      {open && (
                        <div className="pl-8 space-y-1.5">
                          {a.issues.length === 0 ? (
                            <p className="text-sm text-green-700 flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4" /> Nenhum problema detectado pela auditoria.
                            </p>
                          ) : (
                            a.issues.map((iss, i) => (
                              <div key={i} className="text-sm text-gray-700 bg-[#F5F1E8]/60 border border-[#E8DCC4] rounded-lg px-3 py-2 flex items-start gap-2">
                                <Badge className={`${iss.severity === 'alto' ? 'bg-red-100 text-red-700' : iss.severity === 'medio' ? 'bg-orange-100 text-orange-700' : 'bg-amber-100 text-amber-700'} text-[10px] font-bold flex-shrink-0`}>
                                  {TYPE_LABELS[iss.type] || iss.type}
                                </Badge>
                                <span>{iss.message}</span>
                              </div>
                            ))
                          )}
                          <Button
                            size="sm" variant="outline"
                            className="border-[#8B6F47] text-[#8B6F47] hover:bg-[#8B6F47] hover:text-white text-xs gap-1.5"
                            onClick={() => navigate(`${createPageUrl("Library")}?song=${a.id}`)}
                          >
                            Abrir na Biblioteca
                          </Button>
                          {staleScore && (
                            <p className="text-xs text-amber-600 italic">⚠ Nota gravada no banco ({a.stored_score}) difere da auditoria atual ({a.score}) — rode o lote para atualizar.</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}