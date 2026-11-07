import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, BarChart3, Users, ShieldAlert, Calendar, DollarSign, UserCircle2, BookOpen, Waves } from "lucide-react";
import { motion } from "framer-motion";

// Sub-pages
import AdminPlanoAulas from "../components/admin/AdminPlanoAulas";
import AdminRelatorios from "../components/admin/AdminRelatorios";
import AdminFrequencia from "../components/admin/AdminFrequencia";
import AdminAlunos from "../components/admin/AdminAlunos";
import AdminTurmas from "../components/admin/AdminTurmas";
import AdminPagamentos from "../components/admin/AdminPagamentos";
import AdminCalendario from "../components/admin/AdminCalendario";
import AdminMateriais from "../components/admin/AdminMateriais";
import AdminHarmonicTrends from "../components/admin/AdminHarmonicTrends";

export default function AdminPanel() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    base44.auth.me()
      .then(setCurrentUser)
      .catch(() => {})
      .finally(() => setLoadingUser(false));
  }, []);

  if (loadingUser) {
    return (
      <div className="bg-amber-50 min-h-screen flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-[#8B6F47] border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (currentUser?.role !== 'admin') {
    return (
      <div className="bg-amber-50 min-h-screen flex items-center justify-center p-8">
        <Card className="border-red-200 bg-white max-w-md w-full">
          <CardContent className="p-8 text-center">
            <ShieldAlert className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-red-600 mb-2">Acesso Restrito</h2>
            <p className="text-gray-600">Esta área é exclusiva para administradores do sistema.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-amber-50 min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#8B6F47] to-[#D4AF37] flex items-center justify-center">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[#8B6F47]">Painel do Administrador</h1>
              <p className="text-[#A68A64]">Gerenciamento completo do curso</p>
            </div>
          </div>
        </motion.div>

        <Tabs defaultValue="alunos" className="space-y-6">
          <TabsList className="bg-white border border-[#D4C5B0] p-1 h-auto flex flex-wrap gap-1">
            <TabsTrigger value="alunos" className="data-[state=active]:bg-[#8B6F47] data-[state=active]:text-white flex items-center gap-2 py-2 px-3 text-sm">
              <UserCircle2 className="w-4 h-4" />
              Alunos
            </TabsTrigger>
            <TabsTrigger value="turmas" className="data-[state=active]:bg-[#8B6F47] data-[state=active]:text-white flex items-center gap-2 py-2 px-3 text-sm">
              <GraduationCap className="w-4 h-4" />
              Turmas
            </TabsTrigger>
            <TabsTrigger value="calendario" className="data-[state=active]:bg-[#8B6F47] data-[state=active]:text-white flex items-center gap-2 py-2 px-3 text-sm">
              <Calendar className="w-4 h-4" />
              Calendário
            </TabsTrigger>
            <TabsTrigger value="pagamentos" className="data-[state=active]:bg-[#8B6F47] data-[state=active]:text-white flex items-center gap-2 py-2 px-3 text-sm">
              <DollarSign className="w-4 h-4" />
              Pagamentos
            </TabsTrigger>
            <TabsTrigger value="frequencia" className="data-[state=active]:bg-[#8B6F47] data-[state=active]:text-white flex items-center gap-2 py-2 px-3 text-sm">
              <Users className="w-4 h-4" />
              Frequência
            </TabsTrigger>
            <TabsTrigger value="plano" className="data-[state=active]:bg-[#8B6F47] data-[state=active]:text-white flex items-center gap-2 py-2 px-3 text-sm">
              <GraduationCap className="w-4 h-4" />
              Plano de Aulas
            </TabsTrigger>
            <TabsTrigger value="materiais" className="data-[state=active]:bg-[#8B6F47] data-[state=active]:text-white flex items-center gap-2 py-2 px-3 text-sm">
              <BookOpen className="w-4 h-4" />
              Materiais
            </TabsTrigger>
            <TabsTrigger value="relatorios" className="data-[state=active]:bg-[#8B6F47] data-[state=active]:text-white flex items-center gap-2 py-2 px-3 text-sm">
              <BarChart3 className="w-4 h-4" />
              Relatórios
            </TabsTrigger>
            <TabsTrigger value="harmonia" className="data-[state=active]:bg-[#8B6F47] data-[state=active]:text-white flex items-center gap-2 py-2 px-3 text-sm">
              <Waves className="w-4 h-4" />
              Tendências Harmônicas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="alunos">
            <AdminAlunos />
          </TabsContent>

          <TabsContent value="turmas">
            <AdminTurmas />
          </TabsContent>

          <TabsContent value="calendario">
            <AdminCalendario />
          </TabsContent>

          <TabsContent value="pagamentos">
            <AdminPagamentos />
          </TabsContent>

          <TabsContent value="frequencia">
            <AdminFrequencia />
          </TabsContent>

          <TabsContent value="plano">
            <AdminPlanoAulas />
          </TabsContent>

          <TabsContent value="materiais">
            <AdminMateriais />
          </TabsContent>

          <TabsContent value="relatorios">
            <AdminRelatorios />
          </TabsContent>

          <TabsContent value="harmonia">
            <AdminHarmonicTrends />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}