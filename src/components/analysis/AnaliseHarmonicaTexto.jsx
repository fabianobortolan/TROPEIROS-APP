import ReactMarkdown from "react-markdown";
import { BookOpen } from "lucide-react";

// Mostra a análise harmônica escrita da música (campo general_notes, em Markdown)
// com títulos, listas e destaques legíveis — no lugar do texto cru.
const comps = {
  h1: ({ children }) => <h2 className="text-lg md:text-xl font-bold text-[#5C3D20] leading-snug mb-2">{children}</h2>,
  h2: ({ children }) => <h3 className="text-sm font-bold uppercase tracking-wide text-[#B5652B] mt-5 mb-2">{children}</h3>,
  h3: ({ children }) => <h4 className="text-sm font-bold text-[#5C3D20] mt-3 mb-1">{children}</h4>,
  p: ({ children }) => <p className="text-[15px] leading-relaxed text-[#3B2A1A] mb-2">{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 mb-2 marker:text-[#B5652B]">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1 mb-2 marker:text-[#B5652B]">{children}</ol>,
  li: ({ children }) => <li className="text-[15px] leading-relaxed text-[#3B2A1A]">{children}</li>,
  strong: ({ children }) => <strong className="font-bold text-[#5C3D20]">{children}</strong>,
  em: ({ children }) => <em className="text-[#6B4F2E]">{children}</em>,
  code: ({ children }) => <code className="font-mono text-[13px] bg-[#F5EEDD] text-[#8A5A1E] rounded px-1">{children}</code>,
  table: ({ children }) => <div className="overflow-x-auto mb-3"><table className="text-sm border-collapse">{children}</table></div>,
  th: ({ children }) => <th className="border border-[#E6DCC8] bg-[#F5EEDD] px-2 py-1 text-left font-semibold text-[#5C3D20]">{children}</th>,
  td: ({ children }) => <td className="border border-[#E6DCC8] px-2 py-1 text-[#3B2A1A]">{children}</td>,
  hr: () => <hr className="my-4 border-[#E6DCC8]" />,
  a: ({ children, href }) => <a href={href} target="_blank" rel="noreferrer" className="underline text-[#8A5A1E]">{children}</a>,
};

export default function AnaliseHarmonicaTexto({ texto, compacto = false }) {
  if (!texto || !String(texto).trim()) return null;
  return (
    <section
      className={compacto ? "" : "rounded-2xl border border-[#E6DCC8] bg-[#FFFDF8] p-4 md:p-6"}
      aria-label="Análise harmônica da música"
    >
      {!compacto && (
        <p className="flex items-center gap-2 text-xs font-bold tracking-wide uppercase text-[#A68A64] mb-3">
          <BookOpen className="w-4 h-4" /> Análise harmônica
        </p>
      )}
      <ReactMarkdown components={comps}>{String(texto)}</ReactMarkdown>
    </section>
  );
}
