import React from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export default function SongDeleteButton({ song, currentUserEmail, onDelete }) {
  const canDelete = currentUserEmail === song.created_by;

  const handleClick = () => {
    if (!canDelete) {
      alert("❌ Você não pode excluir uma música criada por outro usuário.");
      return;
    }
    onDelete();
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      className="text-white hover:bg-red-500/30 rounded-full h-7 w-7 md:h-8 md:w-8 p-0 flex-shrink-0"
      disabled={!canDelete}
      title={canDelete ? "Excluir música" : "Você não pode excluir esta música"}
    >
      <Trash2 className="w-3 h-3 md:w-3.5 md:h-3.5" />
    </Button>
  );
}