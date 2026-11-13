import { useMemo, useState } from "react";
import { INSTRUMENTOS, acordesDaCifra, desenhosDoAcorde } from "@/lib/acordesInstrumento";
import DiagramaAcorde from "./DiagramaAcorde";

// Seletor Viola / Violão (usado aqui e na Dica)
export function SeletorInstrumento({ valor, onChange, className = "" }) {
  return (
    <div className={`inline-flex rounded-xl border border-[#E6DCC8] bg-[#FBF6EA] p-0.5 ${className}`} role="radiogroup" aria-label="Instrumento">
      {Object.values(INSTRUMENTOS).map((i) => (
        <button
          key={i.id}
          type="button"
          role="radio"
          aria-checked={valor === i.id}
          onClick={() => onChange(i.id)}
          className={`h-8 px-3 rounded-lg text-xs font-semibold ${valor === i.id ? "bg-[#6B4F2E] text-[#FFFDF8]" : "text-[#6B4F2E]"}`}
        >
          {i.nome}
        </button>
      ))}
    </div>
  );
}

// Lista, no fim da cifra, só os acordes usados na música, desenhados no instrumento escolhido.
export default function AcordesDaMusica({ texto, instrumento, onInstrumento }) {
  const acordes = useMemo(() => acordesDaCifra(texto), [texto]);
  const [escolha, setEscolha] = useState({}); // acorde → índice da posição mostrada
  const inst = INSTRUMENTOS[instrumento];

  const lista = useMemo(
    () => acordes.map((nome) => ({ nome, desenhos: desenhosDoAcorde(nome, instrumento) })),
    [acordes, instrumento]
  );

  if (!acordes.length) return null;

  return (
    <section className="rounded-2xl border border-[#E6DCC8] bg-[#FFFDF8] p-3 md:p-4" aria-label="Acordes desta música">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <h3 className="text-xs font-bold tracking-wide text-[#B5652B] uppercase">
          Acordes desta música{" "}
          <span className="font-semibold normal-case text-[#8B7355]">· {inst.nome} {instrumento === "viola" ? `(${inst.afinacao})` : ""}</span>
        </h3>
        <SeletorInstrumento valor={instrumento} onChange={onInstrumento} />
      </div>
      <div className="flex flex-wrap gap-x-1 gap-y-2">
        {lista.map(({ nome, desenhos }) => {
          const k = `${instrumento}|${nome}`;
          const i = (escolha[k] || 0) % Math.max(1, desenhos.length);
          return (
            <DiagramaAcorde
              key={k}
              nome={nome}
              instrumento={instrumento}
              desenho={desenhos[i]}
              posicao={i + 1}
              totalPosicoes={desenhos.length}
              onClick={() => desenhos.length > 1 && setEscolha((e) => ({ ...e, [k]: i + 1 }))}
            />
          );
        })}
      </div>
      <p className="text-[11px] text-[#A68A64] mt-2">
        Toque num acorde para ver outra posição no braço. Os desenhos seguem o tom e a simplificação escolhidos acima.
      </p>
    </section>
  );
}
