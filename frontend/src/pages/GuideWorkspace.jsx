import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useSearchParams } from 'react-router-dom';
import YandexMap from '../components/YandexMap';
import api from '../utils/api';

const getPreferredVariant = (pack, variantId = '') => {
  if (!pack?.variants?.length) return null;
  return (
    pack.variants.find((variant) => variant.routeId === variantId) ||
    pack.variants.find((variant) => variant.routeId === pack.defaultVariantRouteId) ||
    pack.variants[0]
  );
};

const formatRouteMeta = (variant) => {
  if (!variant) return 'Маршрут уточняется';
  return `${variant.pointCount || 0} точек • ${variant.distanceKm || 0} км • ${variant.durationMinutes || 0} мин`;
};

const formatVariantBadge = (role) => (role === 'primary' ? 'Основной маршрут' : 'Альтернатива');

const materialBlockTitles = {
  guideText: 'Сценарий экскурсовода',
  audio: 'Аудио',
  facts: 'Факты для рассказа',
  description: 'Описание точки'
};

const GuideWorkspace = ({ accessDenied = false }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [packs, setPacks] = useState([]);
  const [selectedPack, setSelectedPack] = useState(null);
  const [loadingPacks, setLoadingPacks] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [config, setConfig] = useState({
    mapKey: '',
    center: { lat: 54.629624, lng: 39.742445 }
  });

  const selectedPackId = searchParams.get('packId') || '';
  const selectedVariantRouteId = searchParams.get('variantId') || '';

  useEffect(() => {
    if (accessDenied) return undefined;

    let alive = true;

    const loadInitial = async () => {
      setLoadingPacks(true);

      const [packsResult, configResult] = await Promise.allSettled([
        api.get('/route-packs/guide'),
        api.get('/config')
      ]);

      if (!alive) return;

      if (packsResult.status === 'fulfilled') {
        setPacks(packsResult.value.data || []);
      } else {
        console.error(packsResult.reason);
        toast.error(packsResult.reason?.response?.data?.msg || 'Не удалось загрузить сценарии экскурсовода');
        setPacks([]);
      }

      if (configResult.status === 'fulfilled') {
        setConfig((current) => ({ ...current, ...(configResult.value.data || {}) }));
      }

      setLoadingPacks(false);
    };

    loadInitial();

    return () => {
      alive = false;
    };
  }, [accessDenied]);

  useEffect(() => {
    if (accessDenied || !selectedPackId) {
      setSelectedPack(null);
      return;
    }

    let alive = true;

    const loadPackDetail = async () => {
      setLoadingDetail(true);

      try {
        const response = await api.get(`/route-packs/guide/${selectedPackId}`);
        if (!alive) return;

        setSelectedPack(response.data);

        const nextVariant = getPreferredVariant(response.data, selectedVariantRouteId);
        if (nextVariant && nextVariant.routeId !== selectedVariantRouteId) {
          setSearchParams((currentParams) => {
            const nextParams = new URLSearchParams(currentParams);
            nextParams.set('packId', selectedPackId);
            nextParams.set('variantId', nextVariant.routeId);
            return nextParams;
          }, { replace: true });
        }
      } catch (error) {
        console.error(error);
        if (!alive) return;

        setSelectedPack(null);
        toast.error(error.response?.data?.msg || 'Не удалось открыть выбранный сценарий');
        setSearchParams({});
      } finally {
        if (alive) setLoadingDetail(false);
      }
    };

    loadPackDetail();

    return () => {
      alive = false;
    };
  }, [accessDenied, selectedPackId, setSearchParams]);

  const selectedPackSummary = useMemo(
    () => packs.find((pack) => pack._id === selectedPackId) || null,
    [packs, selectedPackId]
  );

  const activePack = selectedPack?._id === selectedPackId ? selectedPack : null;
  const activeVariant = useMemo(
    () => getPreferredVariant(activePack, selectedVariantRouteId),
    [activePack, selectedVariantRouteId]
  );

  const openPack = (pack) => {
    const nextVariant = getPreferredVariant(pack);
    setSearchParams({
      packId: pack._id,
      ...(nextVariant ? { variantId: nextVariant.routeId } : {})
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closePack = () => {
    setSearchParams({});
    setSelectedPack(null);
  };

  const selectVariant = (routeId) => {
    setSearchParams((currentParams) => {
      const nextParams = new URLSearchParams(currentParams);
      nextParams.set('packId', selectedPackId);
      nextParams.set('variantId', routeId);
      return nextParams;
    }, { replace: true });
  };

  if (accessDenied) {
    return (
      <div className="mx-auto max-w-4xl p-4 sm:p-6" data-testid="guide-access-denied">
        <section className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-lg backdrop-blur sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">Guide Workspace</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">Доступ закрыт</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
            Этот раздел открыт только для ролей Guide, Curator и Administrator. Если нужен доступ для рабочей смены, попроси администратора назначить подходящую роль.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/" className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-black">
              Вернуться на главную
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6">
      <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-slate-950 text-white shadow-xl">
        <div className="grid gap-5 px-5 py-6 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-200/80">Guide Workspace</p>
            <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">Кабинет экскурсовода для живой прогулки</h1>
            <p className="mt-3 text-sm leading-7 text-slate-300 sm:text-base">
              Открывай готовые сценарии, быстро переключайся между вариантами маршрута и держи под рукой краткий briefing по каждой остановке без редакторского шума.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-[1.5rem] border border-white/10 bg-white/10 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Сценариев</div>
              <div className="mt-2 text-3xl font-bold">{packs.length}</div>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-white/10 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Featured</div>
              <div className="mt-2 text-3xl font-bold">{packs.filter((pack) => pack.featured).length}</div>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-white/10 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Выбранный pack</div>
              <div className="mt-2 text-sm font-semibold leading-6 text-white">{selectedPackSummary?.name || 'Пока не выбран'}</div>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <section className={`${selectedPackId ? 'hidden lg:block' : ''}`}>
          <div className="rounded-[2rem] border border-white/80 bg-white/90 p-5 shadow-lg backdrop-blur sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">Сценарии</p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Что провести сегодня</h2>
              </div>
              {!loadingPacks && packs.length > 0 && (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{packs.length}</span>
              )}
            </div>

            {loadingPacks ? (
              <p className="mt-5 text-sm text-slate-500">Собираем доступные сценарии...</p>
            ) : packs.length ? (
              <div className="mt-5 space-y-4" data-testid="guide-pack-list">
                {packs.map((pack) => {
                  const preferredVariant = getPreferredVariant(pack);
                  const isSelected = pack._id === selectedPackId;

                  return (
                    <button
                      key={pack._id}
                      type="button"
                      data-testid={`guide-pack-card-${pack._id}`}
                      onClick={() => openPack(pack)}
                      className={`w-full rounded-[1.6rem] border p-4 text-left transition ${
                        isSelected
                          ? 'border-sky-300 bg-sky-50 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex flex-wrap gap-2">
                        {pack.featured && (
                          <span className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">
                            Сценарий дня
                          </span>
                        )}
                        {(pack.badges || []).slice(0, 3).map((badge) => (
                          <span
                            key={`${pack._id}-${badge}`}
                            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600"
                          >
                            {badge}
                          </span>
                        ))}
                      </div>

                      <h3 className="mt-3 text-lg font-bold text-slate-900">{pack.name}</h3>
                      <p className="mt-2 text-sm font-medium leading-6 text-slate-800">{pack.promise}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{pack.description}</p>

                      {pack.practicalNotesTeaser && (
                        <div className="mt-4 rounded-[1.2rem] border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                          {pack.practicalNotesTeaser}
                        </div>
                      )}

                      <div className="mt-4 rounded-[1.2rem] border border-slate-200 bg-white p-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Маршруты внутри</div>
                        <div className="mt-2 text-sm font-semibold text-slate-900">
                          {preferredVariant?.name || 'Маршрут уточняется'}
                        </div>
                        <div className="mt-1 text-sm text-slate-500">
                          {pack.variants.length} вариант(а) • {pack.variants.reduce((sum, variant) => sum + (variant.fallbackStopCount || 0), 0)} stop-gap
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="mt-5 rounded-[1.6rem] border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-500" data-testid="guide-pack-empty">
                Пока нет опубликованных и пригодных сценариев. Когда куратор подготовит pack, он появится здесь автоматически.
              </div>
            )}
          </div>
        </section>

        <section className={`${!selectedPackId ? 'hidden lg:block' : ''}`}>
          {!selectedPackId ? (
            <div className="hidden h-full rounded-[2rem] border border-dashed border-slate-300 bg-white/80 p-8 text-sm leading-7 text-slate-500 shadow-sm backdrop-blur lg:block">
              Выбери сценарий слева — здесь откроется единый briefing с вариантом маршрута, картой и stop-by-stop материалами.
            </div>
          ) : loadingDetail ? (
            <div className="rounded-[2rem] border border-white/80 bg-white/90 p-6 text-sm text-slate-500 shadow-lg backdrop-blur">
              Загружаем briefing сценария...
            </div>
          ) : activePack && activeVariant ? (
            <div className="space-y-6">
              <section className="rounded-[2rem] border border-white/80 bg-white/95 p-5 shadow-lg backdrop-blur sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="max-w-3xl">
                    <button
                      type="button"
                      onClick={closePack}
                      className="mb-4 inline-flex rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 lg:hidden"
                    >
                      ← Ко всем сценариям
                    </button>

                    <div className="flex flex-wrap gap-2">
                      {activePack.featured && (
                        <span className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">
                          Сценарий дня
                        </span>
                      )}
                      {(activePack.badges || []).map((badge) => (
                        <span
                          key={`${activePack._id}-${badge}`}
                          className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600"
                        >
                          {badge}
                        </span>
                      ))}
                    </div>

                    <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">{activePack.name}</h2>
                    <p className="mt-3 text-base font-medium leading-7 text-slate-900">{activePack.promise}</p>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{activePack.description}</p>
                  </div>

                  <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Активный маршрут</div>
                    <div className="mt-2 font-semibold text-slate-900">{activeVariant.name}</div>
                    <div className="mt-1 text-slate-500">{formatRouteMeta(activeVariant)}</div>
                  </div>
                </div>

                {activePack.practicalNotes && (
                  <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Practical notes</div>
                    <p className="mt-2 text-sm leading-7 text-slate-700">{activePack.practicalNotes}</p>
                  </div>
                )}

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Остановок</div>
                    <div className="mt-2 text-2xl font-bold text-slate-950">{activeVariant.pointCount}</div>
                  </div>
                  <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Guide-ready</div>
                    <div className="mt-2 text-2xl font-bold text-emerald-700">{activeVariant.guideReadyStopCount}</div>
                  </div>
                  <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Fallback stops</div>
                    <div className="mt-2 text-2xl font-bold text-amber-700">{activeVariant.fallbackStopCount}</div>
                  </div>
                </div>
              </section>

              <section className="rounded-[2rem] border border-white/80 bg-white/95 p-5 shadow-lg backdrop-blur sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">Маршрут внутри pack</p>
                    <h3 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Выбор варианта</h3>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {activePack.variants.length} вариант(а)
                  </span>
                </div>

                <div className="mt-5 space-y-3">
                  {activePack.variants.map((variant) => {
                    const isSelected = variant.routeId === activeVariant.routeId;

                    return (
                      <button
                        key={variant.routeId}
                        type="button"
                        data-testid={`guide-variant-${variant.routeId}`}
                        onClick={() => selectVariant(variant.routeId)}
                        className={`w-full rounded-[1.5rem] border p-4 text-left transition ${
                          isSelected
                            ? 'border-sky-300 bg-sky-50 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="max-w-2xl">
                            <div className="flex flex-wrap gap-2">
                              <span
                                className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                                  variant.role === 'primary' ? 'bg-sky-100 text-sky-800' : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {formatVariantBadge(variant.role)}
                              </span>
                              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                                {formatRouteMeta(variant)}
                              </span>
                            </div>
                            <div className="mt-3 text-lg font-bold text-slate-900">{variant.name}</div>
                            <p className="mt-2 text-sm leading-6 text-slate-600">{variant.reason || variant.description}</p>
                          </div>
                          {isSelected && (
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                              Выбран
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                <div className="rounded-[2rem] border border-white/80 bg-white/95 p-5 shadow-lg backdrop-blur sm:p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">Map preview</p>
                  <h3 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Контекст маршрута</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    Карта показывает порядок точек текущего варианта. Если картографический ключ недоступен, briefing всё равно остаётся рабочим.
                  </p>
                  <div className="mt-5">
                    <YandexMap
                      mapKey={config.mapKey}
                      center={activeVariant.previewCenter || config.center}
                      routePoints={activeVariant.stops}
                      routeGeometry={[]}
                      placedStops={[]}
                      scannedPointIds={[]}
                    />
                  </div>
                </div>

                <div className="rounded-[2rem] border border-white/80 bg-white/95 p-5 shadow-lg backdrop-blur sm:p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">Быстрый summary</p>
                  <h3 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Что помнить перед стартом</h3>

                  <div className="mt-5 space-y-3">
                    <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Маршрут</div>
                      <div className="mt-2 font-semibold text-slate-900">{activeVariant.name}</div>
                      <div className="mt-1 text-sm text-slate-500">{formatRouteMeta(activeVariant)}</div>
                    </div>

                    <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Почему именно этот вариант</div>
                      <div className="mt-2 text-sm leading-6 text-slate-700">{activeVariant.reason || 'Редакционный комментарий не задан, ориентируйтесь по описанию маршрута.'}</div>
                    </div>

                    <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Материалы</div>
                      <div className="mt-2 text-sm leading-6 text-slate-700">
                        {activeVariant.guideReadyStopCount} stop(s) готовы с dedicated material, {activeVariant.fallbackStopCount} используют fallback.
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-[2rem] border border-white/80 bg-white/95 p-5 shadow-lg backdrop-blur sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">Stop-by-stop</p>
                    <h3 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Материалы по точкам</h3>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {activeVariant.stops.length} остановок
                  </span>
                </div>

                <div className="mt-5 space-y-4">
                  {activeVariant.stops.map((stop) => (
                    <article
                      key={stop._id}
                      data-testid={`guide-stop-${stop._id}`}
                      className="rounded-[1.6rem] border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="max-w-3xl">
                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                              #{stop.order}
                            </span>
                            <span
                              className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                                stop.hasGuideGap ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {stop.hasGuideGap ? 'Есть fallback' : 'Guide-ready'}
                            </span>
                            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                              {stop.materialSource}
                            </span>
                          </div>
                          <h4 className="mt-3 text-xl font-bold text-slate-900">{stop.name}</h4>
                          {stop.address && <p className="mt-2 text-sm text-slate-500">{stop.address}</p>}
                          {stop.previewText && <p className="mt-3 text-sm leading-6 text-slate-700">{stop.previewText}</p>}
                        </div>
                        <div className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                          {stop.waypointType === 'qr' ? 'QR point' : 'Regular stop'}
                        </div>
                      </div>

                      <div className="mt-4 space-y-3">
                        {stop.materialBlocks.map((block, index) => (
                          <div key={`${stop._id}-${block.type}-${index}`} className="rounded-[1.3rem] border border-slate-200 bg-white p-4">
                            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                              {materialBlockTitles[block.type] || block.type}
                            </div>

                            {block.type === 'guideText' && <p className="mt-2 text-sm leading-7 text-slate-700">{block.text}</p>}
                            {block.type === 'description' && <p className="mt-2 text-sm leading-7 text-slate-700">{block.text}</p>}
                            {block.type === 'audio' && (
                              <audio className="mt-3 w-full" controls preload="none">
                                <source src={block.url} />
                              </audio>
                            )}
                            {block.type === 'facts' && (
                              <div className="mt-3 space-y-3">
                                {(block.items || []).map((fact, factIndex) => (
                                  <div key={`${stop._id}-fact-${factIndex}`} className="rounded-[1.1rem] border border-slate-200 bg-slate-50 p-3">
                                    {fact.question && <div className="text-sm font-semibold text-slate-900">{fact.question}</div>}
                                    {fact.answer && <div className="mt-1 text-sm leading-6 text-slate-700">{fact.answer}</div>}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          ) : (
            <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/80 p-6 text-sm text-slate-500 shadow-sm backdrop-blur">
              Выбранный сценарий сейчас недоступен. Вернись к списку и открой другой pack.
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default GuideWorkspace;
