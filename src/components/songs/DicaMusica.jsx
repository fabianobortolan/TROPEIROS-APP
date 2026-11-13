import { useMemo } from "react";
import { INSTRUMENTOS, dicaDaMusica } from "@/lib/acordesInstrumento";
import { simplificarAcorde, temOQueSimplificar } from "@/utils/simplificarAcordes";
import { transposeKey } from "@/utils/transposition";
import { SeletorInstrumento } from "./AcordesDaMusica";

const Item = ({ children }) => <li className="pl-1">{children}</li>;
const Chip = ({ children }) => (
  <span className="inline-block font-mono font-bold text-[#B5652B] bg-[#FBF0E2] rounded px-1.5 py-0.5 mx-0.5 text-[13px]">{children}</span>
);

// Dica automática da música: pestana, capotraste, tom mais fácil, acordes enfeitados,
// diminuto e baixo trocado — calculada pelos desenhos do instrumento escolhido.
export default function DicaMusica({ texto, textoOriginal, tom, instrumento, onInstrumento, onAbrirSimplificar, onAbrirTom }) {
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

  if (!dica) return null;
  const { pestana, capo, tom: outroTom, temDiminuto, barras } = dica;
  const nomeIns = inst.nome.toLowerCase();

  return (
    <div className="rounded-2xl border border-[#E8C98F] bg-[#FFF8EC] p-3 md:p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-[#6B4F2E]">💡 Dica para tocar</p>
        <SeletorInstrumento valor={instrumento} onChange={onInstrumento} />
      </div>

      <div className="rounded-xl bg-[#FFFDF8] border border-[#F0DDB8] p-3 text-sm text-[#3B2A1A]">
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
  );
}
