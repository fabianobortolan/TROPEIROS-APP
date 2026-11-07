import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, RotateCcw, Clock, Trash2, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function DataProtectionDashboard() {
  const [restoring, setRestoring] = useState(null);

  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ['dataChangeLogs'],
    queryFn: () => base44.entities.DataChangeLog.list('-change_timestamp', 100),
    initialData: []
  });

  const { data: deleted, isLoading: deletedLoading, refetch } = useQuery({
    queryKey: ['deletedEntities'],
    queryFn: () => base44.entities.DeletedEntity.filter({ can_restore: true }, '-deleted_at', 50),
    initialData: []
  });

  const handleRestore = async (deletedId, entityName) => {
    if (!confirm(`Restaurar "${entityName}"? Esta ação será registrada em auditoria.`)) return;

    setRestoring(deletedId);
    try {
      const response = await base44.functions.invoke('restoreDeletedEntity', { deletedEntityId: deletedId });
      
      if (response.data.success) {
        alert('✅ ' + response.data.message);
        refetch();
      } else {
        alert('❌ ' + response.data.error);
      }
    } catch (err) {
      alert('❌ Erro ao restaurar: ' + err.message);
    } finally {
      setRestoring(null);
    }
  };

  const actionColors = {
    create: 'bg-green-100 text-green-800',
    update: 'bg-blue-100 text-blue-800',
    delete: 'bg-red-100 text-red-800',
    restore: 'bg-purple-100 text-purple-800'
  };

  const actionLabels = {
    create: '✨ Criado',
    update: '✏️ Alterado',
    delete: '🗑️ Deletado',
    restore: '♻️ Restaurado'
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}>

        <Alert className="border-amber-400 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-900">
            <strong>🛡️ Proteção de Dados Ativa:</strong> Todas as alterações são registradas em auditoria. Deletados podem ser restaurados em até 30 dias.
          </AlertDescription>
        </Alert>
      </motion.div>

      <Tabs defaultValue="logs" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-[#E8DCC4]">
          <TabsTrigger value="logs" className="text-[#8B6F47] data-[state=active]:bg-white data-[state=active]:shadow">
            📋 Histórico de Alterações
          </TabsTrigger>
          <TabsTrigger value="trash" className="text-[#8B6F47] data-[state=active]:bg-white data-[state=active]:shadow">
            🗑️ Papeleira ({deleted.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-4">
          <Card className="border-[#D4C5B0] bg-white/80">
            <CardHeader>
              <CardTitle className="text-[#8B6F47]">Auditoria de Mudanças</CardTitle>
              <CardDescription>Registro de todas as alterações no sistema</CardDescription>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <p className="text-[#A68A64]">Carregando...</p>
              ) : logs.length === 0 ? (
                <p className="text-center text-[#A68A64] py-8">Nenhuma alteração registrada ainda</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {logs.map((log) => (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-3 rounded-lg border border-[#D4C5B0] hover:bg-[#F5F1E8]/50 transition-colors">

                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={actionColors[log.action]}>
                              {actionLabels[log.action]}
                            </Badge>
                            {log.is_critical && (
                              <Badge variant="destructive" className="text-xs">⚠️ Crítica</Badge>
                            )}
                          </div>
                          <p className="text-sm text-[#8B6F47] font-medium">
                            {log.entity_type}: {log.entity_id?.substring(0, 12)}...
                          </p>
                          <p className="text-xs text-[#A68A64]">
                            por {log.changed_by?.split('@')[0]} • {format(new Date(log.change_timestamp), 'PPpp', { locale: ptBR })}
                          </p>
                          
                          {log.changes_summary && log.changes_summary.length > 0 && (
                            <div className="mt-2 text-xs text-[#A68A64] space-y-1">
                              {log.changes_summary.slice(0, 3).map((change, idx) => (
                                <div key={idx} className="flex gap-1">
                                  <span className="font-medium">{change.field}:</span>
                                  <span className="line-through">{String(change.old_value)}</span>
                                  <span>→</span>
                                  <span className="text-[#8B6F47]">{String(change.new_value)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trash" className="space-y-4">
          <Card className="border-[#D4C5B0] bg-white/80">
            <CardHeader>
              <CardTitle className="text-[#8B6F47]">Papeleira</CardTitle>
              <CardDescription>Itens deletados que podem ser restaurados (até 30 dias)</CardDescription>
            </CardHeader>
            <CardContent>
              {deletedLoading ? (
                <p className="text-[#A68A64]">Carregando...</p>
              ) : deleted.length === 0 ? (
                <p className="text-center text-[#A68A64] py-8">Papeleira vazia</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {deleted.map((item) => {
                    const daysLeft = Math.ceil((new Date(item.restore_deadline) - new Date()) / (1000 * 60 * 60 * 24));
                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="p-4 rounded-lg border border-[#D4C5B0] hover:bg-[#F5F1E8]/50 transition-colors">

                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-[#8B6F47] mb-1">
                              {item.entity_name}
                            </p>
                            <p className="text-xs text-[#A68A64] mb-2">
                              {item.entity_type} • Deletado por {item.deleted_by?.split('@')[0]}
                            </p>
                            <div className="flex items-center gap-2">
                              <Clock className="w-3 h-3 text-[#D4AF37]" />
                              <span className="text-xs text-[#A68A64]">
                                {daysLeft > 0 ? (
                                  <span className="text-amber-600 font-medium">{daysLeft} dia(s) restante(s)</span>
                                ) : (
                                  <span className="text-red-600">Prazo expirado</span>
                                )}
                              </span>
                            </div>
                          </div>
                          <Button
                            onClick={() => handleRestore(item.id, item.entity_name)}
                            disabled={restoring === item.id || daysLeft <= 0}
                            className="bg-[#9CAF88] hover:bg-[#8B9B7B] text-white text-xs h-8">
                            {restoring === item.id ? (
                              <>
                                <span className="animate-spin inline-block mr-1">⟳</span>
                                Restaurando...
                              </>
                            ) : (
                              <>
                                <RotateCcw className="w-3 h-3 mr-1" />
                                Restaurar
                              </>
                            )}
                          </Button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}