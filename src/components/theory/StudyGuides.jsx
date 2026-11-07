import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookOpen, CheckCircle, XCircle, Star, ArrowRight, Award, Target, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const STUDY_GUIDES = [
  {
    id: "escalas-basicas",
    title: "Escalas Básicas",
    description: "Aprenda a construir e reconhecer escalas maiores e menores",
    difficulty: "iniciante",
    duration: "15 min",
    topics: [
      {
        title: "O que é uma Escala?",
        concept: "escala",
        content: "Uma escala é uma sequência ordenada de notas musicais que seguem um padrão de intervalos específico. É a base fundamental da melodia e harmonia.",
        dictionaryLink: "escala",
        examples: ["Escala de C Maior: C - D - E - F - G - A - B - C", "Escala de A Menor: A - B - C - D - E - F - G - A"]
      },
      {
        title: "Escala Maior - Estrutura",
        concept: "escala-maior",
        content: "A escala maior segue o padrão de intervalos: Tom - Tom - Semitom - Tom - Tom - Tom - Semitom (T-T-ST-T-T-T-ST)",
        dictionaryLink: "intervalo",
        examples: ["C Maior: C(T)D(T)E(ST)F(T)G(T)A(T)B(ST)C"]
      },
      {
        title: "Escala Menor Natural",
        concept: "escala-menor",
        content: "A escala menor natural segue: Tom - Semitom - Tom - Tom - Semitom - Tom - Tom (T-ST-T-T-ST-T-T)",
        dictionaryLink: "escala",
        examples: ["A Menor: A(T)B(ST)C(T)D(T)E(ST)F(T)G(T)A"]
      }
    ],
    exercises: [
      {
        question: "Qual o padrão de intervalos da escala MAIOR?",
        options: [
          "T-T-ST-T-T-T-ST",
          "T-ST-T-T-ST-T-T",
          "ST-T-T-ST-T-T-T",
          "T-T-T-ST-T-T-ST"
        ],
        correct: 0,
        explanation: "A escala maior segue sempre o padrão: Tom - Tom - Semitom - Tom - Tom - Tom - Semitom"
      },
      {
        question: "Quantas notas tem uma escala diatônica completa?",
        options: ["5 notas", "7 notas", "8 notas (contando a oitava)", "12 notas"],
        correct: 2,
        explanation: "Uma escala diatônica tem 7 notas diferentes, mas quando contamos até a oitava (repetição da primeira nota), temos 8 notas no total."
      },
      {
        question: "Se C é o 1º grau de C Maior, qual é o 5º grau?",
        options: ["E", "F", "G", "A"],
        correct: 2,
        explanation: "Em C Maior (C-D-E-F-G-A-B), o 5º grau é G. Este é o grau dominante, muito importante na harmonia."
      }
    ]
  },
  {
    id: "formacao-acordes",
    title: "Formação de Acordes",
    description: "Como construir acordes a partir de escalas e graus",
    difficulty: "iniciante",
    duration: "20 min",
    topics: [
      {
        title: "O que é um Acorde?",
        concept: "acorde",
        content: "Um acorde é formado por três ou mais notas tocadas simultaneamente. Os acordes mais básicos são as tríades, formadas por três notas.",
        dictionaryLink: "acorde",
        examples: ["C Maior: C + E + G", "A Menor: A + C + E"]
      },
      {
        title: "Tríades Maiores",
        concept: "triade-maior",
        content: "Uma tríade maior é formada pela 1ª, 3ª maior e 5ª justa da escala. Fórmula: 1 - 3M - 5J",
        dictionaryLink: "triade",
        examples: ["C = C(1ª) + E(3ª maior) + G(5ª justa)", "G = G + B + D"]
      },
      {
        title: "Tríades Menores",
        concept: "triade-menor",
        content: "Uma tríade menor é formada pela 1ª, 3ª menor e 5ª justa. Fórmula: 1 - 3m - 5J",
        dictionaryLink: "triade",
        examples: ["Am = A(1ª) + C(3ª menor) + E(5ª justa)", "Em = E + G + B"]
      },
      {
        title: "Campo Harmônico",
        concept: "campo-harmonico",
        content: "O campo harmônico é o conjunto de acordes formados a partir dos graus de uma escala. Em C Maior: I(C), ii(Dm), iii(Em), IV(F), V(G), vi(Am), vii°(Bdim)",
        dictionaryLink: "campo-harmonico",
        examples: ["C Maior: C - Dm - Em - F - G - Am - Bdim"]
      }
    ],
    exercises: [
      {
        question: "Quais notas formam o acorde de C Maior?",
        options: ["C - E - G", "C - D - E", "C - Eb - G", "C - F - A"],
        correct: 0,
        explanation: "C Maior é formado pela tônica (C), terça maior (E) e quinta justa (G)."
      },
      {
        question: "Qual a diferença entre C e Cm?",
        options: [
          "A quinta é diferente",
          "A terça: E (maior) vs Eb (menor)",
          "O baixo é diferente",
          "Não há diferença"
        ],
        correct: 1,
        explanation: "A diferença está na terça: C Maior tem E (terça maior), Cm tem Eb (terça menor)."
      },
      {
        question: "No campo harmônico de C Maior, qual é o acorde do II grau?",
        options: ["C", "Dm", "Em", "F"],
        correct: 1,
        explanation: "O II grau de C Maior é Dm (ré menor). É um acorde menor construído sobre a segunda nota da escala."
      }
    ]
  },
  {
    id: "progressoes-harmonicas",
    title: "Progressões Harmônicas",
    description: "Entenda como funcionam as progressões e cadências",
    difficulty: "intermediario",
    duration: "25 min",
    topics: [
      {
        title: "O que é uma Progressão?",
        concept: "progressao",
        content: "Uma progressão harmônica é uma sequência de acordes que cria uma sensação de movimento e direção musical. Algumas progressões são muito comuns e reconhecíveis.",
        dictionaryLink: "progressao",
        examples: ["I-IV-V-I (C-F-G-C)", "I-V-vi-IV (C-G-Am-F)"]
      },
      {
        title: "Funções Harmônicas",
        concept: "funcoes",
        content: "Cada grau tem uma função: Tônica (I) = repouso, Dominante (V) = tensão, Subdominante (IV) = preparação.",
        dictionaryLink: "funcao-harmonica",
        examples: ["Tônica: I, vi", "Dominante: V, vii°", "Subdominante: IV, ii"]
      },
      {
        title: "Cadências",
        concept: "cadencias",
        content: "Cadências são progressões que criam finalizações. A cadência perfeita V-I é a mais conclusiva.",
        dictionaryLink: "cadencia",
        examples: ["Cadência Autêntica: V7-I (G7-C)", "Cadência Plagal: IV-I (F-C)"]
      }
    ],
    exercises: [
      {
        question: "Qual a função do acorde V (dominante)?",
        options: [
          "Criar repouso e estabilidade",
          "Criar tensão que busca resolução",
          "Preparar o dominante",
          "Finalizar a música"
        ],
        correct: 1,
        explanation: "O acorde V (dominante) cria tensão que naturalmente busca resolver para o I (tônica), criando movimento e direção."
      },
      {
        question: "Qual progressão é conhecida como 'Pop Chord Progression'?",
        options: ["I-IV-V-I", "I-V-vi-IV", "ii-V-I", "I-vi-IV-V"],
        correct: 1,
        explanation: "A progressão I-V-vi-IV é extremamente popular na música pop moderna (ex: C-G-Am-F)."
      },
      {
        question: "O que caracteriza uma cadência perfeita?",
        options: [
          "IV resolve em I",
          "V resolve em I",
          "I resolve em V",
          "vi resolve em IV"
        ],
        correct: 1,
        explanation: "A cadência perfeita (ou autêntica) acontece quando o acorde V (dominante) resolve no I (tônica), criando uma finalização forte."
      }
    ]
  },
  {
    id: "intervalos",
    title: "Intervalos Musicais",
    description: "Distâncias entre notas e sua classificação",
    difficulty: "intermediario",
    duration: "20 min",
    topics: [
      {
        title: "O que são Intervalos?",
        concept: "intervalo",
        content: "Intervalo é a distância entre duas notas musicais. Podem ser melódicos (notas tocadas em sequência) ou harmônicos (notas tocadas simultaneamente).",
        dictionaryLink: "intervalo",
        examples: ["2ª Maior: C-D (1 tom)", "3ª Maior: C-E (2 tons)"]
      },
      {
        title: "Classificação de Intervalos",
        concept: "tipos-intervalos",
        content: "Intervalos são classificados por: distância numérica (2ª, 3ª, 4ª...) e qualidade (maior, menor, justo, aumentado, diminuto).",
        dictionaryLink: "intervalo",
        examples: ["3ª Maior: 2 tons", "3ª Menor: 1 tom e meio", "5ª Justa: 3 tons e meio"]
      },
      {
        title: "Intervalos Importantes",
        concept: "intervalos-pratica",
        content: "A 3ª define se o acorde é maior ou menor. A 5ª dá estabilidade. A 7ª adiciona cor e tensão.",
        dictionaryLink: "setima",
        examples: ["C com 3ª maior = C maior", "C com 3ª menor = C menor", "C com 7ª menor = C7"]
      }
    ],
    exercises: [
      {
        question: "Quantos tons tem uma 3ª MAIOR?",
        options: ["1 tom", "1,5 tons", "2 tons", "2,5 tons"],
        correct: 2,
        explanation: "Uma 3ª maior tem 2 tons de distância (ex: C até E = C-D-E, com 1 tom + 1 tom)."
      },
      {
        question: "Qual intervalo define se um acorde é maior ou menor?",
        options: ["A 2ª", "A 3ª", "A 5ª", "A 7ª"],
        correct: 1,
        explanation: "A terça (3ª) é o intervalo que define a qualidade do acorde: 3ª maior = acorde maior, 3ª menor = acorde menor."
      },
      {
        question: "Qual é o intervalo de C para G?",
        options: ["4ª Justa", "5ª Justa", "6ª Maior", "5ª Diminuta"],
        correct: 1,
        explanation: "De C para G temos 5 notas (C-D-E-F-G), formando uma 5ª Justa (3,5 tons)."
      }
    ]
  }
];

const difficultyColors = {
  iniciante: "bg-green-100 text-green-800 border-green-300",
  intermediario: "bg-blue-100 text-blue-800 border-blue-300",
  avancado: "bg-purple-100 text-purple-800 border-purple-300"
};

const difficultyLabels = {
  iniciante: "Iniciante",
  intermediario: "Intermediário",
  avancado: "Avançado"
};

export default function StudyGuides() {
  const navigate = useNavigate();
  const [selectedGuide, setSelectedGuide] = useState(null);
  const [currentTopicIndex, setCurrentTopicIndex] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [completedGuides, setCompletedGuides] = useState(() => {
    const saved = localStorage.getItem('completed_study_guides');
    return saved ? JSON.parse(saved) : [];
  });

  const guide = selectedGuide ? STUDY_GUIDES.find(g => g.id === selectedGuide) : null;
  const currentTopic = guide?.topics[currentTopicIndex];

  const handleStartGuide = (guideId) => {
    setSelectedGuide(guideId);
    setCurrentTopicIndex(0);
    setShowQuiz(false);
    setQuizAnswers([]);
    setShowResults(false);
  };

  const handleNextTopic = () => {
    if (currentTopicIndex < guide.topics.length - 1) {
      setCurrentTopicIndex(currentTopicIndex + 1);
    } else {
      setShowQuiz(true);
    }
  };

  const handlePreviousTopic = () => {
    if (currentTopicIndex > 0) {
      setCurrentTopicIndex(currentTopicIndex - 1);
    }
  };

  const handleQuizAnswer = (questionIndex, answerIndex) => {
    const newAnswers = [...quizAnswers];
    newAnswers[questionIndex] = answerIndex;
    setQuizAnswers(newAnswers);
  };

  const handleFinishQuiz = () => {
    setShowResults(true);
    const score = quizAnswers.reduce((acc, answer, idx) => {
      return acc + (answer === guide.exercises[idx].correct ? 1 : 0);
    }, 0);

    if (score >= guide.exercises.length * 0.7) {
      const newCompleted = [...completedGuides];
      if (!newCompleted.includes(guide.id)) {
        newCompleted.push(guide.id);
        setCompletedGuides(newCompleted);
        localStorage.setItem('completed_study_guides', JSON.stringify(newCompleted));
      }
    }
  };

  const handleResetGuide = () => {
    setCurrentTopicIndex(0);
    setShowQuiz(false);
    setQuizAnswers([]);
    setShowResults(false);
  };

  const getScore = () => {
    return quizAnswers.reduce((acc, answer, idx) => {
      return acc + (answer === guide.exercises[idx].correct ? 1 : 0);
    }, 0);
  };

  const progress = guide ? ((currentTopicIndex + 1) / guide.topics.length) * 100 : 0;

  if (!guide) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-[#8B6F47] mb-2">📚 Guias de Estudo</h2>
          <p className="text-[#A68A64]">
            Aprenda teoria musical passo a passo com conceitos, exemplos e exercícios práticos
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {STUDY_GUIDES.map((g) => {
            const isCompleted = completedGuides.includes(g.id);
            return (
              <motion.div
                key={g.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card className="border-[#D4C5B0] bg-white/80 hover:shadow-lg transition-all cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <CardTitle className="text-[#8B6F47] text-lg mb-2">
                          {g.title}
                          {isCompleted && (
                            <CheckCircle className="w-5 h-5 text-green-600 inline-block ml-2" />
                          )}
                        </CardTitle>
                        <div className="flex gap-2 flex-wrap">
                          <Badge className={difficultyColors[g.difficulty]}>
                            {difficultyLabels[g.difficulty]}
                          </Badge>
                          <Badge variant="outline" className="text-[#8B6F47]">
                            ⏱️ {g.duration}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-[#A68A64] mb-4">{g.description}</p>
                    <div className="space-y-2 mb-4">
                      <p className="text-sm font-medium text-[#8B6F47]">📖 Conteúdo:</p>
                      <ul className="text-sm text-[#A68A64] space-y-1">
                        <li>• {g.topics.length} conceitos teóricos</li>
                        <li>• {g.exercises.length} questões práticas</li>
                        <li>• Links para o dicionário musical</li>
                      </ul>
                    </div>
                    <Button
                      onClick={() => handleStartGuide(g.id)}
                      className="w-full bg-gradient-to-r from-[#8B6F47] to-[#A68A64] text-white"
                    >
                      {isCompleted ? "Revisar Guia" : "Começar Estudo"}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {completedGuides.length > 0 && (
          <Card className="border-[#D4AF37] bg-gradient-to-r from-[#D4AF37]/10 to-white">
            <CardHeader>
              <CardTitle className="text-[#8B6F47] flex items-center gap-2">
                <Award className="w-6 h-6 text-[#D4AF37]" />
                Seu Progresso
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[#8B6F47] mb-2">
                Você completou <strong>{completedGuides.length}</strong> de <strong>{STUDY_GUIDES.length}</strong> guias
              </p>
              <Progress value={(completedGuides.length / STUDY_GUIDES.length) * 100} className="h-2" />
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  if (showQuiz) {
    const score = getScore();
    const total = guide.exercises.length;
    const percentage = (score / total) * 100;

    return (
      <div className="space-y-4">
        <Button
          variant="outline"
          onClick={() => setSelectedGuide(null)}
          className="border-[#8B6F47] text-[#8B6F47]"
        >
          ← Voltar aos Guias
        </Button>

        <Card className="border-[#D4C5B0] bg-white/80">
          <CardHeader>
            <CardTitle className="text-[#8B6F47] flex items-center gap-2">
              <Target className="w-6 h-6 text-[#D4AF37]" />
              {showResults ? "Resultados do Quiz" : "Mini-Quiz de Revisão"}
            </CardTitle>
            <p className="text-[#A68A64] text-sm">
              {showResults 
                ? `Você acertou ${score} de ${total} questões (${percentage.toFixed(0)}%)`
                : "Responda as questões para consolidar o aprendizado"}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {guide.exercises.map((exercise, idx) => {
              const userAnswer = quizAnswers[idx];
              const isCorrect = userAnswer === exercise.correct;
              const hasAnswered = userAnswer !== undefined;

              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <Badge className="bg-[#8B6F47] text-white">Q{idx + 1}</Badge>
                    <p className="font-medium text-[#8B6F47] flex-1">{exercise.question}</p>
                  </div>

                  <div className="space-y-2 ml-11">
                    {exercise.options.map((option, optIdx) => {
                      const isSelected = userAnswer === optIdx;
                      const isCorrectOption = optIdx === exercise.correct;
                      
                      let buttonClass = "border-[#D4C5B0] text-[#8B6F47] hover:bg-[#F5F1E8]";
                      if (showResults && isCorrectOption) {
                        buttonClass = "border-green-500 bg-green-50 text-green-700";
                      } else if (showResults && isSelected && !isCorrect) {
                        buttonClass = "border-red-500 bg-red-50 text-red-700";
                      } else if (isSelected && !showResults) {
                        buttonClass = "border-[#8B6F47] bg-[#8B6F47] text-white";
                      }

                      return (
                        <Button
                          key={optIdx}
                          variant="outline"
                          className={`w-full justify-start text-left ${buttonClass}`}
                          onClick={() => !showResults && handleQuizAnswer(idx, optIdx)}
                          disabled={showResults}
                        >
                          {showResults && isCorrectOption && <CheckCircle className="w-4 h-4 mr-2" />}
                          {showResults && isSelected && !isCorrect && <XCircle className="w-4 h-4 mr-2" />}
                          {option}
                        </Button>
                      );
                    })}
                  </div>

                  {showResults && (
                    <div className="ml-11 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-900">
                        <strong>💡 Explicação:</strong> {exercise.explanation}
                      </p>
                    </div>
                  )}
                </motion.div>
              );
            })}

            <div className="flex gap-3 justify-end pt-4 border-t border-[#D4C5B0]">
              {!showResults ? (
                <Button
                  onClick={handleFinishQuiz}
                  disabled={quizAnswers.length !== guide.exercises.length}
                  className="bg-gradient-to-r from-[#D4AF37] to-[#9CAF88] text-white"
                >
                  Finalizar Quiz
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={handleResetGuide}
                    className="border-[#8B6F47] text-[#8B6F47]"
                  >
                    Revisar Conceitos
                  </Button>
                  <Button
                    onClick={() => setSelectedGuide(null)}
                    className="bg-gradient-to-r from-[#8B6F47] to-[#A68A64] text-white"
                  >
                    Voltar aos Guias
                  </Button>
                </>
              )}
            </div>

            {showResults && percentage >= 70 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="p-4 bg-gradient-to-r from-[#D4AF37]/20 to-[#9CAF88]/20 rounded-xl border border-[#D4AF37]"
              >
                <div className="flex items-center gap-3">
                  <Star className="w-8 h-8 text-[#D4AF37] fill-[#D4AF37]" />
                  <div>
                    <p className="font-bold text-[#8B6F47]">🎉 Parabéns!</p>
                    <p className="text-sm text-[#A68A64]">
                      Você concluiu este guia com sucesso! Continue estudando.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setSelectedGuide(null)}
          className="border-[#8B6F47] text-[#8B6F47]"
        >
          ← Voltar aos Guias
        </Button>
        <div className="flex gap-2">
          <Badge className={difficultyColors[guide.difficulty]}>
            {difficultyLabels[guide.difficulty]}
          </Badge>
          <Badge variant="outline" className="text-[#8B6F47]">
            {currentTopicIndex + 1} / {guide.topics.length}
          </Badge>
        </div>
      </div>

      <Card className="border-[#D4C5B0] bg-white/80">
        <CardHeader>
          <div className="space-y-3">
            <CardTitle className="text-[#8B6F47] text-2xl">{guide.title}</CardTitle>
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-[#A68A64]">
              Progresso: {currentTopicIndex + 1} de {guide.topics.length} tópicos
            </p>
          </div>
        </CardHeader>
      </Card>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentTopicIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
        >
          <Card className="border-[#D4C5B0] bg-white/80">
            <CardHeader>
              <CardTitle className="text-[#8B6F47] flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-[#D4AF37]" />
                {currentTopic.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-[#F5F1E8] rounded-lg border border-[#D4C5B0]">
                <p className="text-[#8B6F47] leading-relaxed">{currentTopic.content}</p>
              </div>

              {currentTopic.examples && currentTopic.examples.length > 0 && (
                <div>
                  <h4 className="font-bold text-[#8B6F47] mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[#D4AF37]" />
                    Exemplos:
                  </h4>
                  <div className="space-y-2">
                    {currentTopic.examples.map((example, idx) => (
                      <div key={idx} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-900 font-mono">{example}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {currentTopic.dictionaryLink && (
                <Button
                  variant="outline"
                  onClick={() => navigate(createPageUrl("MusicDictionary"))}
                  className="w-full border-[#8B6F47] text-[#8B6F47] hover:bg-[#8B6F47] hover:text-white"
                >
                  📖 Ver no Dicionário Musical
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}

              <div className="flex justify-between pt-4 border-t border-[#D4C5B0]">
                <Button
                  variant="outline"
                  onClick={handlePreviousTopic}
                  disabled={currentTopicIndex === 0}
                  className="border-[#8B6F47] text-[#8B6F47]"
                >
                  ← Anterior
                </Button>
                <Button
                  onClick={handleNextTopic}
                  className="bg-gradient-to-r from-[#8B6F47] to-[#A68A64] text-white"
                >
                  {currentTopicIndex === guide.topics.length - 1 ? "Ir para Quiz" : "Próximo →"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}