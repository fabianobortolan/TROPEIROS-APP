import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, serverUrl, token, functionsVersion } = appParams;

//Create a client with authentication required
export const base44 = createClient({
  appId,
  serverUrl,
  token,
  functionsVersion,
  requiresAuth: false
});

// Busca TODAS as páginas de uma entidade (chamadas com limite fixo deixam registros de fora)
base44.fetchAllRecords = async (entityName, pageSize = 500) => {
  const entity = base44.entities[entityName];
  const items = [];
  let cursor;
  do {
    const page = await entity.filter({}, { sort: '-created_date', limit: pageSize, cursor });
    items.push(...page.items);
    cursor = page.next_cursor;
  } while (cursor);
  return items;
};

// Busca completa do repertório, com paginação em todas as páginas
base44.fetchAllSongs = () => base44.fetchAllRecords('Song');