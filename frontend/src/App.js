import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminHome from './pages/AdminHome';
import AdminRoutes from './pages/AdminRoutes';
import AdminRoutePacks from './pages/AdminRoutePacks';
import GuideWorkspace from './pages/GuideWorkspace';
import Profile from './components/Profile';
import AppErrorBoundary from './components/AppErrorBoundary';
import AdminWorkspaceShell from './components/AdminWorkspaceShell';
import { Toaster } from 'react-hot-toast';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex justify-center p-10">Загрузка...</div>;
  return user ? children : <Navigate to="/login" replace />;
};

const AdminRoute = ({ children }) => {
  const { user, loading, hasEditorialAccess } = useAuth();
  if (loading) return <div className="flex justify-center p-10">Загрузка...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return hasEditorialAccess ? children : <Navigate to="/" replace />;
};

const GuideRoute = ({ children }) => {
  const { user, loading, hasGuideWorkspaceAccess } = useAuth();
  if (loading) return <div className="flex justify-center p-10">Загрузка...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return hasGuideWorkspaceAccess ? children : <GuideWorkspace accessDenied />;
};

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Home />
          </PrivateRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <PrivateRoute>
            <Profile />
          </PrivateRoute>
        }
      />
      <Route
        path="/guide"
        element={
          <GuideRoute>
            <GuideWorkspace />
          </GuideRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminWorkspaceShell />
          </AdminRoute>
        }
      >
        <Route index element={<AdminHome />} />
        <Route path="routes" element={<AdminRoutes />} />
        <Route path="packs" element={<AdminRoutePacks />} />
      </Route>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
      <Route path="/register" element={!user ? <Register /> : <Navigate to="/" replace />} />
    </Routes>
  );
}

function AppShell() {
  const { user, logout, hasGuideWorkspaceAccess, hasEditorialAccess } = useAuth();

  return (
    <BrowserRouter>
      <div className="min-h-screen">
        <nav className="border-b border-white/60 bg-white/75 p-4 shadow-sm backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <span className="font-bold text-xl tracking-tight">НаРязань</span>
            <div className="space-x-4 text-sm flex items-center flex-wrap">
              <Link to="/" className="hover:underline underline-offset-4">
                Карта
              </Link>
              {user && (
                <Link to="/profile" className="hover:underline underline-offset-4">
                  Профиль
                </Link>
              )}
              {user && hasGuideWorkspaceAccess && (
                <Link to="/guide" className="hover:underline underline-offset-4">
                  Гид
                </Link>
              )}
              {user && hasEditorialAccess && (
                <Link to="/admin" className="hover:underline underline-offset-4">
                  Админка
                </Link>
              )}
              {!user && (
                <>
                  <Link to="/login" className="hover:underline underline-offset-4">
                    Вход
                  </Link>
                  <Link to="/register" className="hover:underline underline-offset-4">
                    Регистрация
                  </Link>
                </>
              )}
              {user && (
                <button onClick={logout} className="hover:underline underline-offset-4">
                  Выйти
                </button>
              )}
            </div>
          </div>
        </nav>
        <AppRoutes />
      </div>
      <Toaster position="top-right" />
    </BrowserRouter>
  );
}

function App() {
  return (
    <AppErrorBoundary>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </AppErrorBoundary>
  );
}

export default App;
