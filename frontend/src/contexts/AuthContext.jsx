import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSession = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        api.defaults.headers.common['x-auth-token'] = token;
        await fetchUser();
      } else {
        setLoading(false);
      }
    };

    loadSession();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await api.get('/users/me');
      setUser(res.data);
    } catch (err) {
      console.error(err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { identifier: email, password });
      const token = res.data.token;
      localStorage.setItem('token', token);
      api.defaults.headers.common['x-auth-token'] = token;
      await fetchUser();
      toast.success('Вход выполнен');
      return true;
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Ошибка входа');
      return false;
    }
  };

  const register = async ({ name, email, phone, password }) => {
    try {
      const res = await api.post('/auth/register', { name, email, phone, password });
      const token = res.data.token;
      localStorage.setItem('token', token);
      api.defaults.headers.common['x-auth-token'] = token;
      await fetchUser();
      toast.success('Регистрация успешна');
      return true;
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Ошибка регистрации');
      return false;
    }
  };

  const updateProfile = async (payload) => {
    try {
      const res = await api.patch('/users/me', payload);
      setUser((current) => ({ ...(current || {}), ...res.data.user }));
      toast.success('Профиль обновлён');
      return true;
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Не удалось обновить профиль');
      return false;
    }
  };

  const toggleFavoriteRoute = async (routeId) => {
    try {
      const res = await api.post(`/users/favorites/${routeId}`);
      setUser((current) =>
        current
          ? {
              ...current,
              favoriteRoutes: res.data.favoriteRoutes,
              savedRoutes: res.data.savedRoutes
            }
          : current
      );
      toast.success(res.data.isFavorite ? 'Маршрут сохранён' : 'Маршрут убран из сохранённых');
      return res.data;
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Не удалось обновить избранное');
      return null;
    }
  };

  const requestVerification = async (channel, value) => {
    try {
      const res = await api.post('/auth/request-verification', { channel, value });
      await fetchUser();
      toast.success(`Код подтверждения отправлен для ${channel}`);
      return res.data;
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Не удалось запросить код');
      return null;
    }
  };

  const verifyContact = async (channel, code) => {
    try {
      await api.post('/auth/verify', { channel, code });
      await fetchUser();
      toast.success('Контакт подтверждён');
      return true;
    } catch (err) {
      toast.error(err.response?.data?.msg || 'Неверный код подтверждения');
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete api.defaults.headers.common['x-auth-token'];
    setUser(null);
    setLoading(false);
    toast.success('Вы вышли');
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    setUser,
    updateProfile,
    toggleFavoriteRoute,
    requestVerification,
    verifyContact
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

