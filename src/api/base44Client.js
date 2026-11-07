// ============================================================================
// Adaptador Base44 → Supabase
// ----------------------------------------------------------------------------
// Este arquivo substitui o cliente do SDK do Base44 mantendo a MESMA interface
// (base44.entities.X.list/filter/get/create/update/delete/..., base44.auth.*,
// base44.integrations.Core.*, base44.functions.invoke, base44.appLogs.*).
// Assim as telas do app não precisam mudar: por dentro, tudo vai ao Supabase.
//
// Modelo no banco: cada entidade é uma tabela (nome em minúsculas) com
//   id, created_date, updated_date, created_by, created_by_id, data (jsonb)
// e os campos da entidade ficam dentro de "data". O adaptador "achata" o
// registro de volta ao formato do Base44: { ...data, id, created_date, ... }.
// ============================================================================
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

const BUCKET = 'arquivos';
const META_COLS = ['id', 'created_date', 'updated_date', 'created_by', 'created_by_id'];
const META_SET = new Set(META_COLS);
const SELECT_ALL = 'id,created_date,updated_date,created_by,created_by_id,data';
const MAX_ROWS = 1000;          // limite por requisição do Supabase (PostgREST)
const DEFAULT_PAGE_LIMIT = 100; // mesmo padrão do SDK para list(options)/filter(query, options)
const DEFAULT_SORT = '-created_date';

// ---------------------------------------------------------------------------
// Erros no mesmo formato do SDK (error.status, error.message, error.data)
// ---------------------------------------------------------------------------
export class Base44Error extends Error {
  constructor(message, status = 500, data = null) {
    super(message);
    this.name = 'Base44Error';
    this.status = status;
    this.data = data;
  }
}

function statusFrom(error) {
  if (!error) return 500;
  if (typeof error.status === 'number') return error.status;
  switch (error.code) {
    case 'PGRST116': case 'P0002': return 404;
    case '42501': return 403;
    case '22023': case '22P02': case 'PGRST100': return 400;
    case 'PGRST301': case 'PGRST302': return 401;
    default: return 500;
  }
}

function raise(error, context) {
  if (error instanceof Base44Error) throw error;
  const msg = error?.message || String(error);
  throw new Base44Error(context ? `${context}: ${msg}` : msg, statusFrom(error), error);
}

// ---------------------------------------------------------------------------
// Utilidades de registro
// ---------------------------------------------------------------------------
const tableOf = (entityName) => entityName.toLowerCase();

// Linha do banco → registro no formato do Base44
function flatten(row) {
  if (!row) return row;
  const { data, ...rest } = row;
  return { ...(data && typeof data === 'object' ? data : {}), ...rest };
}

// Registro do app → somente os campos de "data" (tira id, datas e autor)
function onlyData(record) {
  const out = {};
  for (const [k, v] of Object.entries(record || {})) {
    if (!META_SET.has(k) && v !== undefined) out[k] = v;
  }
  return out;
}

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const safeKey = (k) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(k);

function assertField(k) {
  if (!safeKey(k)) throw new Base44Error(`Campo inválido na consulta: ${k}`, 400);
}

// Coluna para comparação de texto
const textCol = (k) => (META_SET.has(k) ? k : `data->>${k}`);

const pgList = (arr) => `(${arr.map((v) => `"${String(v).replace(/"/g, '\\"')}"`).join(',')})`;

// ---------------------------------------------------------------------------
// Tradução das consultas no estilo Mongo usadas pelo Base44
// ---------------------------------------------------------------------------
function applyQuery(q, query) {
  if (!query) return q;
  for (const [key, cond] of Object.entries(query)) {
    if (key === '$or' || key === '$and' || key === '$nor') {
      throw new Base44Error(`Operador ${key} ainda não suportado pelo adaptador`, 400);
    }
    assertField(key);
    const meta = META_SET.has(key);

    if (isPlainObject(cond) && Object.keys(cond).some((k) => k.startsWith('$'))) {
      for (const [op, val] of Object.entries(cond)) {
        const col = textCol(key);
        switch (op) {
          case '$in':
            q = q.in(col, (val || []).map((v) => (meta ? v : String(v))));
            break;
          case '$nin':
            if (val?.length) q = q.not(col, 'in', pgList(val));
            break;
          case '$ne':
            q = val === null ? q.not(col, 'is', null) : q.or(`${col}.is.null,${col}.neq.${String(val)}`);
            break;
          case '$exists':
            q = val ? q.not(col, 'is', null) : q.is(col, null);
            break;
          case '$gt': case '$gte': case '$lt': case '$lte': {
            const fn = op.slice(1);
            // números: compara como número; textos/datas: compara como texto
            q = typeof val === 'number' && !meta
              ? q.filter(`data->${key}`, fn, val)
              : q[fn](col, val);
            break;
          }
          case '$regex': {
            const flags = cond.$options || '';
            const pattern = `*${String(val).replace(/[*%]/g, '')}*`;
            q = flags.includes('i') ? q.ilike(col, pattern) : q.like(col, pattern);
            break;
          }
          case '$options':
            break;
          default:
            throw new Base44Error(`Operador ${op} ainda não suportado pelo adaptador`, 400);
        }
      }
      continue;
    }

    if (cond === null || cond === undefined) {
      q = q.is(textCol(key), null);
    } else if (meta) {
      q = q.eq(key, cond);
    } else {
      // Igualdade por "contém" no jsonb (usa o índice GIN). Números comparam
      // pelo valor (3 = 3.0); textos, exatamente como no Base44.
      q = q.contains('data', { [key]: cond });
    }
  }
  return q;
}

// Ordenação: 'campo' ou '-campo'
function applySort(q, sort) {
  const s = sort || DEFAULT_SORT;
  for (const part of String(s).split(',').map((x) => x.trim()).filter(Boolean)) {
    const desc = part.startsWith('-');
    const field = part.replace(/^[-+]/, '');
    assertField(field);
    const col = META_SET.has(field) ? field : `data->${field}`;
    q = q.order(col, { ascending: !desc, nullsFirst: false });
  }
  // desempate estável para paginação
  return q.order('id', { ascending: true });
}

function selectFor(fields) {
  if (!fields) return SELECT_ALL;
  const list = (Array.isArray(fields) ? fields : String(fields).split(','))
    .map((f) => f.trim()).filter(Boolean);
  const cols = new Set(META_COLS);
  const parts = [...cols];
  for (const f of list) {
    if (cols.has(f)) continue;
    assertField(f);
    parts.push(`${f}:data->${f}`);
  }
  return parts.join(',');
}

async function fetchRange(table, { query, sort, fields, from, to }) {
  let q = supabase.from(table).select(selectFor(fields));
  q = applyQuery(q, query);
  q = applySort(q, sort);
  const { data, error } = await q.range(from, to);
  if (error) raise(error, `Erro ao ler ${table}`);
  return data.map(flatten);
}

// Lê [skip, skip+limit) — ou tudo, se limit não for informado — em blocos de 1000
async function readArray(table, { query, sort, limit, skip = 0, fields }) {
  const out = [];
  let from = Number(skip) || 0;
  const end = limit ? from + Number(limit) : Infinity;
  while (from < end) {
    const to = Math.min(from + MAX_ROWS, end) - 1;
    const rows = await fetchRange(table, { query, sort, fields, from, to });
    out.push(...rows);
    if (rows.length < to - from + 1) break;
    from = to + 1;
  }
  return out;
}

const encodeCursor = (n) => btoa(`o:${n}`);
const decodeCursor = (c) => {
  try { const s = atob(c); return s.startsWith('o:') ? Number(s.slice(2)) || 0 : 0; } catch { return 0; }
};

// Formato paginado do SDK: { items, next_cursor }
async function readPage(table, options, query) {
  if ('distinct' in options) {
    const field = options.distinct;
    assertField(field);
    const col = META_SET.has(field) ? field : `v:data->>${field}`;
    const values = new Set();
    let from = 0;
    for (;;) {
      let q = supabase.from(table).select(col);
      q = applyQuery(q, query).order('id').range(from, from + MAX_ROWS - 1);
      const { data, error } = await q;
      if (error) raise(error, `Erro ao ler ${table}`);
      for (const r of data) {
        const v = META_SET.has(field) ? r[field] : r.v;
        if (v !== null && v !== undefined && v !== '') values.add(v);
      }
      if (data.length < MAX_ROWS) break;
      from += MAX_ROWS;
    }
    return { items: [...values], next_cursor: null };
  }
  const limit = Number(options.limit) || DEFAULT_PAGE_LIMIT;
  const offset = options.cursor ? decodeCursor(options.cursor) : 0;
  const rows = await readArray(table, {
    query, sort: options.sort, fields: options.fields, skip: offset, limit: limit + 1,
  });
  const hasMore = rows.length > limit;
  return { items: hasMore ? rows.slice(0, limit) : rows, next_cursor: hasMore ? encodeCursor(offset + limit) : null };
}

const isPageOptions = (v) => typeof v === 'object' && v !== null;

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// ---------------------------------------------------------------------------
// Entidade genérica
// ---------------------------------------------------------------------------
function createEntityHandler(entityName) {
  const table = tableOf(entityName);
  return {
    async list(...args) {
      const [sort, limit, skip, fields] = args;
      return isPageOptions(sort)
        ? readPage(table, sort)
        : readArray(table, { sort, limit, skip, fields });
    },

    async filter(query, ...args) {
      const [sort, limit, skip, fields] = args;
      return isPageOptions(sort)
        ? readPage(table, sort, query)
        : readArray(table, { query, sort, limit, skip, fields });
    },

    async get(id) {
      const { data, error } = await supabase.from(table).select(SELECT_ALL).eq('id', id).maybeSingle();
      if (error) raise(error, `Erro ao ler ${entityName}`);
      if (!data) throw new Base44Error(`${entityName} ${id} não encontrado`, 404);
      return flatten(data);
    },

    async create(record) {
      const { data, error } = await supabase.from(table)
        .insert({ data: onlyData(record) }).select(SELECT_ALL).single();
      if (error) raise(error, `Erro ao criar ${entityName}`);
      return flatten(data);
    },

    async bulkCreate(records) {
      const out = [];
      for (const part of chunk(records || [], 500)) {
        const { data, error } = await supabase.from(table)
          .insert(part.map((r) => ({ data: onlyData(r) }))).select(SELECT_ALL);
        if (error) raise(error, `Erro ao criar ${entityName}`);
        out.push(...data.map(flatten));
      }
      return out;
    },

    // Como no Base44: mescla os campos informados com os existentes
    async update(id, patch) {
      const { data, error } = await supabase.rpc('entity_patch', {
        tbl: table, rec_id: id, patch: onlyData(patch),
      });
      if (error) raise(error, `Erro ao salvar ${entityName}`);
      return flatten(data);
    },

    // [{ id, ...campos }, ...]
    async bulkUpdate(rows) {
      let total = 0;
      for (const part of chunk(rows || [], 200)) {
        const { data, error } = await supabase.rpc('entity_bulk_patch', { tbl: table, rows: part });
        if (error) raise(error, `Erro ao salvar ${entityName}`);
        total += data || 0;
      }
      return { updated: total };
    },

    async delete(id) {
      const { data, error } = await supabase.from(table).delete().eq('id', id).select('id');
      if (error) raise(error, `Erro ao apagar ${entityName}`);
      if (!data.length) throw new Base44Error(`${entityName} ${id} não encontrado ou sem permissão`, 404);
      return { success: true, id };
    },

    async deleteMany(query) {
      let q = supabase.from(table).delete();
      q = query && Object.keys(query).length ? applyQuery(q, query) : q.not('id', 'is', null);
      const { data, error } = await q.select('id');
      if (error) raise(error, `Erro ao apagar ${entityName}`);
      return { success: true, deleted: data.length };
    },

    async count(query) {
      let q = supabase.from(table).select('id', { count: 'exact', head: true });
      q = applyQuery(q, query);
      const { count, error } = await q;
      if (error) raise(error, `Erro ao contar ${entityName}`);
      return count;
    },

    async updateMany() {
      throw new Base44Error('updateMany ainda não suportado pelo adaptador', 501);
    },

    // Tempo real não é usado pelo app; mantém a assinatura
    subscribe() {
      return () => {};
    },
  };
}

// ---------------------------------------------------------------------------
// Usuários (entidade User do Base44 → tabela profiles)
// ---------------------------------------------------------------------------
function flattenProfile(p) {
  if (!p) return p;
  const { data, ...rest } = p;
  return { ...(data || {}), ...rest, _app_role: rest.role };
}

const PROFILE_COLS = new Set(['full_name']);

async function currentSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) raise(error);
  return data.session;
}

async function readProfile(id) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
  if (error) raise(error, 'Erro ao ler o perfil');
  return data;
}

async function patchProfile(id, patch) {
  const atual = await readProfile(id);
  if (!atual) throw new Base44Error('Usuário não encontrado', 404);
  const cols = {};
  const extra = {};
  for (const [k, v] of Object.entries(patch || {})) {
    if (['id', 'email', 'created_date', 'updated_date', '_app_role'].includes(k)) continue;
    if (PROFILE_COLS.has(k) || k === 'role') cols[k] = v; else extra[k] = v;
  }
  const { data, error } = await supabase.from('profiles')
    .update({ ...cols, data: { ...(atual.data || {}), ...extra } })
    .eq('id', id).select('*').single();
  if (error) raise(error, 'Erro ao salvar o perfil');
  return flattenProfile(data);
}

const userEntity = {
  async list(sort) {
    const { data, error } = await supabase.from('profiles').select('*').order('created_date', { ascending: true });
    if (error) raise(error, 'Erro ao ler usuários');
    const items = data.map(flattenProfile);
    return isPageOptions(sort) ? { items, next_cursor: null } : items;
  },
  async filter(query, sort) {
    const all = await userEntity.list();
    const items = all.filter((u) => Object.entries(query || {}).every(([k, v]) => u[k] === v));
    return isPageOptions(sort) ? { items, next_cursor: null } : items;
  },
  async get(id) {
    const p = await readProfile(id);
    if (!p) throw new Base44Error('Usuário não encontrado', 404);
    return flattenProfile(p);
  },
  update: (id, patch) => patchProfile(id, patch),
  subscribe: () => () => {},
};

// ---------------------------------------------------------------------------
// Autenticação (Supabase Auth)
// ---------------------------------------------------------------------------
const LOGIN_PATH = '/login';

function goToLogin(nextUrl) {
  if (typeof window === 'undefined') return;
  const url = new URL(nextUrl || window.location.href, window.location.origin);
  const next = url.pathname + url.search + url.hash;
  if (url.pathname === LOGIN_PATH) return;
  window.location.assign(`${LOGIN_PATH}?next=${encodeURIComponent(next)}`);
}

const auth = {
  async me() {
    const session = await currentSession();
    if (!session) throw new Base44Error('Autenticação necessária', 401);
    const p = await readProfile(session.user.id);
    if (!p) throw new Base44Error('Usuário sem perfil cadastrado', 403, { extra_data: { reason: 'user_not_registered' } });
    return flattenProfile(p);
  },
  async updateMe(patch) {
    const session = await currentSession();
    if (!session) throw new Base44Error('Autenticação necessária', 401);
    return patchProfile(session.user.id, patch);
  },
  async isAuthenticated() {
    return !!(await currentSession());
  },
  redirectToLogin(nextUrl) {
    goToLogin(nextUrl);
  },
  async logout(redirectUrl) {
    await supabase.auth.signOut();
    goToLogin(redirectUrl || '/');
  },
  setToken() { /* não se aplica: a sessão é gerida pelo Supabase */ },
};

// ---------------------------------------------------------------------------
// Integrações (UploadFile direto no Storage; demais via Edge Function)
// ---------------------------------------------------------------------------
function safeFileName(name) {
  const base = (name || 'arquivo').normalize('NFD').replace(/[̀-ͯ]/g, '');
  return base.replace(/[^A-Za-z0-9._-]+/g, '_').replace(/_+/g, '_').slice(-120);
}

async function uploadFile({ file }) {
  if (!file) throw new Base44Error('Nenhum arquivo informado', 400);
  const now = new Date();
  const folder = `uploads/${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const rand = (crypto?.randomUUID?.() || Math.random().toString(36).slice(2)).replace(/-/g, '').slice(0, 9);
  const path = `${folder}/${rand}_${safeFileName(file.name)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || undefined, upsert: false, cacheControl: '31536000',
  });
  if (error) raise(error, 'Erro ao enviar o arquivo');
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { file_url: data.publicUrl };
}

async function invokeFunction(name, body) {
  const { data, error } = await supabase.functions.invoke(name, { body: body ?? {} });
  if (error) {
    let detail = error.message;
    try {
      const ctx = error.context;
      if (ctx && typeof ctx.json === 'function') {
        const j = await ctx.json();
        detail = j?.error || j?.message || detail;
      }
    } catch { /* mantém a mensagem original */ }
    throw new Base44Error(detail, error.context?.status || 500, error);
  }
  return data;
}

// Integrações do Base44 atendidas pela Edge Function "integracoes"
// (InvokeLLM, SendEmail, SendSMS, GenerateImage, ExtractDataFromUploadedFile)
async function callIntegration(endpoint, params) {
  if (typeof params === 'string') {
    throw new Base44Error(`Integration ${endpoint} must receive an object with named parameters`, 400);
  }
  const data = await invokeFunction('integracoes', { endpoint, params: params || {} });
  return data?.result !== undefined ? data.result : data;
}

const Core = new Proxy({}, {
  get(_t, endpoint) {
    if (typeof endpoint !== 'string' || endpoint === 'then' || endpoint.startsWith('_')) return undefined;
    if (endpoint === 'UploadFile') return uploadFile;
    return (params) => callIntegration(endpoint, params);
  },
});

const integrations = new Proxy({}, {
  get(_t, pkg) {
    if (pkg === 'Core') return Core;
    return undefined;
  },
});

// ---------------------------------------------------------------------------
// Cliente exportado com a mesma forma do SDK
// ---------------------------------------------------------------------------
export const base44 = {
  entities: new Proxy({}, {
    get(_t, name) {
      if (typeof name !== 'string' || name === 'then' || name.startsWith('_')) return undefined;
      if (name === 'User') return userEntity;
      return createEntityHandler(name);
    },
  }),
  auth,
  integrations,
  functions: {
    // As funções de servidor vindas do Base44 ficam reunidas na Edge Function
    // "funcoes". Mesmo formato de retorno do SDK (axios): { data, status }
    async invoke(functionName, data) {
      const result = await invokeFunction('funcoes', { funcao: functionName, dados: data ?? {} });
      return { data: result, status: 200 };
    },
  },
  appLogs: {
    async logUserInApp() { return null; },
  },
  supabase,
};

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
