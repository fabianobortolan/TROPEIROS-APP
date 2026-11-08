import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useOfflineSync } from "../components/utils/useOfflineSync";
import { Search, Check, ChevronRight, X, ListChecks, Loader2 } from "lucide-react";
import SongRow, { tituloLegivel } from "../components/songs/SongRow";
import SongDetails from "../components/songs/SongDetails";
import PalcoView from "../components/palco/PalcoView";

// ---------------------------------------------------------------------------
// MÚSICAS PARA TRATAR (só administrador)
// Mostra o que falta em cada música e permite revisar uma atrás da outra:
// abre a música, você confere/corrige e toca em "Revisada, próxima".
// ---------------------------------------------------------------------------

const POP_ROCK = ["pop", "rock", "pop_rock", "hard_rock", "metal", "punk", "blues_rock", "indie", "alternativo", "classico_rock", "pop_internacional"];
const SAMBA_MPB = ["mpb", "samba", "forro"];
const bibliotecaDe = (s) => (POP_ROCK.includes(s.genre_style) ? "poprock" : SAMBA_MPB.includes(s.genre_style) ? "samba" : "sertaneja");

const vazio = (v) => v == null || String(v).trim() === "";
const temAlerta = (s) => !!s.validation_severity && s.validation_severity !== "ok";

const FILTROS = [
  { id: "nao_revisadas", nome: "Não revisadas", teste: (s) => !s.is_fully_revised },
  { id: "alerta", nome: "Com alerta na cifra", teste: temAlerta },
  { id: "sem_ritmo", nome: "Sem ritmo", teste: (s) => vazio(s.rhythm_name) },
  { id: "sem_playback", nome: "Sem playback", teste: (s) => vazio(s.playback_url) },
  { id: "sem_bpm", nome: "Sem BPM", teste: (s) => !Number(s.tempo) },
  { id: "todas", nome: "Todas", teste: () => true },
];

const BIBLIOTECAS = [
  { id: "todas", nome: "Todas" },
  { id: "sertaneja", nome: "Sertaneja" },
  { id: "poprock", nome: "Pop/Rock" },
  { id: "samba", nome: "Samba/MPB/Forró" },
];

const semAcento = (t) => (t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function MusicasParaTratar() {
  const queryClient = useQueryClient();
  useQuery({ queryKey: ["currentUser"], queryFn: () => base44.auth.me() });
  const { data: todas, isLoading, reload } = useOfflineSync("songs", () => base44.fetchAllSongs());
  const [filtro, setFiltro] = useState("nao_revisadas");
  const [biblioteca, setBiblioteca] = useState("todas");
  const [busca, setBusca] = useState("");
  const [fila, setFila] = useState(null); // { ids: [...], pos } — lista congelada ao começar
  const [aberta, setAberta] = useState(null);
  const [palco, setPalco] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [ajustes, setAjustes] = useState({}); // alterações feitas aqui, antes de recarregar
  const [editando, setEditando] = useState(false);
  const [janelaAberta, setJanelaAberta] = useState(false);

  // Esconde a barra da revisão enquanto há edição (cifra aberta para editar, formulário) ou janela por cima,
  // para não pular de música sem salvar
  useEffect(() => {
    if (!aberta) return;
    const conferir = () => setJanelaAberta(!!document.querySelector('[role="dialog"], [role="alertdialog"], [role="menu"], textarea'));
    conferir();
    const obs = new MutationObserver(conferir);
    obs.observe(document.body, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, [aberta]);

  const musicas = useMemo(
    () => (todas || []).map((s) => (ajustes[s.id] ? { ...s, ...ajustes[s.id] } : s)),
    [todas, ajustes]
  );
  const daBiblioteca = useMemo(
    () => musicas.filter((s) => biblioteca === "todas" || bibliotecaDe(s) === biblioteca),
    [musicas, biblioteca]
  );
  const contagem = useMemo(() => Object.fromEntries(FILTROS.map((f) => [f.id, daBiblioteca.filter(f.teste).length])), [daBiblioteca]);
  const lista = useMemo(() => {
    const f = FILTROS.find((x) => x.id === filtro) || FILTROS[0];
    const q = semAcento(busca.trim());
    return daBiblioteca
      .filter(f.teste)
      .filter((s) => !q || semAcento(`${s.title} ${s.artist}`).includes(q))
      .sort((a, b) => (a.title || "").localeCompare(b.title || "", "pt-BR"));
  }, [daBiblioteca, filtro, busca]);

  const revisadas = daBiblioteca.filter((s) => s.is_fully_revised).length;
  const total = daBiblioteca.length;
  const pct = total ? Math.round((revisadas / total) * 100) : 0;

  const porId = useMemo(() => Object.fromEntries(musicas.map((s) => [s.id, s])), [musicas]);

  const abrir = (song) => {
    const ids = lista.map((s) => s.id);
    setFila({ ids, pos: Math.max(0, ids.indexOf(song.id)) });
    setAberta(song);
  };
  const comecar = () => { if (lista.length) abrir(lista[0]); };
  const irPara = (pos) => {
    if (!fila || pos >= fila.ids.length) { fechar(); return; }
    setFila({ ...fila, pos });
    setAberta(porId[fila.ids[pos]] || null);
  };
  const fechar = () => {
    setEditando(false);
    setAberta(null);
    setFila(null);
    queryClient.invalidateQueries({ queryKey: ["songs"] });
    reload?.();
  };
  const revisadaEProxima = async () => {
    if (!aberta) return;
    setSalvando(true);
    try {
      await base44.entities.Song.update(aberta.id, { is_fully_revised: true });
      setAjustes((a) => ({ ...a, [aberta.id]: { ...(a[aberta.id] || {}), is_fully_revised: true } }));
      irPara(fila.pos + 1);
    } catch {
      alert("Não consegui marcar como revisada. Confira a internet e tente de novo.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF6EA]">
      <div className="max-w-3xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
        <div className="flex items-center gap-2 mb-1">
          <ListChecks className="w-6 h-6 text-[#8B6F47]" />
          <h1 className="text-2xl font-bold text-[#3D2E1F]">Músicas para tratar</h1>
        </div>
        <p className="text-sm text-[#8B7355] mb-4">Escolha um filtro e toque em “Revisar em sequência”: o app abre uma música atrás da outra.</p>

        {/* Progresso */}
        <div className="rounded-2xl bg-[#FFFDF8] border border-[#E6DCC8] p-4 mb-4">
          <div className="flex items-baseline justify-between mb-2">
            <span className="font-semibold text-[#3D2E1F]">{revisadas} de {total} revisadas</span>
            <span className="text-sm font-bold text-[#6B4F2E]">{pct}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-[#EFE6D4] overflow-hidden">
            <div className="h-full bg-[#6B8E4E] rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Biblioteca */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 mb-2" style={{ scrollbarWidth: "none" }}>
          {BIBLIOTECAS.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setBiblioteca(b.id)}
              className={`flex-shrink-0 h-8 px-3 rounded-full text-sm border ${biblioteca === b.id ? "bg-[#3D2E1F] text-[#FFFDF8] border-[#3D2E1F]" : "bg-[#FFFDF8] text-[#6B4F2E] border-[#E6DCC8]"}`}
            >
              {b.nome}
            </button>
          ))}
        </div>

        {/* O que falta */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFiltro(f.id)}
              className={`h-9 px-3 rounded-xl text-sm font-medium border flex items-center gap-1.5 ${filtro === f.id ? "bg-[#6B4F2E] text-[#FFFDF8] border-[#6B4F2E]" : "bg-[#FFFDF8] text-[#6B4F2E] border-[#E6DCC8]"}`}
            >
              {f.nome}
              <span className={`text-xs px-1.5 rounded-full ${filtro === f.id ? "bg-white/20" : "bg-[#F3EAD6]"}`}>{contagem[f.id] ?? 0}</span>
            </button>
          ))}
        </div>

        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#A68A64]" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar música ou artista"
              className="w-full h-11 pl-9 pr-3 rounded-xl border border-[#E6DCC8] bg-[#FFFDF8] text-[#3D2E1F] outline-none focus:border-[#B8860B]"
            />
          </div>
          <button
            type="button"
            onClick={comecar}
            disabled={!lista.length}
            className="h-11 px-4 rounded-xl bg-[#6B4F2E] text-[#FFFDF8] font-semibold disabled:opacity-40 flex-shrink-0"
          >
            Revisar em sequência
          </button>
        </div>

        {isLoading && !todas ? (
          <div className="py-16 flex justify-center text-[#8B7355]"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : lista.length === 0 ? (
          <div className="py-16 text-center text-[#8B7355]">Nenhuma música neste filtro. 🎉</div>
        ) : (
          <>
            <p className="text-xs text-[#8B7355] mb-2">{lista.length} música{lista.length === 1 ? "" : "s"}</p>
            <div className="flex flex-col gap-1.5">
              {lista.map((s) => (
                <SongRow key={s.id} song={s} tema="claro" onOpen={abrir} onStage={setPalco} />
              ))}
            </div>
          </>
        )}
      </div>

      {aberta && (
        <>
          <SongDetails key={aberta.id} song={aberta} onClose={fechar} onEditandoChange={setEditando} />
          {/* Barra da revisão em sequência */}
          {!editando && !janelaAberta && <div className="fixed z-[60] bottom-3 inset-x-3 sm:inset-x-auto sm:right-6 sm:bottom-6 flex items-center gap-2 rounded-2xl bg-[#3D2E1F] text-[#FFFDF8] shadow-2xl p-2 pl-3" style={{ marginBottom: "env(safe-area-inset-bottom)" }}>
            <div className="text-xs leading-tight min-w-0 flex-1 sm:flex-none sm:w-36">
              <div className="font-semibold tabular-nums">{fila.pos + 1}/{fila.ids.length}</div>
              <div className="opacity-70 truncate hidden sm:block">{tituloLegivel(aberta.title)}</div>
            </div>
            <button type="button" onClick={revisadaEProxima} disabled={salvando || aberta.is_fully_revised} className="h-11 px-3 rounded-xl bg-[#6B8E4E] font-semibold flex items-center gap-1.5 disabled:opacity-50">
              {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span className="text-sm">{aberta.is_fully_revised ? "Já revisada" : "Revisada, próxima"}</span>
            </button>
            <button type="button" onClick={() => irPara(fila.pos + 1)} aria-label="Pular para a próxima" className="h-11 px-2.5 rounded-xl bg-white/10 flex items-center text-sm">
              Pular <ChevronRight className="w-4 h-4" />
            </button>
            <button type="button" onClick={fechar} aria-label="Parar a revisão" className="h-11 w-11 rounded-xl bg-white/10 flex items-center justify-center">
              <X className="w-4 h-4" />
            </button>
          </div>}
        </>
      )}

      {palco && <PalcoView songs={[palco]} onClose={() => setPalco(null)} />}
    </div>
  );
}
