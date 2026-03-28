import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './components/Profile';
import AppErrorBoundary from './components/AppErrorBoundary';
import { Toaster } from 'react-hot-toast';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex justify-center p-10">Загрузка...</div>;
  return user ? children : <Navigate to="/login" replace />;
};

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
      <Route path="/register" element={!user ? <Register /> : <Navigate to="/" replace />} />
    </Routes>
  );
}

function AppShell() {
  const { user, logout } = useAuth();

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-indigo-50">
        <nav className="bg-white/70 backdrop-blur shadow-sm border-b border-white/60 p-4 flex justify-between items-center flex-wrap gap-3">
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
