import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { convertGpFile } from "@/lib/gpImport";
import TocarJuntoPlayer from "@/components/TocarJuntoPlayer"; // usar o componente já existente, sem alterá-lo

// Importador de tablaturas Guitar Pro (.gp) para o Tocar Junto.
// - songId (opcional): quando aberto dentro da página de uma música, já vem associado a ela.
// - Aceita vários arquivos de uma vez e tenta achar a música pelo nome do arquivo / título interno.

const norm = (s) =>
  (s || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toUpperCase().replace(/[^A-Z0-9 ]+/g, " ")
    .replace(/\s+/g, " ").trim();

const VARIANTES = /\s+(?:-?\s*(?:[A-G]M?|EM|SOLO|SIMPLES|ORIGINAL|COMPLETA|NOVO|NOVA VERSAO|VERSAO \w+|\d+|I+))$/;
function baseName(fileName) {
  let n = norm(fileName.replace(/\.gp$/i, ""));
  for (let k = 0; k < 3; k++) n = n.replace(VARIANTES, "").trim();
  return n;
}
function acharMusica(songs, fileName, tituloInterno) {
  const cands = [norm(fileName.replace(/\.gp$/i, "")), baseName(fileName), norm(tituloInterno)].filter(Boolean);
  const semArtigo = (s) => s.replace(/^(A|O|AS|OS) /, "");
  for (const c of cands) {
    const hit = songs.find((s) => norm(s.title) === c) || songs.find((s) => semArtigo(norm(s.title)) === semArtigo(c));
    if (hit) return hit.id;
  }
  return "";
}

export default function GpImporter({ songId: fixedSongId = null, onSaved }) {
  const [songs, setSongs] = useState([]);
  const [rows, setRows] = useState([]); // {key, fileName, tab, report, error, songId, status}
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    base44.entities.Song.list("title", 2000).then((list) =>
      setSongs(list.map((s) => ({ id: s.id, title: s.title, artist: s.artist, hasTab: !!(s.solo_tab && s.solo_tab.measures) })))
    );
  }, []);
  const songById = useMemo(() => Object.fromEntries(songs.map((s) => [s.id, s])), [songs]);

  async function onFiles(e) {
    const files = [...e.target.files];
    e.target.value = "";
    const novos = [];
    for (const f of files) {
      const key = f.name + ":" + f.size + ":" + f.lastModified;
      try {
        const { tab, report } = await convertGpFile(f);
        novos.push({ key, fileName: f.name, tab, report, songId: fixedSongId || acharMusica(songs, f.name, report.title), status: "" });
      } catch (err) {
        novos.push({ key, fileName: f.name, error: err.message || String(err), songId: "", status: "" });
      }
    }
    setRows((r) => [...r.filter((x) => !novos.some((n) => n.key === x.key)), ...novos]);
  }

  const setRow = (key, patch) => setRows((r) => r.map((x) => (x.key === key ? { ...x, ...patch } : x)));

  async function salvar(row) {
    if (!row.songId || !row.tab) return;
    setRow(row.key, { status: "salvando" });
    try {
      await base44.entities.Song.update(row.songId, { solo_tab: row.tab });
      setRow(row.key, { status: "salvo" });
      setSongs((l) => l.map((s) => (s.id === row.songId ? { ...s, hasTab: true } : s)));
      onSaved && onSaved(row.songId);
    } catch (err) {
      setRow(row.key, { status: "erro: " + (err.message || err) });
    }
  }
  async function salvarTodos() {
    setBusy(true);
    for (const r of rows) if (r.tab && r.songId && r.status !== "salvo") await salvar(r);
    setBusy(false);
  }

  const prontos = rows.filter((r) => r.tab && r.songId && r.status !== "salvo").length;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-dashed p-6 text-center">
        <p className="font-semibold">Importar tablatura do Guitar Pro (.gp)</p>
        <p className="text-sm opacity-70 mb-3">
          Guitar Pro 7 ou 8. Pode escolher vários arquivos de uma vez. Ritornelos, casas de 1ª/2ª vez, cifras, ligaduras e andamento são lidos do arquivo.
        </p>
        <label className="inline-block cursor-pointer rounded-lg bg-amber-700 px-4 py-2 text-white">
          Escolher arquivo(s) .gp
          <input type="file" accept=".gp" multiple className="hidden" onChange={onFiles} />
        </label>
      </div>

      {rows.length > 0 && (
        <div className="space-y-3">
          {rows.map((r) => {
            const song = songById[r.songId];
            return (
              <div key={r.key} className="rounded-xl border p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-medium">{r.fileName}</div>
                  <button className="text-sm opacity-60" onClick={() => setRows((l) => l.filter((x) => x.key !== r.key))}>remover</button>
                </div>

                {r.error ? (
                  <div className="text-sm text-red-600">Não foi possível ler: {r.error}</div>
                ) : (
                  <>
                    <div className="text-sm opacity-80">
                      {r.report.title && <>Título no arquivo: <b>{r.report.title}</b> · </>}
                      {r.report.bpm} BPM · compasso {r.report.time} · {r.report.bars} compassos
                      {r.report.unrolled && ` (${r.report.originalBars} no arquivo, ritornelos desdobrados)`} · {r.report.notes} notas · {r.report.chords} cifras
                    </div>

                    {!fixedSongId && (
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span>Música no app:</span>
                        <select className="rounded border px-2 py-1 max-w-full" value={r.songId}
                          onChange={(e) => setRow(r.key, { songId: e.target.value, status: "" })}>
                          <option value="">— escolha a música —</option>
                          {songs.map((s) => (
                            <option key={s.id} value={s.id}>{s.title}{s.artist ? ` — ${s.artist}` : ""}{s.hasTab ? " (já tem tablatura)" : ""}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    {song && song.hasTab && r.status !== "salvo" && (
                      <div className="text-sm text-amber-700">Esta música já tem tablatura; ao salvar, ela será substituída por esta.</div>
                    )}

                    {r.report.warnings.length > 0 && (
                      <ul className="text-sm text-amber-800 bg-amber-50 rounded p-2 list-disc pl-6">
                        {r.report.warnings.map((w, i) => <li key={i}>{w}</li>)}
                      </ul>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <button className="rounded-lg border px-3 py-1.5 text-sm"
                        onClick={() => setPreview(preview === r.key ? null : r.key)}>
                        {preview === r.key ? "Fechar prévia" : "Ouvir prévia"}
                      </button>
                      <button className="rounded-lg bg-green-700 px-3 py-1.5 text-sm text-white disabled:opacity-40"
                        disabled={!r.songId || r.status === "salvando" || r.status === "salvo"} onClick={() => salvar(r)}>
                        {r.status === "salvo" ? "Salvo ✓" : r.status === "salvando" ? "Salvando…" : "Salvar no app"}
                      </button>
                      {r.status.startsWith("erro") && <span className="text-sm text-red-600">{r.status}</span>}
                    </div>

                    {preview === r.key && (
                      <div className="pt-2">
                        <TocarJuntoPlayer soloTab={r.tab} />
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}

          {rows.length > 1 && (
            <button className="w-full rounded-lg bg-green-700 px-4 py-2 text-white disabled:opacity-40"
              disabled={busy || prontos === 0} onClick={salvarTodos}>
              {busy ? "Salvando…" : `Salvar todas as prontas (${prontos})`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}