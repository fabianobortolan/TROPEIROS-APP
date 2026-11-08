import React from "react";

// Marcador enquanto a lista carrega (mesmo formato da linha de música)
export default function SongCardSkeleton() {
  return (
    <div className="flex items-center gap-2 pl-3.5 pr-1.5 py-2 rounded-xl border border-[#E6DCC8] bg-[#FFFDF8] animate-pulse">
      <div className="flex-1 space-y-1.5">
        <div className="h-4 w-1/2 rounded bg-[#EFE6D3]" />
        <div className="h-3 w-1/3 rounded bg-[#F3ECDD]" />
      </div>
      <div className="h-9 w-20 rounded-lg bg-[#EFE6D3]" />
    </div>
  );
}
