import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ShieldAlert, ShieldCheck, AlertCircle } from "lucide-react";

const SEVERITY_CONFIG = {
  critico: {
    label: "Cifra crítica",
    className: "bg-red-100 text-red-700 border-red-300",
    Icon: ShieldAlert
  },
  suspeito: {
    label: "Cifra suspeita",
    className: "bg-orange-100 text-orange-700 border-orange-300",
    Icon: AlertTriangle
  },
  atencao: {
    label: "Atenção",
    className: "bg-amber-100 text-amber-700 border-amber-300",
    Icon: AlertCircle
  },
  ok: {
    label: "Cifra conferida",
    className: "bg-green-100 text-green-700 border-green-300",
    Icon: ShieldCheck
  }
};

// Selo visual do status de auditoria da cifra.
// `showOk` exibe também o selo verde quando a cifra passou na validação.
export default function CifraAlertBadge({ severity, issues, showOk = false, compact = false }) {
  if (!severity) return null;
  if (severity === 'ok' && !showOk) return null;
  const cfg = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.atencao;
  const Icon = cfg.Icon;
  const count = Array.isArray(issues) ? issues.length : 0;
  const title =
    severity === 'ok'
      ? 'Cifra validada: seções consistentes e acordes dentro do campo harmônico.'
      : count > 0
        ? `${cfg.label}: ${count} alerta(s) encontrados — abra Informações para ver.`
        : cfg.label;

  return (
    <Badge
      variant="outline"
      className={`${cfg.className} border text-xs font-semibold gap-1 ${compact ? 'px-1.5 py-0.5' : 'px-2 py-1'}`}
      title={title}
    >
      <Icon className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} flex-shrink-0`} />
      {cfg.label}
      {count > 0 && severity !== 'ok' && (
        <span className="ml-0.5 px-1 rounded-full bg-white/70 font-bold">{count}</span>
      )}
    </Badge>
  );
}