import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Trash2, Clock, Target, Music2, CheckCircle2 } from "lucide-react";

export default function ExerciseCard({ 
  exercise, 
  onView, 
  onDelete, 
  categoryLabels, 
  difficultyLabels, 
  difficultyColors 
}) {
  return (
    <Card className="border-[#D4C5B0] bg-white/80 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-lg text-[#8B6F47] mb-2">
              {exercise.title}
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-[#8B6F47] text-white">
                {categoryLabels[exercise.category] || exercise.category}
              </Badge>
              <Badge className={difficultyColors[exercise.difficulty]}>
                {difficultyLabels[exercise.difficulty] || exercise.difficulty}
              </Badge>
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={onView}
              className="text-[#8B6F47] hover:bg-[#8B6F47]/10">
              <Eye className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="text-red-600 hover:bg-red-50">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-gray-700 line-clamp-2">
          {exercise.description}
        </p>

        {exercise.song_title && (
          <div className="flex items-center gap-2 text-xs text-[#A68A64]">
            <Music2 className="w-3 h-3" />
            <span>{exercise.song_title}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-[#D4C5B0]">
          {exercise.duration_minutes && (
            <div className="flex items-center gap-1 text-xs text-[#A68A64]">
              <Clock className="w-3 h-3" />
              <span>{exercise.duration_minutes} min</span>
            </div>
          )}
          
          {exercise.completed_count > 0 && (
            <div className="flex items-center gap-1 text-xs text-[#9CAF88]">
              <CheckCircle2 className="w-3 h-3" />
              <span>{exercise.completed_count}x praticado</span>
            </div>
          )}
        </div>

        {exercise.goals && exercise.goals.length > 0 && (
          <div className="pt-2">
            <div className="flex items-start gap-2 text-xs">
              <Target className="w-3 h-3 text-[#D4AF37] mt-0.5 flex-shrink-0" />
              <span className="text-gray-600 line-clamp-2">
                {exercise.goals[0]}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}