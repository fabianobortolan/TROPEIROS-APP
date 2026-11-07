import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Hook centralizado de visibilidade.
 * Todos os usuários autenticados veem todos os dados.
 * (Progressões, acordes, ritmos, estilos são dados compartilhados do sistema)
 */
export function useVisibleData(entityName, queryOptions = {}) {
  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const sort = queryOptions.sort || '-created_date';
  const { sort: _omit, ...restQueryOptions } = queryOptions;

  const { data: rawData = [], ...rest } = useQuery({
    queryKey: [entityName],
    queryFn: () => base44.entities[entityName].list(sort),
    initialData: [],
    // Busca dados sempre que autenticado, sem bloquear na ausência do currentUser
    enabled: true,
    staleTime: 0,
    ...restQueryOptions,
  });

  return { data: rawData, currentUser, adminEmails: new Set(), ...rest };
}