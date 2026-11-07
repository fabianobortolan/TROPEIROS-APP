import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Brain, 
  CheckCircle, 
  XCircle, 
  RotateCcw, 
  Trophy, 
  Target,
  Lightbulb,
  Music2,
  ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Banco de questões do Quiz
const QUIZ_QUESTIONS = [
  // Escalas
  {
    category: "Escalas",
    question: "Quantas notas tem uma escala pentatônica?",
    options: ["4 notas", "5 notas", "6 notas", "7 notas"],
    correct: 1,
    explanation: "A escala pentatônica tem 5 notas (penta = cinco)."
  },
  {
    category: "Escalas",
    question: "Quais são as notas da escala de Dó Maior?",
    options: ["C D E F G A B", "C D Eb F G Ab Bb", "C Db Eb F G Ab Bb", "C D E F# G A B"],
    correct: 0,
    explanation: "A escala de Dó Maior não tem sustenidos nem bemóis: C D E F G A B."
  },
  {
    category: "Escalas",
    question: "Qual é a relativa menor de Dó Maior?",
    options: ["D menor", "E menor", "A menor", "G menor"],
    correct: 2,
    explanation: "A relativa menor está uma terça menor abaixo (3 semitons). C → A menor."
  },
  {
    category: "Escalas",
    question: "O modo Dórico é baseado em qual grau da escala maior?",
    options: ["I grau", "II grau", "IV grau", "V grau"],
    correct: 1,
    explanation: "O modo Dórico começa no II grau da escala maior."
  },
  {
    category: "Escalas",
    question: "A escala menor harmônica tem qual característica?",
    options: ["6ª maior", "7ª maior", "2ª menor", "4ª aumentada"],
    correct: 1,
    explanation: "A escala menor harmônica tem a 7ª maior (sensível), criando um intervalo de 1,5 tom entre 6ª e 7ª."
  },
  
  // Acordes
  {
    category: "Acordes",
    question: "Quais notas formam o acorde de Dó Maior (C)?",
    options: ["C E G", "C Eb G", "C E G#", "C D G"],
    correct: 0,
    explanation: "Dó Maior = Fundamental (C) + Terça Maior (E) + Quinta Justa (G)."
  },
  {
    category: "Acordes",
    question: "O que diferencia um acorde maior de um menor?",
    options: ["A quinta", "A fundamental", "A terça", "A oitava"],
    correct: 2,
    explanation: "A terça determina se o acorde é maior (3ª maior) ou menor (3ª menor)."
  },
  {
    category: "Acordes",
    question: "Quantas notas tem uma tétrade?",
    options: ["2 notas", "3 notas", "4 notas", "5 notas"],
    correct: 2,
    explanation: "Tétrade = 4 notas (fundamental + terça + quinta + sétima)."
  },
  {
    category: "Acordes",
    question: "O que é uma inversão de acorde?",
    options: [
      "Tocar o acorde de trás para frente",
      "Mudar qual nota está no baixo",
      "Adicionar uma nota ao acorde",
      "Transpor o acorde"
    ],
    correct: 1,
    explanation: "Inversão é quando uma nota diferente da fundamental está no baixo."
  },
  {
    category: "Acordes",
    question: "Qual acorde é formado pelas notas A, C, E?",
    options: ["A maior", "A menor", "C maior", "E menor"],
    correct: 1,
    explanation: "A (fundamental) + C (terça menor) + E (quinta justa) = Lá menor."
  },
  {
    category: "Acordes",
    question: "O acorde diminuto tem qual intervalo de quinta?",
    options: ["Quinta justa", "Quinta aumentada", "Quinta diminuta", "Quinta maior"],
    correct: 2,
    explanation: "O acorde diminuto tem terça menor e quinta diminuta (6 semitons)."
  },
  
  // Progressões
  {
    category: "Progressões",
    question: "Qual é a progressão mais usada no pop/rock?",
    options: ["I-IV-V-I", "I-V-vi-IV", "ii-V-I", "I-vi-ii-V"],
    correct: 1,
    explanation: "I-V-vi-IV é uma das progressões mais populares do pop/rock."
  },
  {
    category: "Progressões",
    question: "Em Dó Maior, qual acorde é o V grau?",
    options: ["C", "F", "G", "Am"],
    correct: 2,
    explanation: "V grau de C Maior = G (Sol Maior)."
  },
  {
    category: "Progressões",
    question: "Qual é a função harmônica da dominante?",
    options: [
      "Repouso",
      "Tensão que resolve na tônica",
      "Preparação para a dominante",
      "Modulação"
    ],
    correct: 1,
    explanation: "A dominante (V) cria tensão que naturalmente quer resolver na tônica (I)."
  },
  {
    category: "Progressões",
    question: "A cadência perfeita é formada por:",
    options: ["I-IV", "IV-V", "V-I", "ii-V"],
    correct: 2,
    explanation: "Cadência perfeita = V → I (dominante resolvendo na tônica)."
  },
  {
    category: "Progressões",
    question: "Qual é o acorde subdominante em Sol Maior?",
    options: ["G", "C", "D", "Em"],
    correct: 1,
    explanation: "Subdominante = IV grau. Em Sol Maior, o IV é C (Dó Maior)."
  },
  {
    category: "Progressões",
    question: "O que significa 'ii-V-I' em jazz?",
    options: [
      "Acordes menores apenas",
      "Sequência 2-5-1 com acordes do campo harmônico",
      "Apenas acordes maiores",
      "Sequência de escalas"
    ],
    correct: 1,
    explanation: "ii-V-I é uma progressão comum no jazz: acorde menor do II grau, dominante (V) e tônica (I)."
  },
  
  // Intervalos
  {
    category: "Intervalos",
    question: "Quantos semitons tem uma terça maior?",
    options: ["2 semitons", "3 semitons", "4 semitons", "5 semitons"],
    correct: 2,
    explanation: "Terça maior = 4 semitons (2 tons)."
  },
  {
    category: "Intervalos",
    question: "Qual intervalo existe entre C e G?",
    options: ["Terça", "Quarta", "Quinta justa", "Sexta"],
    correct: 2,
    explanation: "C → G = 7 semitons = Quinta Justa."
  },
  {
    category: "Intervalos",
    question: "Uma oitava tem quantos semitons?",
    options: ["8 semitons", "10 semitons", "12 semitons", "14 semitons"],
    correct: 2,
    explanation: "Uma oitava = 12 semitons (a mesma nota em altura diferente)."
  },
  {
    category: "Intervalos",
    question: "Qual é o intervalo de um semitom?",
    options: ["Segunda menor", "Segunda maior", "Terça menor", "Prima justa"],
    correct: 0,
    explanation: "1 semitom = segunda menor (ex: E → F ou B → C)."
  },
  
  // Ritmo
  {
    category: "Ritmo",
    question: "O que significa o compasso 4/4?",
    options: [
      "4 notas por música",
      "4 tempos por compasso, cada tempo vale uma semínima",
      "4 compassos por música",
      "Ritmo de 4 segundos"
    ],
    correct: 1,
    explanation: "4/4 = 4 tempos por compasso, cada tempo vale uma semínima (1/4)."
  },
  {
    category: "Ritmo",
    question: "A Guarânia é tipicamente em qual compasso?",
    options: ["2/4", "3/4", "4/4", "6/8"],
    correct: 1,
    explanation: "A Guarânia tradicionalmente usa compasso ternário (3/4)."
  },
  {
    category: "Ritmo",
    question: "O que significa BPM?",
    options: [
      "Beats Per Music",
      "Batidas Por Minuto",
      "Base Para Melodia",
      "Baixo Por Medida"
    ],
    correct: 1,
    explanation: "BPM = Beats Per Minute (Batidas Por Minuto) - indica a velocidade da música."
  },
  
  // Conceitos Gerais
  {
    category: "Conceitos",
    question: "O que é transposição?",
    options: [
      "Mudar o ritmo da música",
      "Mudar todas as notas para outra tonalidade",
      "Adicionar acordes",
      "Mudar o andamento"
    ],
    correct: 1,
    explanation: "Transposição é mover todas as notas da música para cima ou para baixo mantendo as relações intervalares."
  },
  {
    category: "Conceitos",
    question: "O que é o campo harmônico?",
    options: [
      "Conjunto de ritmos",
      "Conjunto de acordes formados a partir de uma escala",
      "Conjunto de melodias",
      "Conjunto de instrumentos"
    ],
    correct: 1,
    explanation: "Campo harmônico = todos os acordes diatônicos (formados apenas com notas da escala)."
  },
  {
    category: "Conceitos",
    question: "O que significa 'enarmonia'?",
    options: [
      "Notas com mesmo som mas nomes diferentes",
      "Notas com nomes iguais e sons diferentes",
      "Acordes iguais",
      "Escalas paralelas"
    ],
    correct: 0,
    explanation: "Enarmonia: F# e Gb são a mesma nota com nomes diferentes."
  }
];

const CATEGORIES = ["Todas", "Escalas", "Acordes", "Progressões", "Intervalos", "Ritmo", "Conceitos"];

export default function MusicTheoryQuiz() {
  const [gameState, setGameState] = useState("menu"); // menu, playing, results
  const [selectedCategory, setSelectedCategory] = useState("Todas");
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState([]);

  const startQuiz = () => {
    let filteredQuestions = QUIZ_QUESTIONS;
    if (selectedCategory !== "Todas") {
      filteredQuestions = QUIZ_QUESTIONS.filter(q => q.category === selectedCategory);
    }
    
    // Embaralhar e pegar 10 questões (ou todas se menos de 10)
    const shuffled = [...filteredQuestions].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(10, shuffled.length));
    
    setQuestions(selected);
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setScore(0);
    setAnswers([]);
    setGameState("playing");
  };

  const handleAnswer = (index) => {
    if (selectedAnswer !== null) return;
    
    setSelectedAnswer(index);
    setShowExplanation(true);
    
    const isCorrect = index === questions[currentQuestion].correct;
    if (isCorrect) {
      setScore(score + 1);
    }
    
    setAnswers([...answers, { 
      question: currentQuestion, 
      selected: index, 
      correct: questions[currentQuestion].correct,
      isCorrect 
    }]);
  };

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      setGameState("results");
    }
  };

  const getScoreMessage = () => {
    const percentage = (score / questions.length) * 100;
    if (percentage >= 90) return { emoji: "🏆", message: "Excelente! Você é um mestre!" };
    if (percentage >= 70) return { emoji: "🎉", message: "Muito bem! Conhecimento sólido!" };
    if (percentage >= 50) return { emoji: "👍", message: "Bom trabalho! Continue estudando!" };
    return { emoji: "📚", message: "Continue praticando! Você vai melhorar!" };
  };

  // Menu inicial
  if (gameState === "menu") {
    return (
      <div className="space-y-6">
        <Card className="border-[#D4C5B0] bg-gradient-to-r from-[#F5F1E8] to-white">
          <CardHeader>
            <CardTitle className="text-[#8B6F47] flex items-center gap-2">
              <Brain className="w-6 h-6" />
              Quiz de Teoria Musical
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-[#A68A64]">
              Teste seus conhecimentos sobre escalas, acordes, progressões e mais!
            </p>

            <div>
              <p className="text-sm font-medium text-[#8B6F47] mb-3">Escolha uma categoria:</p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => (
                  <Badge
                    key={cat}
                    className={`cursor-pointer transition-all px-4 py-2 text-sm ${
                      selectedCategory === cat
                        ? "bg-gradient-to-r from-[#8B6F47] to-[#A68A64] text-white"
                        : "bg-white text-[#8B6F47] border-2 border-[#8B6F47] hover:bg-[#8B6F47]/10"
                    }`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="bg-[#D4AF37]/10 p-4 rounded-lg border border-[#D4AF37]/30">
              <div className="flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-[#D4AF37] mt-0.5" />
                <div>
                  <p className="font-medium text-[#8B6F47]">Como funciona:</p>
                  <ul className="text-sm text-[#A68A64] mt-1 space-y-1">
                    <li>• 10 questões de múltipla escolha</li>
                    <li>• Explicação após cada resposta</li>
                    <li>• Resultado final com pontuação</li>
                  </ul>
                </div>
              </div>
            </div>

            <Button
              onClick={startQuiz}
              className="w-full bg-gradient-to-r from-[#8B6F47] to-[#A68A64] hover:from-[#A68A64] hover:to-[#8B6F47] text-white py-6 text-lg"
            >
              <Target className="w-5 h-5 mr-2" />
              Iniciar Quiz
            </Button>
          </CardContent>
        </Card>

        {/* Estatísticas de questões */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {CATEGORIES.filter(c => c !== "Todas").map(cat => {
            const count = QUIZ_QUESTIONS.filter(q => q.category === cat).length;
            return (
              <Card key={cat} className="border-[#D4C5B0] bg-white/80">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-[#8B6F47]">{count}</p>
                  <p className="text-xs text-[#A68A64]">{cat}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // Jogando
  if (gameState === "playing") {
    const question = questions[currentQuestion];
    const progress = ((currentQuestion + 1) / questions.length) * 100;

    return (
      <div className="space-y-6">
        {/* Progresso */}
        <Card className="border-[#D4C5B0] bg-white/80">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#A68A64]">
                Questão {currentQuestion + 1} de {questions.length}
              </span>
              <Badge className="bg-[#9CAF88] text-white">
                {score} acertos
              </Badge>
            </div>
            <Progress value={progress} className="h-2" />
          </CardContent>
        </Card>

        {/* Questão */}
        <Card className="border-[#D4C5B0] bg-white/80">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-[#D4AF37] text-white">{question.category}</Badge>
            </div>
            <CardTitle className="text-xl text-[#8B6F47]">
              {question.question}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {question.options.map((option, index) => {
              let buttonClass = "w-full p-4 text-left border-2 rounded-lg transition-all ";
              
              if (selectedAnswer === null) {
                buttonClass += "border-[#D4C5B0] hover:border-[#8B6F47] hover:bg-[#8B6F47]/5";
              } else if (index === question.correct) {
                buttonClass += "border-[#9CAF88] bg-[#9CAF88]/10 text-[#9CAF88]";
              } else if (index === selectedAnswer && index !== question.correct) {
                buttonClass += "border-red-500 bg-red-50 text-red-600";
              } else {
                buttonClass += "border-[#D4C5B0] opacity-50";
              }

              return (
                <motion.button
                  key={index}
                  className={buttonClass}
                  onClick={() => handleAnswer(index)}
                  disabled={selectedAnswer !== null}
                  whileHover={selectedAnswer === null ? { scale: 1.01 } : {}}
                  whileTap={selectedAnswer === null ? { scale: 0.99 } : {}}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-[#F5F1E8] flex items-center justify-center font-bold text-[#8B6F47]">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="flex-1">{option}</span>
                    {selectedAnswer !== null && index === question.correct && (
                      <CheckCircle className="w-5 h-5 text-[#9CAF88]" />
                    )}
                    {selectedAnswer === index && index !== question.correct && (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                </motion.button>
              );
            })}
          </CardContent>
        </Card>

        {/* Explicação */}
        <AnimatePresence>
          {showExplanation && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className={`border-2 ${
                selectedAnswer === question.correct 
                  ? "border-[#9CAF88] bg-[#9CAF88]/10" 
                  : "border-red-300 bg-red-50"
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {selectedAnswer === question.correct ? (
                      <CheckCircle className="w-6 h-6 text-[#9CAF88] mt-0.5" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-500 mt-0.5" />
                    )}
                    <div>
                      <p className={`font-bold ${
                        selectedAnswer === question.correct ? "text-[#9CAF88]" : "text-red-600"
                      }`}>
                        {selectedAnswer === question.correct ? "Correto!" : "Incorreto!"}
                      </p>
                      <p className="text-sm text-[#8B6F47] mt-1">{question.explanation}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button
                onClick={nextQuestion}
                className="w-full mt-4 bg-gradient-to-r from-[#8B6F47] to-[#A68A64] hover:from-[#A68A64] hover:to-[#8B6F47] text-white"
              >
                {currentQuestion < questions.length - 1 ? (
                  <>
                    Próxima Questão
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                ) : (
                  <>
                    Ver Resultado
                    <Trophy className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Resultados
  if (gameState === "results") {
    const { emoji, message } = getScoreMessage();
    const percentage = Math.round((score / questions.length) * 100);

    return (
      <div className="space-y-6">
        <Card className="border-[#D4C5B0] bg-gradient-to-r from-[#F5F1E8] to-white">
          <CardContent className="p-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="text-6xl mb-4"
            >
              {emoji}
            </motion.div>
            
            <h2 className="text-3xl font-bold text-[#8B6F47] mb-2">
              {score} de {questions.length}
            </h2>
            <p className="text-xl text-[#A68A64] mb-4">{message}</p>
            
            <div className="w-full bg-[#E8DCC4] rounded-full h-4 mb-6">
              <motion.div
                className={`h-4 rounded-full ${
                  percentage >= 70 ? "bg-[#9CAF88]" : percentage >= 50 ? "bg-[#D4AF37]" : "bg-red-400"
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 1, delay: 0.3 }}
              />
            </div>
            <p className="text-2xl font-bold text-[#8B6F47]">{percentage}%</p>
          </CardContent>
        </Card>

        {/* Resumo das respostas */}
        <Card className="border-[#D4C5B0] bg-white/80">
          <CardHeader>
            <CardTitle className="text-[#8B6F47]">Resumo das Respostas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
              {answers.map((answer, index) => (
                <div
                  key={index}
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                    answer.isCorrect ? "bg-[#9CAF88]" : "bg-red-400"
                  }`}
                >
                  {index + 1}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Botões de ação */}
        <div className="flex gap-3">
          <Button
            onClick={() => setGameState("menu")}
            variant="outline"
            className="flex-1 border-[#8B6F47] text-[#8B6F47]"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Novo Quiz
          </Button>
          <Button
            onClick={startQuiz}
            className="flex-1 bg-gradient-to-r from-[#8B6F47] to-[#A68A64] hover:from-[#A68A64] hover:to-[#8B6F47] text-white"
          >
            <Target className="w-4 h-4 mr-2" />
            Tentar Novamente
          </Button>
        </div>
      </div>
    );
  }

  return null;
}