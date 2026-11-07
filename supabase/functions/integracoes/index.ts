// =============================================================================
// Edge Function "integracoes" — substitui as integrações Core do Base44
// (base44.integrations.Core.*). Chamada pelo adaptador do app com
//   { endpoint: "InvokeLLM" | "ExtractDataFromUploadedFile" | ..., params: {...} }
//
// InvokeLLM usa a API da Anthropic (Claude). A chave fica no cofre do projeto
// (segredo ANTHROPIC_API_KEY) e nunca vai para o navegador.
// Só administradores do app podem usar (a IA gasta crédito da Anthropic).
// =============================================================================
import { createClient } from "npm:@supabase/supabase-js@2";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODELO_PADRAO = "claude-sonnet-5-5";
const MODELO_RAPIDO = "claude-haiku-5-5";
const MAX_TOKENS = 16000;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

class Falha extends Error {
  constructor(message: string, public status = 500) { super(message); }
}

// ---------------------------------------------------------------------------
// Quem está chamando? (precisa ser um usuário logado do app)
// ---------------------------------------------------------------------------
async function usuarioLogado(req: Request) {
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) throw new Falha("Faça login para usar este recurso.", 401);
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    auth: { persistSession: false },
  });
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data?.user) throw new Falha("Faça login para usar este recurso.", 401);
  return data.user;
}

// A IA gasta crédito da conta da Anthropic: só administradores podem usar.
async function exigirAdmin(userId: string) {
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const { data } = await sb.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (data?.role !== "admin") {
    throw new Falha("Os recursos de inteligência artificial estão disponíveis só para administradores.", 403);
  }
}

// ---------------------------------------------------------------------------
// Esquemas do Base44 → formato aceito pelas "saídas estruturadas" do Claude
// (todo objeto precisa de additionalProperties: false; palavras-chave não
// suportadas são removidas)
// ---------------------------------------------------------------------------
const CHAVES_OK = new Set(["type", "properties", "items", "enum", "const", "required", "description", "anyOf", "allOf", "$ref", "$defs", "definitions"]);
const FORMATOS_OK = new Set(["date-time", "time", "date", "duration", "email", "hostname", "uri", "ipv4", "ipv6", "uuid"]);

// deno-lint-ignore no-explicit-any
function ajustaEsquema(s: any): any {
  if (Array.isArray(s)) return s.map(ajustaEsquema);
  if (!s || typeof s !== "object") return s;
  // deno-lint-ignore no-explicit-any
  const out: any = {};
  for (const [k, v] of Object.entries(s)) {
    if (k === "format" && typeof v === "string" && FORMATOS_OK.has(v)) out.format = v;
    else if (CHAVES_OK.has(k)) out[k] = v;
  }
  if (out.properties) {
    // deno-lint-ignore no-explicit-any
    const props: any = {};
    for (const [k, v] of Object.entries(out.properties)) props[k] = ajustaEsquema(v);
    out.properties = props;
    if (Array.isArray(out.required)) out.required = out.required.filter((r: string) => r in props);
  }
  const ehObjeto = out.type === "object" || (Array.isArray(out.type) && out.type.includes("object")) || out.properties;
  if (ehObjeto) {
    out.properties = out.properties ?? {};
    out.additionalProperties = false;
    // Todos os campos obrigatórios: com campos opcionais a resposta fica muito lenta
    // (ou é recusada a partir de 24 opcionais). A IA preenche vazio o que não souber.
    out.required = Object.keys(out.properties);
  }
  if (out.items) out.items = ajustaEsquema(out.items);
  for (const k of ["anyOf", "allOf"]) if (out[k]) out[k] = ajustaEsquema(out[k]);
  for (const k of ["$defs", "definitions"]) {
    if (out[k]) {
      // deno-lint-ignore no-explicit-any
      const d: any = {};
      for (const [n, v] of Object.entries(out[k])) d[n] = ajustaEsquema(v);
      out[k] = d;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Arquivos anexados (file_urls) → blocos de conteúdo do Claude
// ---------------------------------------------------------------------------
async function blocosDeArquivos(urls: string[] = []) {
  // deno-lint-ignore no-explicit-any
  const blocos: any[] = [];
  for (const url of urls.filter(Boolean)) {
    const ext = (new URL(url).pathname.split(".").pop() || "").toLowerCase();
    if (ext === "pdf") {
      blocos.push({ type: "document", source: { type: "url", url } });
    } else if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) {
      blocos.push({ type: "image", source: { type: "url", url } });
    } else {
      // texto (txt, csv, md, json...) — baixa e inclui o conteúdo
      const r = await fetch(url);
      if (!r.ok) throw new Falha(`Não foi possível abrir o arquivo anexado (${r.status}).`, 400);
      const tipo = r.headers.get("content-type") || "";
      if (!tipo.startsWith("text/") && !["txt", "csv", "md", "json", "xml", "html"].includes(ext)) {
        throw new Falha(`Tipo de arquivo não suportado pela IA: .${ext}`, 400);
      }
      const texto = (await r.text()).slice(0, 400_000);
      blocos.push({ type: "text", text: `Conteúdo do arquivo anexado (${url.split("/").pop()}):\n\n${texto}` });
    }
  }
  return blocos;
}

// ---------------------------------------------------------------------------
// Chamada à API da Anthropic
// ---------------------------------------------------------------------------
// deno-lint-ignore no-explicit-any
async function claude(body: any) {
  const chave = Deno.env.get("ANTHROPIC_API_KEY");
  if (!chave) throw new Falha("A chave da IA (ANTHROPIC_API_KEY) não está configurada no Supabase.", 503);
  const r = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: { "x-api-key": chave, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = data?.error?.message || `erro ${r.status}`;
    if (r.status === 401) throw new Falha("A chave da IA foi recusada pela Anthropic (confira o segredo ANTHROPIC_API_KEY).", 502);
    if (r.status === 402 || /credit balance/i.test(msg)) throw new Falha("Sem crédito na conta da Anthropic. Adicione crédito em console.anthropic.com → Billing.", 402);
    if (r.status === 429) throw new Falha("Muitas solicitações à IA ao mesmo tempo. Tente de novo em instantes.", 429);
    throw new Falha(`IA: ${msg}`, r.status >= 500 ? 502 : 400);
  }
  return data;
}

// deno-lint-ignore no-explicit-any
const consumo = (r: any) => `[saída: ${r?.usage?.output_tokens ?? "?"} tokens; raciocínio: ${r?.usage?.output_tokens_details?.thinking_tokens ?? "?"}]`;

// deno-lint-ignore no-explicit-any
const textoDe = (resp: any) => (resp.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("");

function extraiJson(texto: string) {
  const t = texto.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  try { return JSON.parse(t); } catch { /* tenta achar o objeto dentro do texto */ }
  const ini = t.indexOf("{"), fim = t.lastIndexOf("}");
  if (ini >= 0 && fim > ini) return JSON.parse(t.slice(ini, fim + 1));
  throw new Falha("A IA não devolveu dados no formato esperado. Tente de novo.", 502);
}

// Sem raciocínio prévio nas respostas estruturadas (mais rápido e barato).
// Só o modelo principal aceita essa opção; o rápido (Haiku) recusa.
const semRaciocinioPrevio = (model: string) => (model === MODELO_PADRAO ? { thinking: { type: "between_tools" } } : {});

const escolheModelo = (m?: string) => (m && /flash|haiku|mini|lite/i.test(m) ? MODELO_RAPIDO : MODELO_PADRAO);

// ---------------------------------------------------------------------------
// InvokeLLM({ prompt, response_json_schema?, file_urls?, add_context_from_internet?, model? })
// Igual ao Base44: com esquema devolve o objeto; sem esquema devolve o texto.
// ---------------------------------------------------------------------------
// deno-lint-ignore no-explicit-any
async function invokeLLM(p: any) {
  if (!p?.prompt || typeof p.prompt !== "string") throw new Falha("InvokeLLM precisa de 'prompt'.", 400);
  const model = escolheModelo(p.model);
  const arquivos = await blocosDeArquivos(p.file_urls);
  const esquema = p.response_json_schema ? ajustaEsquema(p.response_json_schema) : null;
  const sistema = "Você é o assistente do app Tropeiros do Bebedouro (biblioteca de músicas e escola de viola caipira e violão). Responda em português do Brasil, salvo quando o pedido disser outra coisa.";

  // 1) Pesquisa na internet (quando pedida): reúne as informações em texto
  let contextoWeb = "";
  if (p.add_context_from_internet) {
    const pesquisa = await claude({
      model, max_tokens: 4000, system: sistema,
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }],
      messages: [{ role: "user", content: [...arquivos, { type: "text", text:
        `Pesquise na internet as informações necessárias para atender ao pedido abaixo e escreva um resumo objetivo dos fatos encontrados, com as fontes. Não responda ao pedido ainda.\n\nPEDIDO:\n${p.prompt}` }] }],
    });
    contextoWeb = textoDe(pesquisa);
    if (!esquema) {
      // sem esquema: a própria resposta com pesquisa já serve
      const final = await claude({
        model, max_tokens: MAX_TOKENS, system: sistema,
        messages: [{ role: "user", content: [...arquivos, { type: "text", text: `${p.prompt}\n\nInformações pesquisadas na internet:\n${contextoWeb}` }] }],
      });
      return textoDe(final);
    }
  }

  const textoPedido = contextoWeb
    ? `${p.prompt}\n\nInformações pesquisadas na internet (use quando forem úteis):\n${contextoWeb}`
    : p.prompt;
  const mensagens = [{ role: "user", content: [...arquivos, { type: "text", text: textoPedido }] }];

  if (!esquema) {
    const r = await claude({ model, max_tokens: MAX_TOKENS, system: sistema, messages: mensagens, output_config: { effort: "medium" } });
    return textoDe(r);
  }

  // 2) Resposta no formato pedido (saídas estruturadas)
  try {
    const r = await claude({
      model, max_tokens: MAX_TOKENS, system: sistema, messages: mensagens,
      ...semRaciocinioPrevio(model),
      output_config: { effort: "medium", format: { type: "json_schema", schema: esquema } },
    });
    if (r.stop_reason === "max_tokens") throw new Falha(`A resposta da IA ficou longa demais e foi cortada. Tente com um pedido menor. ${consumo(r)}`, 502);
    if (r.stop_reason === "refusal") throw new Falha("A IA recusou este pedido.", 422);
    return JSON.parse(textoDe(r));
  } catch (e) {
    // Plano B: esquema complexo demais para as saídas estruturadas → pede o JSON por instrução
    if (!(e instanceof Falha) || e.status !== 400) throw e;
    const r = await claude({
      model, max_tokens: MAX_TOKENS, system: sistema + " Responda SOMENTE com um objeto JSON válido, sem texto antes ou depois.",
      messages: [{ role: "user", content: [...arquivos, { type: "text", text:
        `${textoPedido}\n\nResponda SOMENTE com um objeto JSON que siga este esquema:\n${JSON.stringify(p.response_json_schema)}` }] }],
      ...semRaciocinioPrevio(model),
      output_config: { effort: "medium" },
    });
    if (r.stop_reason === "max_tokens") throw new Falha(`A resposta da IA ficou longa demais e foi cortada. Tente com um pedido menor. ${consumo(r)}`, 502);
    return extraiJson(textoDe(r));
  }
}

// ExtractDataFromUploadedFile({ file_url, json_schema }) → { status, output }
// deno-lint-ignore no-explicit-any
async function extractData(p: any) {
  try {
    const output = await invokeLLM({
      prompt: "Extraia do arquivo anexado os dados descritos no esquema. Preserve textos e cifras exatamente como estão.",
      file_urls: [p.file_url], response_json_schema: p.json_schema,
    });
    return { status: "success", output };
  } catch (e) {
    return { status: "error", details: (e as Error).message, output: null };
  }
}

// ---------------------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);
  try {
    const user = await usuarioLogado(req);
    await exigirAdmin(user.id);
    const { endpoint, params } = await req.json();
    switch (endpoint) {
      case "InvokeLLM":
        return json({ result: await invokeLLM(params) });
      case "ExtractDataFromUploadedFile":
        return json({ result: await extractData(params) });
      case "SendEmail":
      case "SendSMS":
        throw new Falha("Envio de e-mail/SMS ainda não configurado na versão Supabase do app.", 501);
      case "GenerateImage":
        throw new Falha("Geração de imagem não está disponível na versão Supabase do app.", 501);
      default:
        throw new Falha(`Integração desconhecida: ${endpoint}`, 400);
    }
  } catch (e) {
    const status = e instanceof Falha ? e.status : 500;
    console.error("integracoes:", (e as Error).message);
    return json({ error: (e as Error).message }, status);
  }
});
