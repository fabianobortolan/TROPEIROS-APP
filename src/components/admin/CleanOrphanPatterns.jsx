import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trash2, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";

export default function CleanOrphanPatterns() {
  const queryClient = useQueryClient();
  const [cleaning, setCleaning] = useState(false);
  const [result, setResult] = useState(null);

  const { data: progressions } = useQuery({
    queryKey: ['progressions'],
    queryFn: () => base44.entities.Progression.list(),
    initialData: []
  });

  const { data: learningPatterns } = useQuery({
    queryKey: ['learningPatterns'],
    queryFn: () => base44.entities.LearningPattern.list(),
    initialData: []
  });

  const handleCleanOrphans = async () => {
    if (!confirm("🧹 LIMPEZA DE PADRÕES ÓRFÃOS\n\nEsta operação vai:\n1. Verificar todos os LearningPatterns\n2. Deletar aqueles que referenciam progressões que NÃO existem mais\n\nContinuar?")) {
      return;
    }

    setCleaning(true);
    setResult(null);

    try {
      console.log("\n╔═══════════════════════════════════════════════════════════╗");
      console.log("║  🧹 LIMPEZA DE LEARNING PATTERNS ÓRFÃOS                  ║");
      console.log("╚═══════════════════════════════════════════════════════════╝");

      const validProgressionNames = new Set(progressions.map(p => p.name));
      console.log(`\n✅ ${validProgressionNames.size} progressões válidas no banco`);
      console.log(`📚 ${learningPatterns.length} padrões de aprendizado total`);

      const orphanPatterns = learningPatterns.filter(lp => 
        !validProgressionNames.has(lp.progression_name)
      );

      console.log(`\n⚠️ ${orphanPatterns.length} padrões órfãos encontrados:`);
      
      const orphansByProgression = {};
      orphanPatterns.forEach(lp => {
        if (!orphansByProgression[lp.progression_name]) {
          orphansByProgression[lp.progression_name] = [];
        }
        orphansByProgression[lp.progression_name].push(lp);
      });

      for (const [progName, patterns] of Object.entries(orphansByProgression)) {
        console.log(`   ❌ "${progName}": ${patterns.length} padrão(ões)`);
      }

      if (orphanPatterns.length === 0) {
        setResult({
          success: true,
          deleted: 0,
          message: "✅ Nenhum padrão órfão encontrado! Sistema limpo."
        });
        setCleaning(false);
        return;
      }

      // Deleta cada padrão órfão
      let deleted = 0;
      for (const orphan of orphanPatterns) {
        try {
          await base44.entities.LearningPattern.delete(orphan.id);
          deleted++;
          console.log(`   ✅ Deletado: ${orphan.progression_name} (${orphan.pattern})`);
        } catch (err) {
          console.error(`   ❌ Erro ao deletar ${orphan.id}:`, err);
        }
      }

      console.log(`\n✅ LIMPEZA CONCLUÍDA: ${deleted} padrões órfãos removidos`);

      setResult({
        success: true,
        deleted,
        orphansByProgression,
        message: `✅ Limpeza concluída! ${deleted} padrão(ões) órfão(s) removido(s).`
      });

      queryClient.invalidateQueries({ queryKey: ['learningPatterns'] });

    } catch (err) {
      console.error("❌ Erro na limpeza:", err);
      setResult({
        success: false,
        message: `❌ Erro: ${err.message}`
      });
    } finally {
      setCleaning(false);
    }
  };

  const orphanCount = learningPatterns.filter(lp => 
    !progressions.some(p => p.name === lp.progression_name)
  ).length;

  return (
    <Card className="border-orange-300 bg-orange-50/50">
      <CardHeader>
        <CardTitle className="text-orange-700 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Limpeza de Padrões Órfãos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className={orphanCount > 0 ? "border-orange-500 bg-orange-50" : "border-green-500 bg-green-50"}>
          <AlertTriangle className={`h-4 w-4 ${orphanCount > 0 ? 'text-orange-600' : 'text-green-600'}`} />
          <AlertDescription className={orphanCount > 0 ? "text-orange-700" : "text-green-700"}>
            {orphanCount > 0 ? (
              <>
                <strong>⚠️ {orphanCount} padrão(ões) órfão(s) detectado(s)</strong>
                <p className="text-sm mt-1">
                  Estes padrões referenciam progressões que não existem mais no banco e devem ser removidos.
                </p>
              </>
            ) : (
              <>
                <strong>✅ Nenhum padrão órfão detectado</strong>
                <p className="text-sm mt-1">
                  Todos os padrões de aprendizado referenciam progressões válidas.
                </p>
              </>
            )}
          </AlertDescription>
        </Alert>

        {result && (
          <Alert className={result.success ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"}>
            {result.success ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className={result.success ? "text-green-700" : "text-red-700"}>
              {result.message}
              {result.orphansByProgression && (
                <div className="mt-2 text-xs">
                  <strong>Progressões órfãs removidas:</strong>
                  <ul className="mt-1 ml-4">
                    {Object.entries(result.orphansByProgression).map(([name, patterns]) => (
                      <li key={name}>"{name}": {patterns.length} padrão(ões)</li>
                    ))}
                  </ul>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        <Button
          onClick={handleCleanOrphans}
          disabled={cleaning || orphanCount === 0}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white"
        >
          {cleaning ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Limpando...
            </>
          ) : (
            <>
              <Trash2 className="w-4 h-4 mr-2" />
              Limpar Padrões Órfãos ({orphanCount})
            </>
          )}
        </Button>

        <p className="text-xs text-gray-600">
          💡 Execute esta limpeza sempre que deletar progressões do banco para manter o sistema consistente.
        </p>
      </CardContent>
    </Card>
  );
}