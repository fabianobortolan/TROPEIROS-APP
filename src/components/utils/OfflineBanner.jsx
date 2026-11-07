import { WifiOff, RefreshCw, CheckCircle2 } from "lucide-react";

/**
 * Banner exibido quando o usuário está offline ou há sincronização pendente.
 */
export default function OfflineBanner({ isOffline, isSyncing, pendingCount }) {
  if (!isOffline && !isSyncing && pendingCount === 0) return null;

  if (isSyncing) {
    return (
      <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl px-4 py-3 mb-4 text-sm">
        <RefreshCw className="w-4 h-4 animate-spin flex-shrink-0" />
        <span>Sincronizando progresso salvo offline...</span>
      </div>
    );
  }

  if (isOffline) {
    return (
      <div className="flex items-center gap-2 bg-amber-50 border border-amber-300 text-amber-800 rounded-xl px-4 py-3 mb-4 text-sm">
        <WifiOff className="w-4 h-4 flex-shrink-0" />
        <span>
          Você está <strong>offline</strong>. Exibindo dados salvos localmente.
          {pendingCount > 0 && (
            <> &nbsp;·&nbsp; <strong>{pendingCount}</strong> atualização{pendingCount > 1 ? "ões" : ""} pendente{pendingCount > 1 ? "s" : ""} para sincronizar.</>
          )}
        </span>
      </div>
    );
  }

  if (pendingCount > 0) {
    return (
      <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 rounded-xl px-4 py-3 mb-4 text-sm">
        <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
        <span>Conectado! Sincronizando <strong>{pendingCount}</strong> atualização{pendingCount > 1 ? "ões" : ""} pendente{pendingCount > 1 ? "s" : ""}...</span>
      </div>
    );
  }

  return null;
}