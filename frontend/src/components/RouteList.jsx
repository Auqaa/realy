import React from 'react';

const routeThemeLabels = {
  popular: 'Популярное',
  water: 'У воды',
  history: 'История',
  parks: 'Парки'
};

const RouteList = ({
  routes = [],
  loading = false,
  selectedRouteId,
  favoriteRouteIds = [],
  onSelectRoute,
  onToggleFavorite
}) => {
  if (loading) return <div className="text-sm text-gray-600">Загрузка...</div>;

  if (!routes.length) {
    return <div className="text-sm text-gray-600">Маршруты не найдены. Попробуйте изменить фильтры.</div>;
  }

  return (
    <div className="space-y-2">
      {routes.map((route) => {
        const isSelected = route._id === selectedRouteId;
        const isFavorite = favoriteRouteIds.includes(route._id);

        return (
          <div
            key={route._id}
            className={`overflow-hidden rounded-3xl border bg-white transition-shadow ${isSelected ? 'ring-2 ring-sky-300' : 'hover:shadow-sm'}`}
          >
            {route.image && (
              <img
                src={route.image}
                alt={route.name}
                className="h-36 w-full object-cover"
              />
            )}

            <div className="p-4">
              <div className="flex justify-between gap-3 items-start">
                <div>
                  <h3 className="font-bold text-slate-900">{route.name}</h3>
                  <p className="text-sm text-slate-600">{route.description}</p>
                </div>
                <button
                  onClick={() => onToggleFavorite?.(route._id)}
                  className={`rounded-full border px-3 py-2 text-xs ${
                    isFavorite ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white text-gray-600'
                  }`}
                >
                  {isFavorite ? 'В сохранённых' : 'Сохранить'}
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {(route.themes || []).map((theme) => (
                  <span key={theme} className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">
                    {routeThemeLabels[theme] || theme}
                  </span>
                ))}
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                <div className="rounded-2xl border bg-slate-50 p-2">
                  Точек: <span className="font-semibold">{route.pointCount || route.points?.length || 0}</span>
                </div>
                <div className="rounded-2xl border bg-slate-50 p-2">
                  Длина: <span className="font-semibold">{route.distanceKm || 0} км</span>
                </div>
                <div className="rounded-2xl border bg-slate-50 p-2">
                  Время: <span className="font-semibold">{route.durationMinutes || 0} мин</span>
                </div>
              </div>

              <button
                onClick={() => onSelectRoute(route)}
                className="mt-3 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-black"
              >
                {isSelected ? 'Маршрут выбран' : 'Выбрать'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default RouteList;
