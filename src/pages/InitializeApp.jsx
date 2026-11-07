import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Loader2, AlertCircle, Database } from "lucide-react";
import { motion } from "framer-motion";

export default function InitializeApp() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("checking"); // checking, initializing, complete, error
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    checkAndInitialize();
  }, []);

  const checkAndInitialize = async () => {
    try {
      setStatus("checking");
      setCurrentStep("Verificando base de dados...");
      
      // Verifica se já existe dados de referência
      const [progressions, rhythms, styles, chords] = await Promise.all([
        base44.entities.Progression.list(),
        base44.entities.Rhythm.list(),
        base44.entities.Style.list(),
        base44.entities.Chord.list()
      ]);

      // Se já tem dados, não precisa inicializar
      if (progressions.length > 0 || rhythms.length > 0 || styles.length > 0 || chords.length > 0) {
        setStatus("complete");
        setProgress(100);
        setTimeout(() => {
          navigate(createPageUrl("Library"));
        }, 1500);
        return;
      }

      // Se não tem dados, inicializa
      await initializeReferenceData();
      
    } catch (err) {
      console.error("Erro ao verificar/inicializar:", err);
      setError(err.message);
      setStatus("error");
    }
  };

  const initializeReferenceData = async () => {
    setStatus("initializing");
    setProgress(10);

    try {
      // PROGRESSÕES BÁSICAS
      setCurrentStep("Criando progressões harmônicas...");
      const progressionsData = [
        {
          name: "Progressão Blues Básica",
          pattern: "I-IV-V",
          description: "Progressão fundamental do Blues, base de inúmeras músicas",
          common_keys: ["E", "A", "G", "C"],
          genre_tags: ["blues", "rock", "sertanejo"],
          examples: ["Johnny B. Goode - Chuck Berry", "Sweet Home Alabama - Lynyrd Skynyrd"]
        },
        {
          name: "Progressão Pop Clássica",
          pattern: "I-V-vi-IV",
          description: "Uma das progressões mais populares da música moderna",
          common_keys: ["C", "G", "D", "A"],
          genre_tags: ["pop", "rock", "sertanejo"],
          examples: ["Let It Be - The Beatles", "No Woman No Cry - Bob Marley"]
        },
        {
          name: "Progressão Canon",
          pattern: "I-V-vi-III-IV-I-IV-V",
          description: "Inspirada no Canon de Pachelbel, muito usada em baladas",
          common_keys: ["C", "D", "G"],
          genre_tags: ["pop", "balada"],
          examples: ["Canon in D - Pachelbel", "Basket Case - Green Day"]
        },
        {
          name: "Progressão Anos 50",
          pattern: "I-vi-IV-V",
          description: "Progressão característica do Rock n' Roll dos anos 50",
          common_keys: ["C", "G", "D"],
          genre_tags: ["rock", "doo-wop"],
          examples: ["Stand by Me - Ben E. King", "Every Breath You Take - The Police"]
        },
        {
          name: "Progressão Jazz Básica",
          pattern: "ii-V-I",
          description: "Cadência fundamental do Jazz",
          common_keys: ["C", "F", "Bb"],
          genre_tags: ["jazz", "bossa nova"],
          examples: ["Garota de Ipanema - Tom Jobim", "Autumn Leaves"]
        },
        {
          name: "Progressão Sertaneja Clássica",
          pattern: "I-IV-I-V",
          description: "Progressão muito comum no sertanejo raiz",
          common_keys: ["G", "D", "A", "E"],
          genre_tags: ["sertanejo", "country"],
          examples: ["Evidências - Chitãozinho & Xororó", "Fio de Cabelo - Chitãozinho & Xororó"]
        },
        {
          name: "Progressão Menor Natural",
          pattern: "i-iv-i-V",
          description: "Progressão em tonalidade menor, muito emotiva",
          common_keys: ["Am", "Em", "Dm"],
          genre_tags: ["balada", "sertanejo"],
          examples: ["Comfortably Numb - Pink Floyd"]
        },
        {
          name: "Progressão Country",
          pattern: "I-IV-vi-V",
          description: "Característica da música country e sertanejo universitário",
          common_keys: ["G", "C", "D"],
          genre_tags: ["country", "sertanejo"],
          examples: ["Take Me Home, Country Roads - John Denver"]
        },
        {
          name: "Progressão Andaluza",
          pattern: "i-bVII-bVI-V",
          description: "Progressão com sabor espanhol/flamenco",
          common_keys: ["Am", "Em"],
          genre_tags: ["flamenco", "espanhol"],
          examples: ["Hit the Road Jack - Ray Charles"]
        },
        {
          name: "Progressão Royal Road",
          pattern: "IV-V-iii-vi",
          description: "Muito popular na música japonesa e anime",
          common_keys: ["C", "G", "F"],
          genre_tags: ["j-pop", "anime"],
          examples: ["Cruel Angel's Thesis"]
        }
      ];

      await base44.entities.Progression.bulkCreate(progressionsData);
      setProgress(30);

      // RITMOS
      setCurrentStep("Criando ritmos sertanejos...");
      const rhythmsData = [
        {
          name: "Guarânia",
          pattern: "Semínima - Colcheia - Semínima - Colcheia",
          description: "Ritmo paraguaio muito popular no Brasil, de compasso binário lento e cadenciado",
          tempo_range: "60-80 BPM",
          time_signature: "3/4",
          origin: "Paraguai",
          genre_tags: ["sertanejo", "guarânia", "paraguaio"],
          examples: ["Índia - Cascatinha e Inhana", "Chalana - Almir Sater"]
        },
        {
          name: "Vanera",
          pattern: "Ternário marcado com baixo em semínimas",
          description: "Ritmo gaúcho de origem europeia, animado e dançante",
          tempo_range: "120-140 BPM",
          time_signature: "3/4",
          origin: "Rio Grande do Sul",
          genre_tags: ["gaúcho", "tradicionalista"],
          examples: ["Vanera Grossa", "Baile de Gauchão"]
        },
        {
          name: "Rancheira",
          pattern: "Quaternário com acentuação no primeiro e terceiro tempo",
          description: "Ritmo mexicano adaptado ao Brasil, muito usado em festas",
          tempo_range: "90-110 BPM",
          time_signature: "4/4",
          origin: "México",
          genre_tags: ["sertanejo", "rancheira"],
          examples: ["Rancheira do Amor", "Moreninha Linda"]
        },
        {
          name: "Toada",
          pattern: "Binário simples com melodia cantada",
          description: "Ritmo característico do Centro-Oeste brasileiro",
          tempo_range: "80-100 BPM",
          time_signature: "2/4",
          origin: "Centro-Oeste do Brasil",
          genre_tags: ["sertanejo raiz", "toada"],
          examples: ["Rei do Gado - Sérgio Reis", "Peão de Boiadeiro"]
        },
        {
          name: "Cateretê",
          pattern: "Binário com palmas e sapateado",
          description: "Dança folclórica brasileira de origem indígena",
          tempo_range: "110-130 BPM",
          time_signature: "2/4",
          origin: "Interior de São Paulo",
          genre_tags: ["folclórico", "caipira"],
          examples: ["Cateretê da Serra", "Dança do Cateretê"]
        },
        {
          name: "Baião Sertanejo",
          pattern: "Binário sincopado característico",
          tempo_range: "100-120 BPM",
          time_signature: "2/4",
          origin: "Nordeste (adaptado ao sertanejo)",
          genre_tags: ["baião", "sertanejo"],
          examples: ["Asa Branca - Luiz Gonzaga", "Baião de Dois"]
        },
        {
          name: "Arrasta-pé",
          pattern: "Binário rápido e animado",
          description: "Variação acelerada do forró",
          tempo_range: "130-150 BPM",
          time_signature: "2/4",
          origin: "Nordeste",
          genre_tags: ["forró", "arrasta-pé"],
          examples: ["Forró no Escuro", "Olha Pro Céu"]
        },
        {
          name: "Polca Paraguaia",
          pattern: "Binário saltitante e alegre",
          description: "Polca de origem europeia adaptada no Paraguai e sul do Brasil",
          tempo_range: "120-140 BPM",
          time_signature: "2/4",
          origin: "Paraguai",
          genre_tags: ["polca", "gaúcho"],
          examples: ["Galopera", "Polca Paraguaia"]
        }
      ];

      await base44.entities.Rhythm.bulkCreate(rhythmsData);
      setProgress(55);

      // ESTILOS
      setCurrentStep("Criando estilos musicais...");
      const stylesData = [
        {
          name: "Sertanejo Raiz",
          description: "Estilo tradicional da música caipira, com instrumentação acústica e letras que retratam a vida no campo",
          characteristics: [
            "Viola caipira como instrumento principal",
            "Harmonias simples e diretas",
            "Letras sobre vida rural, natureza e amor",
            "Duetos em terças paralelas",
            "Ritmos como guarânia, toada e cateretê"
          ],
          typical_instruments: ["Viola caipira", "Violão", "Sanfona", "Acordeão"],
          typical_rhythms: ["Guarânia", "Toada", "Cateretê", "Moda de viola"],
          origin: "Interior de São Paulo, Minas Gerais e Goiás",
          period: "Décadas de 1920-1980",
          representative_artists: [
            "Tonico & Tinoco",
            "Tião Carreiro & Pardinho",
            "Milionário & José Rico",
            "Pena Branca & Xavantinho",
            "Almir Sater"
          ],
          example_songs: [
            "Chico Mineiro - Tonico & Tinoco",
            "Rei do Gado - Sérgio Reis",
            "Chalana - Almir Sater"
          ],
          icon: "🎸",
          color: "#8B6F47"
        },
        {
          name: "Sertanejo Universitário",
          description: "Vertente moderna e pop do sertanejo, surgida nos anos 2000, com apelo ao público jovem",
          characteristics: [
            "Produção moderna e polida",
            "Influências de pop, rock e eletrônica",
            "Letras sobre relacionamentos modernos",
            "Uso de instrumentos elétricos",
            "Arranjos elaborados"
          ],
          typical_instruments: ["Violão", "Guitarra elétrica", "Bateria", "Teclado", "Baixo"],
          typical_rhythms: ["Country-pop", "Balada", "Vanera moderna"],
          origin: "Goiânia e interior de São Paulo",
          period: "Década de 2000 até hoje",
          representative_artists: [
            "Luan Santana",
            "Jorge & Mateus",
            "Gusttavo Lima",
            "Marília Mendonça",
            "Henrique & Juliano"
          ],
          example_songs: [
            "Balada - Gusttavo Lima",
            "Inesquecível - Luan Santana",
            "Infiel - Marília Mendonça"
          ],
          icon: "🎤",
          color: "#D4AF37"
        },
        {
          name: "Sertanejo Romântico",
          description: "Focado em letras de amor e baladas emotivas, muito popular nos anos 80 e 90",
          characteristics: [
            "Melodias sentimentais",
            "Letras sobre amor e sofrimento",
            "Arranjos orquestrais",
            "Vocais emotivos",
            "Ritmo mais lento"
          ],
          typical_instruments: ["Violão", "Teclado", "Cordas", "Bateria"],
          typical_rhythms: ["Balada", "Guarânia lenta"],
          origin: "Todo o Brasil",
          period: "Décadas de 1980-2000",
          representative_artists: [
            "Chitãozinho & Xororó",
            "Zezé Di Camargo & Luciano",
            "Leandro & Leonardo",
            "João Paulo & Daniel"
          ],
          example_songs: [
            "Evidências - Chitãozinho & Xororó",
            "É o Amor - Zezé Di Camargo & Luciano",
            "Entre Tapas e Beijos - Leandro & Leonardo"
          ],
          icon: "💕",
          color: "#9CAF88"
        },
        {
          name: "Música Caipira",
          description: "Gênero tradicional do interior paulista, predecessor do sertanejo",
          characteristics: [
            "Autenticidade rural",
            "Linguagem caipira nas letras",
            "Instrumentação totalmente acústica",
            "Preservação das tradições",
            "Temática folclórica"
          ],
          typical_instruments: ["Viola caipira", "Violão", "Harmônica"],
          typical_rhythms: ["Moda de viola", "Cururu", "Recortado"],
          origin: "Interior de São Paulo",
          period: "Início do século XX",
          representative_artists: [
            "Cornélio Pires",
            "Alvarenga & Ranchinho",
            "Tonico & Tinoco"
          ],
          example_songs: [
            "Tristeza do Jeca - Angelino de Oliveira",
            "Cabocla Tereza - Raul Torres"
          ],
          icon: "🪕",
          color: "#A68A64"
        },
        {
          name: "Sertanejo Moderno",
          description: "Fusão contemporânea com diversos gêneros, experimentação e inovação",
          characteristics: [
            "Fusão com outros gêneros",
            "Produção contemporânea",
            "Liberdade criativa",
            "Elementos eletrônicos",
            "Letras diversificadas"
          ],
          typical_instruments: ["Variados", "Sintetizadores", "Produção digital"],
          typical_rhythms: ["Variados", "Fusão"],
          origin: "Grandes centros urbanos",
          period: "Década de 2010 até hoje",
          representative_artists: [
            "Bruno & Marrone (fase moderna)",
            "Fernando & Sorocaba",
            "Israel & Rodolffo"
          ],
          example_songs: [
            "Cerveja de Garrafa - Dupla inovadora",
            "Largado às Traças - Zé Neto & Cristiano"
          ],
          icon: "🎵",
          color: "#D4C5B0"
        }
      ];

      await base44.entities.Style.bulkCreate(stylesData);
      setProgress(80);

      // ACORDES BÁSICOS (alguns exemplos para violão)
      setCurrentStep("Criando biblioteca de acordes...");
      const chordsData = [
        {
          name: "C",
          instrument: "violao",
          strings: ["x", "3", "2", "0", "1", "0"],
          notes: ["C", "E", "G", "C", "E"],
          fingers: "3-2-0-1-0",
          fret: 0,
          difficulty: "facil",
          category: "maior",
          description: "Acorde de Dó Maior, um dos mais básicos e fundamentais"
        },
        {
          name: "D",
          instrument: "violao",
          strings: ["x", "x", "0", "2", "3", "2"],
          notes: ["D", "A", "D", "F#"],
          fingers: "0-2-3-2",
          fret: 0,
          difficulty: "facil",
          category: "maior",
          description: "Acorde de Ré Maior"
        },
        {
          name: "E",
          instrument: "violao",
          strings: ["0", "2", "2", "1", "0", "0"],
          notes: ["E", "B", "E", "G#", "B", "E"],
          fingers: "0-2-2-1-0-0",
          fret: 0,
          difficulty: "facil",
          category: "maior",
          description: "Acorde de Mi Maior"
        },
        {
          name: "G",
          instrument: "violao",
          strings: ["3", "2", "0", "0", "0", "3"],
          notes: ["G", "B", "D", "G", "B", "G"],
          fingers: "3-2-0-0-0-3",
          fret: 0,
          difficulty: "medio",
          category: "maior",
          description: "Acorde de Sol Maior"
        },
        {
          name: "A",
          instrument: "violao",
          strings: ["x", "0", "2", "2", "2", "0"],
          notes: ["A", "E", "A", "C#", "E"],
          fingers: "0-2-2-2-0",
          fret: 0,
          difficulty: "facil",
          category: "maior",
          description: "Acorde de Lá Maior"
        },
        {
          name: "Am",
          instrument: "violao",
          strings: ["x", "0", "2", "2", "1", "0"],
          notes: ["A", "E", "A", "C", "E"],
          fingers: "0-2-2-1-0",
          fret: 0,
          difficulty: "facil",
          category: "menor",
          description: "Acorde de Lá Menor"
        },
        {
          name: "Em",
          instrument: "violao",
          strings: ["0", "2", "2", "0", "0", "0"],
          notes: ["E", "B", "E", "G", "B", "E"],
          fingers: "0-2-2-0-0-0",
          fret: 0,
          difficulty: "facil",
          category: "menor",
          description: "Acorde de Mi Menor, um dos mais fáceis"
        },
        {
          name: "Dm",
          instrument: "violao",
          strings: ["x", "x", "0", "2", "3", "1"],
          notes: ["D", "A", "D", "F"],
          fingers: "0-2-3-1",
          fret: 0,
          difficulty: "facil",
          category: "menor",
          description: "Acorde de Ré Menor"
        },
        {
          name: "F",
          instrument: "violao",
          strings: ["1", "3", "3", "2", "1", "1"],
          notes: ["F", "A", "C", "F", "A", "F"],
          fingers: "1-3-3-2-1-1",
          fret: 1,
          difficulty: "dificil",
          category: "maior",
          description: "Acorde de Fá Maior com pestana"
        },
        {
          name: "G7",
          instrument: "violao",
          strings: ["3", "2", "0", "0", "0", "1"],
          notes: ["G", "B", "D", "G", "B", "F"],
          fingers: "3-2-0-0-0-1",
          fret: 0,
          difficulty: "medio",
          category: "setima",
          description: "Acorde de Sol com Sétima Dominante"
        }
      ];

      await base44.entities.Chord.bulkCreate(chordsData);
      setProgress(100);

      setCurrentStep("Inicialização concluída!");
      setStatus("complete");
      
      setTimeout(() => {
        navigate(createPageUrl("Library"));
      }, 2000);

    } catch (err) {
      console.error("Erro ao inicializar dados:", err);
      setError(err.message);
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-8 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl w-full"
      >
        <Card className="border-[#D4C5B0] bg-white/80 backdrop-blur-sm shadow-2xl">
          <CardHeader className="text-center border-b border-[#D4C5B0] pb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-[#8B6F47] to-[#A68A64] rounded-full flex items-center justify-center mx-auto mb-4">
              {status === "checking" || status === "initializing" ? (
                <Loader2 className="w-10 h-10 text-white animate-spin" />
              ) : status === "complete" ? (
                <CheckCircle className="w-10 h-10 text-white" />
              ) : status === "error" ? (
                <AlertCircle className="w-10 h-10 text-white" />
              ) : (
                <Database className="w-10 h-10 text-white" />
              )}
            </div>
            <CardTitle className="text-2xl text-[#8B6F47]">
              {status === "checking" && "Verificando Sistema..."}
              {status === "initializing" && "Inicializando Base de Dados"}
              {status === "complete" && "Inicialização Concluída!"}
              {status === "error" && "Erro na Inicialização"}
            </CardTitle>
          </CardHeader>

          <CardContent className="p-8 space-y-6">
            {(status === "checking" || status === "initializing") && (
              <>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#8B6F47] font-medium">{currentStep}</span>
                    <span className="text-[#A68A64]">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-3" />
                </div>

                <div className="bg-[#F5F1E8] rounded-lg p-6 space-y-3">
                  <p className="text-sm text-[#8B6F47] font-medium">
                    Criando base de conhecimento:
                  </p>
                  <ul className="text-sm text-[#A68A64] space-y-2">
                    <li className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${progress >= 30 ? 'bg-green-500' : 'bg-gray-300'}`} />
                      Progressões harmônicas clássicas
                    </li>
                    <li className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${progress >= 55 ? 'bg-green-500' : 'bg-gray-300'}`} />
                      Ritmos sertanejos tradicionais
                    </li>
                    <li className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${progress >= 80 ? 'bg-green-500' : 'bg-gray-300'}`} />
                      Estilos musicais do sertanejo
                    </li>
                    <li className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${progress >= 100 ? 'bg-green-500' : 'bg-gray-300'}`} />
                      Biblioteca de acordes básicos
                    </li>
                  </ul>
                </div>

                <p className="text-xs text-center text-[#A68A64]">
                  Por favor, aguarde. Isso pode levar alguns segundos...
                </p>
              </>
            )}

            {status === "complete" && (
              <div className="text-center space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <p className="text-green-800 font-medium mb-2">
                    🎉 Base de dados inicializada com sucesso!
                  </p>
                  <p className="text-sm text-green-700">
                    Você já tem acesso a progressões, ritmos, estilos e acordes.
                  </p>
                </div>
                <p className="text-sm text-[#A68A64]">
                  Redirecionando para a biblioteca...
                </p>
              </div>
            )}

            {status === "error" && (
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                  <p className="text-red-800 font-medium mb-2">
                    Erro ao inicializar o sistema
                  </p>
                  <p className="text-sm text-red-700">
                    {error || "Ocorreu um erro desconhecido"}
                  </p>
                </div>
                <Button
                  onClick={() => window.location.reload()}
                  className="w-full bg-gradient-to-r from-[#8B6F47] to-[#A68A64] text-white"
                >
                  Tentar Novamente
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate(createPageUrl("Library"))}
                  className="w-full"
                >
                  Ir para Biblioteca
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}