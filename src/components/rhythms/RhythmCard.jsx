import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Music4, Edit, Trash2, Music } from "lucide-react";
import RhythmDiagram from "./RhythmDiagram";
import RhythmBackingTrack from "./RhythmBackingTrack";

export default function RhythmCard({ rhythm, onEdit, onDelete, onBackingTrackUpload, associatedSongs = [], isAdmin = false }) {
  return (
    <Card className="border-[#D4C5B0] bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
      <CardHeader className="border-b border-[#D4C5B0]/50">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <CardTitle className="text-[#8B6F47] flex items-center gap-2 mb-2">
              <Music4 className="w-5 h-5 text-[#9CAF88]" />
              {rhythm.name}
            </CardTitle>
            {rhythm.time_signature && (
              <Badge variant="outline" className="bg-[#F5F1E8] text-[#8B6F47] border-[#D4C5B0]">
                {rhythm.time_signature}
              </Badge>
            )}
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(rhythm)}
                className="text-[#8B6F47] hover:bg-[#8B6F47]/10"
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(rhythm)}
                className="text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-4 space-y-4">
        <RhythmDiagram rhythm={rhythm} />

        {/* Backing Track */}
        <RhythmBackingTrack
          rhythm={rhythm}
          isAdmin={isAdmin}
          onUpload={onBackingTrackUpload ? (file) => onBackingTrackUpload(rhythm, file) : null}
        />

        {rhythm.examples && rhythm.examples.length > 0 && (
          <div>
            <p className="text-xs text-[#A68A64] font-medium mb-2 uppercase">Exemplos de Músicas:</p>
            <div className="flex flex-wrap gap-2">
              {rhythm.examples.map((example, idx) => (
                <Badge key={idx} variant="outline" className="bg-[#9CAF88]/10 text-[#8B6F47] border-[#9CAF88]/30">
                  {example}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {associatedSongs.length > 0 && (
          <div className="pt-3 border-t border-[#D4C5B0]">
            <p className="text-xs text-[#A68A64] font-medium mb-2 uppercase flex items-center gap-1">
              <Music className="w-3 h-3" />
              Músicas usando este ritmo ({associatedSongs.length}):
            </p>
            <div className="flex flex-wrap gap-2">
              {associatedSongs.slice(0, 5).map((song, idx) => (
                <Badge key={idx} className="bg-gradient-to-r from-[#8B6F47] to-[#A68A64] text-white border-none text-xs">
                  {song.title}
                </Badge>
              ))}
              {associatedSongs.length > 5 && (
                <Badge variant="outline" className="text-[#8B6F47] border-[#8B6F47]/30 text-xs">
                  +{associatedSongs.length - 5}
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}