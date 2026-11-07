import { QueryClient } from '@tanstack/react-query';

export const queryClientInstance = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      // Executa queries mesmo offline (não bloqueia a página)
      networkMode: 'offlineFirst',
      // Não tenta novamente — falha rápido offline
      retry: 0,
      // Não propaga erro para o React (evita crash de página)
      throwOnError: false,
      // Dados ficam válidos por 5 min (reduz re-fetches desnecessários)
      staleTime: 5 * 60 * 1000,
    },
    mutations: {
      networkMode: 'offlineFirst',
    },
  },
});