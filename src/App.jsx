import './App.css'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ProtectedRoute from '@/components/ProtectedRoute';
import PlanoAulas from './pages/PlanoAulas';
import AdminPanel from './pages/AdminPanel';
import PortalAluno from './pages/PortalAluno';
import LibraryPopRock from './pages/LibraryPopRock';
import ModoEstudo from './pages/ModoEstudo';
import GerarRepertorioIA from './pages/GerarRepertorioIA';
import ReanaliseEmLote from './pages/ReanaliseEmLote';
import HarmonicEarTraining from './pages/HarmonicEarTraining';
import LibraryInstrumental from './pages/LibraryInstrumental';
import LibrarySambaMPB from './pages/LibrarySambaMPB';
import AuditoriaCifras from './pages/AuditoriaCifras';
import VincularMusicaAula from './pages/VincularMusicaAula';
import ImportarTablaturas from './pages/ImportarTablaturas';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

// Páginas do loop que só administradores devem acessar
const ADMIN_ONLY_PAGES = new Set(["Backup", "Reports", "DataProtection"]);

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => {
        const pageRoute = (
          <Route
            key={path}
            path={`/${path}`}
            element={
              <LayoutWrapper currentPageName={path}>
                <Page />
              </LayoutWrapper>
            }
          />
        );
        if (ADMIN_ONLY_PAGES.has(path)) {
          return (
            <Route key={`${path}-protected`} element={<ProtectedRoute roles={['admin']} />}>
              {pageRoute}
            </Route>
          );
        }
        return pageRoute;
      })}
      <Route 
        path="/LibraryPopRock" 
        element={
          <LayoutWrapper currentPageName="LibraryPopRock">
            <LibraryPopRock />
          </LayoutWrapper>
        } 
      />
      <Route 
        path="/PlanoAulas" 
        element={
          <LayoutWrapper currentPageName="PlanoAulas">
            <PlanoAulas />
          </LayoutWrapper>
        } 
      />
      <Route
        path="/ModoEstudo"
        element={
          <LayoutWrapper currentPageName="ModoEstudo">
            <ModoEstudo />
          </LayoutWrapper>
        }
      />
      <Route 
        path="/GerarRepertorioIA" 
        element={
          <LayoutWrapper currentPageName="GerarRepertorioIA">
            <GerarRepertorioIA />
          </LayoutWrapper>
        } 
      />
      <Route element={<ProtectedRoute roles={['admin']} />}>
        <Route 
          path="/AdminPanel" 
          element={
            <LayoutWrapper currentPageName="AdminPanel">
              <AdminPanel />
            </LayoutWrapper>
          } 
        />
        <Route 
          path="/AuditoriaCifras" 
          element={
            <LayoutWrapper currentPageName="AuditoriaCifras">
              <AuditoriaCifras />
            </LayoutWrapper>
          } 
        />
        <Route 
          path="/VincularMusicaAula" 
          element={
            <LayoutWrapper currentPageName="VincularMusicaAula">
              <VincularMusicaAula />
            </LayoutWrapper>
          } 
        />
        <Route 
          path="/ReanaliseEmLote" 
          element={
            <LayoutWrapper currentPageName="ReanaliseEmLote">
              <ReanaliseEmLote />
            </LayoutWrapper>
          } 
        />
        <Route 
          path="/ImportarTablaturas" 
          element={
            <LayoutWrapper currentPageName="ImportarTablaturas">
              <ImportarTablaturas />
            </LayoutWrapper>
          } 
        />
      </Route>
      <Route 
        path="/PortalAluno" 
        element={
          <LayoutWrapper currentPageName="PortalAluno">
            <PortalAluno />
          </LayoutWrapper>
        } 
      />
      <Route 
        path="/ReanaliseEmLote" 
        element={
          <LayoutWrapper currentPageName="ReanaliseEmLote">
            <ReanaliseEmLote />
          </LayoutWrapper>
        } 
      />
      <Route 
        path="/HarmonicEarTraining" 
        element={
          <LayoutWrapper currentPageName="HarmonicEarTraining">
            <HarmonicEarTraining />
          </LayoutWrapper>
        } 
      />
      <Route 
        path="/LibraryInstrumental" 
        element={
          <LayoutWrapper currentPageName="LibraryInstrumental">
            <LibraryInstrumental />
          </LayoutWrapper>
        } 
      />
      <Route 
        path="/LibrarySambaMPB" 
        element={
          <LayoutWrapper currentPageName="LibrarySambaMPB">
            <LibrarySambaMPB />
          </LayoutWrapper>
        } 
      />
      <Route 
        path="/LibraryMPB" 
        element={
          <LayoutWrapper currentPageName="LibrarySambaMPB">
            <LibrarySambaMPB />
          </LayoutWrapper>
        } 
      />
      <Route 
        path="/AuditoriaCifras" 
        element={
          <LayoutWrapper currentPageName="AuditoriaCifras">
            <AuditoriaCifras />
          </LayoutWrapper>
        } 
      />
      <Route 
        path="/VincularMusicaAula" 
        element={
          <LayoutWrapper currentPageName="VincularMusicaAula">
            <VincularMusicaAula />
          </LayoutWrapper>
        } 
      />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
        <VisualEditAgent />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App