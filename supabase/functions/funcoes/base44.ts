// =============================================================================
// "Mini-SDK" de servidor: imita o createClientFromRequest do Base44 sobre o
// Supabase, para as funções do Base44 rodarem quase sem mudanças.
//   base44.auth.me()                    → perfil do usuário logado (ou null)
//   base44.entities.X                   → acesso COM as regras do usuário (RLS)
//   base44.asServiceRole.entities.X     → acesso de servidor (ignora RLS)
//   base44.asServiceRole.integrations.Core.InvokeLLM → Edge Function "integracoes"
// =============================================================================
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

const URL_SB = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const META = new Set(["id", "created_date", "updated_date", "created_by", "created_by_id"]);
const SELECT_ALL = "id,created_date,updated_date,created_by,created_by_id,data";
const MAX = 1000;

// deno-lint-ignore no-explicit-any
type Rec = Record<string, any>;

const flatten = (r: Rec | null) => (r ? { ...(r.data ?? {}), ...Object.fromEntries(Object.entries(r).filter(([k]) => k !== "data")) } : r);
const soDados = (r: Rec = {}) => Object.fromEntries(Object.entries(r).filter(([k, v]) => !META.has(k) && v !== undefined));
const campoOk = (k: string) => { if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(k)) throw new Error(`Campo inválido: ${k}`); return k; };

// deno-lint-ignore no-explicit-any
function aplicaFiltro(q: any, query?: Rec | null) {
  for (const [k, v] of Object.entries(query ?? {})) {
    campoOk(k);
    if (v && typeof v === "object" && !Array.isArray(v) && "$in" in v) {
      q = META.has(k) ? q.in(k, v.$in) : q.in(`data->>${k}`, (v.$in as unknown[]).map(String));
    } else if (v === null) {
      q = q.is(META.has(k) ? k : `data->>${k}`, null);
    } else {
      q = META.has(k) ? q.eq(k, v) : q.contains("data", { [k]: v });
    }
  }
  return q;
}

// deno-lint-ignore no-explicit-any
function aplicaOrdem(q: any, sort?: string | null) {
  const s = sort || "-created_date";
  const desc = s.startsWith("-");
  const f = campoOk(s.replace(/^[-+]/, ""));
  return q.order(META.has(f) ? f : `data->${f}`, { ascending: !desc, nullsFirst: false }).order("id");
}

function entidade(sb: SupabaseClient, nome: string, autor?: { email?: string; id?: string }, servidor = false) {
  const t = nome.toLowerCase();
  const ler = async (query?: Rec | null, sort?: string | null, limit?: number | null) => {
    const out: Rec[] = [];
    let de = 0;
    const fim = limit ? Number(limit) : Infinity;
    while (de < fim) {
      const ate = Math.min(de + MAX, fim) - 1;
      const { data, error } = await aplicaOrdem(aplicaFiltro(sb.from(t).select(SELECT_ALL), query), sort).range(de, ate);
      if (error) throw new Error(`Erro ao ler ${nome}: ${error.message}`);
      out.push(...data.map(flatten));
      if (data.length < ate - de + 1) break;
      de = ate + 1;
    }
    return out;
  };
  // Pelo servidor (service_role) o banco não sabe quem é o autor: preenche aqui
  const carimbo = () => (servidor && autor?.email ? { created_by: autor.email, created_by_id: autor.id } : {});
  return {
    list: (sort?: string | null, limit?: number | null) => ler(null, sort, limit),
    filter: (query: Rec, sort?: string | null, limit?: number | null) => ler(query, sort, limit),
    async get(id: string) {
      const { data, error } = await sb.from(t).select(SELECT_ALL).eq("id", id).maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) throw new Error(`${nome} ${id} não encontrado`);
      return flatten(data);
    },
    async create(rec: Rec) {
      const { data, error } = await sb.from(t).insert({ data: soDados(rec), ...carimbo() }).select(SELECT_ALL).single();
      if (error) throw new Error(`Erro ao criar ${nome}: ${error.message}`);
      return flatten(data);
    },
    async bulkCreate(recs: Rec[]) {
      if (!recs?.length) return [];
      const { data, error } = await sb.from(t).insert(recs.map((r) => ({ data: soDados(r), ...carimbo() }))).select(SELECT_ALL);
      if (error) throw new Error(`Erro ao criar ${nome}: ${error.message}`);
      return data.map(flatten);
    },
    async update(id: string, patch: Rec) {
      const { data, error } = await sb.rpc("entity_patch", { tbl: t, rec_id: id, patch: soDados(patch) });
      if (error) throw new Error(`Erro ao salvar ${nome}: ${error.message}`);
      if (servidor) await sb.from(t).update({ updated_date: new Date().toISOString() }).eq("id", id);
      return flatten(data);
    },
    async delete(id: string) {
      const { error } = await sb.from(t).delete().eq("id", id);
      if (error) throw new Error(`Erro ao apagar ${nome}: ${error.message}`);
      return { success: true, id };
    },
  };
}

// ---------------------------------------------------------------------------
// IA direta (mesmas regras da função "integracoes": modelo, esquema ajustado)
// ---------------------------------------------------------------------------
const MODELO_PADRAO = "claude-sonnet-5-5";
const MODELO_RAPIDO = "claude-haiku-5-5";
const SISTEMA = "Você é o assistente do app Tropeiros do Bebedouro (biblioteca de músicas e escola de viola caipira e violão). Responda em português do Brasil, salvo quando o pedido disser outra coisa.";
const CHAVES_ESQUEMA = new Set(["type", "properties", "items", "enum", "const", "required", "description", "anyOf", "allOf"]);

// deno-lint-ignore no-explicit-any
function ajustaEsquema(s: any): any {
  if (Array.isArray(s)) return s.map(ajustaEsquema);
  if (!s || typeof s !== "object") return s;
  // deno-lint-ignore no-explicit-any
  const out: any = {};
  for (const [k, v] of Object.entries(s)) if (CHAVES_ESQUEMA.has(k)) out[k] = v;
  if (out.properties) out.properties = Object.fromEntries(Object.entries(out.properties).map(([k, v]) => [k, ajustaEsquema(v)]));
  // Todos os campos obrigatórios: com campos opcionais a resposta fica muito lenta (ou é recusada)
  if (out.type === "object" || out.properties) { out.properties = out.properties ?? {}; out.additionalProperties = false; out.required = Object.keys(out.properties); }
  if (out.items) out.items = ajustaEsquema(out.items);
  for (const k of ["anyOf", "allOf"]) if (out[k]) out[k] = ajustaEsquema(out[k]);
  return out;
}

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function claudeDireto(p: Rec) {
  const chave = Deno.env.get("ANTHROPIC_API_KEY");
  if (!chave) throw new Error("A chave da IA (ANTHROPIC_API_KEY) não está configurada no Supabase.");
  const model = p.model && /flash|haiku|mini|lite/i.test(p.model) ? MODELO_RAPIDO : MODELO_PADRAO;
  const corpo: Rec = { model, max_tokens: 16000, system: SISTEMA, messages: [{ role: "user", content: p.prompt }] };
  if (p.response_json_schema) {
    corpo.output_config = { effort: "medium", format: { type: "json_schema", schema: ajustaEsquema(p.response_json_schema) } };
    if (model === MODELO_PADRAO) corpo.thinking = { type: "between_tools" };
  }
  for (let tentativa = 1; ; tentativa++) {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": chave, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify(corpo),
    });
    const j = await r.json().catch(() => ({}));
    if ((r.status === 429 || r.status === 529 || r.status >= 500) && tentativa < 4) { await espera(3000 * tentativa); continue; }
    if (!r.ok) throw new Error(`IA: ${j?.error?.message || `erro ${r.status}`}`);
    if (j.stop_reason === "max_tokens") throw new Error("A resposta da IA ficou longa demais e foi cortada.");
    // deno-lint-ignore no-explicit-any
    const texto = (j.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
    return p.response_json_schema ? JSON.parse(texto) : texto;
  }
}

// Fila: no máximo 6 pedidos à IA ao mesmo tempo
let emAndamento = 0;
const aguardando: Array<() => void> = [];
async function naFila<T>(fn: () => Promise<T>): Promise<T> {
  if (emAndamento >= 6) await new Promise<void>((ok) => aguardando.push(ok));
  emAndamento++;
  try { return await fn(); } finally { emAndamento--; aguardando.shift()?.(); }
}

function proxyEntidades(sb: SupabaseClient, autor: () => { email?: string; id?: string } | undefined, servidor: boolean) {
  return new Proxy({}, {
    get: (_t, nome) => (typeof nome === "string" && nome !== "then" ? entidade(sb, nome, autor(), servidor) : undefined),
  // deno-lint-ignore no-explicit-any
  }) as Record<string, any>;
}

export function createClientFromRequest(req: Request) {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const opcoes = { auth: { persistSession: false, autoRefreshToken: false } };
  const doUsuario = createClient(URL_SB, ANON, { ...opcoes, global: { headers: { Authorization: authHeader } } });
  const doServidor = createClient(URL_SB, SERVICE, opcoes);
  let usuario: Rec | null | undefined;

  const me = async () => {
    if (usuario !== undefined) return usuario;
    usuario = null;
    if (!token) return null;
    const { data, error } = await doServidor.auth.getUser(token);
    if (error || !data?.user) return null;
    const { data: p } = await doServidor.from("profiles").select("*").eq("id", data.user.id).maybeSingle();
    if (!p) return null;
    usuario = { ...(p.data ?? {}), id: p.id, email: p.email, full_name: p.full_name, role: p.role, created_date: p.created_date };
    return usuario;
  };

  // Pedidos simples (texto + esquema) vão direto à Anthropic, no máximo 6 por vez.
  // Pedidos com arquivos ou pesquisa na internet usam a Edge Function "integracoes".
  const invokeLLM = async (params: Rec) => {
    if (!params?.file_urls?.length && !params?.add_context_from_internet) {
      return await naFila(() => claudeDireto(params));
    }
    const r = await fetch(`${URL_SB}/functions/v1/integracoes`, {
      method: "POST",
      headers: { Authorization: authHeader, apikey: ANON, "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: "InvokeLLM", params }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j?.error || `IA: erro ${r.status}`);
    return j.result;
  };

  const autor = () => (usuario ? { email: usuario.email, id: usuario.id } : undefined);
  return {
    auth: { me },
    entities: proxyEntidades(doUsuario, autor, false),
    asServiceRole: {
      entities: proxyEntidades(doServidor, autor, true),
      integrations: { Core: { InvokeLLM: invokeLLM } },
    },
  };
}
