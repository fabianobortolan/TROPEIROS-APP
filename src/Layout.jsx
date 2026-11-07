import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Music2, Library, Upload, Waves, ListMusic, Download, Music, Guitar, Palette, BarChart3, FileText, BookOpen, Target, LogOut, Piano, GraduationCap, GitBranch, ChevronDown, Timer, User, X, Sparkles, BookMarked, ShieldAlert, ShieldCheck, LayoutDashboard, Zap, Ear, Link2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

const navigationItems = [
  { title: "Analisar Música", url: createPageUrl("Analyze"), icon: Upload },
  { title: "Biblioteca Sertaneja", url: createPageUrl("Library"), icon: Guitar, publicItem: true },
  { title: "Biblioteca Pop/Rock", url: "/LibraryPopRock", icon: Zap, publicItem: true },
  { title: "Biblioteca Samba, MPB & Forró", url: "/LibrarySambaMPB", icon: Waves, publicItem: true },
  { title: "Biblioteca Instrumental", url: "/LibraryInstrumental", icon: FileText, publicItem: true },
  { title: "Repertórios", url: createPageUrl("Setlists"), icon: ListMusic, publicItem: true },
  { title: "Metrônomo", url: createPageUrl("MetronomePage"), icon: Timer },
  { title: "Progressões", url: createPageUrl("Progressions"), icon: Waves },
  { title: "Escalas", url: createPageUrl("Scales"), icon: Music2, publicItem: true },
  { title: "Modo Estudo", url: createPageUrl("ModoEstudo"), icon: BookMarked },
  { title: "Treinamento Auditivo", url: "/HarmonicEarTraining", icon: Ear },
  {
    title: "Teoria Musical",
    icon: GraduationCap,
    isGroup: true,
    children: [

      { title: "Formação de Acordes", url: createPageUrl("ChordBuilder"), icon: Piano },
      { title: "Explorador Harmônico", url: createPageUrl("HarmonicExplorer"), icon: GitBranch },
      { title: "Dicionário Musical", url: createPageUrl("MusicDictionary"), icon: GraduationCap },
      { title: "Exercícios Interativos", url: createPageUrl("TheoryExercises"), icon: Target },
      { title: "Gerador de Exercícios", url: createPageUrl("ExerciseGenerator"), icon: Target },
      { title: "Biblioteca de Referências", url: createPageUrl("ReferenceLibrary"), icon: BookOpen },
      { title: "Vincular Música à Aula", url: "/VincularMusicaAula", icon: Link2, adminOnly: true },
    ]
  },
  { title: "Ritmos", url: createPageUrl("Rhythms"), icon: Music },
  { title: "Estilos", url: createPageUrl("Styles"), icon: Palette },
  { title: "Acordes", url: createPageUrl("Chords"), icon: Guitar },
  { title: "Auditoria Geral", url: "/AuditoriaCifras", icon: ShieldCheck, adminOnly: true },
  { title: "Importar Tablaturas", url: "/ImportarTablaturas", icon: Upload, adminOnly: true },
  { title: "Relatórios", url: createPageUrl("Reports"), icon: BarChart3, adminOnly: true },
  { title: "Backup", url: createPageUrl("Backup"), icon: Download, adminOnly: true },
  { title: "📄 Documentação PDF", url: createPageUrl("Documentation"), icon: FileText },
  { title: "📖 Guia de Uso", url: createPageUrl("WorkflowGuide"), icon: BookOpen },
  { title: "📝 Template de Cifra", url: createPageUrl("TemplateGuide"), icon: FileText },
  { title: "🔒 Política de Privacidade", url: createPageUrl("PrivacyPolicy"), icon: FileText },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [open, setOpen] = React.useState(false);
  const [expandedGroups, setExpandedGroups] = React.useState({});
  const [currentUser, setCurrentUser] = React.useState(null);
  const [checkedUser, setCheckedUser] = React.useState(false);

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {}).finally(() => setCheckedUser(true));
  }, []);

  const isAdmin = currentUser?.role === 'admin';

  const toggleGroup = (groupTitle) => {
    setExpandedGroups((prev) => ({ ...prev, [groupTitle]: !prev[groupTitle] }));
  };

  const closeSidebar = () => setOpen(false);

  React.useEffect(() => {
    closeSidebar();
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const handleNavClick = () => {
    closeSidebar();
  };

  return (
    <>
      <style>{`
        :root {
          --color-primary: #8B6F47;
          --color-primary-dark: #6B5437;
          --color-secondary: #A68A64;
          --color-accent: #D4AF37;
          --color-green: #9CAF88;
          --color-light: #F5F1E8;
          --color-lighter: #E8DCC4;
        }
        body {
          background-color: #3D2B1F;
          background-image: 
            repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255,255,255,0.012) 2px, rgba(255,255,255,0.012) 4px),
            repeating-linear-gradient(180deg, transparent, transparent 40px, rgba(0,0,0,0.06) 40px, rgba(0,0,0,0.06) 41px, transparent 41px, transparent 80px, rgba(0,0,0,0.04) 80px, rgba(0,0,0,0.04) 81px),
            linear-gradient(180deg, #5C3D20 0%, #4A2E15 15%, #3D2410 30%, #503318 45%, #3A2210 60%, #4D3019 75%, #3D2510 90%, #442C14 100%);
        }
      `}</style>

      <div className="min-h-screen flex flex-col w-full">
        {/* Header */}
        <header className="bg-[#a08464] px-4 py-3 border-b border-[#D4C5B0]/50 shadow-sm flex-shrink-0" style={{ zIndex: 40, position: 'sticky', top: 0 }}>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onTouchEnd={(e) => { e.preventDefault(); setOpen(prev => !prev); }}
              onClick={() => setOpen(prev => !prev)}
              style={{
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation',
                cursor: 'pointer',
                background: 'none',
                border: 'none',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '800',
                  color: 'white',
                  fontSize: '13px',
                  letterSpacing: '2px',
                  background: 'radial-gradient(circle at 35% 35%, #c47a3a, #7a3d0e)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                  border: '2px solid rgba(255,255,255,0.15)',
                  flexShrink: 0,
                }}
              >
                MENU
              </div>
              <span className="text-stone-50 text-2xl font-extrabold underline uppercase">TROPEIROS DO BEBEDOURO</span>
            </button>
          </div>
        </header>

        {/* Overlay */}
        {open && (
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 49 }}
            onClick={closeSidebar}
          />
        )}

        {/* Sidebar Drawer */}
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            height: '100%',
            width: '280px',
            background: 'linear-gradient(180deg, #FFFFFF 0%, #F5F1E8 100%)',
            zIndex: 50,
            transform: open ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.3s ease',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            boxShadow: '4px 0 20px rgba(0,0,0,0.3)',
          }}
        >
          {/* Sidebar Header */}
          <div className="bg-amber-50 p-4 border-b border-[#D4C5B0]/50 flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-600 font-medium" style={{ letterSpacing: '0.5px' }}>
                Progressões Harmônicas v5.0
              </p>
              <button
                type="button"
                onClick={closeSidebar}
                className="p-1 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex justify-center">
              <img
                src="/img/522fde112_LOGO-PNG.png"
                alt="Tropeiros do Bebedouro Logo"
                className="w-32 h-32 object-contain opacity-90 drop-shadow-lg rounded-md"
              />
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto bg-amber-50 p-3">
            <p className="text-xs font-semibold text-black uppercase tracking-widest px-3 py-2 mb-1">Navegação</p>
            <nav className="space-y-1">
              {/* Portal do Aluno - para todos os usuários logados */}
              <Link
                to="/PortalAluno"
                onClick={handleNavClick}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                  location.pathname === '/PortalAluno'
                    ? 'bg-gradient-to-r from-[#8B6F47] via-[#A68A64] to-[#D4AF37] text-white shadow-lg shadow-[#8B6F47]/50'
                    : 'text-[#8B6F47] bg-[#F5F1E8]/60 hover:bg-[#8B6F47] hover:text-white'
                }`}
              >
                <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
                <span className="whitespace-nowrap text-sm font-bold">🎓 Portal do Aluno</span>
              </Link>

              {/* Item exclusivo para admin */}
              {isAdmin && (
                <Link
                  to="/AdminPanel"
                  onClick={handleNavClick}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                    location.pathname === '/AdminPanel'
                      ? 'bg-gradient-to-r from-[#8B6F47] via-[#A68A64] to-[#D4AF37] text-white shadow-lg shadow-[#8B6F47]/50'
                      : 'text-white bg-gradient-to-r from-[#8B6F47] to-[#A68A64] hover:from-[#6B5437] hover:to-[#8B6F47]'
                  }`}
                >
                  <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                  <span className="whitespace-nowrap text-sm font-bold">⚙️ Painel Admin</span>
                </Link>
              )}

              {navigationItems.filter(item => (!item.adminOnly || isAdmin) && (currentUser || !checkedUser || item.publicItem)).map((item) => {
                if (item.isGroup) {
                  return (
                    <div key={item.title}>
                      <button
                        type="button"
                        onClick={() => toggleGroup(item.title)}
                        className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-[#8B6F47] bg-[#F5F1E8]/60 hover:bg-[#8B6F47] hover:text-white transition-all duration-200 font-medium"
                      >
                        <div className="flex items-center gap-3">
                          <item.icon className="w-5 h-5 flex-shrink-0" />
                          <span className="whitespace-nowrap text-sm">{item.title}</span>
                        </div>
                        <ChevronDown className={`w-4 h-4 transition-transform ${expandedGroups[item.title] ? 'rotate-180' : ''}`} />
                      </button>
                      {expandedGroups[item.title] && (
                        <div className="ml-4 mt-1 space-y-1">
                          {item.children.filter(child => {
                            if (child.title === 'Plano de Aulas') return currentUser?.role === 'admin';
                            return true;
                          }).filter(child => !child.adminOnly || currentUser?.role === 'admin').map((child) => (
                            <Link
                              key={child.title}
                              to={child.url}
                              onClick={handleNavClick}
                              className={`flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                                location.pathname === child.url
                                  ? 'bg-gradient-to-r from-[#8B6F47] via-[#A68A64] to-[#D4AF37] text-white shadow-md'
                                  : 'text-[#8B6F47] bg-[#F5F1E8]/40 hover:bg-[#8B6F47] hover:text-white'
                              }`}
                            >
                              <child.icon className="w-4 h-4 flex-shrink-0" />
                              <span className="whitespace-nowrap">{child.title}</span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }
                return (
                  <Link
                    key={item.title}
                    to={item.url}
                    onClick={handleNavClick}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                      location.pathname === item.url
                        ? 'bg-gradient-to-r from-[#8B6F47] via-[#A68A64] to-[#D4AF37] text-white shadow-lg shadow-[#8B6F47]/50'
                        : 'text-[#8B6F47] bg-[#F5F1E8]/60 hover:bg-[#8B6F47] hover:text-white'
                    }`}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    <span className="whitespace-nowrap text-sm">{item.title}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-6 px-4 py-3">
              <div className="flex items-start gap-3 text-sm text-black">
                <Music2 className="w-4 h-4 mt-0.5 text-[#9CAF88] flex-shrink-0" />
                <p className="leading-relaxed text-xs">
                  Identifique progressões harmônicas em músicas sertanejas com inteligência artificial
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-amber-50 p-4 border-t border-[#D4C5B0]/50 flex-shrink-0">
            {checkedUser && !currentUser ? (
            <Link
              to={`/login?next=${encodeURIComponent(location.pathname)}`}
              onClick={handleNavClick}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-medium transition-all duration-200 shadow-md"
            >
              <User className="w-4 h-4" />
              <span>Entrar</span>
            </Link>
            ) : (
            <>
            <Link
              to="/login?modo=nova-senha"
              onClick={handleNavClick}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 mb-2 rounded-xl border border-[#D4C5B0] text-[#8B6F47] hover:bg-amber-100 text-sm font-medium transition-all duration-200"
            >
              <User className="w-4 h-4" />
              <span>Criar / trocar minha senha</span>
            </Link>
            <button
              type="button"
              onClick={() => base44.auth.logout()}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium transition-all duration-200 shadow-md"
            >
              <LogOut className="w-4 h-4" />
              <span>Sair do Sistema</span>
            </button>
            </>
            )}
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </>
  );
}