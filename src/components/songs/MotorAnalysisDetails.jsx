import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Wand2, AlertTriangle, ArrowDown, ArrowUp } from "lucide-react";
import { analisarComMotor } from "@/utils/motorReanalysis";

// Cores por função harmônica (campo "func" gerado pelo motor)
const PREP = "bg-orange-100 text-orange-800 border-orange-300";
const FUNC_STYLE = {
  Dsec: PREP, DsecDec: PREP, SubV: PREP, iiSec: PREP, dimPass: PREP, dimDesc: PREP, dimAux: PREP,
  emp: "bg-purple-100 text-purple-800 border-purple-300",
  crom: "bg-gray-100 text-gray-600 border-gray-300",
};

const uniq = (arr) => [...new Set(arr)];

// Detalhes da análise do motor para UMA seção (graus coloridos, preparações, linhas, cadências)
export function MotorSectionDetails({ prog }) {
  if (!prog || !Array.isArray(prog.degrees) || prog.degrees.length === 0) return null;
  const funcs = Array.isArray(prog.functions) ? prog.functions : [];
  const preps = Array.isArray(prog.preparations) ? prog.preparations : [];
  const lines = Array.isArray(prog.lines) ? prog.lines : [];
  const cads = Array.isArray(prog.cadences) ? prog.cadences : [];
  const borrowed = Array.isArray(prog.borrowed) ? prog.borrowed : [];

  return (
    <div className="px-4 py-2 border-t border-[#D4C5B0]/50 bg-white/60 space-y-1.5">
      <div className="flex flex-wrap items-center gap-1">
        <span className="text-[10px] font-semibold text-[#A39682] uppercase tracking-wide mr-0.5">Graus:</span>
        {prog.degrees.map((d, i) => {
          const f = funcs[i]?.func;
          return (
            <span
              key={i}
              title={funcs[i]?.role || ""}
              className={`px-1.5 py-0.5 rounded border text-[11px] font-mono font-semibold ${FUNC_STYLE[f] || "bg-[#F5F1E8] text-[#6B5437] border-[#D4C5B0]"}`}
            >
              {d}
            </span>
          );
        })}
      </div>

      {preps.length > 0 && (
        <div className="text-xs text-orange-800">
          <span className="font-semibold">🎯 Preparações: </span>
          {uniq(preps.map((p) => p.text)).join(" · ")}
        </div>
      )}
      {borrowed.length > 0 && (
        <div className="text-xs text-purple-800">
          <span className="font-semibold">🎨 Empréstimos: </span>
          {uniq(borrowed.map((b) => `${b.chord} (${b.degree})`)).join(", ")}
        </div>
      )}
      {lines.length > 0 && (
        <div className="text-xs text-[#6B5437] space-y-0.5">
          {uniq(lines.map((l) => (l.type === "caída" ? "D" : "U") + l.text)).map((k, i) => (
            <div key={i} className="flex items-start gap-1">
              {k[0] === "D" ? <ArrowDown className="w-3 h-3 mt-0.5 text-sky-600" /> : <ArrowUp className="w-3 h-3 mt-0.5 text-emerald-600" />}
              <span>{k.slice(1)}</span>
            </div>
          ))}
        </div>
      )}
      {cads.length > 0 && (
        <div className="text-[11px] text-[#A68A64]">
          <span className="font-semibold">Cadências: </span>
          {uniq(cads.map((c) => c.type)).map((t) => `${t} (${cads.filter((c) => c.type === t).length})`).join(", ")}
        </div>
      )}
    </div>
  );
}

// Aviso de tom + botão "Reanalisar progressões" (admin) para a música inteira
export function MotorSongHeader({ song, onUpdated }) {
  const queryClient = useQueryClient();
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState(null);
  const { data: currentUser } = useQuery({ queryKey: ["currentUser"], queryFn: () => base44.auth.me() });
  const isAdmin = currentUser?.role === "admin";
  const warnings = Array.isArray(song?.analysis_warnings) ? song.analysis_warnings : [];

  const run = async () => {
    if (!song?.id) return;
    setRunning(true);
    setMsg(null);
    try {
      const registros = await base44.entities.Progression.list();
      const r = analisarComMotor(song, registros);
      if (r.skipped) { setMsg(r.reason); return; }
      await base44.entities.Song.update(song.id, r.updates);
      queryClient.invalidateQueries({ queryKey: ["songs"] });
      setMsg("Progressões reanalisadas. Feche e reabra a música para ver o resultado.");
      if (onUpdated) onUpdated(r.updates);
    } catch (e) {
      setMsg("Erro: " + (e?.message || e));
    } finally {
      setRunning(false);
    }
  };

  if (!isAdmin && warnings.length === 0) return null;
  return (
    <div className="space-y-2 mb-2">
      {warnings.length > 0 && (
        <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-300 rounded-lg px-3 py-2 text-xs text-yellow-800">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>{warnings.map((w, i) => <div key={i}>{w}</div>)}</div>
        </div>
      )}
      {isAdmin && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={run}
            disabled={running}
            className="flex items-center gap-1 text-xs font-semibold text-white bg-[#8B6F47] hover:bg-[#6B5437] px-3 py-1.5 rounded-lg disabled:opacity-60"
            title="Reanalisa as progressões desta música com o Motor Harmônico (sem IA)"
          >
            {running ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
            Reanalisar progressões
          </button>
          {song?.analysis_engine && (
            <span className="text-[10px] text-[#A68A64]">
              {song.analysis_engine}{song.analysis_date ? ` · ${new Date(song.analysis_date).toLocaleDateString("pt-BR")}` : ""}
            </span>
          )}
          {msg && <span className="text-xs text-[#6B5437]">{msg}</span>}
        </div>
      )}
    </div>
  );
}
