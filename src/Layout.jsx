import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Music2, Upload, Waves, ListMusic, Download, Music, Guitar, Palette, BarChart3, FileText, BookOpen, Target,
  LogOut, Piano, GraduationCap, GitBranch, ChevronDown, Timer, User, X, BookMarked, ShieldAlert, ShieldCheck,
  LayoutDashboard, Zap, Ear, Link2, Menu as MenuIcon, MoreHorizontal, Grid3x3, KeyRound,
} from "lucide-react";
import { base44 } from "@/api/base44Client";

// ---------------------------------------------------------------------------
// Menu em grupos. publicItem = visível para visitante sem login.
// aberto = grupo começa aberto. adminOnly = só administrador.
// ---------------------------------------------------------------------------
const GRUPOS = [
  {
    nome: "Músicas", aberto: true,
    itens: [
      { title: "Biblioteca Sertaneja", url: createPageUrl("Library"), icon: Guitar, publicItem: true },
      { title: "Biblioteca Pop/Rock", url: "/LibraryPopRock", icon: Zap, publicItem: true },
      { title: "Biblioteca Samba, MPB & Forró", url: "/LibrarySambaMPB", icon: Waves, publicItem: true },
      { title: "Biblioteca Instrumental", url: "/LibraryInstrumental", icon: FileText, publicItem: true },
      { title: "Repertórios", url: createPageUrl("Setlists"), icon: ListMusic, publicItem: true },
    ],
  },
  {
    nome: "Tocar e estudar", aberto: true,
    itens: [
      { title: "Acordes", url: createPageUrl("Chords"), icon: Grid3x3, publicItem: true },
      { title: "Escalas", url: createPageUrl("Scales"), icon: Music2, publicItem: true },
      { title: "Ritmos", url: createPageUrl("Rhythms"), icon: Music },
      { title: "Progressões", url: createPageUrl("Progressions"), icon: Waves },
      { title: "Estilos", url: createPageUrl("Styles"), icon: Palette },
      { title: "Metrônomo", url: createPageUrl("MetronomePage"), icon: Timer },
      { title: "Modo Estudo", url: createPageUrl("ModoEstudo"), icon: BookMarked },
      { title: "Treinamento Auditivo", url: "/HarmonicEarTraining", icon: Ear },
    ],
  },
  {
    nome: "Teoria musical",
    itens: [
      { title: "Formação de Acordes", url: createPageUrl("ChordBuilder"), icon: Piano },
      { title: "Explorador Harmônico", url: createPageUrl("HarmonicExplorer"), icon: GitBranch },
      { title: "Dicionário Musical", url: createPageUrl("MusicDictionary"), icon: GraduationCap },
      { title: "Exercícios Interativos", url: createPageUrl("TheoryExercises"), icon: Target },
      { title: "Gerador de Exercícios", url: createPageUrl("ExerciseGenerator"), icon: Target },
      { title: "Biblioteca de Referências", url: createPageUrl("ReferenceLibrary"), icon: BookOpen },
    ],
  },
  {
    nome: "Escola",
    itens: [
      { title: "Portal do Aluno", url: "/PortalAluno", icon: LayoutDashboard },
      { title: "Analisar Música", url: createPageUrl("Analyze"), icon: Upload },
      { title: "Vincular Música à Aula", url: "/VincularMusicaAula", icon: Link2, adminOnly: true },
    ],
  },
  {
    nome: "Administração", adminOnly: true,
    itens: [
      { title: "Painel Admin", url: "/AdminPanel", icon: ShieldAlert },
      { title: "Auditoria Geral", url: "/AuditoriaCifras", icon: ShieldCheck },
      { title: "Importar Tablaturas", url: "/ImportarTablaturas", icon: Upload },
      { title: "Relatórios", url: createPageUrl("Reports"), icon: BarChart3 },
      { title: "Backup", url: createPageUrl("Backup"), icon: Download },
    ],
  },
  {
    nome: "Ajuda",
    itens: [
      { title: "Guia de Uso", url: createPageUrl("WorkflowGuide"), icon: BookOpen },
      { title: "Template de Cifra", url: createPageUrl("TemplateGuide"), icon: FileText },
      { title: "Documentação PDF", url: createPageUrl("Documentation"), icon: FileText },
      { title: "Política de Privacidade", url: createPageUrl("PrivacyPolicy"), icon: FileText },
    ],
  },
];

const BIBLIOTECAS = ["/", "/library", "/librarypoprock", "/librarysambampb", "/libraryinstrumental"];
const normaliza = (p) => ((p || "/").replace(/\/+$/, "") || "/").toLowerCase();

// Barra fixa no celular
const ABAS = [
  { title: "Biblioteca", url: createPageUrl("Library"), icon: Music, ativo: (p) => BIBLIOTECAS.includes(p) },
  { title: "Repertórios", url: createPageUrl("Setlists"), icon: ListMusic, ativo: (p) => p === "/setlists" },
  { title: "Escalas", url: createPageUrl("Scales"), icon: Music2, ativo: (p) => p === "/scales" },
  { title: "Acordes", url: createPageUrl("Chords"), icon: Grid3x3, ativo: (p) => p === "/chords" },
];

const LOGO = "/img/522fde112_LOGO-PNG.png";

export default function Layout({ children }) {
  const location = useLocation();
  const caminho = normaliza(location.pathname);
  const [open, setOpen] = React.useState(false);
  const [currentUser, setCurrentUser] = React.useState(null);
  const [checkedUser, setCheckedUser] = React.useState(false);
  const [abertos, setAbertos] = React.useState({});

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {}).finally(() => setCheckedUser(true));
  }, []);

  const isAdmin = currentUser?.role === "admin";
  const visitante = checkedUser && !currentUser;

  React.useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Trava a rolagem da página com o menu aberto (celular)
  React.useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const grupos = GRUPOS
    .filter((g) => !g.adminOnly || isAdmin)
    .map((g) => ({
      ...g,
      itens: g.itens.filter((i) => (!i.adminOnly || isAdmin) && (currentUser || !checkedUser || i.publicItem)),
    }))
    .filter((g) => g.itens.length > 0);

  const ativo = (url) => normaliza(url) === caminho || (normaliza(url) === "/library" && caminho === "/");
  const grupoAberto = (g) => abertos[g.nome] ?? (g.aberto || g.itens.some((i) => ativo(i.url)));
  const alternar = (g) => setAbertos((prev) => ({ ...prev, [g.nome]: !grupoAberto(g) }));

  const menu = (
    <>
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#E6DCC8] flex-shrink-0">
        <img src={LOGO} alt="Logo da Orquestra de Violeiros Tropeiros do Bebedouro" className="w-12 h-9 object-contain" />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-[#6B4F2E] leading-tight" style={{ fontFamily: "Bitter, Georgia, serif" }}>
            Tropeiros do Bebedouro
          </div>
          <div className="text-xs text-[#7A6A55] truncate">
            {currentUser ? `${currentUser.full_name || currentUser.email}${isAdmin ? " · administrador" : ""}` : "Visitante"}
          </div>
        </div>
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={() => setOpen(false)}
          className="lg:hidden w-11 h-11 flex items-center justify-center rounded-lg text-[#6B4F2E] hover:bg-[#F3EAD6]"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-2" aria-label="Menu principal">
        {grupos.map((g) => {
          const aberto = grupoAberto(g);
          return (
            <div key={g.nome} className="mt-1">
              <button
                type="button"
                onClick={() => alternar(g)}
                aria-expanded={aberto}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[11px] font-bold tracking-[.08em] uppercase text-[#8B6F47] hover:bg-[#F3EAD6]/60"
              >
                <span>{g.nome}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${aberto ? "rotate-180" : ""}`} />
              </button>
              {aberto && (
                <div className="space-y-0.5 pb-1">
                  {g.itens.map((i) => (
                    <Link
                      key={i.url}
                      to={i.url}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 h-10 px-3 rounded-lg text-[15px] transition-colors ${
                        ativo(i.url)
                          ? "bg-[#F3EAD6] text-[#4A3520] font-semibold"
                          : "text-[#4A3520] hover:bg-[#F8F1E2]"
                      }`}
                    >
                      <i.icon className="w-[18px] h-[18px] flex-shrink-0 text-[#8B6F47]" />
                      <span className="truncate">{i.title}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="flex gap-2 p-3 border-t border-[#E6DCC8] flex-shrink-0">
        {visitante ? (
          <Link
            to={`/login?next=${encodeURIComponent(location.pathname)}`}
            onClick={() => setOpen(false)}
            className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl bg-[#6B4F2E] text-[#FFFDF8] font-semibold"
          >
            <User className="w-4 h-4" /> Entrar
          </Link>
        ) : (
          <>
            <Link
              to="/login?modo=nova-senha"
              onClick={() => setOpen(false)}
              className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl border border-[#E6DCC8] text-[#6B4F2E] text-sm"
            >
              <KeyRound className="w-4 h-4" /> Minha senha
            </Link>
            <button
              type="button"
              onClick={() => base44.auth.logout()}
              className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl border border-[#E6DCC8] text-[#9B2C1F] text-sm"
            >
              <LogOut className="w-4 h-4" /> Sair
            </button>
          </>
        )}
      </div>
    </>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bitter:wght@600;700&display=swap');
        :root {
          --color-primary: #8B6F47;
          --color-primary-dark: #6B5437;
          --color-secondary: #A68A64;
          --color-accent: #D4AF37;
          --color-green: #9CAF88;
          --color-light: #F5F1E8;
          --color-lighter: #E8DCC4;
        }
        body { background-color: #FBF6EA; }
      `}</style>

      <div className="min-h-screen w-full">
        {/* Menu lateral fixo no computador */}
        <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col bg-[#FFFDF8] border-r border-[#E6DCC8] z-30">
          {menu}
        </aside>

        {/* Topo fino (celular e tablet) */}
        <header className="lg:hidden sticky top-0 z-40 h-14 flex items-center gap-2 pl-3 pr-1 bg-[#FFFDF8] border-b border-[#E6DCC8]">
          <Link to={createPageUrl("Library")} className="flex items-center gap-2 flex-1 min-w-0">
            <img src={LOGO} alt="" className="w-11 h-8 object-contain" />
            <span className="font-bold text-[17px] text-[#6B4F2E] truncate" style={{ fontFamily: "Bitter, Georgia, serif" }}>
              Tropeiros do Bebedouro
            </span>
          </Link>
          {visitante && (
            <Link
              to={`/login?next=${encodeURIComponent(location.pathname)}`}
              className="h-9 px-3 flex items-center rounded-lg text-sm font-semibold text-[#6B4F2E] border border-[#E6DCC8]"
            >
              Entrar
            </Link>
          )}
          <button
            type="button"
            aria-label="Abrir menu"
            onClick={() => setOpen(true)}
            className="w-11 h-11 flex items-center justify-center rounded-lg text-[#6B4F2E] hover:bg-[#F3EAD6]"
          >
            <MenuIcon className="w-6 h-6" />
          </button>
        </header>

        {/* Menu deslizante (celular e tablet) */}
        {open && <div className="lg:hidden fixed inset-0 bg-black/45 z-50" onClick={() => setOpen(false)} />}
        <aside
          className="lg:hidden fixed inset-y-0 left-0 w-[300px] max-w-[85vw] flex flex-col bg-[#FFFDF8] z-50 shadow-2xl transition-transform duration-300"
          style={{ transform: open ? "translateX(0)" : "translateX(-100%)" }}
          aria-hidden={!open}
        >
          {menu}
        </aside>

        {/* Conteúdo */}
        <main className="lg:pl-64 pb-[72px] lg:pb-0">
          {children}
        </main>

        {/* Barra fixa embaixo (celular e tablet) */}
        <nav
          aria-label="Navegação principal"
          className="lg:hidden fixed bottom-0 inset-x-0 z-30 grid grid-cols-5 bg-[#FFFDF8] border-t border-[#E6DCC8]"
          style={{ height: "calc(64px + env(safe-area-inset-bottom))", paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          {ABAS.map((a) => {
            const on = a.ativo(caminho);
            return (
              <Link
                key={a.title}
                to={a.url}
                className={`flex flex-col items-center justify-center gap-0.5 text-[11px] ${on ? "text-[#6B4F2E] font-semibold" : "text-[#7A6A55]"}`}
                aria-current={on ? "page" : undefined}
              >
                <a.icon className="w-[22px] h-[22px]" strokeWidth={on ? 2.4 : 2} />
                {a.title}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 text-[11px] text-[#7A6A55]"
          >
            <MoreHorizontal className="w-[22px] h-[22px]" />
            Mais
          </button>
        </nav>
      </div>
    </>
  );
}
