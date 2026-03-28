import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

const Login = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await login(identifier, password);
    if (success) navigate('/');
  };

  return (
    <div className="mx-auto mt-8 max-w-md overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-xl">
      <div
        className="px-6 py-10 text-white"
        style={{
          backgroundImage:
            "linear-gradient(135deg, rgba(15,23,42,0.7), rgba(15,23,42,0.25)), url('/images/hero/ryazan-hero.jpg')",
          backgroundPosition: 'center',
          backgroundSize: 'cover'
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70">НаРязань</p>
        <h2 className="mt-3 text-3xl font-bold">Вход в аккаунт</h2>
        <p className="mt-2 max-w-sm text-sm text-white/80">Войдите по почте или номеру телефона и продолжайте маршрут с того места, где остановились.</p>
      </div>

      <div className="p-6">
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="E-mail или телефон"
            className="mb-3 w-full rounded-2xl border border-slate-200 p-3"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Пароль"
            className="mb-4 w-full rounded-2xl border border-slate-200 p-3"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" className="w-full rounded-2xl bg-slate-900 p-3 font-medium text-white transition hover:bg-black">
            Войти
          </button>
        </form>
        <p className="mt-3 text-center text-sm text-slate-600">Поддерживаются оба варианта входа: e-mail и телефон.</p>
        <p className="mt-3 text-center text-sm">
          Нет аккаунта?{' '}
          <Link to="/register" className="font-medium text-sky-700 hover:underline">
            Зарегистрироваться
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
