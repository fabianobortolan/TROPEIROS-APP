import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Music, Upload, Loader2, Trash2, AlertCircle } from "lucide-react";

export default function MidiUploadCard({ song }) {
  const queryClient = useQueryClient();
  const midiFileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState(null);
  const [midiUrl, setMidiUrl] = useState(song.solo_midi_url || null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (midiFileInputRef.current) midiFileInputRef.current.value = '';

    const fn = file.name.toLowerCase();
    if (!fn.endsWith('.mid') && !fn.endsWith('.midi')) {
      setError("Selecione um arquivo MIDI (.mid ou .midi)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Arquivo muito grande. Máximo 5MB");
      return;
    }

    setUploading(true);
    setError(null);
    try {
      // Renomeia para .bin pois o servidor bloqueia arquivos .mid/.midi por extensão
      const fixedFile = new File([file], file.name.replace(/\.midi?$/i, '.bin'), { type: 'application/octet-stream' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file: fixedFile });
      await base44.entities.Song.update(song.id, { solo_midi_url: file_url });
      setMidiUrl(file_url);
      queryClient.invalidateQueries({ queryKey: ['songs'] });
    } catch (err) {
      console.error('Erro upload MIDI:', err);
      setError(`Erro no upload: ${err.message || 'Tente novamente'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm("Remover o arquivo MIDI do solo?")) return;
    setRemoving(true);
    try {
      await base44.entities.Song.update(song.id, { solo_midi_url: null });
      setMidiUrl(null);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['songs'] });
    } catch (err) {
      setError(`Erro ao remover: ${err.message}`);
    } finally {
      setRemoving(false);
    }
  };

  return (
    <Card className="border-[#D4C5B0] bg-white/60">
      <CardHeader>
        <CardTitle className="text-[#8B6F47] flex items-center gap-2">
          <Music className="w-5 h-5 text-purple-500" />
          Solo MIDI
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {midiUrl ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Music className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-[#8B6F47]">Arquivo MIDI anexado</p>
                <p className="text-xs text-[#A68A64]">Pronto para reprodução no Player</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => midiFileInputRef.current?.click()} variant="outline"
                className="flex-1 border-purple-500 text-purple-700 hover:bg-purple-50" disabled={uploading || removing}>
                {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enviando...</> : <><Upload className="w-4 h-4 mr-2" />Substituir</>}
              </Button>
              <Button onClick={handleRemove} variant="outline"
                className="flex-1 border-red-500 text-red-600 hover:bg-red-50" disabled={uploading || removing}>
                {removing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}Remover
              </Button>
            </div>
            <input ref={midiFileInputRef} type="file" accept=".mid,.midi" onChange={handleFileSelect} className="hidden" />
          </div>
        ) : (
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer ${
              uploading ? "border-purple-400 bg-purple-50 cursor-not-allowed" : "border-[#D4C5B0] hover:border-purple-500 hover:bg-purple-50"
            }`}
            onClick={() => !uploading && midiFileInputRef.current?.click()}
          >
            <input ref={midiFileInputRef} type="file" accept=".mid,.midi" onChange={handleFileSelect} className="hidden" />
            {uploading ? (
              <><Loader2 className="w-12 h-12 text-purple-500 mx-auto mb-3 animate-spin" /><p className="text-purple-700 font-medium">Fazendo upload...</p></>
            ) : (
              <><Music className="w-12 h-12 text-purple-400 mx-auto mb-3" /><p className="text-[#8B6F47] font-medium mb-1">Clique para fazer upload do Solo MIDI</p><p className="text-sm text-[#A68A64]">Arquivos .mid ou .midi (Guitar Pro, etc.)</p></>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}