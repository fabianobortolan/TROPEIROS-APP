// =============================================================================
// Edge Function "funcoes" — reúne as funções de servidor do app que vieram do
// Base44. O adaptador do app chama base44.functions.invoke(nome, dados) e isto
// chega aqui como { funcao: nome, dados }.
// =============================================================================
import restoreDeletedEntity from "./restoreDeletedEntity.ts";
import gerarAulaPorTema from "./gerarAulaPorTema.ts";
import iniciarGeracaoAulas from "./iniciarGeracaoAulas.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FUNCOES: Record<string, (req: Request) => Promise<Response>> = {
  restoreDeletedEntity,
  gerarAulaPorTema,
  iniciarGeracaoAulas,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const comCors = (r: Response) => { for (const [k, v] of Object.entries(CORS)) r.headers.set(k, v); return r; };
  try {
    const { funcao, dados } = await req.json();
    const fn = FUNCOES[funcao];
    if (!fn) {
      const msg = funcao === "generateExercises"
        ? "A geração de exercícios ainda não existe nesta versão do app."
        : `Função desconhecida: ${funcao}`;
      return comCors(Response.json({ error: msg }, { status: funcao === "generateExercises" ? 501 : 404 }));
    }
    // Repassa a chamada como se fosse a função original do Base44 (mesmos cabeçalhos, corpo = dados)
    const original = new Request(req.url, { method: "POST", headers: req.headers, body: JSON.stringify(dados ?? {}) });
    return comCors(await fn(original));
  } catch (e) {
    return comCors(Response.json({ error: (e as Error).message }, { status: 500 }));
  }
});
