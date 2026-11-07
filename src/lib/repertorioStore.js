// Repertórios (Setlists): quem está logado grava no banco; visitante sem login
// grava só neste aparelho/navegador (localStorage), sem precisar de cadastro.
import { base44, supabase } from '@/api/base44Client';

const CHAVE = 'tropeiros_repertorios_visitante';

function lerLocais() {
  try { return JSON.parse(localStorage.getItem(CHAVE) || '[]'); } catch { return []; }
}
function gravarLocais(lista) {
  try { localStorage.setItem(CHAVE, JSON.stringify(lista)); }
  catch { throw new Error('Não foi possível salvar o repertório neste aparelho.'); }
}

const locais = {
  async list() {
    return lerLocais().sort((a, b) => (b.created_date || '').localeCompare(a.created_date || ''));
  },
  async create(dados) {
    const agora = new Date().toISOString();
    const novo = { ...dados, id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, created_date: agora, updated_date: agora };
    gravarLocais([...lerLocais(), novo]);
    return novo;
  },
  async update(id, dados) {
    let atualizado = null;
    gravarLocais(lerLocais().map((r) => (r.id === id ? (atualizado = { ...r, ...dados, updated_date: new Date().toISOString() }) : r)));
    return atualizado;
  },
  async delete(id) {
    gravarLocais(lerLocais().filter((r) => r.id !== id));
  },
};

async function alvo() {
  const { data } = await supabase.auth.getSession();
  return data.session ? base44.entities.Setlist : locais;
}

export const Repertorios = {
  list: async (...a) => (await alvo()).list(...a),
  create: async (d) => (await alvo()).create(d),
  update: async (id, d) => (await alvo()).update(id, d),
  delete: async (id) => (await alvo()).delete(id),
};

// Link de compartilhamento: leva nome, dados e a lista de músicas (ids)
export function linkDoRepertorio(setlist) {
  const pacote = {
    name: setlist.name, description: setlist.description || '', location: setlist.location || '',
    event_date: setlist.event_date || '', notes: setlist.notes || '', songs: setlist.songs || [],
  };
  const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(pacote)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${window.location.origin}/setlists?r=${b64}`;
}

export function lerRepertorioDoLink() {
  const r = new URLSearchParams(window.location.search).get('r');
  if (!r) return null;
  try {
    const b64 = r.replace(/-/g, '+').replace(/_/g, '/');
    const p = JSON.parse(decodeURIComponent(escape(atob(b64))));
    if (!p?.name || !Array.isArray(p.songs)) return null;
    return { name: String(p.name).slice(0, 200), description: p.description || '', location: p.location || '',
      event_date: p.event_date || '', notes: p.notes || '', songs: p.songs.filter((x) => typeof x === 'string').slice(0, 300) };
  } catch { return null; }
}
