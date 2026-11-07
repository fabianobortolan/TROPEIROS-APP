import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Download, Upload, Database, Music, Waves, ListMusic, CheckCircle, AlertCircle, Loader2, Music4, Guitar, Target } from "lucide-react";
import { motion } from "framer-motion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import SelectiveExporter from "../components/backup/SelectiveExporter";
import { BACKUP_ENTITIES, fetchAllRecords, downloadJson, runImport } from "@/utils/backupUtils";

const APP_NAME = "TropeirosDoBebedouro";

export default function Backup() {
  const queryClient = useQueryClient();
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState("");
  const [importSuccess, setImportSuccess] = useState(null);
  const [importError, setImportError] = useState(null);

  const { data: allData = {}, isLoading: loadingData } = useQuery({
    queryKey: ['backup-all'],
    queryFn: async () => {
      const out = {};
      for (const { key, entity } of BACKUP_ENTITIES) {
        out[key] = await fetchAllRecords(entity);
      }
      return out;
    }
  });

  const songs = allData.songs || [];
  const progressions = allData.progressions || [];
  const rhythms = allData.rhythms || [];
  const setlists = allData.setlists || [];
  const chords = allData.chords || [];
  const exercises = allData.exercises || [];
  const totalCount = BACKUP_ENTITIES.reduce((sum, { key }) => sum + (allData[key]?.length || 0), 0);

  const handleExportAll = () => {
    const data = {
      export_date: new Date().toISOString(),
      app_name: "Tropeiros do Bebedouro",
      version: "2.0",
      data: Object.fromEntries(BACKUP_ENTITIES.map(({ key }) => [key, allData[key] || []]))
    };
    downloadJson(data, `${APP_NAME}_Backup_${new Date().toISOString().split('T')[0]}.json`);
  };

  const handleExportType = (key, type) => {
    const data = {
      export_date: new Date().toISOString(),
      export_type: key,
      data: allData[key] || []
    };
    downloadJson(data, `${APP_NAME}_${type}_${new Date().toISOString().split('T')[0]}.json`);
  };

  const exportButtons = [
    { key: "songs", label: "Músicas", icon: Music },
    { key: "progressions", label: "Progressões", icon: Waves },
    { key: "rhythms", label: "Ritmos", icon: Music4 },
    { key: "chords", label: "Acordes", icon: Guitar },
    { key: "setlists", label: "Setlists", icon: ListMusic },
    { key: "exercises", label: "Exercícios", icon: Target }
  ];

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportError(null);
    setImportSuccess(null);
    setImportProgress("");

    try {
      const text = await file.text();
      const importData = JSON.parse(text);
      const results = await runImport(importData, (entity) => setImportProgress(entity));

      if (results.errors.length > 0) {
        console.warn('Erros durante importação:', results.errors);
      }

      const total = results.created + results.updated;
      if (total === 0) {
        throw new Error("Nenhum registro foi importado. Verifique se o arquivo contém dados.");
      }

      setImportSuccess({ created: results.created, updated: results.updated, errors: results.errors.length });
      queryClient.invalidateQueries({ queryKey: ['backup-all'] });
      queryClient.invalidateQueries({ queryKey: ['songs'] });
      queryClient.invalidateQueries({ queryKey: ['progressions'] });
      queryClient.invalidateQueries({ queryKey: ['rhythms'] });
      queryClient.invalidateQueries({ queryKey: ['setlists'] });
      queryClient.invalidateQueries({ queryKey: ['chords'] });

    } catch (err) {
      console.error(err);
      setImportError(`Erro ao importar: ${err.message || "Verifique se o arquivo é válido."}`);
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  const stats = exportButtons;

  return (
    <div className="bg-amber-50 p-4 min-h-screen md:p-8">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8">

          <h1 className="text-4xl font-bold text-[#8B6F47] mb-2" style={{ letterSpacing: '0.5px' }}>
            Backup & Exportação
          </h1>
          <p className="text-[#A68A64]">Faça backup dos seus dados e exporte para o computador</p>
        </motion.div>

        {loadingData && (
          <div className="flex items-center justify-center py-16 gap-3">
            <Loader2 className="w-8 h-8 text-[#8B6F47] animate-spin" />
            <p className="text-[#8B6F47] font-medium">Carregando todos os dados...</p>
          </div>
        )}

        {!loadingData && (
        <>
        {importSuccess &&
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6">

            <Alert className="border-[#9CAF88] bg-[#9CAF88]/10">
              <CheckCircle className="h-4 w-4 text-[#9CAF88]" />
              <AlertDescription className="text-[#8B6F47]">
                Dados importados com sucesso! {importSuccess.created} criados, {importSuccess.updated} atualizados.
                {importSuccess.errors > 0 && ` (${importSuccess.errors} tipo(s) de registro com erro — veja o console)`}
              </AlertDescription>
            </Alert>
          </motion.div>
        }

        {importError &&
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6">

            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{importError}</AlertDescription>
            </Alert>
          </motion.div>
        }

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}>

            <Card className="border-[#D4C5B0] bg-white/80 backdrop-blur-sm shadow-xl h-full">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#9CAF88] to-[#8B6F47] rounded-xl flex items-center justify-center">
                    <Download className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-[#8B6F47]">Exportar Todos</CardTitle>
                    <CardDescription>Backup completo ou por categoria</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={handleExportAll}
                  className="w-full bg-gradient-to-r from-[#8B6F47] to-[#A68A64] hover:from-[#A68A64] hover:to-[#8B6F47] text-white shadow-lg justify-start">

                  <Database className="w-4 h-4 mr-2" />
                  Exportar Tudo ({totalCount} itens)
                </Button>

                {exportButtons.map(({ key, label, icon: Icon }) => (
                  <Button
                    key={key}
                    onClick={() => handleExportType(key, label)}
                    variant="outline"
                    className="w-full border-[#8B6F47] text-[#8B6F47] hover:bg-[#8B6F47] hover:text-white justify-start">

                    <Icon className="w-4 h-4 mr-2" />
                    Exportar {label} ({(allData[key] || []).length})
                  </Button>
                ))}

                <div className="pt-3 text-xs text-[#A68A64] space-y-1">
                  <p>💡 Dica: Crie uma pasta no seu computador (ex: "TropeirosDoBebedouro_Backups")</p>
                  <p>📁 Os arquivos serão salvos em formato JSON</p>
                  <p>🔄 Faça backups regularmente para não perder seus dados</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}>

            <Card className="border-[#D4C5B0] bg-white/80 backdrop-blur-sm shadow-xl h-full">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#D4AF37] to-[#9CAF88] rounded-xl flex items-center justify-center">
                    <Upload className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-[#8B6F47]">Importar Dados</CardTitle>
                    <CardDescription>Restaure backup de arquivo JSON</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-[#D4C5B0] rounded-xl p-8 text-center hover:border-[#8B6F47] hover:bg-[#8B6F47]/5 transition-all duration-300">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    disabled={importing}
                    className="hidden"
                    id="import-file" />

                  <label
                    htmlFor="import-file"
                    className="cursor-pointer flex flex-col items-center">

                    {importing ?
                    <>
                        <Loader2 className="w-12 h-12 text-[#8B6F47] mb-3 animate-spin" />
                        <p className="text-[#8B6F47] font-medium">Importando dados...</p>
                        <p className="text-sm text-[#A68A64]">{importProgress ? `Processando: ${importProgress}` : "Por favor, aguarde"}</p>
                      </> :

                    <>
                        <Upload className="w-12 h-12 text-[#A68A64] mb-3" />
                        <p className="text-[#8B6F47] font-medium mb-1">
                          Clique para selecionar arquivo
                        </p>
                        <p className="text-sm text-[#A68A64]">
                          Arquivo JSON de backup
                        </p>
                      </>
                    }
                  </label>
                </div>

                <Alert className="border-[#D4AF37]/30 bg-[#D4AF37]/5">
                  <AlertCircle className="h-4 w-4 text-[#D4AF37]" />
                  <AlertDescription className="text-[#8B6F47] text-xs">
                    <strong>Atenção:</strong> Registros que já existem são atualizados (mesmo ID, sem duplicar);
                    registros ausentes são recriados e as referências (setlists, apostilas, aulas) são corrigidas automaticamente.
                  </AlertDescription>
                </Alert>

                <div className="pt-3 text-xs text-[#A68A64] space-y-1">
                  <p>⚠️ Certifique-se de usar apenas arquivos exportados deste app</p>
                  <p>✅ O arquivo deve estar em formato JSON válido</p>
                  <p>🔄 Registros sem título podem exigir revisão após a importação</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8">

          <h2 className="text-2xl font-bold text-[#8B6F47] mb-4" style={{ letterSpacing: '0.5px' }}>
            Exportação Individual
          </h2>
          <div className="grid grid-cols-1 gap-4">
            {exportButtons.map(({ key, label, icon: Icon }) => (
              <SelectiveExporter
                key={key}
                items={allData[key] || []}
                label={label}
                icon={Icon}
                exportType={key}
                onExport={() => handleExportType(key, label)} />
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}>

          <Card className="border-[#D4C5B0] bg-gradient-to-br from-[#F5F1E8] to-white shadow-xl">
            <CardHeader>
              <CardTitle className="text-[#8B6F47]">📋 Estatísticas do Banco de Dados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {stats.map(({ key, label, icon: Icon }) => (
                  <div key={key} className="flex items-center gap-3 p-4 bg-white/60 rounded-xl border border-[#D4C5B0]">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#8B6F47] to-[#A68A64] rounded-xl flex items-center justify-center">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-[#8B6F47]">{(allData[key] || []).length}</p>
                      <p className="text-sm text-[#A68A64]">{label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
        </>
        )}
      </div>
    </div>);

}