import React, { useDeferredValue, useEffect, useMemo, useState, useTransition } from 'react';
import toast from 'react-hot-toast';
import YandexMap from '../components/YandexMap';
import QRScanner from '../components/QRScanner';
import RouteList from '../components/RouteList';
import Leaderboard from '../components/Leaderboard';
import Shop from '../components/Shop';
import AIAssistant from '../components/AIAssistant';
import ShareButton from '../components/ShareButton';
import { useAuth } from '../contexts/AuthContext';
import { getPointsOffline, getRoutesOffline, savePointsOffline, saveRoutesOffline } from '../utils/offlineStorage';
import api from '../utils/api';

const themeButtons = [
  { id: 'all', label: 'Все' },
  { id: 'popular', label: 'Популярное' },
  { id: 'water', label: 'У воды' },
  { id: 'history', label: 'История' },
  { id: 'parks', label: 'Парки' }
];

const stopKindButtons = [
  { id: 'all', label: 'Все остановки' },
  { id: 'food', label: 'Еда' },
  { id: 'shop', label: 'Покупки' },
  { id: 'museum', label: 'Музеи' },
  { id: 'park', label: 'Парки' }
];

const formatKm = (meters) => {
  if (!meters) return '0 км';
  return `${(meters / 1000).toFixed(meters > 990 ? 1 : 2)} км`;
};

const formatMinutes = (seconds) => {
  if (!seconds) return '0 мин';
  return `${Math.max(1, Math.round(seconds / 60))} мин`;
};

const sortByRouteOrder = (route) => (route?.points || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));

const measureDistance = (first, second) => {
  const dx = (first.lat - second.lat) * 111;
  const dy = (first.lng - second.lng) * 71;
  return Math.sqrt(dx * dx + dy * dy);
};

const Home = () => {
  const { user, toggleFavoriteRoute } = useAuth();
  const [, setPoints] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [optionalStops, setOptionalStops] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [routePreview, setRoutePreview] = useState(null);
  const [routePreviewLoading, setRoutePreviewLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [routeOrigin, setRouteOrigin] = useState(null);
  const [aiPoint, setAiPoint] = useState(null);
  const [loadingRoutes, setLoadingRoutes] = useState(true);
  const [routeQuery, setRouteQuery] = useState('');
  const [activeTheme, setActiveTheme] = useState('all');
  const [onlySaved, setOnlySaved] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerTheme, setPickerTheme] = useState('all');
  const [pickerMaxDuration, setPickerMaxDuration] = useState('any');
  const [pickerMaxDistance, setPickerMaxDistance] = useState('any');
  const [pickerPointCount, setPickerPointCount] = useState('any');
  const [selectedStopKind, setSelectedStopKind] = useState('all');
  const [stopInsertAfterIndex, setStopInsertAfterIndex] = useState(0);
  const [placedStops, setPlacedStops] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  const [installPromptEvent, setInstallPromptEvent] = useState(null);
  const [mapConfig, setMapConfig] = useState({
    mapKey: '',
    center: { lat: 54.629624, lng: 39.742445 }
  });
  const deferredRouteQuery = useDeferredValue(routeQuery);
  const [isFiltering, startFiltering] = useTransition();

  useEffect(() => {
    let alive = true;

    const loadData = async () => {
      setLoadingRoutes(true);

      if (navigator.onLine) {
        const [pointsResult, routesResult, configResult, stopsResult] = await Promise.allSettled([
          api.get('/points'),
          api.get('/routes'),
          api.get('/config'),
          api.get('/stops')
        ]);

        if (!alive) return;

        if (pointsResult.status === 'fulfilled') {
          setPoints(pointsResult.value.data);
          await savePointsOffline(pointsResult.value.data);
        } else {
          setPoints(await getPointsOffline());
        }

        if (routesResult.status === 'fulfilled') {
          setRoutes(routesResult.value.data);
          setSelectedRoute((current) => current || routesResult.value.data[0] || null);
          await saveRoutesOffline(routesResult.value.data);
        } else {
          const offlineRoutes = await getRoutesOffline();
          setRoutes(offlineRoutes);
          setSelectedRoute((current) => current || offlineRoutes[0] || null);
        }

        if (configResult.status === 'fulfilled') {
          setMapConfig(configResult.value.data);
        }

        if (stopsResult.status === 'fulfilled') {
          setOptionalStops(stopsResult.value.data);
        }
      } else {
        const [offlinePoints, offlineRoutes] = await Promise.all([getPointsOffline(), getRoutesOffline()]);
        if (!alive) return;
        setPoints(offlinePoints);
        setRoutes(offlineRoutes);
        setSelectedRoute((current) => current || offlineRoutes[0] || null);
      }

      setLoadingRoutes(false);
    };

    loadData();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return undefined;

    const watchId = navigator.geolocation.watchPosition(
      (position) =>
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }),
      (error) => console.error(error),
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    if (!routeOrigin && userLocation) {
      setRouteOrigin(userLocation);
    }
  }, [routeOrigin, userLocation]);

  useEffect(() => {
    const handleInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPromptEvent(event);
    };

    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
  }, []);

  useEffect(() => {
    setPlacedStops([]);
    setSearchResults([]);
    setStopInsertAfterIndex(0);
    setRoutePreview(null);
  }, [selectedRoute?._id]);

  const handleInstallApp = async () => {
    if (!installPromptEvent) return;
    await installPromptEvent.prompt();
    setInstallPromptEvent(null);
  };

  const favoriteRouteIds = useMemo(
    () => new Set((user?.favoriteRoutes || user?.savedRoutes || []).map((route) => route._id)),
    [user]
  );

  const filteredRoutes = useMemo(() => {
    const query = deferredRouteQuery.trim().toLowerCase();

    return routes.filter((route) => {
      if (activeTheme !== 'all' && !(route.themes || []).includes(activeTheme)) {
        return false;
      }

      if (onlySaved && !favoriteRouteIds.has(route._id)) {
        return false;
      }

      if (pickerTheme !== 'all' && !(route.themes || []).includes(pickerTheme)) {
        return false;
      }

      if (pickerMaxDuration !== 'any') {
        const limit = pickerMaxDuration === 'short' ? 70 : 120;
        if ((route.durationMinutes || 0) > limit) return false;
      }

      if (pickerMaxDistance !== 'any') {
        const distanceLimit = pickerMaxDistance === 'short' ? 3 : pickerMaxDistance === 'medium' ? 6 : 10;
        if ((route.distanceKm || 0) > distanceLimit) return false;
      }

      if (pickerPointCount !== 'any') {
        const pointCount = route.pointCount || route.points?.length || 0;
        if (pickerPointCount === 'compact' && pointCount > 4) return false;
        if (pickerPointCount === 'long' && pointCount < 5) return false;
      }

      if (!query) {
        return true;
      }

      const haystack = `${route.name} ${route.description} ${(route.themes || []).join(' ')}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [
    activeTheme,
    deferredRouteQuery,
    favoriteRouteIds,
    onlySaved,
    pickerTheme,
    pickerMaxDistance,
    pickerMaxDuration,
    pickerPointCount,
    routes
  ]);

  const savedRoutes = useMemo(() => routes.filter((route) => favoriteRouteIds.has(route._id)), [favoriteRouteIds, routes]);

  const selectedRoutePoints = useMemo(() => sortByRouteOrder(selectedRoute), [selectedRoute]);
  const scannedPointIds = user?.scannedPoints?.map((point) => point._id) || [];

  const routeWaypoints = useMemo(() => {
    if (!selectedRoutePoints.length) return [];

    const sequence = [];
    if (routeOrigin) {
      sequence.push({ lat: routeOrigin.lat, lng: routeOrigin.lng, kind: 'origin' });
    }

    selectedRoutePoints.forEach((point, index) => {
      sequence.push({ lat: point.lat, lng: point.lng, kind: 'point', refId: point._id });

      placedStops
        .filter((entry) => entry.afterIndex === index)
        .forEach((entry) => {
          sequence.push({ lat: entry.stop.lat, lng: entry.stop.lng, kind: 'stop', refId: entry.stop._id });
        });
    });

    return sequence;
  }, [placedStops, routeOrigin, selectedRoutePoints]);

  useEffect(() => {
    let alive = true;

    const loadRoutePreview = async () => {
      if (routeWaypoints.length < 2) {
        setRoutePreview(null);
        setRoutePreviewLoading(false);
        return;
      }

      setRoutePreviewLoading(true);

      try {
        const response = await api.post('/routing/pedestrian', {
          waypoints: routeWaypoints.map((point) => ({ lat: point.lat, lng: point.lng }))
        });

        if (alive) {
          setRoutePreview(response.data);
        }
      } catch (error) {
        console.error(error);
        if (alive) {
          setRoutePreview({
            geometry: routeWaypoints.map((point) => [point.lng, point.lat]),
            distanceMeters: 0,
            durationSeconds: 0,
            source: 'local',
            error: 'Failed to build route'
          });
        }
      } finally {
        if (alive) {
          setRoutePreviewLoading(false);
        }
      }
    };

    loadRoutePreview();
    return () => {
      alive = false;
    };
  }, [routeWaypoints]);

  const routeReferencePoints = useMemo(
    () => [
      ...selectedRoutePoints.map((point) => ({ lat: point.lat, lng: point.lng })),
      ...(routeOrigin ? [{ lat: routeOrigin.lat, lng: routeOrigin.lng }] : [])
    ],
    [routeOrigin, selectedRoutePoints]
  );

  const visibleOptionalStops = useMemo(() => {
    return optionalStops
      .filter((stop) => selectedStopKind === 'all' || stop.kind === selectedStopKind)
      .filter((stop) => !placedStops.some((entry) => entry.stop._id === stop._id))
      .sort((left, right) => {
        const leftDistance = Math.min(...routeReferencePoints.map((point) => measureDistance(stopToPoint(left), point)));
        const rightDistance = Math.min(...routeReferencePoints.map((point) => measureDistance(stopToPoint(right), point)));
        return leftDistance - rightDistance;
      })
      .slice(0, 6);
  }, [optionalStops, placedStops, routeReferencePoints, selectedStopKind]);

  const displayDistanceKm = routePreview?.distanceMeters ? Number((routePreview.distanceMeters / 1000).toFixed(1)) : selectedRoute?.distanceKm || 0;
  const displayDurationMinutes = routePreview?.durationSeconds
    ? Math.max(1, Math.round(routePreview.durationSeconds / 60))
    : selectedRoute?.durationMinutes || 0;

  const handlePointClick = (point) => {
    setAiPoint(point);
  };

  const handleScanSuccess = async () => {
    if (!navigator.onLine) return;

    try {
      const [pointsResponse, routesResponse] = await Promise.all([api.get('/points'), api.get('/routes')]);
      setPoints(pointsResponse.data);
      setRoutes(routesResponse.data);
      await savePointsOffline(pointsResponse.data);
      await saveRoutesOffline(routesResponse.data);
    } catch (err) {
      console.error('Failed updating points after scan', err);
    }
  };

  const handleRecommendRoute = () => {
    const match = filteredRoutes[0];

    if (!match) {
      toast.error('Пока нет маршрута под такие условия');
      return;
    }

    setSelectedRoute(match);
    if (pickerTheme !== 'all') {
      setActiveTheme(pickerTheme);
    }
    toast.success(`Подобрали маршрут: ${match.name}`);
  };

  const handleToggleFavorite = async (routeId) => {
    await toggleFavoriteRoute(routeId);
  };

  const handleUseMyLocation = () => {
    if (!userLocation) {
      toast.error('Сначала разрешите геолокацию в браузере');
      return;
    }

    setRouteOrigin(userLocation);
    toast.success('Маршрут будет начинаться от вашего местоположения');
  };

  const handleClearMyLocation = () => {
    setRouteOrigin(null);
    toast.success('Маршрут снова начинается с первой точки');
  };

  const handleAddStop = (stop) => {
    setPlacedStops((current) => {
      if (current.some((entry) => entry.stop._id === stop._id)) {
        return current;
      }

      return [...current, { stop, afterIndex: Number(stopInsertAfterIndex) }].sort((left, right) => left.afterIndex - right.afterIndex);
    });
    toast.success(`Остановка добавлена: ${stop.name}`);
  };

  const handleRemoveStop = (stopId) => {
    setPlacedStops((current) => current.filter((entry) => entry.stop._id !== stopId));
  };

  const handleSearchPlace = async () => {
    const query = searchQuery.trim();
    if (!query) return;

    setSearchingPlaces(true);

    try {
      const location = userLocation || mapConfig.center;
      const resultsResponse = await api.post('/places/search', {
        q: query,
        location,
        limit: 6
      });

      let results = resultsResponse.data || [];
      if (!results.length) {
        const geocodeResponse = await api.post('/geocode', { q: query });
        results = [
          {
            id: geocodeResponse.data.title,
            title: geocodeResponse.data.title,
            address: geocodeResponse.data.address,
            lat: geocodeResponse.data.lat,
            lng: geocodeResponse.data.lng,
            type: 'address'
          }
        ];
      }

      setSearchResults(
        results.map((item) => ({
          _id: `search-${item.id || item.title}`,
          kind: 'search',
          name: item.title,
          address: item.address,
          lat: item.lat,
          lng: item.lng
        }))
      );
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.msg || 'Не удалось найти адрес или место');
    } finally {
      setSearchingPlaces(false);
    }
  };

  const stopInsertionOptions = selectedRoutePoints.slice(0, Math.max(selectedRoutePoints.length - 1, 0));

  return (
    <div className="mx-auto max-w-7xl p-4">
      <section
        className="mb-4 overflow-hidden rounded-[2rem] border border-white/70 bg-slate-900 text-white shadow-xl"
        style={{
          backgroundImage:
            "linear-gradient(135deg, rgba(15,23,42,0.78), rgba(30,41,59,0.36)), url('/images/hero/ryazan-hero.jpg')",
          backgroundPosition: 'center',
          backgroundSize: 'cover'
        }}
      >
        <div className="grid gap-6 px-5 py-6 sm:px-6 lg:grid-cols-[1.3fr_0.7fr] lg:px-8 lg:py-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/70">НаРязань</p>
            <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">Маршруты по Рязани, QR-квест и билеты в пару касаний.</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/80 sm:text-base">
              Собирайте прогулку по интересам, стройте путь по пешеходным дорогам, добавляйте остановки как в навигаторе и
              сохраняйте любимые маршруты в «Мои сохранённые».
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button onClick={() => setShowPicker(true)} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100">
                Подобрать маршрут
              </button>
              <button onClick={handleUseMyLocation} className="rounded-full border border-white/40 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10">
                Построить от меня
              </button>
              {installPromptEvent && (
                <button onClick={handleInstallApp} className="rounded-full border border-white/40 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10">
                  Добавить на экран
                </button>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-3xl bg-white/14 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.2em] text-white/60">Маршруты</p>
              <p className="mt-2 text-3xl font-bold">{routes.length}</p>
              <p className="mt-1 text-sm text-white/70">Подбор по теме, длительности и числу точек.</p>
            </div>
            <div className="rounded-3xl bg-white/14 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.2em] text-white/60">Старт</p>
              <p className="mt-2 text-lg font-bold">{routeOrigin ? 'Моё местоположение' : 'Первая точка маршрута'}</p>
              <p className="mt-1 text-sm text-white/70">Можно быстро переключить и обновить геопозицию.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.25fr_0.9fr]">
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-1">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Карта маршрута</h2>
                <p className="text-sm text-slate-500">Карта отображает готовый пешеходный маршрут и статусы точек.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleUseMyLocation}
                  className="rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Обновить старт от меня
                </button>
                {routeOrigin && (
                  <button
                    onClick={handleClearMyLocation}
                    className="rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Начать с первой точки
                  </button>
                )}
              </div>
            </div>

            <YandexMap
              mapKey={mapConfig.mapKey}
              center={mapConfig.center}
              routePoints={selectedRoutePoints}
              routeGeometry={routePreview?.geometry || []}
              userLocation={userLocation}
              routingOrigin={routeOrigin}
              placedStops={placedStops}
              onPointClick={handlePointClick}
              scannedPointIds={scannedPointIds}
            />

            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Длина</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{routePreviewLoading ? '...' : formatKm((displayDistanceKm || 0) * 1000)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Время</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {routePreviewLoading ? '...' : formatMinutes(routePreview?.durationSeconds || displayDurationMinutes * 60)}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Точек</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{selectedRoutePoints.length + placedStops.length}</p>
              </div>
            </div>

            {routePreview?.error && (
              <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Основной источник маршрута временно недоступен, поэтому маршрут показан по запасной схеме.
              </p>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Остановки по пути</h2>
                <p className="text-sm text-slate-500">Выберите место из каталога или найдите адрес и вставьте его в маршрут.</p>
              </div>
              {placedStops.length > 0 && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{placedStops.length} добавлено</span>}
            </div>

            {stopInsertionOptions.length > 0 && (
              <div className="mb-4 grid gap-3 lg:grid-cols-[0.65fr_0.35fr]">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Куда вставить следующую остановку</label>
                  <select
                    className="w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm"
                    value={stopInsertAfterIndex}
                    onChange={(event) => setStopInsertAfterIndex(Number(event.target.value))}
                  >
                    {stopInsertionOptions.map((point, index) => (
                      <option key={point._id} value={index}>
                        После точки: {point.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Найти адрес или место</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Например, Почтовая 62"
                      className="w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm"
                    />
                    <button
                      onClick={handleSearchPlace}
                      disabled={searchingPlaces}
                      className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-black disabled:opacity-60"
                    >
                      {searchingPlaces ? '...' : 'Найти'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="mb-4 flex flex-wrap gap-2">
              {stopKindButtons.map((button) => (
                <button
                  key={button.id}
                  onClick={() => setSelectedStopKind(button.id)}
                  className={`rounded-full border px-3 py-2 text-sm transition ${
                    selectedStopKind === button.id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  {button.label}
                </button>
              ))}
            </div>

            {searchResults.length > 0 && (
              <div className="mb-4">
                <h3 className="mb-2 text-sm font-semibold text-slate-900">Найдено по запросу</h3>
                <div className="space-y-2">
                  {searchResults.map((stop) => (
                    <div key={stop._id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 p-3">
                      <div>
                        <p className="font-semibold text-slate-900">{stop.name}</p>
                        <p className="text-sm text-slate-500">{stop.address}</p>
                      </div>
                      <button
                        onClick={() => handleAddStop(stop)}
                        className="rounded-full bg-sky-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-sky-700"
                      >
                        Добавить
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-3 lg:grid-cols-2">
              <div className="space-y-2">
                {visibleOptionalStops.map((stop) => (
                  <div key={stop._id} className="rounded-2xl border border-slate-200 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{stop.name}</p>
                        <p className="text-sm text-slate-500">{stop.address}</p>
                      </div>
                      <button
                        onClick={() => handleAddStop(stop)}
                        className="rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        В маршрут
                      </button>
                    </div>
                  </div>
                ))}
                {!visibleOptionalStops.length && <p className="text-sm text-slate-500">Под текущие фильтры свободных остановок не осталось.</p>}
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-semibold text-slate-900">Добавленные остановки</h3>
                <div className="mt-3 space-y-2">
                  {placedStops.length ? (
                    placedStops.map((entry) => (
                      <div key={entry.stop._id} className="rounded-2xl border border-slate-200 bg-white p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">{entry.stop.name}</p>
                            <p className="text-sm text-slate-500">{entry.stop.address}</p>
                            {selectedRoutePoints[entry.afterIndex] && (
                              <p className="mt-1 text-xs text-slate-400">После точки: {selectedRoutePoints[entry.afterIndex].name}</p>
                            )}
                          </div>
                          <button
                            onClick={() => handleRemoveStop(entry.stop._id)}
                            className="rounded-full border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                          >
                            Удалить
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">Маршрут строится без промежуточных остановок. Добавьте кафе, музей или магазин по пути.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-slate-900">QR-сканер</h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">Mobile ready</span>
            </div>
            <QRScanner onScanSuccess={handleScanSuccess} />
            <p className="mt-3 text-xs leading-5 text-slate-500">
              Сканер оптимизирован под телефон: работает с основной камерой, не ломает layout и ставит офлайн-сканы в очередь до появления сети.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-slate-900">Маршруты</h2>
              <button
                onClick={() => setShowPicker((current) => !current)}
                className="rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Фильтры
              </button>
            </div>

            <div className="mb-3 flex flex-wrap gap-2">
              {themeButtons.map((button) => (
                <button
                  key={button.id}
                  onClick={() => setActiveTheme(button.id)}
                  className={`rounded-full border px-3 py-2 text-sm transition ${
                    activeTheme === button.id ? 'border-sky-600 bg-sky-600 text-white' : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  {button.label}
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="Поиск по маршрутам"
              className="mb-3 w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm"
              value={routeQuery}
              onChange={(event) => startFiltering(() => setRouteQuery(event.target.value))}
            />

            <label className="mb-3 flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={onlySaved} onChange={(event) => setOnlySaved(event.target.checked)} />
              Показывать только «мои сохранённые»
            </label>

            {showPicker && (
              <div className="mb-4 space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Тема маршрута</label>
                  <select className="w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm" value={pickerTheme} onChange={(event) => setPickerTheme(event.target.value)}>
                    <option value="all">Любая</option>
                    <option value="popular">Популярное</option>
                    <option value="history">История</option>
                    <option value="water">У воды</option>
                    <option value="parks">Парки</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Длительность</label>
                  <select className="w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm" value={pickerMaxDuration} onChange={(event) => setPickerMaxDuration(event.target.value)}>
                    <option value="any">Любая</option>
                    <option value="short">До 70 минут</option>
                    <option value="medium">До 120 минут</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Длина маршрута</label>
                  <select className="w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm" value={pickerMaxDistance} onChange={(event) => setPickerMaxDistance(event.target.value)}>
                    <option value="any">Любая</option>
                    <option value="short">До 3 км</option>
                    <option value="medium">До 6 км</option>
                    <option value="long">До 10 км</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Количество точек</label>
                  <select className="w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm" value={pickerPointCount} onChange={(event) => setPickerPointCount(event.target.value)}>
                    <option value="any">Любое</option>
                    <option value="compact">До 4 точек</option>
                    <option value="long">От 5 точек</option>
                  </select>
                </div>
                <button onClick={handleRecommendRoute} className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-black">
                  Подобрать маршрут
                </button>
              </div>
            )}

            <RouteList
              routes={filteredRoutes}
              loading={loadingRoutes || isFiltering}
              selectedRouteId={selectedRoute?._id}
              favoriteRouteIds={Array.from(favoriteRouteIds)}
              onSelectRoute={setSelectedRoute}
              onToggleFavorite={handleToggleFavorite}
            />

            {selectedRoute && (
              <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-900">{selectedRoute.name}</h3>
                    <p className="text-sm text-slate-600">{selectedRoute.description}</p>
                  </div>
                  <button
                    onClick={() => handleToggleFavorite(selectedRoute._id)}
                    className={`rounded-full border px-3 py-2 text-sm transition ${
                      favoriteRouteIds.has(selectedRoute._id) ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    {favoriteRouteIds.has(selectedRoute._id) ? 'В сохранённых' : 'Сохранить'}
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-2xl border border-slate-200 bg-white p-3">
                    Точек: <span className="font-semibold">{selectedRoute.points?.length || 0}</span>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-3">
                    Награда: <span className="font-semibold text-sky-700">{selectedRoute.totalReward}</span> баллов
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-3">
                    Длина: <span className="font-semibold">{displayDistanceKm} км</span>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-3">
                    Время: <span className="font-semibold">{displayDurationMinutes} мин</span>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(selectedRoute.themes || []).map((theme) => (
                    <span key={theme} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
                      {theme}
                    </span>
                  ))}
                </div>
                <div className="mt-3">
                  <ShareButton routeName={selectedRoute.name} pointsCount={selectedRoute.points?.length || 0} />
                </div>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900">Мои сохранённые</h3>
            <div className="mt-3 space-y-2">
              {savedRoutes.length ? (
                savedRoutes.map((route) => (
                  <button
                    key={route._id}
                    onClick={() => setSelectedRoute(route)}
                    className="w-full rounded-2xl border border-slate-200 p-3 text-left transition hover:bg-slate-50"
                  >
                    <p className="font-semibold text-slate-900">{route.name}</p>
                    <p className="text-sm text-slate-500">{route.description}</p>
                  </button>
                ))
              ) : (
                <p className="text-sm text-slate-500">Здесь появятся маршруты, которые вы добавите в избранное.</p>
              )}
            </div>
          </div>

          <Leaderboard />
          <Shop />
        </div>
      </div>

      {aiPoint && <AIAssistant point={aiPoint} onClose={() => setAiPoint(null)} />}
    </div>
  );
};

const stopToPoint = (stop) => ({
  lat: stop.lat,
  lng: stop.lng
});

export default Home;
