import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Music2, Music4, Clock, Guitar, User, Calendar, FileText, Zap, Tag, BookOpen, AlertTriangle, ShieldCheck } from "lucide-react";
import CifraAlertBadge from "./CifraAlertBadge";

const genreLabels = {
  sertanejo_raiz: "Sertanejo Raiz",
  sertanejo_universitario: "Sertanejo Universitário",
  sertanejo_romantico: "Sertanejo Romântico",
  sertanejo_moderno: "Sertanejo Moderno",
  sertanejo_modao: "Sertanejo Modão",
  pop_rock: "Pop/Rock",
  mpb: "MPB",
  samba: "Samba",
  forro: "Forró",
  religioso: "Religioso",
};

function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2 border-b border-[#D4C5B0]/40 last:border-0">
      <Icon className="w-4 h-4 text-[#8B6F47] mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-[#A68A64] font-medium uppercase tracking-wide">{label}</p>
        <p className="text-sm text-[#5C3D20] font-medium mt-0.5 whitespace-pre-wrap">{value}</p>
      </div>
    </div>
  );
}

export default function SongInfoModal({ song, open, onClose }) {
  if (!song) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto border-[#D4C5B0]">
        <DialogHeader className="border-b border-[#D4C5B0]/50 pb-4">
          <DialogTitle className="text-[#8B6F47] font-bold text-xl uppercase tracking-wide">
            {song.title}
          </DialogTitle>
          <p className="text-[#A68A64] text-sm flex items-center gap-2">
            <Music2 className="w-4 h-4" />
            {song.artist}
          </p>
        </DialogHeader>

        {song.validation_severity && song.validation_severity !== 'ok' && (
          <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <p className="text-sm font-bold text-red-700 uppercase tracking-wide">Auditoria de Cifra</p>
              <CifraAlertBadge severity={song.validation_severity} issues={song.validation_issues} />
            </div>
            <ul className="space-y-1.5">
              {(song.validation_issues || []).map((iss, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-red-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                  <span>{iss.message}</span>
                </li>
              ))}
            </ul>
            {song.validation_date && (
              <p className="text-xs text-red-500 mt-2">Auditada em {new Date(song.validation_date).toLocaleString('pt-BR')}</p>
            )}
          </div>
        )}

        {song.validation_severity === 'ok' && (
          <div className="mt-2 rounded-lg border border-green-200 bg-green-50 p-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-green-600 flex-shrink-0" />
            <p className="text-sm text-green-700 font-medium">Cifra conferida: seções consistentes e acordes dentro do campo harmônico.</p>
          </div>
        )}

        <div className="space-y-1 pt-2">
          <InfoRow icon={User} label="Compositor / Autor" value={song.author} />
          <InfoRow icon={Calendar} label="Ano de Lançamento" value={song.year ? String(song.year) : null} />
          <InfoRow icon={Guitar} label="Tom Atual" value={song.main_key} />
          <InfoRow icon={Guitar} label="Tom Original" value={song.original_key} />
          <InfoRow icon={Zap} label="BPM (Andamento)" value={song.tempo ? `${song.tempo} BPM` : null} />
          <InfoRow icon={Clock} label="Duração" value={song.duration} />
          <InfoRow icon={Music4} label="Ritmo" value={song.rhythm_name} />
          <InfoRow icon={Tag} label="Estilo Musical" value={genreLabels[song.genre_style]} />

          {song.general_notes && (
            <div className="pt-2">
              <div className="flex items-start gap-3 py-2">
                <BookOpen className="w-4 h-4 text-[#8B6F47] mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-[#A68A64] font-medium uppercase tracking-wide mb-2">Observações Gerais</p>
                  <div className="bg-[#F5F1E8] rounded-lg p-3 text-sm text-[#5C3D20] leading-relaxed whitespace-pre-wrap border border-[#D4C5B0]/50">
                    {song.general_notes}
                  </div>
                </div>
              </div>
            </div>
          )}

          {song.manual_notes && (
            <div className="pt-1">
              <div className="flex items-start gap-3 py-2">
                <FileText className="w-4 h-4 text-[#8B6F47] mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-[#A68A64] font-medium uppercase tracking-wide mb-2">Notas Manuais</p>
                  <div className="bg-[#F5F1E8] rounded-lg p-3 text-sm text-[#5C3D20] leading-relaxed whitespace-pre-wrap border border-[#D4C5B0]/50">
                    {song.manual_notes}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Progressão predominante */}
          {song.predominant_progression && (
            <div className="pt-2 border-t border-[#D4C5B0]/40">
              <p className="text-xs text-[#A68A64] font-medium uppercase tracking-wide mb-2">Progressão Predominante</p>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-gradient-to-r from-[#8B6F47] to-[#A68A64] text-white text-sm px-3 py-1">
                  {song.predominant_progression}
                </Badge>
                {song.predominant_progression_pattern && (
                  <Badge variant="outline" className="border-[#8B6F47] text-[#8B6F47] text-sm px-3 py-1">
                    {song.predominant_progression_pattern}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}