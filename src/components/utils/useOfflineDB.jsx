/**
 * Hook para persistência offline com IndexedDB.
 * Armazena dados localmente e sincroniza ao reconectar.
 */

const DB_NAME = "TropeirosOfflineDB";
const DB_VERSION = 2;
const STORES = {
  songs: "songs",
  setlists: "setlists",
  exercises: "exercises",
  chords: "chords",
  progressions: "progressions",
  learningPatterns: "learningPatterns",
  pendingSync: "pendingSync",
};

// Abre (ou cria) o banco IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      Object.values(STORES).forEach((store) => {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: "id" });
        }
      });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Salva array de registros em uma store
export async function saveToLocal(storeName, records) {
  const db = await openDB();
  const tx = db.transaction(storeName, "readwrite");
  const store = tx.objectStore(storeName);
  records.forEach((r) => store.put(r));
  return new Promise((res, rej) => {
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

// Lê todos os registros de uma store
export async function readFromLocal(storeName) {
  const db = await openDB();
  const tx = db.transaction(storeName, "readonly");
  const store = tx.objectStore(storeName);
  const req = store.getAll();
  return new Promise((res, rej) => {
    req.onsuccess = () => res(req.result || []);
    req.onerror = () => rej(req.error);
  });
}

// Salva uma operação pendente de sincronização (progress de exercício)
export async function savePendingSync(payload) {
  const db = await openDB();
  const tx = db.transaction(STORES.pendingSync, "readwrite");
  const store = tx.objectStore(STORES.pendingSync);
  const entry = { id: `${Date.now()}_${Math.random()}`, ...payload };
  store.put(entry);
  return new Promise((res, rej) => {
    tx.oncomplete = () => res(entry);
    tx.onerror = () => rej(tx.error);
  });
}

// Lê todas as operações pendentes
export async function readPendingSync() {
  return readFromLocal(STORES.pendingSync);
}

// Remove uma operação pendente após sincronizar
export async function removePendingSync(id) {
  const db = await openDB();
  const tx = db.transaction(STORES.pendingSync, "readwrite");
  tx.objectStore(STORES.pendingSync).delete(id);
  return new Promise((res, rej) => {
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

export const OFFLINE_STORES = STORES;