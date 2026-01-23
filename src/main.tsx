import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuthContext } from './context/AuthContext';
import { ErrorBoundary } from './app/components/ErrorBoundary';
import { Toaster } from 'sonner';
import FeedEditorPage from './app/pages/FeedEditorPage';
import { LoginPage } from './app/pages/LoginPage';
import { FeedsPage } from './app/pages/FeedsPage';
import './styles/index.css';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuthContext();

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-stone-600">Betöltés...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  const { user, loading } = useAuthContext();

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-stone-600">Betöltés...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/feeds" replace /> : <LoginPage />} />
      <Route
        path="/feeds"
        element={
          <ProtectedRoute>
            <FeedsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/feed/:id"
        element={
          <ProtectedRoute>
            <FeedEditorPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/"
        element={<Navigate to="/feeds" replace />}
      />
      <Route path="*" element={<Navigate to={user ? '/feeds' : '/login'} replace />} />
    </Routes>
  );
};

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  </ErrorBoundary>
);
  