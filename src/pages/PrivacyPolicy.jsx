import React from "react";
import { Shield, Lock, Eye, Database, Mail, User, AlertCircle, CheckCircle } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F1E8] to-[#E8DCC4] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        
        {/* Cabeçalho */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-[#8B6F47] to-[#D4AF37] rounded-full flex items-center justify-center shadow-lg">
              <Shield className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-[#2d1810] mb-2">
            Política de Privacidade
          </h1>
          <p className="text-[#8B6F47] font-medium text-lg">Tropeiros do Bebedouro</p>
          <p className="text-[#A68A64] text-sm mt-2">Última atualização: fevereiro de 2026</p>
        </div>

        <div className="space-y-6">

          {/* Introdução */}
          <Section icon={<CheckCircle className="w-5 h-5" />} title="1. Introdução">
            <p>
              Bem-vindo ao aplicativo <strong>Tropeiros do Bebedouro – Progressões Harmônicas</strong>. 
              Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos 
              suas informações pessoais ao utilizar nossa plataforma.
            </p>
            <p className="mt-3">
              Ao utilizar este aplicativo, você concorda com as práticas descritas nesta política. 
              Caso não concorde, recomendamos que não utilize o serviço.
            </p>
          </Section>

          {/* Dados coletados */}
          <Section icon={<Database className="w-5 h-5" />} title="2. Dados que Coletamos">
            <p className="mb-3">Coletamos os seguintes tipos de informações:</p>
            <ul className="space-y-2">
              <InfoItem title="Dados de cadastro" text="Nome completo e endereço de e-mail fornecidos durante o registro." />
              <InfoItem title="Dados musicais" text="Cifras, progressões harmônicas, anotações e músicas que você adiciona ao sistema." />
              <InfoItem title="Dados de uso" text="Informações sobre como você utiliza o aplicativo, como páginas acessadas e funcionalidades utilizadas." />
              <InfoItem title="Arquivos de áudio" text="Arquivos de playback e áudio que você optar por fazer upload no sistema." />
              <InfoItem title="Preferências" text="Configurações de velocidade de rolagem, temas visuais e outras preferências salvas." />
            </ul>
          </Section>

          {/* Uso dos dados */}
          <Section icon={<Eye className="w-5 h-5" />} title="3. Como Usamos seus Dados">
            <p className="mb-3">Utilizamos suas informações para:</p>
            <ul className="space-y-2">
              <InfoItem title="Autenticação" text="Verificar sua identidade e garantir acesso seguro à sua conta." />
              <InfoItem title="Funcionalidades do app" text="Armazenar e exibir suas músicas, cifras, repertórios e progressões harmônicas." />
              <InfoItem title="Personalização" text="Salvar suas preferências e configurações para uma melhor experiência." />
              <InfoItem title="Análise musical" text="Processar cifras e áudios para identificar progressões harmônicas com auxílio de IA." />
              <InfoItem title="Melhorias" text="Entender como o sistema é usado para aprimorar funcionalidades e corrigir problemas." />
            </ul>
          </Section>

          {/* Compartilhamento */}
          <Section icon={<User className="w-5 h-5" />} title="4. Compartilhamento de Dados">
            <p className="mb-3">
              <strong>Não vendemos, alugamos ou compartilhamos seus dados pessoais com terceiros</strong> para fins comerciais.
            </p>
            <p className="mb-3">Seus dados podem ser compartilhados apenas nas seguintes situações:</p>
            <ul className="space-y-2">
              <InfoItem title="Provedores de serviço" text="Plataformas de infraestrutura (como armazenamento em nuvem e banco de dados) necessárias para o funcionamento do aplicativo, sob acordos de confidencialidade." />
              <InfoItem title="Serviços de IA" text="Para análise harmônica, trechos de cifras ou áudios podem ser processados por serviços de inteligência artificial. Esses dados são usados apenas para gerar a análise solicitada." />
              <InfoItem title="Obrigação legal" text="Quando exigido por lei, ordem judicial ou autoridade competente." />
            </ul>
          </Section>

          {/* Segurança */}
          <Section icon={<Lock className="w-5 h-5" />} title="5. Segurança dos Dados">
            <p className="mb-3">
              Adotamos medidas técnicas e organizacionais para proteger seus dados contra acesso não autorizado, 
              alteração, divulgação ou destruição, incluindo:
            </p>
            <ul className="space-y-2">
              <InfoItem title="Criptografia" text="Comunicações entre o aplicativo e os servidores são criptografadas via HTTPS/TLS." />
              <InfoItem title="Autenticação segura" text="Sistema de login com controle de acesso baseado em funções (admin/usuário)." />
              <InfoItem title="Acesso restrito" text="Apenas usuários autorizados podem acessar seus próprios dados." />
              <InfoItem title="Backups" text="Dados são armazenados com redundância para prevenir perda de informações." />
            </ul>
          </Section>

          {/* Retenção */}
          <Section icon={<Database className="w-5 h-5" />} title="6. Retenção de Dados">
            <p>
              Seus dados são mantidos enquanto sua conta estiver ativa. Caso deseje excluir sua conta 
              e todos os dados associados, entre em contato através do e-mail indicado nesta política. 
              Após a solicitação, seus dados serão removidos em até <strong>30 dias</strong>, salvo 
              obrigações legais que exijam retenção por período maior.
            </p>
          </Section>

          {/* Direitos do usuário */}
          <Section icon={<User className="w-5 h-5" />} title="7. Seus Direitos">
            <p className="mb-3">
              Em conformidade com a <strong>Lei Geral de Proteção de Dados (LGPD – Lei nº 13.709/2018)</strong>, 
              você tem direito a:
            </p>
            <ul className="space-y-2">
              <InfoItem title="Acesso" text="Solicitar uma cópia dos dados pessoais que temos sobre você." />
              <InfoItem title="Correção" text="Corrigir dados incorretos ou desatualizados diretamente no perfil do aplicativo." />
              <InfoItem title="Exclusão" text="Solicitar a exclusão dos seus dados pessoais." />
              <InfoItem title="Portabilidade" text="Solicitar os seus dados em formato estruturado." />
              <InfoItem title="Oposição" text="Opor-se ao tratamento de dados em determinadas situações." />
            </ul>
          </Section>

          {/* Cookies */}
          <Section icon={<Eye className="w-5 h-5" />} title="8. Cookies e Tecnologias Similares">
            <p>
              O aplicativo pode utilizar cookies e tecnologias similares para manter sua sessão ativa 
              e salvar preferências locais. Esses dados são armazenados localmente no seu navegador 
              e não são compartilhados com terceiros.
            </p>
          </Section>

          {/* Menores */}
          <Section icon={<AlertCircle className="w-5 h-5" />} title="9. Menores de Idade">
            <p>
              Este aplicativo é destinado a músicos adultos. Não coletamos intencionalmente dados 
              de menores de 18 anos. Se identificarmos que dados de menores foram coletados sem 
              consentimento dos responsáveis, eles serão excluídos imediatamente.
            </p>
          </Section>

          {/* Alterações */}
          <Section icon={<AlertCircle className="w-5 h-5" />} title="10. Alterações nesta Política">
            <p>
              Esta política pode ser atualizada periodicamente. Quando houver alterações significativas, 
              você será notificado por e-mail ou através de aviso no aplicativo. O uso continuado após 
              as alterações implica na aceitação da nova política.
            </p>
          </Section>

          {/* Contato */}
          <Section icon={<Mail className="w-5 h-5" />} title="11. Contato">
            <p className="mb-3">
              Para exercer seus direitos, esclarecer dúvidas ou fazer solicitações relacionadas à privacidade, 
              entre em contato:
            </p>
            <div className="bg-[#F5F1E8] rounded-lg p-4 border border-[#D4C5B0]">
              <p className="font-bold text-[#2d1810]">Tropeiros do Bebedouro</p>
              <p className="text-[#8B6F47] mt-1">
                <strong>E-mail:</strong> contato@tropeiros-do-bebedouro.com
              </p>
              <p className="text-[#8B6F47] mt-1">
                <strong>Site:</strong> tropeiros-do-bebedouro.com
              </p>
            </div>
          </Section>

        </div>

        {/* Rodapé */}
        <div className="mt-10 text-center text-sm text-[#A68A64] pb-8">
          <p>© 2026 Tropeiros do Bebedouro. Todos os direitos reservados.</p>
          <p className="mt-1">Esta política está em conformidade com a LGPD (Lei nº 13.709/2018).</p>
        </div>

      </div>
    </div>
  );
}

function Section({ icon, title, children }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#D4C5B0]/50 p-6">
      <h2 className="text-lg font-bold text-[#2d1810] mb-4 flex items-center gap-2">
        <span className="text-[#8B6F47]">{icon}</span>
        {title}
      </h2>
      <div className="text-[#4a3728] leading-relaxed text-sm md:text-base">
        {children}
      </div>
    </div>
  );
}

function InfoItem({ title, text }) {
  return (
    <li className="flex items-start gap-2">
      <span className="w-2 h-2 rounded-full bg-[#D4AF37] mt-2 flex-shrink-0" />
      <span><strong className="text-[#2d1810]">{title}:</strong> {text}</span>
    </li>
  );
}