import { base44 } from "@/api/base44Client";

// Todas as entidades cobertas pelo backup completo (ordem de importação respeita dependências)
export const BACKUP_ENTITIES = [
  { key: "turmas", entity: "Turma" },
  { key: "estilos", entity: "Style" },
  { key: "rhythms", entity: "Rhythm" },
  { key: "progressions", entity: "Progression" },
  { key: "songs", entity: "Song" },
  { key: "chords", entity: "Chord" },
  { key: "alunos", entity: "Aluno" },
  { key: "exercises", entity: "Exercise" },
  { key: "partituras", entity: "Partitura" },
  { key: "cadernos", entity: "CadernosCifras" },
  { key: "referencias", entity: "ReferenceLibrary" },
  { key: "materiais", entity: "MaterialDidatico" },
  { key: "aulas", entity: "Aula" },
  { key: "planos_estudo", entity: "StudyPlan" },
  { key: "padroes", entity: "LearningPattern" },
  { key: "setlists", entity: "Setlist" },
  { key: "progressos", entity: "ProgressoAluno" },
  { key: "pagamentos", entity: "Pagamento" },
  { key: "frequencias", entity: "Frequencia" },
  { key: "eventos", entity: "EventoEscola" }
];

const BUILTIN_FIELDS = ["id", "created_by", "created_by_id", "created_date", "updated_date"];

// Reaproveita a busca paginada global do cliente (todas as páginas, não só a primeira)
export const fetchAllRecords = (entity, pageSize = 500) => base44.fetchAllRecords(entity, pageSize);

export function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Campos de referência a corrigir na importação (entidade -> campo -> chave do tipo referenciado)
const REMAP_FIELDS = {
  Setlist: { songs: "songs" },
  Aula: { musicas_exemplo: "songs", material_ids: "materiais" },
  Aluno: { turma_id: "turmas" },
  MaterialDidatico: { turma_id: "turmas" },
  EventoEscola: { turma_id: "turmas" },
  Pagamento: { aluno_id: "alunos" },
  Exercise: { song_id: "songs" },
  LearningPattern: { source_songs: "songs" },
  ProgressoAluno: { aula_id: "aulas" }
};

const chunk = (arr, n) => {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
};

function applyRemap(entity, obj, idMaps) {
  const spec = REMAP_FIELDS[entity] || {};
  for (const [field, refKey] of Object.entries(spec)) {
    const map = idMaps[refKey];
    if (!map) continue;
    const val = obj[field];
    if (Array.isArray(val)) {
      obj[field] = val.map((v) => (typeof v === "string" && map[v] ? map[v] : v));
    } else if (typeof val === "string" && map[val]) {
      obj[field] = map[val];
    }
  }
  if (entity === "StudyPlan" && Array.isArray(obj.repertoire_songs)) {
    const map = idMaps.songs;
    if (map) {
      obj.repertoire_songs = obj.repertoire_songs.map((rs) =>
        rs && rs.song_id && map[rs.song_id] ? { ...rs, song_id: map[rs.song_id] } : rs
      );
    }
  }
}

// Importação client-side: atualiza registros existentes pelo ID, recria os ausentes
// (com IDs novos) e remapeia referências entre entidades para que setlists, apostilas
// e aulas continuem apontando para o registro certo.
export async function runImport(importData, onProgress) {
  if (!importData || !importData.data) throw new Error("Arquivo de backup inválido");
  const data = importData.data;
  const idMaps = {};
  const results = { created: 0, updated: 0, errors: [] };

  for (const { key, entity } of BACKUP_ENTITIES) {
    const records = Array.isArray(data[key]) ? data[key] : [];
    if (!records.length) continue;
    if (onProgress) onProgress(entity);
    try {
      const existing = await fetchAllRecords(entity, 1000);
      const existingIds = new Set(existing.map((r) => r.id));
      const idMap = {};
      for (const r of existing) idMap[r.id] = r.id;

      const updates = [];
      const creates = [];
      for (const rec of records) {
        const clean = {};
        for (const [k, v] of Object.entries(rec)) {
          if (!BUILTIN_FIELDS.includes(k)) clean[k] = v;
        }
        applyRemap(entity, clean, idMaps);
        if (rec.id && existingIds.has(rec.id)) {
          updates.push({ id: rec.id, ...clean });
        } else {
          creates.push({ __old_id: rec.id || null, ...clean });
        }
      }

      for (const batch of chunk(updates, 500)) await base44.entities[entity].bulkUpdate(batch);
      for (const batch of chunk(creates, 500)) {
        const payload = batch.map(({ __old_id, ...rest }) => rest);
        const createdRecords = await base44.entities[entity].bulkCreate(payload);
        createdRecords.forEach((newRec, i) => {
          if (newRec && newRec.id && batch[i].__old_id) idMap[batch[i].__old_id] = newRec.id;
        });
      }

      idMaps[key] = idMap;
      results.created += creates.length;
      results.updated += updates.length;
    } catch (err) {
      results.errors.push(`${entity}: ${err.message || err}`);
    }
  }
  return results;
}