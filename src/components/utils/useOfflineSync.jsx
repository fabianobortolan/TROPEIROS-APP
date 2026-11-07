/**
 * Hook React para carregar dados com fallback offline (IndexedDB)
 * e sincronizar progresso pendente ao reconectar.
 *
 * Uso:
 *   const { data, isOffline, pendingCount } = useOfflineSync('songs', fetchFn);
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  saveToLocal,
  readFromLocal,
  readPendingSync,
  removePendingSync,
} from "./useOfflineDB";

export function useOfflineSync(storeName, fetchFn, options = {}) {
  const { onSyncPending } = options;
  const [data, setData] = useState([]);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const hasFetched = useRef(false);
  // Espelha os dados carregados para saber se já existe conteúdo em tela.
  // Recarregamentos em segundo plano (ex: oscilação/reconexão de rede) NÃO
  // podem derrubar o que o usuário está vendo/editando.
  const dataRef = useRef([]);

  // Verifica pendentes no IndexedDB
  const checkPending = useCallback(async () => {
    const pending = await readPendingSync();
    setPendingCount(pending.length);
    return pending;
  }, []);

  // Tenta sincronizar pendentes com o servidor
  const syncPending = useCallback(async () => {
    if (!onSyncPending) return;
    const pending = await readPendingSync();
    if (pending.length === 0) return;

    setIsSyncing(true);
    for (const item of pending) {
      try {
        await onSyncPending(item);
        await removePendingSync(item.id);
      } catch {
        // Deixa para próxima tentativa
      }
    }
    setIsSyncing(false);
    setPendingCount(0);
  }, [onSyncPending]);

  // Carrega dados: tenta online primeiro, fallback para local
  const loadData = useCallback(async () => {
    // Só entra em "carregando" se ainda não há dados em tela;
    // senão o refresh acontece em segundo plano, sem fechar nada.
    setIsLoading(dataRef.current.length === 0);
    if (!navigator.onLine) {
      setIsOffline(true);
      const local = await readFromLocal(storeName);
      dataRef.current = local || [];
      setData(local);
      setIsLoading(false);
      return;
    }
    setIsOffline(false);
    try {
      const fresh = await fetchFn();
      dataRef.current = fresh || [];
      setData(fresh);
      if (fresh && fresh.length > 0) {
        await saveToLocal(storeName, fresh);
      }
      hasFetched.current = true;
      await syncPending();
    } catch {
      // Fallback para cache local
      const local = await readFromLocal(storeName);
      dataRef.current = local || [];
      setData(local);
      setIsOffline(true);
    } finally {
      setIsLoading(false);
    }
  }, [storeName, fetchFn, syncPending]);

  useEffect(() => {
    loadData();
    checkPending();
  }, [loadData, checkPending]);

  // Escuta eventos de conexão
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      loadData();
    };
    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [loadData]);

  return { data, isOffline, isSyncing, pendingCount, isLoading, reload: loadData };
}