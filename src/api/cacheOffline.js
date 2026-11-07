// Cópia local (IndexedDB) das últimas leituras do banco, para o app continuar
// mostrando o que já foi aberto quando o aparelho estiver sem internet.
const DB = 'tropeiros-offline';
const STORE = 'leituras';
let abrindo = null;

function abrir() {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  if (!abrindo) {
    abrindo = new Promise((resolve) => {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
  }
  return abrindo;
}

export async function guardar(chave, valor) {
  try {
    const db = await abrir();
    if (!db) return;
    db.transaction(STORE, 'readwrite').objectStore(STORE).put(valor, chave);
  } catch { /* sem espaço ou modo privado: segue sem cópia */ }
}

export async function ler(chave) {
  try {
    const db = await abrir();
    if (!db) return undefined;
    return await new Promise((resolve) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(chave);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(undefined);
    });
  } catch { return undefined; }
}

// Falha de rede (sem internet), e não erro de permissão ou de dados
export function semInternet(erro) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  const msg = String(erro?.message || erro || '') + ' ' + String(erro?.data?.message || '');
  return /failed to fetch|networkerror|network request failed|load failed|fetch failed/i.test(msg);
}

// Executa a leitura; se der certo guarda a cópia, se faltar internet devolve a cópia
export async function comCopiaLocal(chave, leitura) {
  try {
    const r = await leitura();
    guardar(chave, r);
    return r;
  } catch (e) {
    if (semInternet(e)) {
      const copia = await ler(chave);
      if (copia !== undefined) return copia;
    }
    throw e;
  }
}
