import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Profile = () => {
  const { user, updateProfile, requestVerification, verifyContact } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [hideFromLeaderboard, setHideFromLeaderboard] = useState(Boolean(user?.hideFromLeaderboard));
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [emailCode, setEmailCode] = useState('');
  const [phoneCode, setPhoneCode] = useState('');

  const savedRoutes = useMemo(() => user?.savedRoutes || user?.favoriteRoutes || [], [user]);

  if (!user) {
    return <div className="max-w-3xl mx-auto mt-10 p-6 bg-white rounded-2xl shadow-sm border">Загрузка профиля...</div>;
  }

  const handleProfileSave = async (event) => {
    event.preventDefault();
    await updateProfile({ name, hideFromLeaderboard, avatar });
  };

  const handleRequestCode = async (channel) => {
    await requestVerification(channel, channel === 'email' ? email : phone);
  };

  const handleVerify = async (channel) => {
    const success = await verifyContact(channel, channel === 'email' ? emailCode : phoneCode);
    if (success) {
      if (channel === 'email') setEmailCode('');
      if (channel === 'phone') setPhoneCode('');
    }
  };

  const handleAvatarChange = (event) => {
    const [file] = Array.from(event.target.files || []);
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatar(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-4">
      <div className="bg-white rounded-xl shadow-sm border p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100">
            {avatar ? (
              <img src={avatar} alt={name || user.name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-3xl font-semibold text-slate-500">{(name || user.name || 'Н').trim().charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-2">Профиль</h2>
            <p className="text-sm text-gray-600">Баланс: {user.balance} баллов</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <form onSubmit={handleProfileSave} className="bg-white rounded-xl shadow-sm border p-4">
          <h3 className="text-lg font-bold mb-3">Личные данные</h3>
          <input
            type="text"
            className="w-full p-2 border mb-3 rounded-lg"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Имя"
          />
          <div className="mb-3 rounded-xl border border-slate-200 p-3">
            <p className="mb-2 text-sm font-medium text-slate-800">Аватар</p>
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex cursor-pointer items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-black">
                Загрузить фото
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </label>
              {avatar && (
                <button
                  type="button"
                  onClick={() => setAvatar('')}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Убрать фото
                </button>
              )}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 mb-4">
            <input
              type="checkbox"
              checked={hideFromLeaderboard}
              onChange={(event) => setHideFromLeaderboard(event.target.checked)}
            />
            Скрыть меня из лидерборда
          </label>
          <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg">
            Сохранить профиль
          </button>
        </form>

        <div className="bg-white rounded-xl shadow-sm border p-4 space-y-4">
          <h3 className="text-lg font-bold">Подтверждение контактов</h3>

          <div className="border rounded-lg p-3">
            <div className="flex justify-between items-center gap-2 mb-2">
              <strong>E-mail</strong>
              <span className={user.verification?.email?.verified ? 'text-emerald-600 text-sm' : 'text-amber-600 text-sm'}>
                {user.verification?.email?.verified ? 'Подтверждён' : 'Не подтверждён'}
              </span>
            </div>
            <input
              type="email"
              className="w-full p-2 border mb-2 rounded-lg"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Введите e-mail"
            />
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => handleRequestCode('email')} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg text-sm">
                Получить код
              </button>
              <input
                type="text"
                className="flex-1 min-w-[160px] p-2 border rounded-lg"
                value={emailCode}
                onChange={(event) => setEmailCode(event.target.value)}
              placeholder="Код подтверждения"
            />
              <button type="button" onClick={() => handleVerify('email')} className="bg-slate-800 hover:bg-slate-900 text-white px-3 py-2 rounded-lg text-sm">
                Подтвердить
              </button>
            </div>
          </div>

          <div className="border rounded-lg p-3">
            <div className="flex justify-between items-center gap-2 mb-2">
              <strong>Телефон</strong>
              <span className={user.verification?.phone?.verified ? 'text-emerald-600 text-sm' : 'text-amber-600 text-sm'}>
                {user.verification?.phone?.verified ? 'Подтверждён' : 'Не подтверждён'}
              </span>
            </div>
            <input
              type="tel"
              className="w-full p-2 border mb-2 rounded-lg"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+7..."
            />
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => handleRequestCode('phone')} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg text-sm">
                Получить код
              </button>
              <input
                type="text"
                className="flex-1 min-w-[160px] p-2 border rounded-lg"
                value={phoneCode}
                onChange={(event) => setPhoneCode(event.target.value)}
                placeholder="Код подтверждения"
              />
              <button type="button" onClick={() => handleVerify('phone')} className="bg-slate-800 hover:bg-slate-900 text-white px-3 py-2 rounded-lg text-sm">
                Подтвердить
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <h3 className="text-lg font-bold mb-3">Мои сохранённые</h3>
          <div className="space-y-2">
            {savedRoutes.length ? (
              savedRoutes.map((route) => (
                <Link key={route._id} to="/" className="block border rounded-lg p-3 hover:bg-slate-50">
                  <strong>{route.name}</strong>
                  <p className="text-sm text-gray-600">{route.description}</p>
                </Link>
              ))
            ) : (
              <p className="text-sm text-gray-600">Пока нет сохранённых маршрутов.</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-4">
          <h3 className="text-lg font-bold mb-3">Пройденные маршруты</h3>
          <div className="space-y-2">
            {(user.completedRoutes || []).length ? (
              user.completedRoutes.map((route) => (
                <div key={route._id} className="border rounded-lg p-3">
                  <strong>{route.name}</strong>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-600">Вы ещё не завершили ни одного маршрута.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
