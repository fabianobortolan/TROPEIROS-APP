import { INSTRUMENTOS } from "@/lib/acordesInstrumento";

// Desenho compacto de um acorde (viola: pares de cordas; violão: cordas simples).
// Ordem da esquerda para a direita = da mais grave para a mais aguda.
export default function DiagramaAcorde({ nome, desenho, instrumento = "viola", posicao, totalPosicoes, onClick }) {
  const inst = INSTRUMENTOS[instrumento];
  const n = inst.cordas.length;
  const esp = n === 5 ? 15 : 12.5; // espaço entre ordens
  const casaH = 15;
  const linhas = 4;
  const x0 = 12;
  const y0 = 16;
  const largura = x0 * 2 + esp * (n - 1) + 8;
  const altura = y0 + casaH * linhas + 16;
  const ehViola = instrumento === "viola";

  const trastes = desenho?.trastes || [];
  const presas = trastes.filter((f) => f !== null && f > 0);
  const max = presas.length ? Math.max(...presas) : 0;
  // começa na casa 1 quando cabe; senão a partir da menor casa presa
  const inicio = max <= linhas ? 1 : Math.min(...presas);
  const xDe = (i) => x0 + i * esp;
  const yDe = (casa) => y0 + (casa - inicio + 0.5) * casaH;
  const cor = "#6B4F2E";

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center rounded-xl px-1 pt-1 pb-0.5 hover:bg-[#F5EEDD] active:bg-[#EFE5CF] transition-colors"
      title={totalPosicoes > 1 ? "Toque para ver outra posição" : nome}
      aria-label={`Acorde ${nome}${totalPosicoes > 1 ? `, posição ${posicao} de ${totalPosicoes}` : ""}`}
    >
      <span className="text-sm font-bold text-[#B5652B] leading-tight">{nome}</span>
      {desenho ? (
        <svg width={largura} height={altura} viewBox={`0 0 ${largura} ${altura}`} role="img" aria-hidden="true">
          {/* pestana / capo da casa 1 */}
          {inicio === 1 ? (
            <rect x={x0 - 1} y={y0 - 3} width={esp * (n - 1) + 2} height={3} fill={cor} />
          ) : (
            <text x={x0 + esp * (n - 1) + 5} y={y0 + casaH * 0.5 + 3.5} fontSize="9" fill={cor} fontWeight="700">{inicio}</text>
          )}
          {/* casas */}
          {Array.from({ length: linhas + 1 }).map((_, i) => (
            <line key={`c${i}`} x1={x0} x2={x0 + esp * (n - 1)} y1={y0 + i * casaH} y2={y0 + i * casaH} stroke={cor} strokeWidth="1" opacity="0.7" />
          ))}
          {/* cordas */}
          {Array.from({ length: n }).map((_, i) =>
            ehViola ? (
              <g key={`s${i}`}>
                <line x1={xDe(i) - 1.3} x2={xDe(i) - 1.3} y1={y0} y2={y0 + casaH * linhas} stroke={cor} strokeWidth="0.8" />
                <line x1={xDe(i) + 1.3} x2={xDe(i) + 1.3} y1={y0} y2={y0 + casaH * linhas} stroke={cor} strokeWidth="0.8" />
              </g>
            ) : (
              <line key={`s${i}`} x1={xDe(i)} x2={xDe(i)} y1={y0} y2={y0 + casaH * linhas} stroke={cor} strokeWidth="1" />
            )
          )}
          {/* pestana */}
          {desenho.pestana && desenho.pestana.casa >= inicio && (
            <rect
              x={xDe(desenho.pestana.de) - 5}
              y={yDe(desenho.pestana.casa) - 5}
              width={xDe(n - 1) - xDe(desenho.pestana.de) + 10}
              height={10}
              rx={5}
              fill="#2D2116"
            />
          )}
          {/* x / o e dedos */}
          {trastes.map((f, i) => {
            if (f === null) {
              return (
                <text key={`t${i}`} x={xDe(i)} y={y0 - 6} fontSize="9" textAnchor="middle" fill="#8B7355">×</text>
              );
            }
            if (f === 0) {
              return <circle key={`t${i}`} cx={xDe(i)} cy={y0 - 8} r={3} fill="none" stroke="#8B7355" strokeWidth="1" />;
            }
            if (desenho.pestana && f === desenho.pestana.casa && i >= desenho.pestana.de) return null;
            return <circle key={`t${i}`} cx={xDe(i)} cy={yDe(f)} r={ehViola ? 5.2 : 4.6} fill="#2D2116" />;
          })}
          {/* afinação */}
          {inst.rotulos.map((r, i) => (
            <text key={`r${i}`} x={xDe(i)} y={altura - 3} fontSize="7" textAnchor="middle" fill="#A68A64">{r}</text>
          ))}
        </svg>
      ) : (
        <div style={{ width: largura, height: altura }} className="flex items-center justify-center text-[10px] text-[#A68A64] text-center px-1">
          sem desenho
        </div>
      )}
      {totalPosicoes > 1 && <span className="text-[9px] text-[#A68A64] leading-none">{posicao}/{totalPosicoes}</span>}
    </button>
  );
}
