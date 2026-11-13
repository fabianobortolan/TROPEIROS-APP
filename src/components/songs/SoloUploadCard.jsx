import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Guitar, FileText, Upload, Loader2, Trash2, ExternalLink, AlertCircle, Image } from "lucide-react";

export default function SoloUploadCard({ song, soloFileInputRef, uploadingSolo, soloError, onUpload, onRemove, podeEditar = true }) {
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(song.solo_pdf_url || "");

  return (
    <Card className="border-[#D4C5B0] bg-white/60">
      <CardHeader>
        <CardTitle className="text-[#8B6F47] flex items-center gap-2">
          <Guitar className="w-5 h-5" />
          Solo da Música
        </CardTitle>
      </CardHeader>
      <CardContent>
        {soloError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{soloError}</AlertDescription>
          </Alert>
        )}

        {song.solo_pdf_url ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-4 bg-[#9CAF88]/10 rounded-lg border border-[#9CAF88]/30">
              <div className="w-12 h-12 bg-gradient-to-br from-[#D4AF37] to-[#9CAF88] rounded-lg flex items-center justify-center">
                {isImage ? <Image className="w-6 h-6 text-white" /> : <FileText className="w-6 h-6 text-white" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-[#8B6F47]">Solo</p>
                <p className="text-xs text-[#A68A64]">Arquivo anexado</p>
              </div>
              <a href={song.solo_pdf_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-[#8B6F47] hover:text-[#A68A64] transition-colors text-sm">
                Abrir <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            {isImage && (
              <div className="rounded-xl overflow-hidden border border-[#D4C5B0]">
                <img src={song.solo_pdf_url} alt="Solo tablatura" className="w-full object-contain max-h-96" />
              </div>
            )}

            {podeEditar && <div className="flex gap-3">
              <Button onClick={() => soloFileInputRef.current?.click()} variant="outline"
                className="flex-1 border-[#8B6F47] text-[#8B6F47] hover:bg-[#8B6F47] hover:text-white" disabled={uploadingSolo}>
                {uploadingSolo ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enviando...</> : <><Upload className="w-4 h-4 mr-2" />Substituir</>}
              </Button>
              <Button onClick={onRemove} variant="outline"
                className="flex-1 border-red-500 text-red-600 hover:bg-red-50" disabled={uploadingSolo}>
                <Trash2 className="w-4 h-4 mr-2" />Remover Solo
              </Button>
            </div>}

            <input ref={soloFileInputRef} type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
              onChange={onUpload} className="hidden" disabled={uploadingSolo} />
          </div>
        ) : (
          <div className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer ${
                uploadingSolo ? 'border-[#8B6F47] bg-[#8B6F47]/5 cursor-not-allowed' : 'border-[#D4C5B0] hover:border-[#8B6F47] hover:bg-[#8B6F47]/5'
              }`}
              onClick={() => !uploadingSolo && soloFileInputRef.current?.click()}
            >
              <input ref={soloFileInputRef} type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
                onChange={onUpload} className="hidden" disabled={uploadingSolo} />
              {uploadingSolo ? (
                <>
                  <Loader2 className="w-12 h-12 text-[#8B6F47] mx-auto mb-3 animate-spin" />
                  <p className="text-[#8B6F47] font-medium">Fazendo upload...</p>
                </>
              ) : (
                <>
                  <Upload className="w-12 h-12 text-[#A68A64] mx-auto mb-3" />
                  <p className="text-[#8B6F47] font-medium mb-1">Clique para fazer upload do Solo</p>
                  <p className="text-sm text-[#A68A64]">PDF ou imagem PNG/JPG (máx. 10MB)</p>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}