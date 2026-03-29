import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import toast from 'react-hot-toast';
import YandexMap from '../components/YandexMap';
import api from '../utils/api';

const EMPTY_ROUTE_FORM = {
  _id: '',
  name: '',
  description: '',
  category: '',
  image: '',
  waypoints: []
};

const DEFAULT_CENTER = { lat: 54.629624, lng: 39.742445 };

const createEmptyWaypoint = (order) => ({
  _id: '',
  name: '',
  description: '',
  address: '',
  lat: '',
  lng: '',
  image: '',
  order,
  waypointType: 'regular',
  qrCodeValue: '',
  qrCodeImage: ''
});

const normalizeRouteToForm = (route) => ({
  _id: route._id,
  name: route.name || '',
  description: route.description || '',
  category: route.category || '',
  image: route.image || '',
  waypoints: (route.points || [])
    .slice()
    .sort((left, right) => (left.order || 0) - (right.order || 0))
    .map((point, index) => ({
      _id: point._id || '',
      name: point.name || '',
      description: point.description || '',
      address: point.address || '',
      lat: point.lat ?? '',
      lng: point.lng ?? '',
      image: point.image || '',
      order: Number.isFinite(Number(point.order)) ? Number(point.order) : index + 1,
      waypointType: point.waypointType || 'regular',
      qrCodeValue: point.qrCodeValue || '',
      qrCodeImage: point.qrCodeImage || ''
    }))
});

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const AdminRoutes = () => {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [routeForm, setRouteForm] = useState(EMPTY_ROUTE_FORM);
  const [geocodingId, setGeocodingId] = useState('');
  const [mapKey, setMapKey] = useState('');
  const [routeGeometry, setRouteGeometry] = useState([]);

  useEffect(() => {
    let alive = true;

    const loadAdminData = async () => {
      try {
        const [routesResponse, configResponse] = await Promise.all([api.get('/routes'), api.get('/config')]);
        if (!alive) return;
        setRoutes(routesResponse.data || []);
        setMapKey(configResponse.data?.mapKey || '');
      } catch (error) {
        console.error(error);
        toast.error(error.response?.data?.msg || 'Не удалось загрузить маршруты');
      } finally {
        if (alive) setLoading(false);
      }
    };

    loadAdminData();
    return () => {
      alive = false;
    };
  }, []);

  const orderedWaypoints = useMemo(
    () => routeForm.waypoints.slice().sort((left, right) => Number(left.order) - Number(right.order)),
    [routeForm.waypoints]
  );

  const previewPoints = useMemo(
    () =>
      orderedWaypoints
        .filter((waypoint) => waypoint.lat !== '' && waypoint.lng !== '')
        .map((waypoint) => ({
          _id: waypoint._id || `draft-${waypoint.order}`,
          name: waypoint.name || `Точка ${waypoint.order}`,
          image: waypoint.image || '',
          lat: Number(waypoint.lat),
          lng: Number(waypoint.lng)
        })),
    [orderedWaypoints]
  );

  const mapCenter = useMemo(() => {
    if (!previewPoints.length) return DEFAULT_CENTER;
    return { lat: previewPoints[0].lat, lng: previewPoints[0].lng };
  }, [previewPoints]);

  useEffect(() => {
    let alive = true;

    const buildPreviewRoute = async () => {
      if (previewPoints.length < 2) {
        setRouteGeometry(previewPoints.map((point) => [point.lng, point.lat]));
        return;
      }

      try {
        const response = await api.post('/routing/pedestrian', {
          waypoints: previewPoints.map((point) => ({ lat: point.lat, lng: point.lng }))
        });

        if (!alive) return;
        setRouteGeometry(response.data?.geometry || previewPoints.map((point) => [point.lng, point.lat]));
      } catch (error) {
        console.error(error);
        if (!alive) return;
        setRouteGeometry(previewPoints.map((point) => [point.lng, point.lat]));
      }
    };

    buildPreviewRoute();
    return () => {
      alive = false;
    };
  }, [previewPoints]);

  const refreshRoutes = async (selectedId = '') => {
    const response = await api.get('/routes');
    setRoutes(response.data || []);

    if (selectedId) {
      const selected = response.data.find((route) => route._id === selectedId);
      if (selected) {
        setRouteForm(normalizeRouteToForm(selected));
      }
    }
  };

  const updateWaypoint = (index, key, value) => {
    setRouteForm((current) => ({
      ...current,
      waypoints: current.waypoints.map((waypoint, waypointIndex) =>
        waypointIndex === index ? { ...waypoint, [key]: value } : waypoint
      )
    }));
  };

  const addWaypoint = () => {
    setRouteForm((current) => ({
      ...current,
      waypoints: [...current.waypoints, createEmptyWaypoint(current.waypoints.length + 1)]
    }));
  };

  const removeWaypoint = (index) => {
    setRouteForm((current) => ({
      ...current,
      waypoints: current.waypoints
        .filter((_, waypointIndex) => waypointIndex !== index)
        .map((waypoint, waypointIndex) => ({
          ...waypoint,
          order: waypointIndex + 1
        }))
    }));
  };

  const handleRouteImageUpload = async (file) => {
    if (!file) return;
    try {
      const result = await readFileAsDataUrl(file);
      setRouteForm((current) => ({ ...current, image: result }));
    } catch (error) {
      console.error(error);
      toast.error('Не удалось загрузить изображение маршрута');
    }
  };

  const handlePointImageUpload = async (index, file) => {
    if (!file) return;
    try {
      const result = await readFileAsDataUrl(file);
      updateWaypoint(index, 'image', result);
    } catch (error) {
      console.error(error);
      toast.error('Не удалось загрузить изображение точки');
    }
  };

  const handleGeocode = async (index) => {
    const waypoint = routeForm.waypoints[index];
    const query = String(waypoint.address || '').trim();
    if (!query) {
      toast.error('Сначала укажите адрес для геокодирования');
      return;
    }

    setGeocodingId(`wp-${index}`);
    try {
      const response = await api.post('/geocode', { q: query });
      updateWaypoint(index, 'lat', response.data.lat);
      updateWaypoint(index, 'lng', response.data.lng);
      updateWaypoint(index, 'address', response.data.address || query);
      if (!waypoint.name) {
        updateWaypoint(index, 'name', response.data.title || query);
      }
      toast.success('Координаты получены по адресу');
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.msg || 'Не удалось геокодировать адрес');
    } finally {
      setGeocodingId('');
    }
  };

  const handleQrUpload = async (index, file) => {
    if (!file) return;
    try {
      const result = await readFileAsDataUrl(file);
      updateWaypoint(index, 'qrCodeImage', result);
    } catch (error) {
      console.error(error);
      toast.error('Не удалось прочитать изображение QR');
    }
  };

  const handleGenerateQr = async (index) => {
    const waypoint = routeForm.waypoints[index];
    const qrValue = String(waypoint.qrCodeValue || '').trim();

    if (!qrValue) {
      toast.error('Сначала укажите значение QR');
      return;
    }

    try {
      const dataUrl = await QRCode.toDataURL(qrValue, {
        width: 320,
        margin: 1,
        errorCorrectionLevel: 'M',
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      });
      updateWaypoint(index, 'qrCodeImage', dataUrl);
      toast.success('QR-код сгенерирован');
    } catch (error) {
      console.error(error);
      toast.error('Не удалось сгенерировать QR-код');
    }
  };

  const handleEditRoute = (route) => {
    setRouteForm(normalizeRouteToForm(route));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReset = () => {
    setRouteForm(EMPTY_ROUTE_FORM);
    setRouteGeometry([]);
  };

  const handleDeleteRoute = async (routeId, routeName) => {
    if (!window.confirm(`Удалить маршрут «${routeName}»? Это действие удалит и все его точки.`)) {
      return;
    }

    try {
      await api.delete(`/routes/admin/${routeId}`);
      toast.success('Маршрут удалён');
      if (routeForm._id === routeId) {
        handleReset();
      }
      await refreshRoutes();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.msg || 'Не удалось удалить маршрут');
    }
  };

  const handleSaveRoute = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      const payload = {
        name: routeForm.name.trim(),
        description: routeForm.description.trim(),
        category: routeForm.category.trim(),
        image: String(routeForm.image || ''),
        waypoints: routeForm.waypoints.map((waypoint) => ({
          _id: waypoint._id || undefined,
          name: String(waypoint.name || '').trim(),
          description: String(waypoint.description || '').trim(),
          address: String(waypoint.address || '').trim(),
          lat: Number(waypoint.lat),
          lng: Number(waypoint.lng),
          image: String(waypoint.image || ''),
          order: Number(waypoint.order),
          waypointType: waypoint.waypointType,
          qrCodeValue: String(waypoint.qrCodeValue || '').trim(),
          qrCodeImage: String(waypoint.qrCodeImage || '')
        }))
      };

      const response = routeForm._id
        ? await api.put(`/routes/admin/${routeForm._id}`, payload)
        : await api.post('/routes/admin', payload);

      toast.success(routeForm._id ? 'Маршрут обновлён' : 'Маршрут создан');
      await refreshRoutes(response.data._id);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.msg || error.response?.data?.errors?.[0]?.msg || 'Не удалось сохранить маршрут');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="mx-auto max-w-7xl p-6 text-sm text-slate-600">Загрузка админ-панели...</div>;
  }

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6">
      <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-slate-950 text-white shadow-xl">
        <div className="grid gap-6 px-5 py-6 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-200/80">Админ-панель</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Маршруты, точки и QR-коды</h1>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Здесь можно собрать маршрут, поменять изображения, подготовить QR-коды для точек и сразу проверить схему на карте.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-[1.6rem] bg-white/10 p-4 backdrop-blur">
              <div className="text-xs uppercase tracking-[0.22em] text-slate-300">Маршрутов</div>
              <div className="mt-2 text-3xl font-bold">{routes.length}</div>
            </div>
            <div className="rounded-[1.6rem] bg-white/10 p-4 backdrop-blur">
              <div className="text-xs uppercase tracking-[0.22em] text-slate-300">Точек в форме</div>
              <div className="mt-2 text-3xl font-bold">{routeForm.waypoints.length}</div>
            </div>
            <div className="rounded-[1.6rem] bg-white/10 p-4 backdrop-blur">
              <div className="text-xs uppercase tracking-[0.22em] text-slate-300">Карта</div>
              <div className="mt-2 text-lg font-semibold">{previewPoints.length > 1 ? 'Маршрут виден' : 'Нужно 2+ точки'}</div>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <section className="rounded-[2rem] border border-white/70 bg-white/95 p-5 shadow-xl sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">Редактор маршрута</p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                  {routeForm._id ? 'Редактирование маршрута' : 'Новый маршрут'}
                </h2>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Очистить форму
              </button>
            </div>

            <form className="mt-6 space-y-5" onSubmit={handleSaveRoute}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Название</span>
                  <input
                    value={routeForm.name}
                    onChange={(event) => setRouteForm((current) => ({ ...current, name: event.target.value }))}
                    className="mt-3 w-full rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                    placeholder="Например, Сердце Рязани"
                    required
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Категория</span>
                  <input
                    value={routeForm.category}
                    onChange={(event) => setRouteForm((current) => ({ ...current, category: event.target.value }))}
                    className="mt-3 w-full rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                    placeholder="История / Парки / У воды"
                    required
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Описание</span>
                <textarea
                  value={routeForm.description}
                  onChange={(event) => setRouteForm((current) => ({ ...current, description: event.target.value }))}
                  className="mt-3 min-h-[7rem] w-full rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                  placeholder="Коротко опишите маршрут и его цель."
                  required
                />
              </label>

              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Изображение маршрута</p>
                    <p className="mt-1 text-sm text-slate-600">Это фото показывается в карточках и в подборке маршрутов.</p>
                  </div>
                  <label className="inline-flex cursor-pointer items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-black">
                    Загрузить фото
                    <input type="file" accept="image/*" className="hidden" onChange={(event) => handleRouteImageUpload(event.target.files?.[0])} />
                  </label>
                </div>

                {routeForm.image && (
                  <div className="mt-4 overflow-hidden rounded-[1.2rem] border border-slate-200 bg-white p-3">
                    <img src={routeForm.image} alt="Маршрут" className="h-44 w-full rounded-xl object-cover" />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Точки маршрута</p>
                  <p className="mt-1 text-sm text-slate-600">Порядок точек хранится явно и сохраняется в локальной JSON-базе.</p>
                </div>
                <button
                  type="button"
                  onClick={addWaypoint}
                  className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-black"
                >
                  Добавить точку
                </button>
              </div>

              <div className="space-y-4">
                {routeForm.waypoints.map((waypoint, index) => (
                  <article key={waypoint._id || `new-${index}`} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Точка #{index + 1}</p>
                        <h3 className="mt-1 text-lg font-semibold text-slate-900">{waypoint.name || 'Новая точка'}</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeWaypoint(index)}
                        className="rounded-full border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                      >
                        Удалить
                      </button>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <label className="block">
                        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Название точки</span>
                        <input
                          value={waypoint.name}
                          onChange={(event) => updateWaypoint(index, 'name', event.target.value)}
                          className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                          required
                        />
                      </label>

                      <label className="block">
                        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Тип точки</span>
                        <select
                          value={waypoint.waypointType}
                          onChange={(event) => updateWaypoint(index, 'waypointType', event.target.value)}
                          className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                        >
                          <option value="regular">Обычная точка</option>
                          <option value="qr">QR-точка</option>
                        </select>
                      </label>
                    </div>

                    <label className="mt-4 block">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Описание точки</span>
                      <textarea
                        value={waypoint.description}
                        onChange={(event) => updateWaypoint(index, 'description', event.target.value)}
                        className="mt-3 min-h-[6rem] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                      />
                    </label>

                    <div className="mt-4 rounded-[1.2rem] border border-slate-200 bg-white p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Изображение точки</p>
                          <p className="mt-1 text-sm text-slate-600">Эта фотография используется в карточке точки и в пазле.</p>
                        </div>
                        <label className="inline-flex cursor-pointer items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-black">
                          Загрузить фото
                          <input type="file" accept="image/*" className="hidden" onChange={(event) => handlePointImageUpload(index, event.target.files?.[0])} />
                        </label>
                      </div>
                      {waypoint.image && <img src={waypoint.image} alt={waypoint.name || 'Точка'} className="mt-4 h-44 w-full rounded-xl object-cover" />}
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto]">
                      <label className="block">
                        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Адрес</span>
                        <input
                          value={waypoint.address}
                          onChange={(event) => updateWaypoint(index, 'address', event.target.value)}
                          className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                          placeholder="Например, пл. Кремль, 15"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => handleGeocode(index)}
                        disabled={geocodingId === `wp-${index}`}
                        className="self-end rounded-full bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60"
                      >
                        {geocodingId === `wp-${index}` ? 'Поиск...' : 'Геокодировать'}
                      </button>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-3">
                      <label className="block">
                        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Широта</span>
                        <input type="number" step="0.000001" value={waypoint.lat} onChange={(event) => updateWaypoint(index, 'lat', event.target.value)} className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900" required />
                      </label>

                      <label className="block">
                        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Долгота</span>
                        <input type="number" step="0.000001" value={waypoint.lng} onChange={(event) => updateWaypoint(index, 'lng', event.target.value)} className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900" required />
                      </label>

                      <label className="block">
                        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Порядок</span>
                        <input type="number" min="1" value={waypoint.order} onChange={(event) => updateWaypoint(index, 'order', event.target.value)} className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900" required />
                      </label>
                    </div>

                    {waypoint.waypointType === 'qr' && (
                      <div className="mt-4 rounded-[1.2rem] border border-slate-200 bg-white p-4">
                        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                          <label className="block">
                            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Значение QR</span>
                            <input value={waypoint.qrCodeValue} onChange={(event) => updateWaypoint(index, 'qrCodeValue', event.target.value)} className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900" placeholder="qr_route_point_01" required />
                          </label>
                          <button type="button" onClick={() => handleGenerateQr(index)} className="self-end rounded-full bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700">
                            Сгенерировать QR
                          </button>
                        </div>

                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                          <label className="block">
                            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Загрузить готовый QR</span>
                            <input type="file" accept="image/*" onChange={(event) => handleQrUpload(index, event.target.files?.[0])} className="mt-3 block w-full text-sm text-slate-700" />
                          </label>

                          {waypoint.qrCodeImage && (
                            <a href={waypoint.qrCodeImage} download={`${waypoint.qrCodeValue || waypoint.name || 'qr-code'}.png`} className="inline-flex items-center justify-center self-end rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                              Скачать QR
                            </a>
                          )}
                        </div>

                        {waypoint.qrCodeImage && (
                          <div className="mt-4 overflow-hidden rounded-[1.25rem] border border-slate-200 bg-slate-50 p-3">
                            <img src={waypoint.qrCodeImage} alt="QR preview" className="h-48 w-48 rounded-xl object-contain" />
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <button type="submit" disabled={saving} className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-60">
                  {saving ? 'Сохраняем...' : routeForm._id ? 'Сохранить маршрут' : 'Создать маршрут'}
                </button>
                <button type="button" onClick={handleReset} className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                  Сбросить
                </button>
              </div>
            </form>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-[2rem] border border-white/70 bg-white/95 p-5 shadow-xl sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">Карта маршрута</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Проверка точек на карте</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Карта использует текущую интеграцию проекта. Если точек две и больше, отображается пешеходная линия.
            </p>
            <div className="mt-5">
              <YandexMap
                mapKey={mapKey}
                routePoints={previewPoints}
                routeGeometry={routeGeometry}
                userLocation={null}
                routingOrigin={null}
                placedStops={[]}
                center={mapCenter}
                onPointClick={() => {}}
                scannedPointIds={[]}
              />
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/70 bg-white/95 p-5 shadow-xl sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">Список маршрутов</p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Все маршруты и точки</h2>
              </div>
              <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">{routes.length} записей</div>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full text-left text-sm text-slate-700">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-[0.18em] text-slate-500">
                    <th className="pb-3 pr-4 font-semibold">Маршрут</th>
                    <th className="pb-3 pr-4 font-semibold">Категория</th>
                    <th className="pb-3 pr-4 font-semibold">Точек</th>
                    <th className="pb-3 text-right font-semibold">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {routes.map((route) => (
                    <tr key={route._id} className="border-b border-slate-100 align-top last:border-b-0">
                      <td className="py-4 pr-4">
                        {route.image && <img src={route.image} alt={route.name} className="mb-3 h-24 w-40 rounded-xl object-cover" />}
                        <div className="font-semibold text-slate-900">{route.name}</div>
                        <div className="mt-1 max-w-md text-sm leading-6 text-slate-600">{route.description}</div>
                        <div className="mt-3 space-y-1 text-xs text-slate-500">
                          {(route.points || [])
                            .slice()
                            .sort((left, right) => (left.order || 0) - (right.order || 0))
                            .map((point) => (
                              <div key={point._id}>
                                {point.order}. {point.name} • {point.waypointType === 'qr' ? 'QR-точка' : 'Обычная точка'}
                              </div>
                            ))}
                        </div>
                      </td>
                      <td className="py-4 pr-4">{route.category || 'Без категории'}</td>
                      <td className="py-4 pr-4">{route.points?.length || 0}</td>
                      <td className="py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => handleEditRoute(route)} className="rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                            Редактировать
                          </button>
                          <button type="button" onClick={() => handleDeleteRoute(route._id, route.name)} className="rounded-full border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50">
                            Удалить
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AdminRoutes;
