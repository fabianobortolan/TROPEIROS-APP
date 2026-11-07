import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { base44, supabase } from '@/api/base44Client';

// Contexto de autenticação — agora sobre o Supabase Auth.
// Mantém exatamente os mesmos campos que o app já usava com o Base44.
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings] = useState({ id: 'tropeiros-do-bebedouro', public_settings: {} });

  const checkUserAuth = useCallback(async () => {
    try {
      setIsLoadingAuth(true);
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      setAuthError(null);
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
      if (error.status === 403) {
        setAuthError({ type: 'user_not_registered', message: 'Usuário sem cadastro neste app' });
      } else {
        setAuthError({ type: 'auth_required', message: 'Autenticação necessária' });
      }
    } finally {
      setIsLoadingAuth(false);
    }
  }, []);

  const checkAppState = useCallback(async () => {
    setIsLoadingPublicSettings(true);
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      await checkUserAuth();
    } else {
      setUser(null);
      setIsAuthenticated(false);
      setAuthError({ type: 'auth_required', message: 'Autenticação necessária' });
      setIsLoadingAuth(false);
    }
    setIsLoadingPublicSettings(false);
  }, [checkUserAuth]);

  useEffect(() => {
    checkAppState();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') checkUserAuth();
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsAuthenticated(false);
        setAuthError({ type: 'auth_required', message: 'Autenticação necessária' });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [checkAppState, checkUserAuth]);

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    if (shouldRedirect) {
      base44.auth.logout(window.location.href);
    } else {
      supabase.auth.signOut();
    }
  };

  const navigateToLogin = useCallback(() => {
    base44.auth.redirectToLogin(window.location.href);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin,
      checkAppState,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
