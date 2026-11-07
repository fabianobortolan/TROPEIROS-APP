import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ShieldCheck, ShieldAlert, AlertTriangle, AlertCircle, Info, CheckCircle2,
  Loader2, EyeOff, Eye, Save, GitCompare, X, LineChart, Target, CircleCheck
} from "lucide-react";
import { validarCifra, computeValidationScore, findDuplicateSongs } from "@/utils/cifraValidator";
import { isIssueIgnored, revalidateAndPersist } from "@/utils/revalidateAudit";

const SEV_GROUPS = [
  { key: 'alto', label: 'Críticos', icon: ShieldAlert, cls: 'border-red-200 bg-red-50', text: 'text-red-700', chip: 'bg-red-100 text-red-700 border-red-300' },
  { key: 'medio', label: 'Suspeitos', icon: AlertTriangle, cls: 'border-orange-200 bg-orange-50', text: 'text-orange-700', chip: 'bg-orange-100 text-orange-700 border-orange-300' },
  { key: 'baixo', label: 'Observações', icon: AlertCircle, cls: 'border-amber-200 bg-amber-50', text: 'text-amber-700', chip: 'bg-amber-100 text-amber-700 border-amber-300' },
];

const TYPE_LABELS = {
  acorde_invalido: "Grafia inválida",
  acorde_invalido_progressoes: "Acorde não reconhecido",
  enarmonico: "Enarmônicos misturados",
  tom_detectado: "Tom detectado difere do informado",
  tom_errado: "Tom principal provavelmente errado",
  modulacao: "Modulação não registrada",
  inconsistencia: "Seções repetidas divergentes",
  acorde_além_do_fim: "Acorde desalinhado da letra",
  acordes_colados: "Acordes colados na letra",
  secao_nao_marcada: "Seções sem marcação",
  intro_ausente: "Intro ausente",
  marcador_secao: "Marcador de seção malformado",
  chord_count: "Nº de acordes desatualizado",
  metadados: "Metadados faltando",
  custom_cifra_desatualizada: "Cifra da apostila desatualizada",
  original_key_incoerente: "Tom original incoerente",
  tonica_ausente: "Tônica ausente",
  duplicata: "Possível duplicata",
};

function ScoreGauge({ score, severity }) {
  const color = score >= 90 ? '#10B981' : score >= 70 ? '#F59E0B' : score >= 50 ? '#F97316' : '#EF4444';
  const r = 42, c = 2 * Math.PI * r;
  return (
    <div className="relative w-28 h-28 flex-shrink-0">
      <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#E8DCC4" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={c} strokeDashoffset={c - (c * score) / 100}
          strokeLinecap="round" className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-extrabold" style={{ color }}>{score}</span>
        <span className="text-[10px] font-semibold text-[#A68A64] uppercase tracking-wider">de 100</span>
      </div>
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
        <Badge variant="outline" className="bg-white text-[10px] uppercase font-bold">
          {severity === 'ok' ? 'ok' : severity}
        </Badge>
      </div>
    </div>
  );
}

export default function AuditPanel({ song, onGoToLine, onUpdated }) {
  const queryClient = useQueryClient();
  const [confirmFix, setConfirmFix] = useState(null); // { issue, kind, preview }
  const [ignoring, setIgnoring] = useState(null); // issue
  const [ignoreReason, setIgnoreReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [showIgnored, setShowIgnored] = useState(false);
  const [expandedDiff, setExpandedDiff] = useState({});

  const ignoredList = song.validation_ignored || [];

  // Auditoria ao vivo sobre o conteúdo atual da música
  const live = useMemo(() => validarCifra(song), [song]);

  // Duplicatas possíveis (mesmo título + artista) em todo o acervo
  const { data: sameTitlePage = {} } = useQuery({
    queryKey: ['song-duplicates', song.title],
    queryFn: () => base44.entities.Song.filter({ title: song.title }, { limit: 20, fields: ['title', 'artist'] }),
  });
  const sameTitle = sameTitlePage.items || [];
  const duplicateIssues = useMemo(() => {
    const pool = [...sameTitle, song].filter((s, i, arr) => arr.findIndex((x) => x.id === s.id) === i);
    const dups = findDuplicateSongs(pool);
    const related = dups.filter((g) => g.some((s) => s.id === song.id));
    if (!related.length) return [];
    return related.map((g) => ({
      type: 'duplicata', section: '(acervo)', line: null, severity: 'medio',
      message: `Possível duplicata: ${g.length} músicas com o mesmo título e artista: ${g.map((s) => `"${s.title}" (${s.id === song.id ? 'esta' : s.id})`).join(', ')}.`,
      detail: { ids: g.map((s) => s.id) },
    }));
  }, [sameTitle, song]);

  const allIssues = useMemo(() => {
    const merged = [...(live.issues || []), ...duplicateIssues];
    return merged.filter((i) => !isIssueIgnored(i, ignoredList));
  }, [live, duplicateIssues, ignoredList]);

  const score = computeValidationScore(allIssues);
  const severity = allIssues.length === 0 ? 'ok' : (live.severity !== 'ok' ? live.severity : 'atencao');
  const grouped = Object.fromEntries(SEV_GROUPS.map((g) => [g.key, allIssues.filter((i) => i.severity === g.key)]));

  const refreshAfterChange = async (songId) => {
    setBusy(true);
    try {
      const res = await revalidateAndPersist(songId);
      onUpdated && onUpdated({
        validation_severity: res.validation_severity,
        validation_issues: res.validation_issues,
        validation_score: res.validation_score,
        validation_date: res.validation_date,
        validation_main_key: res.validation_main_key,
        validation_foreign_ratio: res.validation_foreign_ratio,
      });
      queryClient.invalidateQueries({ queryKey: ['songs'] });
      return res;
    } finally {
      setBusy(false);
    }
  };

  const handleReaudit = async () => {
    const res = await refreshAfterChange(song.id);
    setFeedback({ ok: true, msg: `Reauditada — nota ${res?.validation_score ?? score}/100 gravada no banco.` });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleIgnore = async (issue) => {
    if (!ignoreReason.trim()) return;
    setBusy(true);
    try {
      const entry = {
        type: issue.type,
        line: issue.line ?? null,
        message: (issue.message || '').slice(0, 160),
        reason: ignoreReason.trim(),
        ignored_at: new Date().toISOString(),
        ignored_by: 'admin',
      };
      await base44.entities.Song.update(song.id, { validation_ignored: [...ignoredList, entry] });
      onUpdated && onUpdated({ validation_ignored: [...ignoredList, entry] });
      await refreshAfterChange(song.id);
      setIgnoring(null); setIgnoreReason("");
      setFeedback({ ok: true, msg: 'Alerta ignorado — não voltará a aparecer nas próximas auditorias.' });
      setTimeout(() => setFeedback(null), 4000);
    } finally {
      setBusy(false);
    }
  };

  const buildFixPreview = (issue) => {
    const s = issue.suggestion;
    if (!s) return null;
    if (s.kind === 'tom' || s.kind === 'modulacao') {
      return { title: 'Corrigir tom principal', before: song.main_key, after: s.main_key, action: { main_key: s.main_key } };
    }
    if (s.kind === 'update_field') {
      const before = s.field === 'chord_count' ? song.chord_count : song[s.field];
      return { title: `Atualizar "${s.field}"`, before: String(before ?? 'vazio'), after: String(s.value), action: { [s.field]: s.value } };
    }
    if (s.kind === 'replace_token') {
      const lines = String(song.cifra_text || '').split('\n');
      const lineText = lines[s.line - 1] ?? '';
      const fixedLine = lineText.includes(s.from) ? lineText.replace(s.from, s.to) : (lineText.trim() + ' → ' + s.to);
      return {
        title: `Corrigir linha ${s.line} da cifra`,
        before: lineText || '(linha vazia)',
        after: fixedLine,
        action: { cifra_text: lines.map((l, i) => (i === s.line - 1 ? fixedLine : l)).join('\n') },
      };
    }
    return null;
  };

  const applyFix = async () => {
    if (!confirmFix) return;
    setBusy(true);
    try {
      await base44.entities.Song.update(song.id, confirmFix.action);
      if (confirmFix.action.cifra_text) onUpdated && onUpdated({ cifra_text: confirmFix.action.cifra_text });
      if (confirmFix.action.main_key) onUpdated && onUpdated({ main_key: confirmFix.action.main_key });
      if (confirmFix.action.chord_count != null) onUpdated && onUpdated({ chord_count: confirmFix.action.chord_count });
      await refreshAfterChange(song.id);
      setConfirmFix(null);
      setFeedback({ ok: true, msg: 'Sugestão aplicada e auditoria regravada. A cifra só foi alterada porque você confirmou.' });
      setTimeout(() => setFeedback(null), 4000);
    } finally {
      setBusy(false);
    }
  };

  const toggleRevised = async () => {
    setBusy(true);
    try {
      const newValue = !song.is_fully_revised;
      await base44.entities.Song.update(song.id, { is_fully_revised: newValue });
      onUpdated && onUpdated({ is_fully_revised: newValue });
      queryClient.invalidateQueries({ queryKey: ['songs'] });
    } finally {
      setBusy(false);
    }
  };

  const ChordChips = ({ chords, others }) => {
    const otherSet = new Set(others || []);
    return (
      <div className="flex flex-wrap gap-1">
        {(chords || []).map((c, i) => {
          const onlyHere = !otherSet.has(c);
          return (
            <span
              key={i}
              className={`px-1.5 py-0.5 rounded text-xs font-mono font-bold ${onlyHere ? 'bg-red-100 text-red-700 ring-1 ring-red-300' : 'bg-[#F5F1E8] text-[#8B6F47]'}`}
              title={onlyHere ? 'Acorde diferente entre as ocorrências' : c}
            >
              {c}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Cabeçalho: nota + selo + ações */}
      <Card className="border-[#D4C5B0]">
        <CardContent className="p-4 flex flex-col md:flex-row items-center gap-4">
          <ScoreGauge score={score} severity={severity} />
          <div className="flex-1 w-full">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-[#8B6F47] text-lg flex items-center gap-2">
                {severity === 'ok' ? <ShieldCheck className="w-5 h-5 text-green-600" /> : <ShieldAlert className="w-5 h-5 text-red-500" />}
                Auditoria da Cifra
              </h3>
              <Badge className="bg-[#E8DCC4] text-[#8B6F47] text-xs">
                {allIssues.length === 0 ? 'Sem alertas' : `${allIssues.length} alerta(s)`}
              </Badge>
              {borrowingsCount(live) > 0 && (
                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                  {borrowingsCount(live)} empréstimo(s) comum(ns) — não são erros
                </Badge>
              )}
              {song.is_fully_revised && (
                <Badge className="bg-green-100 text-green-700 border-green-300 text-xs gap-1">
                  <CircleCheck className="w-3 h-3" /> Totalmente revisada
                </Badge>
              )}
            </div>
            <p className="text-xs text-[#A68A64] mt-1">
              {song.validation_date
                ? `Última auditoria salva: ${new Date(song.validation_date).toLocaleString('pt-BR')} • tom de referência: ${song.validation_main_key || '—'}`
                : 'Esta música ainda não tem auditoria gravada no banco.'}
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Button size="sm" onClick={handleReaudit} disabled={busy} className="bg-[#8B6F47] hover:bg-[#6B5437] text-white gap-1.5">
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Reauditar e salvar no banco
              </Button>
              <Button size="sm" variant="outline" onClick={toggleRevised} disabled={busy}
                className={`text-xs gap-1.5 ${song.is_fully_revised ? 'border-green-500 text-green-700 hover:bg-green-50' : 'border-[#8B6F47] text-[#8B6F47] hover:bg-[#8B6F47] hover:text-white'}`}>
                <CircleCheck className="w-3.5 h-3.5" />
                {song.is_fully_revised ? 'Desmarcar revisão' : 'Marcar como totalmente revisada'}
              </Button>
              {ignoredList.length > 0 && (
                <Button size="sm" variant="ghost" onClick={() => setShowIgnored(v => !v)} className="text-xs gap-1.5 text-[#A68A64]">
                  <Eye className="w-3.5 h-3.5" /> {showIgnored ? 'Ocultar' : 'Ver'} ignorados ({ignoredList.length})
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {feedback && (
        <Alert className={feedback.ok ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}>
          <AlertDescription className={feedback.ok ? 'text-green-700' : 'text-red-700'}>{feedback.msg}</AlertDescription>
        </Alert>
      )}

      {/* Empréstimos comuns (informativo, não é alerta) */}
      {borrowingsCount(live) > 0 && (
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="w-4 h-4 text-blue-600" />
          <AlertDescription className="text-blue-700 text-sm">
            <span className="font-semibold">Empréstimos comuns identificados:</span>{' '}
            {[...new Set(live.borrowings.map((b) => `${b.chord} (${b.label})`))].join(', ')}. Esses acordes são recursos harmônicos esperados e não contam como erro.
          </AlertDescription>
        </Alert>
      )}

      {/* Alertas agrupados por severidade */}
      {SEV_GROUPS.map((g) => {
        const list = grouped[g.key];
        if (!list.length) return null;
        const Icon = g.icon;
        return (
          <Card key={g.key} className={`${g.cls} border`}>
            <CardHeader className="pb-2">
              <CardTitle className={`text-sm uppercase tracking-wide flex items-center gap-2 ${g.text}`}>
                <Icon className="w-4 h-4" /> {g.label} ({list.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {list.map((iss, i) => (
                <div key={i} className="bg-white rounded-xl border border-[#E8DCC4] p-3">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <Badge className={`${g.chip} border text-[10px] font-bold`}>{TYPE_LABELS[iss.type] || iss.type}</Badge>
                        {iss.section && <span className="text-xs text-[#A68A64]">Seção: {iss.section}</span>}
                        {iss.line != null && (
                          <button
                            onClick={() => onGoToLine && onGoToLine(iss.line)}
                            className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#8B6F47] text-white font-bold hover:bg-[#6B5437] transition-colors"
                            title="Ir para a linha na cifra"
                          >
                            linha {iss.line} ↗
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-gray-700">{iss.message}</p>

                      {/* Seções divergentes lado a lado */}
                      {iss.type === 'inconsistencia' && iss.detail?.versions?.length === 2 && (
                        <div className="mt-2">
                          <button
                            onClick={() => setExpandedDiff(p => ({ ...p, [`${iss.type}-${i}`]: !p[`${iss.type}-${i}`] }))}
                            className="text-xs font-semibold text-[#8B6F47] flex items-center gap-1.5 hover:underline"
                          >
                            <GitCompare className="w-3.5 h-3.5" />
                            {expandedDiff[`${iss.type}-${i}`] ? 'Ocultar comparação' : 'Ver as duas versões'}
                          </button>
                          {expandedDiff[`${iss.type}-${i}`] && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                              {iss.detail.versions.map((v, vi) => (
                                <div key={vi} className="border border-[#E8DCC4] rounded-lg p-2 bg-[#F5F1E8]/50">
                                  <p className="text-xs font-bold text-[#8B6F47] mb-1">{v.section}{v.key ? ` (${v.key})` : ''}</p>
                                  <ChordChips
                                    chords={v.chords}
                                    others={iss.detail.versions[1 - vi]?.chords}
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Ações do alerta */}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {iss.suggestion && buildFixPreview(iss) && (
                          <Button
                            size="sm" variant="outline"
                            className="h-7 text-xs border-[#8B6F47] text-[#8B6F47] hover:bg-[#8B6F47] hover:text-white"
                            onClick={() => setConfirmFix({ issue: iss, ...buildFixPreview(iss) })}
                          >
                            Aplicar sugestão
                          </Button>
                        )}
                        <Button
                          size="sm" variant="ghost"
                          className="h-7 text-xs text-[#A68A64] hover:text-[#8B6F47]"
                          onClick={() => { setIgnoring(iss); setIgnoreReason(""); }}
                        >
                          <EyeOff className="w-3.5 h-3.5 mr-1" /> Ignorar (falso positivo)
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Formulário de motivo do ignore */}
                  {ignoring === iss && (
                    <div className="mt-2 p-2 bg-amber-50 rounded-lg border border-amber-200">
                      <p className="text-xs font-semibold text-[#8B6F47] mb-1">Motivo para ignorar (obrigatório):</p>
                      <Textarea
                        value={ignoreReason}
                        onChange={(e) => setIgnoreReason(e.target.value)}
                        placeholder="Ex: O artista realmente toca assim / variação intencional..."
                        className="text-xs h-14 border-[#D4C5B0] resize-none"
                      />
                      <div className="flex justify-end gap-2 mt-1">
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setIgnoring(null)}>Cancelar</Button>
                        <Button size="sm" disabled={!ignoreReason.trim() || busy} onClick={() => handleIgnore(iss)}
                          className="h-7 text-xs bg-[#8B6F47] text-white hover:bg-[#6B5437]">
                          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Confirmar ignorar'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}

      {allIssues.length === 0 && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <AlertDescription className="text-green-700">
            Nenhum problema detectado. Grafia, enarmônicos, tom, campo harmônico, seções, alinhamento, metadados e acervo em ordem.
          </AlertDescription>
        </Alert>
      )}

      {/* Lista de ignorados salvos */}
      {showIgnored && ignoredList.length > 0 && (
        <Card className="border-[#D4C5B0]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-[#A68A64] flex items-center gap-2"><EyeOff className="w-4 h-4" /> Alertas ignorados (falsos positivos)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {ignoredList.map((ig, i) => (
              <div key={i} className="text-xs text-gray-600 bg-[#F5F1E8]/60 rounded-lg p-2 flex items-start gap-2">
                <EyeOff className="w-3 h-3 mt-0.5 flex-shrink-0 text-[#A68A64]" />
                <div>
                  <span className="font-semibold">{TYPE_LABELS[ig.type] || ig.type}</span>
                  {ig.line != null && <span className="text-[#A68A64]"> (linha {ig.line})</span>}
                  {ig.reason && <span> — motivo: {ig.reason}</span>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Confirmação de correção (nunca automática) */}
      <Dialog open={!!confirmFix} onOpenChange={(o) => !o && setConfirmFix(null)}>
        <DialogContent className="max-w-lg bg-amber-50">
          <DialogHeader>
            <DialogTitle className="text-[#8B6F47] flex items-center gap-2"><Target className="w-5 h-5" /> {confirmFix?.title}</DialogTitle>
            <DialogDescription>Pré-visualize a alteração antes de confirmar. Nada é alterado sem a sua confirmação.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-bold text-[#A68A64] uppercase mb-1">Antes</p>
              <pre className="bg-white border border-red-200 rounded-lg p-2 text-xs font-mono whitespace-pre-wrap break-all text-red-800">{confirmFix?.before}</pre>
            </div>
            <div>
              <p className="text-xs font-bold text-[#A68A64] uppercase mb-1">Depois</p>
              <pre className="bg-white border border-green-200 rounded-lg p-2 text-xs font-mono whitespace-pre-wrap break-all text-green-800">{confirmFix?.after}</pre>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmFix(null)} className="border-[#D4C5B0] text-[#8B6F47]">Cancelar</Button>
            <Button onClick={applyFix} disabled={busy} className="bg-green-600 hover:bg-green-700 text-white gap-1.5">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Confirmar correção
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function borrowingsCount(live) {
  return live?.borrowings?.length || 0;
}