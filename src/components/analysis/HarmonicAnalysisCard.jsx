import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Waves, Music2, Clock, Guitar, Activity, KeyRound, BarChart3 } from "lucide-react";

const GENRE_LABELS = {
  sertanejo_raiz: "Sertanejo Raiz",
  sertanejo_universitario: "Sertanejo Universitário",
  sertanejo_romantico: "Sertanejo Romântico",
  sertanejo_moderno: "Sertanejo Moderno",
  sertanejo_modao: "Sertanejo Modão",
  pop_rock: "Pop/Rock",
  religioso: "Religioso"
};

const SEVERITY = {
  ok: { label: "OK", className: "bg-[#9CAF88] text-white" },
  atencao: { label: "Atenção", className: "bg-yellow-500 text-white" },
  suspeito: { label: "Suspeito", className: "bg-orange-500 text-white" },
  critico: { label: "Crítico", className: "bg-red-500 text-white" }
};

function Field({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2 bg-[#F5F1E8]/60 rounded-lg p-3 border border-[#D4C5B0]">
      <Icon className="w-4 h-4 text-[#A68A64] mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-[#A68A64] font-medium">{label}</p>
        <p className="text-sm text-[#8B6F47] font-semibold break-words">{value || "—"}</p>
      </div>
    </div>
  );
}

export default function HarmonicAnalysisCard({ song }) {
  const progressions = song.progressions || [];
  const severity = SEVERITY[song.validation_severity] || SEVERITY.ok;

  return (
    <Card className="border-[#D4C5B0] bg-white/80 backdrop-blur-sm">
      <CardHeader className="border-b border-[#D4C5B0]">
        <CardTitle className="text-[#8B6F47] flex items-center gap-2">
          <Waves className="w-5 h-5" />
          Análise Harmônica
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-5">
        {/* Dados principais */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Field icon={KeyRound} label="Tonalidade" value={song.main_key} />
          <Field icon={KeyRound} label="Tonalidade original" value={song.original_key} />
          <Field icon={Music2} label="Ritmo" value={song.rhythm_name} />
          <Field icon={Clock} label="BPM" value={song.tempo} />
          <Field icon={Guitar} label="Compasso" value={song.beats_per_measure ? `${song.beats_per_measure}/4` : null} />
          <Field icon={BarChart3} label="Gênero" value={GENRE_LABELS[song.genre_style] || song.genre_style} />
        </div>

        {/* Progressão predominante */}
        {(song.predominant_progression || song.predominant_progression_pattern) && (
          <div className="bg-gradient-to-r from-[#9CAF88]/10 to-[#D4AF37]/10 rounded-lg p-4 border border-[#D4C5B0]">
            <p className="text-xs text-[#A68A64] font-medium mb-1">Progressão predominante</p>
            <div className="flex items-center gap-2 flex-wrap">
              {song.predominant_progression && (
                <Badge className="bg-[#8B6F47] text-white">{song.predominant_progression}</Badge>
              )}
              {song.predominant_progression_pattern && (
                <span className="text-sm text-[#8B6F47] font-mono">{song.predominant_progression_pattern}</span>
              )}
            </div>
          </div>
        )}

        {/* Contagem e auditoria */}
        <div className="flex items-center gap-3 flex-wrap">
          {typeof song.chord_count === "number" && (
            <Badge variant="outline" className="border-[#D4C5B0] text-[#8B6F47]">
              <Activity className="w-3 h-3 mr-1" />
              {song.chord_count} acordes únicos
            </Badge>
          )}
          {typeof song.validation_score === "number" && (
            <Badge variant="outline" className="border-[#D4C5B0] text-[#8B6F47]">
              Auditoria: {song.validation_score}/100
            </Badge>
          )}
          <Badge className={severity.className}>Status: {severity.label}</Badge>
        </div>

        {/* Progressões por seção */}
        {progressions.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-[#8B6F47]">Progressões por seção</p>
            <div className="space-y-2">
              {progressions.map((p, i) => (
                <div key={i} className="bg-[#F5F1E8]/60 rounded-lg p-3 border border-[#D4C5B0]">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge className="bg-[#8B6F47] text-white">{p.section || "Seção"}</Badge>
                    {p.progression_name && (
                      <span className="text-xs text-[#A68A64]">{p.progression_name}</span>
                    )}
                    {p.key && (
                      <span className="text-xs text-[#A68A64]">· Tom: {p.key}</span>
                    )}
                    {p.modulated_key && p.modulated_key !== p.key && (
                      <span className="text-xs text-[#D4AF37]">→ modulação: {p.modulated_key}</span>
                    )}
                  </div>
                  {p.chords && p.chords.length > 0 && (
                    <p className="text-sm text-[#8B6F47] font-mono break-words">{p.chords.join("  ")}</p>
                  )}
                  {p.pattern && (
                    <p className="text-xs text-[#A68A64] font-mono mt-1">Padrão: {p.pattern}</p>
                  )}
                  {p.notes && (
                    <p className="text-xs text-[#A68A64] mt-1 italic">{p.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}