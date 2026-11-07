import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Music2, 
  Guitar, 
  Hand, 
  Drum,
  CheckCircle,
  Circle,
  Trophy,
  Star,
  RotateCcw,
  ChevronRight,
  Clock,
  Target,
  Flame,
  Award
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Metronome from "../tools/Metronome";

// Banco de exercícios organizados por categoria e dificuldade
const EXERCISES_DATABASE = {
  palhetada: {
    icon: Guitar,
    color: "bg-orange-500",
    colorLight: "bg-orange-100 text-orange-800 border-orange-200",
    title: "Palhetada",
    description: "Técnicas de palhetada alternada, sweep e economia",
    exercises: {
      iniciante: [
        {
          id: "pal-ini-1",
          title: "Palhetada Alternada Básica",
          duration: 5,
          instructions: [
            "Posicione a palheta entre o polegar e indicador",
            "Toque a corda Mi grave (6ª) para baixo",
            "Toque a mesma corda para cima",
            "Alterne baixo-cima em ritmo constante",
            "Use metrônomo em 60 BPM",
            "Repita por 2 minutos sem parar"
          ],
          tips: ["Mantenha o pulso relaxado", "Movimentos pequenos e precisos", "Não force a palheta"],
          goals: ["Desenvolver coordenação básica", "Criar consistência no ataque"]
        },
        {
          id: "pal-ini-2",
          title: "Mudança de Cordas",
          duration: 5,
          instructions: [
            "Comece na 6ª corda com palhetada alternada",
            "Após 4 batidas, mude para a 5ª corda",
            "Continue até chegar na 1ª corda",
            "Volte da 1ª até a 6ª corda",
            "Metrônomo em 60 BPM"
          ],
          tips: ["Olhe para as cordas no início", "Minimize o movimento do braço"],
          goals: ["Precisão na troca de cordas", "Fluidez no movimento"]
        }
      ],
      intermediario: [
        {
          id: "pal-int-1",
          title: "Palhetada em Escalas",
          duration: 10,
          instructions: [
            "Escolha a escala pentatônica de Am",
            "Toque cada nota com palhetada alternada",
            "Suba e desça a escala 2 oitavas",
            "Metrônomo em 80 BPM",
            "Aumente 5 BPM quando dominar"
          ],
          tips: ["Cada nota deve ter volume igual", "Sincronize mão esquerda e direita"],
          goals: ["Velocidade controlada", "Sincronização das mãos"]
        },
        {
          id: "pal-int-2",
          title: "Acentuação Rítmica",
          duration: 8,
          instructions: [
            "Toque 4 notas por tempo em uma corda",
            "Acentue apenas a primeira nota de cada grupo",
            "Metrônomo em 70 BPM",
            "Pratique por 5 minutos",
            "Mude o acento para a 3ª nota"
          ],
          tips: ["O acento vem do pulso, não do braço", "Mantenha as não-acentuadas suaves"],
          goals: ["Controle dinâmico", "Independência rítmica"]
        }
      ],
      avancado: [
        {
          id: "pal-ava-1",
          title: "Economy Picking",
          duration: 15,
          instructions: [
            "Pratique arpejos de 3 notas por corda",
            "Use sweep ao mudar para corda adjacente na mesma direção",
            "Comece lento: 60 BPM em colcheias",
            "Toque o arpejo de Am: A-C-E em 3 cordas",
            "Suba e desça sem interromper"
          ],
          tips: ["O sweep é um movimento contínuo", "Silencie cordas que não está tocando"],
          goals: ["Eficiência de movimento", "Velocidade em arpejos"]
        }
      ],
      expert: [
        {
          id: "pal-exp-1",
          title: "Sweep Picking Completo",
          duration: 20,
          instructions: [
            "Pratique arpejo de Am em 5 cordas",
            "Movimento de varredura contínuo",
            "Sincronize perfeitamente com mão esquerda",
            "Comece em 50 BPM",
            "Adicione hammer-on no topo do arpejo"
          ],
          tips: ["Cada nota deve soar limpa", "Pratique a subida e descida separadamente"],
          goals: ["Domínio completo de sweep", "Limpeza em alta velocidade"]
        }
      ]
    }
  },
  dedilhado: {
    icon: Hand,
    color: "bg-blue-500",
    colorLight: "bg-blue-100 text-blue-800 border-blue-200",
    title: "Dedilhado",
    description: "Técnicas de fingerpicking e dedilhado clássico",
    exercises: {
      iniciante: [
        {
          id: "ded-ini-1",
          title: "Padrão PIMA Básico",
          duration: 5,
          instructions: [
            "P (polegar) = cordas 6, 5, 4",
            "I (indicador) = corda 3",
            "M (médio) = corda 2",
            "A (anelar) = corda 1",
            "Toque P-I-M-A em sequência",
            "Use acorde de C aberto"
          ],
          tips: ["Dedos curvados naturalmente", "Não olhe para a mão direita"],
          goals: ["Independência dos dedos", "Posicionamento correto"]
        },
        {
          id: "ded-ini-2",
          title: "Arpejo Simples",
          duration: 5,
          instructions: [
            "Forme o acorde de Am",
            "Toque: P (5ª) - I (3ª) - M (2ª) - A (1ª)",
            "Repita o padrão continuamente",
            "Metrônomo em 50 BPM",
            "Cada nota = 1 tempo"
          ],
          tips: ["Mantenha o acorde pressionado", "Som deve ser uniforme"],
          goals: ["Fluidez no arpejo", "Consistência sonora"]
        }
      ],
      intermediario: [
        {
          id: "ded-int-1",
          title: "Travis Picking",
          duration: 10,
          instructions: [
            "Polegar alterna entre baixos (6-4 ou 5-4)",
            "Dedos I-M tocam melodia nas agudas",
            "Comece com acorde de C",
            "P toca no tempo, dedos no contratempo",
            "Metrônomo em 60 BPM"
          ],
          tips: ["Polegar é a base rítmica", "Pratique o baixo isoladamente primeiro"],
          goals: ["Independência polegar/dedos", "Groove country/folk"]
        },
        {
          id: "ded-int-2",
          title: "Padrão de Bossa Nova",
          duration: 12,
          instructions: [
            "Acorde de Am7",
            "Polegar toca baixo no tempo 1 e 3",
            "Dedos I-M-A tocam juntos no '2 e' e '4 e'",
            "Padrão: P - xxx - P - xxx",
            "Metrônomo em 70 BPM"
          ],
          tips: ["Síncope é característica da bossa", "Ataque suave nas agudas"],
          goals: ["Ritmo sincopado", "Sonoridade brasileira"]
        }
      ],
      avancado: [
        {
          id: "ded-ava-1",
          title: "Fingerstyle Melódico",
          duration: 15,
          instructions: [
            "Toque melodia na 1ª corda com anelar",
            "Baixo alternado com polegar",
            "Preencha harmonia com I e M",
            "Escolha uma melodia simples conhecida",
            "Adapte para fingerstyle"
          ],
          tips: ["Destaque a melodia com mais volume", "Baixo e harmonia mais suaves"],
          goals: ["Arranjo solo", "Controle de vozes"]
        }
      ],
      expert: [
        {
          id: "ded-exp-1",
          title: "Percussivo + Dedilhado",
          duration: 20,
          instructions: [
            "Adicione slaps no corpo do violão",
            "Combine com padrão de dedilhado",
            "Tempo 1: slap com palma",
            "Tempos 2-3-4: padrão de dedilhado",
            "Crie groove percussivo"
          ],
          tips: ["Slap não deve atrapalhar as notas", "Pratique cada elemento separado"],
          goals: ["Técnica percussiva", "Performance solo completa"]
        }
      ]
    }
  },
  acordes: {
    icon: Music2,
    color: "bg-purple-500",
    colorLight: "bg-purple-100 text-purple-800 border-purple-200",
    title: "Acordes",
    description: "Formação, transição e voicings de acordes",
    exercises: {
      iniciante: [
        {
          id: "aco-ini-1",
          title: "Acordes Abertos Maiores",
          duration: 10,
          instructions: [
            "Pratique formar C, G, D, A, E",
            "Mantenha cada acorde por 10 segundos",
            "Toque todas as cordas, verifique se soam limpas",
            "Corrija dedos que abafam cordas",
            "Repita o ciclo 3 vezes"
          ],
          tips: ["Dedos na ponta, próximos ao traste", "Polegar atrás do braço"],
          goals: ["Formação limpa", "Memorização das shapes"]
        },
        {
          id: "aco-ini-2",
          title: "Transição C - G",
          duration: 8,
          instructions: [
            "Forme o acorde de C",
            "Toque 4 batidas",
            "Mude para G",
            "Toque 4 batidas",
            "Metrônomo em 60 BPM",
            "Minimize o tempo de transição"
          ],
          tips: ["Visualize o próximo acorde antes de mudar", "Dedo guia: mantenha um dedo como referência"],
          goals: ["Transição suave", "Timing consistente"]
        }
      ],
      intermediario: [
        {
          id: "aco-int-1",
          title: "Acordes com Pestana",
          duration: 15,
          instructions: [
            "Pratique F maior (pestana na 1ª casa)",
            "Indicador reto cobrindo todas as cordas",
            "Polegar atrás do braço, oposto ao indicador",
            "Toque corda por corda verificando som",
            "Mantenha por 30 segundos, descanse, repita"
          ],
          tips: ["Use o lado do indicador", "Pressão vem do braço, não só do dedo"],
          goals: ["Pestana limpa", "Resistência muscular"]
        },
        {
          id: "aco-int-2",
          title: "Progressão I-IV-V-I",
          duration: 10,
          instructions: [
            "Em G: G - C - D - G",
            "4 batidas por acorde",
            "Metrônomo em 80 BPM",
            "Repita até fluir naturalmente",
            "Mude para outras tonalidades"
          ],
          tips: ["Antecipe mentalmente cada mudança", "Pratique as transições problemáticas isoladamente"],
          goals: ["Fluência em progressões", "Versatilidade tonal"]
        }
      ],
      avancado: [
        {
          id: "aco-ava-1",
          title: "Voicings de Jazz",
          duration: 15,
          instructions: [
            "Aprenda Dm7 - G7 - Cmaj7",
            "Use voicings com fundamental na 5ª corda",
            "Pratique ii-V-I em várias posições",
            "Adicione extensões (9, 11, 13)",
            "Metrônomo em 60 BPM"
          ],
          tips: ["Menos é mais em voicings", "Omita a 5ª para ganhar espaço"],
          goals: ["Vocabulário harmônico", "Sonoridade sofisticada"]
        }
      ],
      expert: [
        {
          id: "aco-exp-1",
          title: "Chord Melody",
          duration: 25,
          instructions: [
            "Escolha uma melodia simples",
            "Harmonize cada nota da melodia",
            "Melodia sempre na voz mais aguda",
            "Use inversões para movimento suave",
            "Pratique compassos individualmente"
          ],
          tips: ["Analise a harmonia original", "Simplifique onde necessário"],
          goals: ["Arranjo completo", "Independência de vozes"]
        }
      ]
    }
  },
  ritmo: {
    icon: Drum,
    color: "bg-green-500",
    colorLight: "bg-green-100 text-green-800 border-green-200",
    title: "Ritmo",
    description: "Padrões rítmicos, síncopes e grooves",
    exercises: {
      iniciante: [
        {
          id: "rit-ini-1",
          title: "Batida Básica 4/4",
          duration: 5,
          instructions: [
            "Conte: 1 - 2 - 3 - 4",
            "Toque para baixo em cada número",
            "Metrônomo em 70 BPM",
            "Mantenha braço relaxado",
            "Pratique por 3 minutos"
          ],
          tips: ["Movimento vem do cotovelo", "Pulso solto como um pêndulo"],
          goals: ["Manter tempo", "Relaxamento"]
        },
        {
          id: "rit-ini-2",
          title: "Padrão Baixo-Cima",
          duration: 5,
          instructions: [
            "Conte: 1 e 2 e 3 e 4 e",
            "Baixo nos números, cima no 'e'",
            "Metrônomo em 60 BPM",
            "Braço em movimento constante",
            "Mesmo sem tocar, mantenha o movimento"
          ],
          tips: ["Nunca pare o braço", "Silencie quando necessário, mas mova"],
          goals: ["Subdivisão rítmica", "Movimento contínuo"]
        }
      ],
      intermediario: [
        {
          id: "rit-int-1",
          title: "Ritmo de Guarânia",
          duration: 10,
          instructions: [
            "Compasso 3/4",
            "Padrão: Baixo (1) - Cima (2) - Cima (3)",
            "Acentue o tempo 1",
            "Metrônomo em 80 BPM",
            "Use acorde de Am"
          ],
          tips: ["Tempo 1 mais forte", "Característica: leveza nos tempos 2 e 3"],
          goals: ["Domínio do 3/4", "Feeling sertanejo"]
        },
        {
          id: "rit-int-2",
          title: "Síncope Brasileira",
          duration: 12,
          instructions: [
            "Padrão: 1 - - e - 2 e - - 4 -",
            "Acentue o 'e' do 2",
            "Metrônomo em 70 BPM",
            "Pratique apenas o padrão rítmico primeiro",
            "Adicione acordes depois"
          ],
          tips: ["A síncope é o coração do samba/bossa", "Sinta o balanço"],
          goals: ["Ritmo sincopado", "Groove brasileiro"]
        }
      ],
      avancado: [
        {
          id: "rit-ava-1",
          title: "Polirritimia 3 sobre 4",
          duration: 15,
          instructions: [
            "Mão direita: 4 batidas por compasso",
            "Pé: 3 batidas por compasso",
            "Comece muito lento",
            "Metrônomo em 50 BPM",
            "Pratique cada mão/pé separado"
          ],
          tips: ["Paciência é fundamental", "Use padrões de acentuação"],
          goals: ["Independência rítmica", "Coordenação avançada"]
        }
      ],
      expert: [
        {
          id: "rit-exp-1",
          title: "Odd Time Signatures",
          duration: 20,
          instructions: [
            "Pratique compasso 7/8",
            "Divida: 4+3 ou 3+4",
            "Crie um riff no padrão",
            "Metrônomo em 60 BPM",
            "Experimente 5/4 e 9/8"
          ],
          tips: ["Pense em agrupamentos", "Músicas de referência: Dave Brubeck, Tool"],
          goals: ["Compassos ímpares", "Criatividade rítmica"]
        }
      ]
    }
  }
};

const DIFFICULTY_LEVELS = [
  { id: "iniciante", label: "Iniciante", color: "bg-green-500", icon: "🌱" },
  { id: "intermediario", label: "Intermediário", color: "bg-yellow-500", icon: "🌿" },
  { id: "avancado", label: "Avançado", color: "bg-orange-500", icon: "🌳" },
  { id: "expert", label: "Expert", color: "bg-red-500", icon: "🔥" }
];

export default function InteractiveExercises() {
  const [selectedCategory, setSelectedCategory] = useState("palhetada");
  const [selectedDifficulty, setSelectedDifficulty] = useState("iniciante");
  const [activeExercise, setActiveExercise] = useState(null);
  const [completedExercises, setCompletedExercises] = useState({});
  const [currentStep, setCurrentStep] = useState(0);

  // Carregar progresso do localStorage
  useEffect(() => {
    const saved = localStorage.getItem('theoryExercisesProgress');
    if (saved) setCompletedExercises(JSON.parse(saved));
  }, []);

  // Salvar progresso
  useEffect(() => {
    localStorage.setItem('theoryExercisesProgress', JSON.stringify(completedExercises));
  }, [completedExercises]);

  const category = EXERCISES_DATABASE[selectedCategory];
  const exercises = category?.exercises[selectedDifficulty] || [];

  const markComplete = (exerciseId) => {
    const now = new Date().toISOString();
    setCompletedExercises(prev => ({
      ...prev,
      [exerciseId]: {
        completedAt: now,
        count: (prev[exerciseId]?.count || 0) + 1
      }
    }));
  };

  const getTotalCompleted = () => {
    return Object.keys(completedExercises).length;
  };

  const getTotalExercises = () => {
    let total = 0;
    Object.values(EXERCISES_DATABASE).forEach(cat => {
      Object.values(cat.exercises).forEach(diff => {
        total += diff.length;
      });
    });
    return total;
  };

  const getCategoryProgress = (catKey) => {
    const cat = EXERCISES_DATABASE[catKey];
    let completed = 0;
    let total = 0;
    Object.values(cat.exercises).forEach(diff => {
      diff.forEach(ex => {
        total++;
        if (completedExercises[ex.id]) completed++;
      });
    });
    return { completed, total, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
  };

  const getStreak = () => {
    // Simples: conta exercícios feitos hoje
    const today = new Date().toDateString();
    let streak = 0;
    Object.values(completedExercises).forEach(ex => {
      if (new Date(ex.completedAt).toDateString() === today) streak++;
    });
    return streak;
  };

  const CategoryIcon = category?.icon || Music2;

  return (
    <div className="space-y-6">
      {/* Header com estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-[#D4C5B0] bg-gradient-to-br from-[#8B6F47] to-[#A68A64] text-white">
          <CardContent className="p-4 text-center">
            <Trophy className="w-6 h-6 mx-auto mb-1" />
            <p className="text-2xl font-bold">{getTotalCompleted()}</p>
            <p className="text-xs opacity-80">Completados</p>
          </CardContent>
        </Card>
        <Card className="border-[#D4C5B0] bg-gradient-to-br from-[#D4AF37] to-[#9CAF88] text-white">
          <CardContent className="p-4 text-center">
            <Target className="w-6 h-6 mx-auto mb-1" />
            <p className="text-2xl font-bold">{getTotalExercises()}</p>
            <p className="text-xs opacity-80">Total</p>
          </CardContent>
        </Card>
        <Card className="border-[#D4C5B0] bg-gradient-to-br from-[#9CAF88] to-[#8B6F47] text-white">
          <CardContent className="p-4 text-center">
            <Flame className="w-6 h-6 mx-auto mb-1" />
            <p className="text-2xl font-bold">{getStreak()}</p>
            <p className="text-xs opacity-80">Hoje</p>
          </CardContent>
        </Card>
        <Card className="border-[#D4C5B0] bg-gradient-to-br from-purple-500 to-pink-500 text-white">
          <CardContent className="p-4 text-center">
            <Award className="w-6 h-6 mx-auto mb-1" />
            <p className="text-2xl font-bold">{Math.round((getTotalCompleted() / getTotalExercises()) * 100)}%</p>
            <p className="text-xs opacity-80">Progresso</p>
          </CardContent>
        </Card>
      </div>

      {/* Seletor de Categorias */}
      <Card className="border-[#D4C5B0] bg-white/80">
        <CardHeader className="pb-2">
          <CardTitle className="text-[#8B6F47] text-lg">Categoria de Exercício</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(EXERCISES_DATABASE).map(([key, cat]) => {
              const Icon = cat.icon;
              const progress = getCategoryProgress(key);
              return (
                <motion.div
                  key={key}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card 
                    className={`cursor-pointer transition-all ${
                      selectedCategory === key 
                        ? 'ring-2 ring-[#8B6F47] bg-[#8B6F47]/10' 
                        : 'hover:shadow-md'
                    }`}
                    onClick={() => setSelectedCategory(key)}
                  >
                    <CardContent className="p-4 text-center">
                      <div className={`w-12 h-12 ${cat.color} rounded-full mx-auto mb-2 flex items-center justify-center`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <p className="font-bold text-[#8B6F47]">{cat.title}</p>
                      <Progress value={progress.percentage} className="h-1 mt-2" />
                      <p className="text-xs text-[#A68A64] mt-1">{progress.completed}/{progress.total}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Seletor de Dificuldade */}
      <Card className="border-[#D4C5B0] bg-white/80">
        <CardHeader className="pb-2">
          <CardTitle className="text-[#8B6F47] text-lg flex items-center gap-2">
            <CategoryIcon className="w-5 h-5" />
            {category?.title} - Nível de Dificuldade
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {DIFFICULTY_LEVELS.map(level => {
              const levelExercises = category?.exercises[level.id] || [];
              const completedCount = levelExercises.filter(ex => completedExercises[ex.id]).length;
              return (
                <Button
                  key={level.id}
                  variant={selectedDifficulty === level.id ? "default" : "outline"}
                  onClick={() => setSelectedDifficulty(level.id)}
                  className={selectedDifficulty === level.id 
                    ? `${level.color} text-white` 
                    : 'border-[#D4C5B0]'
                  }
                >
                  <span className="mr-2">{level.icon}</span>
                  {level.label}
                  <Badge className="ml-2 bg-white/20 text-inherit">
                    {completedCount}/{levelExercises.length}
                  </Badge>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Lista de Exercícios */}
      <div className="space-y-3">
        <AnimatePresence>
          {exercises.map((exercise, index) => {
            const isCompleted = !!completedExercises[exercise.id];
            const isActive = activeExercise === exercise.id;
            
            return (
              <motion.div
                key={exercise.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card 
                  className={`border-[#D4C5B0] transition-all ${
                    isActive ? 'ring-2 ring-[#8B6F47]' : ''
                  } ${isCompleted ? 'bg-[#9CAF88]/10' : 'bg-white/80'}`}
                >
                  <CardContent className="p-4">
                    {/* Cabeçalho do exercício */}
                    <div 
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => {
                        setActiveExercise(isActive ? null : exercise.id);
                        setCurrentStep(0);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        {isCompleted ? (
                          <CheckCircle className="w-6 h-6 text-[#9CAF88]" />
                        ) : (
                          <Circle className="w-6 h-6 text-[#D4C5B0]" />
                        )}
                        <div>
                          <h3 className="font-bold text-[#8B6F47]">{exercise.title}</h3>
                          <div className="flex items-center gap-2 text-sm text-[#A68A64]">
                            <Clock className="w-4 h-4" />
                            {exercise.duration} min
                            {isCompleted && (
                              <Badge className="bg-[#9CAF88] text-white text-xs">
                                ✓ {completedExercises[exercise.id].count}x
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className={`w-5 h-5 text-[#A68A64] transition-transform ${isActive ? 'rotate-90' : ''}`} />
                    </div>

                    {/* Conteúdo expandido */}
                    <AnimatePresence>
                      {isActive && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4 pt-4 border-t border-[#D4C5B0] space-y-4">
                            {/* Progresso dos passos */}
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-[#A68A64]">Passo {currentStep + 1} de {exercise.instructions.length}</span>
                              <Progress value={((currentStep + 1) / exercise.instructions.length) * 100} className="flex-1 h-2" />
                            </div>

                            {/* Instrução atual */}
                            <Card className="border-[#D4AF37] bg-[#D4AF37]/10">
                              <CardContent className="p-4">
                                <p className="text-lg text-[#8B6F47] font-medium">
                                  {currentStep + 1}. {exercise.instructions[currentStep]}
                                </p>
                              </CardContent>
                            </Card>

                            {/* Metrônomo compacto */}
                            <div className="my-4">
                              <p className="text-sm font-medium text-[#8B6F47] mb-2">🎵 Metrônomo:</p>
                              <Metronome compact initialBpm={60} />
                            </div>

                            {/* Navegação de passos */}
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={currentStep === 0}
                                onClick={() => setCurrentStep(currentStep - 1)}
                                className="border-[#D4C5B0]"
                              >
                                Anterior
                              </Button>
                              {currentStep < exercise.instructions.length - 1 ? (
                                <Button
                                  size="sm"
                                  onClick={() => setCurrentStep(currentStep + 1)}
                                  className="bg-[#8B6F47] hover:bg-[#A68A64]"
                                >
                                  Próximo
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    markComplete(exercise.id);
                                    setActiveExercise(null);
                                  }}
                                  className="bg-[#9CAF88] hover:bg-[#8B9F78]"
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Concluir
                                </Button>
                              )}
                            </div>

                            {/* Todas as instruções */}
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-[#8B6F47]">Todas as instruções:</p>
                              {exercise.instructions.map((inst, idx) => (
                                <div 
                                  key={idx} 
                                  className={`flex items-start gap-2 text-sm p-2 rounded ${
                                    idx === currentStep ? 'bg-[#8B6F47]/10' : ''
                                  } ${idx < currentStep ? 'text-[#9CAF88]' : 'text-[#A68A64]'}`}
                                >
                                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                                    idx < currentStep ? 'bg-[#9CAF88] text-white' : 
                                    idx === currentStep ? 'bg-[#8B6F47] text-white' : 'bg-[#E8DCC4]'
                                  }`}>
                                    {idx < currentStep ? '✓' : idx + 1}
                                  </span>
                                  {inst}
                                </div>
                              ))}
                            </div>

                            {/* Dicas */}
                            <Card className="border-[#9CAF88] bg-[#9CAF88]/10">
                              <CardContent className="p-3">
                                <p className="text-sm font-medium text-[#9CAF88] mb-2">💡 Dicas:</p>
                                <ul className="text-sm text-[#8B6F47] space-y-1">
                                  {exercise.tips.map((tip, idx) => (
                                    <li key={idx}>• {tip}</li>
                                  ))}
                                </ul>
                              </CardContent>
                            </Card>

                            {/* Objetivos */}
                            <Card className="border-purple-300 bg-purple-50">
                              <CardContent className="p-3">
                                <p className="text-sm font-medium text-purple-700 mb-2">🎯 Objetivos:</p>
                                <ul className="text-sm text-purple-600 space-y-1">
                                  {exercise.goals.map((goal, idx) => (
                                    <li key={idx}>• {goal}</li>
                                  ))}
                                </ul>
                              </CardContent>
                            </Card>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {exercises.length === 0 && (
        <Card className="border-[#D4C5B0] bg-white/80">
          <CardContent className="p-8 text-center">
            <CategoryIcon className="w-16 h-16 text-[#D4C5B0] mx-auto mb-4" />
            <h3 className="text-xl font-bold text-[#8B6F47] mb-2">Em breve!</h3>
            <p className="text-[#A68A64]">
              Novos exercícios de {category?.title} nível {DIFFICULTY_LEVELS.find(d => d.id === selectedDifficulty)?.label} estão sendo preparados.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Botão de reset */}
      {getTotalCompleted() > 0 && (
        <div className="text-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (confirm('Deseja resetar todo o progresso?')) {
                setCompletedExercises({});
              }
            }}
            className="text-red-500 border-red-300 hover:bg-red-50"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Resetar Progresso
          </Button>
        </div>
      )}
    </div>
  );
}