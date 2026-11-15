import { useMemo, useRef, useState } from "react";
import { Pencil, Save, X, Loader2, Trash2, EyeOff, Eye } from "lucide-react";
import { INSTRUMENTOS, dicaDaMusica } from "@/lib/acordesInstrumento";
import { simplificarAcorde, temOQueSimplificar } from "@/utils/simplificarAcordes";
import { transposeKey } from "@/utils/transposition";
import { SeletorInstrumento } from "./AcordesDaMusica";

const Item = ({ children }) => <li data-dica-item className="pl-1">{children}</li>;
const Chip = ({ children }) => (
  <span className="inline-block font-mono font-bold text-[#B5652B] bg-[#FBF0E2] rounded px-1.5 py-0.5 mx-0.5 text-[13px]">{children}</span>
);

// Dica automática da música: pestana, capotraste, tom mais fácil, acordes enfeitados,
// diminuto e baixo trocado — calculada pelos desenhos do instrumento escolhido.
// Dicas práticas escritas pelo professor: cada linha vira um item
function DicaPratica({ texto }) {
  const linhas = String(texto || "").split("\n").map((l) => l.replace(/^\s*[-•*]\s*/, "").trim()).filter(Boolean);
  if (!linhas.length) return null;
  return (
    <ul className="list-disc pl-5 space-y-1.5 text-sm text-[#3B2A1A] marker:text-[#B5652B]">
      {linhas.map((l, i) => <li key={i}>{l}</li>)}
    </ul>
  );
}

export default function DicaMusica({ texto, textoOriginal, tom, instrumento, onInstrumento, onAbrirSimplificar, onAbrirTom, dicaPratica = "", dicaAutoOculta = false, isAdmin = false, onSalvarDica }) {
  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [ocultarAuto, setOcultarAuto] = useState(!!dicaAutoOculta);
  const autoRef = useRef(null);
  const podeEditar = isAdmin && !!onSalvarDica;
  const temPratica = !!String(dicaPratica || "").trim();
  const gravar = async (txt, ocultar) => {
    setSalvando(true);
    try {
      await onSalvarDica(String(txt || "").trim(), !!ocultar);
      setEditando(false);
    } finally {
      setSalvando(false);
    }
  };
  // Texto da dica automática, linha a linha, para o professor editar à vontade
  const textoDaAuto = () => {
    const el = autoRef.current;
    if (!el) return "";
    const partes = [...el.querySelectorAll("[data-dica-item]")].map((n) => {
      const c = n.cloneNode(true);
      c.querySelectorAll("button").forEach((b) => b.remove());
      return c.textContent.replace(/\s+/g, " ").replace(/\s+([.,:;)])/g, "$1").trim();
    });
    return partes.filter(Boolean).join("\n");
  };
  const abrirEditor = (deAuto = false) => {
    if (deAuto) {
      const auto = textoDaAuto();
      setRascunho([String(dicaPratica || "").trim(), auto].filter(Boolean).join("\n"));
      setOcultarAuto(true);
    } else {
      setRascunho(dicaPratica || "");
      setOcultarAuto(!!dicaAutoOculta);
    }
    setEditando(true);
  };
  const inst = INSTRUMENTOS[instrumento];
  const dica = useMemo(() => dicaDaMusica(texto, instrumento), [texto, instrumento]);
  const enfeites = useMemo(() => {
    if (!temOQueSimplificar(textoOriginal || texto, "simples")) return [];
    const out = [];
    for (const a of dica?.acordes || []) {
      const s = simplificarAcorde(a, "simples");
      if (s !== a && !out.some((x) => x.de === a)) out.push({ de: a, para: s });
      if (out.length >= 3) break;
    }
    return out;
  }, [dica, texto, textoOriginal]);

  if (!dica && !temPratica && !podeEditar) return null;
  const { pestana = [], capo = null, tom: outroTom = null, temDiminuto = false, barras = [] } = dica || {};
  const mostraAuto = !!dica && !dicaAutoOculta;
  const nomeIns = inst.nome.toLowerCase();

  return (
    <div className="rounded-2xl border border-[#E8C98F] bg-[#FFF8EC] p-3 md:p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-[#6B4F2E]">💡 Dica para tocar</p>
        <SeletorInstrumento valor={instrumento} onChange={onInstrumento} />
      </div>

      {/* Dica prática do professor (editável pelo administrador) */}
      {editando ? (
        <div className="rounded-xl bg-[#FFFDF8] border border-[#E8C98F] p-3 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-[#B5652B]">Dica do professor</p>
          <textarea
            value={rascunho}
            onChange={(e) => setRascunho(e.target.value)}
            rows={5}
            autoFocus
            placeholder={"Uma dica por linha. Ex.:\nNo ponteio da introdução, use o polegar na 5ª corda.\nSegure o D7 um tempo a mais antes do refrão."}
            className="w-full rounded-lg border border-[#E6DCC8] bg-white p-2 text-sm text-[#3B2A1A] focus:outline-none focus:ring-2 focus:ring-[#E8C98F]"
          />
          {dica && (
            <label className="flex items-center gap-2 text-xs text-[#6B4F2E]">
              <input type="checkbox" checked={!ocultarAuto} onChange={(e) => setOcultarAuto(!e.target.checked)} />
              Mostrar também a dica automática (calculada pelos acordes)
            </label>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            {temPratica && (
              <button type="button" onClick={() => gravar("", ocultarAuto)} disabled={salvando}
                className="h-9 px-3 rounded-lg border border-[#E6C3B8] text-sm text-[#A0412D] flex items-center gap-1 mr-auto"><Trash2 className="w-4 h-4" /> Apagar minha dica</button>
            )}
            <button type="button" onClick={() => setEditando(false)} disabled={salvando}
              className="h-9 px-3 rounded-lg border border-[#E6DCC8] text-sm text-[#6B4F2E] flex items-center gap-1"><X className="w-4 h-4" /> Cancelar</button>
            <button type="button" onClick={() => gravar(rascunho, ocultarAuto)} disabled={salvando}
              className="h-9 px-3 rounded-lg bg-[#6B4F2E] text-[#FFFDF8] text-sm font-semibold flex items-center gap-1">
              {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar
            </button>
          </div>
        </div>
      ) : temPratica ? (
        <div className="rounded-xl bg-[#FFFDF8] border border-[#E8C98F] p-3">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <p className="text-xs font-bold uppercase tracking-wide text-[#B5652B]">Dica do professor</p>
            {podeEditar && (
              <button type="button" onClick={() => abrirEditor(false)}
                className="text-xs font-semibold text-[#6B4F2E] flex items-center gap-1 underline"><Pencil className="w-3.5 h-3.5" /> Editar</button>
            )}
          </div>
          <DicaPratica texto={dicaPratica} />
        </div>
      ) : podeEditar ? (
        <button type="button" onClick={() => abrirEditor(false)}
          className="w-full rounded-xl border border-dashed border-[#E8C98F] p-2.5 text-sm font-semibold text-[#8A5A1E] flex items-center justify-center gap-1.5 hover:bg-[#FFFDF8]">
          <Pencil className="w-4 h-4" /> Escrever dica prática desta música
        </button>
      ) : null}

      {podeEditar && !editando && dica && dicaAutoOculta && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-dashed border-[#E6DCC8] px-3 py-2 text-xs text-[#8B7355]">
          <span className="flex items-center gap-1"><EyeOff className="w-3.5 h-3.5" /> Dica automática oculta nesta música (só você vê este aviso)</span>
          <button type="button" disabled={salvando} onClick={() => gravar(dicaPratica, false)} className="font-semibold text-[#6B4F2E] underline flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> Mostrar</button>
        </div>
      )}

      {mostraAuto && (
      <div ref={autoRef} className="space-y-3">
      {podeEditar && !editando && (
        <div className="flex flex-wrap items-center justify-end gap-3 text-xs">
          <button type="button" onClick={() => abrirEditor(true)} className="font-semibold text-[#6B4F2E] underline flex items-center gap-1"><Pencil className="w-3.5 h-3.5" /> Editar dica automática</button>
          <button type="button" disabled={salvando} onClick={() => gravar(dicaPratica, true)} className="font-semibold text-[#A0412D] underline flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> Apagar dica automática</button>
        </div>
      )}
      <div data-dica-item className="rounded-xl bg-[#FFFDF8] border border-[#F0DDB8] p-3 text-sm text-[#3B2A1A]">
        {pestana.length ? (
          <>
            Esta música tem acorde com pestana no {nomeIns === "viola" ? "braço da viola" : "violão"}:{" "}
            {pestana.map((a) => <Chip key={a}>{a}</Chip>)}.
            {!capo && !outroTom && " São poucos — vale treinar devagar só a troca para eles."}
          </>
        ) : (
          <>✓ Nenhum acorde desta música pede pestana na {nomeIns === "viola" ? "viola" : "violão"}.</>
        )}
      </div>

      <ul className="list-disc pl-5 space-y-2 text-sm text-[#3B2A1A] marker:text-[#B5652B]">
        {capo && (
          <Item>
            <b>Atalho:</b> com capotraste na <b>{capo.casa}ª casa</b>, você toca com desenhos mais fáceis
            {capo.comPestana === 0 ? ", sem nenhuma pestana" : ""}:{" "}
            {capo.desenhos.map((d) => <Chip key={d.de}>{d.para}</Chip>)}
            <span className="text-[#8B7355]"> (no lugar de {capo.desenhos.map((d) => d.de).join(", ")}). O tom que soa continua o mesmo.</span>
          </Item>
        )}
        {outroTom && (
          <Item>
            <b>Tocando sem cantor?</b> Em <b>{tom ? transposeKey(tom, outroTom.semitons) : `${outroTom.semitons > 0 ? "+" : ""}${outroTom.semitons} semitons`}</b> a música fica
            {outroTom.comPestana === 0 ? " sem pestana" : " mais fácil"}:{" "}
            {outroTom.desenhos.map((d) => <Chip key={d.de}>{d.para}</Chip>)}.{" "}
            {onAbrirTom && <button type="button" onClick={onAbrirTom} className="underline font-semibold text-[#6B4F2E]">Mudar tom</button>}
          </Item>
        )}
        {enfeites.length > 0 && (
          <Item>
            <b>Acorde enfeitado travou?</b> Toque o básico: {enfeites.map((e) => <span key={e.de}><Chip>{e.de}</Chip>→<Chip>{e.para}</Chip> </span>)}
            — muda pouco o som e não atrapalha.{" "}
            {onAbrirSimplificar && <button type="button" onClick={onAbrirSimplificar} className="underline font-semibold text-[#6B4F2E]">Simplificar</button>}
          </Item>
        )}
        {temDiminuto && (
          <Item>O acorde diminuto (<b>°</b>) é só uma passagem rápida entre dois acordes: não precisa segurar muito.</Item>
        )}
        {barras.length > 0 && (
          <Item>
            Baixo trocado ({barras.slice(0, 3).map((b) => <Chip key={b}>{b}</Chip>)}):{" "}
            {instrumento === "viola"
              ? "na viola dá para tocar só o acorde antes da barra — o baixo fica com o violão ou o contrabaixo."
              : "a nota depois da barra é o baixo; toque-a na corda mais grave."}
          </Item>
        )}
      </ul>
      <p className="text-[11px] text-[#A68A64]">Dica calculada pelos acordes da cifra, para {inst.nome}{instrumento === "viola" ? ` em ${inst.afinacao}` : ""}. Os desenhos estão no fim da música.</p>
      </div>
      )}
    </div>
  );
}
