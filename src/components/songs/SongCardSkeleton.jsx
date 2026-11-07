import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function SongCardSkeleton() {
  return (
    <Card className="border-[#D4C5B0] bg-white/80 overflow-hidden">
      <CardContent className="p-4 pt-6 pb-6">
        <div className="flex flex-col gap-3">
          {/* Linha do título */}
          <div className="flex items-center gap-2">
            <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-3/4 rounded" />
              <Skeleton className="h-3 w-1/2 rounded" />
            </div>
            <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
          </div>

          {/* 5 botões em linha */}
          <div className="grid grid-cols-5 gap-1">
            {Array(5).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-lg" />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}