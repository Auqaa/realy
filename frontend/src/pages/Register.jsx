import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: ''
  });

  const canSubmit = useMemo(
    () => form.name.trim() && form.password.trim().length >= 6 && (form.email.trim() || form.phone.trim()),
    [form]
  );

  const handleChange = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const success = await register(form);
    if (success) {
      navigate('/');
    }
  };

  return (
    <div className="mx-auto mt-8 max-w-md overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-xl">
      <div
        className="px-6 py-10 text-white"
        style={{
          backgroundImage:
            "linear-gradient(135deg, rgba(15,23,42,0.7), rgba(15,23,42,0.28)), url('/images/landmarks/kremlin-sunset.jpeg')",
          backgroundPosition: 'center',
          backgroundSize: 'cover'
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70">НаРязань</p>
        <h2 className="mt-3 text-3xl font-bold">Новый аккаунт</h2>
        <p className="mt-2 max-w-sm text-sm text-white/80">Укажите имя, пароль и любой удобный контакт: почту или номер телефона. Подтверждение контактов доступно в профиле.</p>
      </div>

      <div className="p-6">
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Имя"
            className="mb-3 w-full rounded-2xl border border-slate-200 p-3"
            value={form.name}
            onChange={handleChange('name')}
            required
          />
          <input
            type="email"
            placeholder="E-mail"
            className="mb-3 w-full rounded-2xl border border-slate-200 p-3"
            value={form.email}
            onChange={handleChange('email')}
          />
          <input
            type="tel"
            placeholder="+7 900 123-45-67"
            className="mb-3 w-full rounded-2xl border border-slate-200 p-3"
            value={form.phone}
            onChange={handleChange('phone')}
          />
          <input
            type="password"
            placeholder="Пароль"
            className="mb-4 w-full rounded-2xl border border-slate-200 p-3"
            value={form.password}
            onChange={handleChange('password')}
            required
          />
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-2xl bg-slate-900 p-3 font-medium text-white transition hover:bg-black disabled:bg-slate-300"
          >
            Создать аккаунт
          </button>
        </form>
        <p className="mt-3 text-center text-sm text-slate-600">Можно зарегистрироваться по e-mail или по номеру телефона.</p>
        <p className="mt-2 text-center text-sm">
          Уже есть аккаунт?{' '}
          <Link to="/login" className="font-medium text-sky-700 hover:underline">
            Войти
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
