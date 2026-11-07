import React, { useState } from "react";
import { motion } from "framer-motion";
import { Dumbbell, Target, Music2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import InteractiveExercises from "../components/theory/InteractiveExercises";
import StudyGuides from "../components/theory/StudyGuides";

export default function TheoryExercises() {
  const [activeTab, setActiveTab] = useState("guides");

  return (
    <div className="bg-amber-50 p-4 min-h-screen md:p-8">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-[#8B6F47] mb-2 flex items-center gap-3">
            <BookOpen className="w-10 h-10" />
            Teoria Musical - Estudo & Prática
          </h1>
          <p className="text-[#A68A64]">
            Aprenda teoria musical com guias estruturados e pratique com exercícios interativos
          </p>
        </motion.div>

        <div className="flex gap-2 mb-6 p-1 bg-white rounded-xl shadow-sm">
          <Button
            onClick={() => setActiveTab("guides")}
            variant={activeTab === "guides" ? "default" : "ghost"}
            className={activeTab === "guides" 
              ? "flex-1 bg-gradient-to-r from-[#8B6F47] to-[#A68A64] text-white" 
              : "flex-1 text-[#8B6F47]"}
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Guias de Estudo
          </Button>
          <Button
            onClick={() => setActiveTab("exercises")}
            variant={activeTab === "exercises" ? "default" : "ghost"}
            className={activeTab === "exercises" 
              ? "flex-1 bg-gradient-to-r from-[#8B6F47] to-[#A68A64] text-white" 
              : "flex-1 text-[#8B6F47]"}
          >
            <Target className="w-4 h-4 mr-2" />
            Exercícios Práticos
          </Button>
        </div>

        {activeTab === "guides" ? <StudyGuides /> : <InteractiveExercises />}
      </div>
    </div>
  );
}