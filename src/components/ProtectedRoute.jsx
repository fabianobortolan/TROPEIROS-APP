import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

const DefaultFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);

export default function ProtectedRoute({ roles, fallback = <DefaultFallback /> }) {
  const { user, isAuthenticated, isLoadingAuth, authError, navigateToLogin } = useAuth();

  useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated && !authError) {
      navigateToLogin();
    }
  }, [isAuthenticated, isLoadingAuth, authError, navigateToLogin]);

  if (isLoadingAuth || !isAuthenticated) {
    return fallback;
  }

  if (authError?.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  if (roles && !roles.includes(user?.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-amber-50 p-8">
        <div className="text-center">
          <h2 className="text-xl font-bold text-[#8B6F47] mb-2">Acesso restrito</h2>
          <p className="text-[#A68A64] text-sm">Esta área é disponível apenas para administradores.</p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}