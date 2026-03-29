const SHARED_TWOGIS_KEY = process.env.TWOGIS_KEY || '';

const TWOGIS_MAP_KEY = process.env.TWOGIS_MAP_KEY || process.env.TWOGIS_PUBLIC_KEY || SHARED_TWOGIS_KEY;
const TWOGIS_ROUTING_KEY = process.env.TWOGIS_ROUTING_KEY || SHARED_TWOGIS_KEY;
const TWOGIS_GEOCODER_KEY = process.env.TWOGIS_GEOCODER_KEY || SHARED_TWOGIS_KEY;
const TWOGIS_PLACES_KEY = process.env.TWOGIS_PLACES_KEY || SHARED_TWOGIS_KEY;

const ROUTING_URL = `https://routing.api.2gis.com/routing/7.0.0/global?key=${TWOGIS_ROUTING_KEY}`;
const GEOCODER_URL = 'https://catalog.api.2gis.com/3.0/items/geocode';
const PLACES_URL = 'https://catalog.api.2gis.com/3.0/items';
const OSRM_BASE_URL = 'https://router.project-osrm.org/route/v1/foot/';

const ROUTE_CACHE_TTL_MS = 1000 * 60 * 30;
const RYAZAN_CENTER = { lat: 54.629624, lng: 39.742445 };

const routeCache = new Map();
const inFlightRoutes = new Map();

const roundCoord = (value) => Number(Number(value || 0).toFixed(6));

const normalizeWaypoints = (waypoints = []) =>
  waypoints
    .map((point) => ({
      lat: Number(point.lat),
      lng: Number(point.lng)
    }))
    .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));

const ensureRyazanQuery = (query) => {
  const normalized = String(query || '').trim();
  if (!normalized) return '';
  return /рязан/i.test(normalized) ? normalized : `Рязань, ${normalized}`;
};

const buildRouteCacheKey = (waypoints) =>
  waypoints.map((point) => `${roundCoord(point.lng)},${roundCoord(point.lat)}`).join(';');

const appendCoordinate = (target, coord) => {
  if (!coord || coord.length < 2) return;
  const [lng, lat] = coord;
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;

  const prev = target[target.length - 1];
  if (prev && prev[0] === lng && prev[1] === lat) return;
  target.push([lng, lat]);
};

const parseLineStringSelection = (selection) => {
  const match = String(selection || '').match(/LINESTRING\s*\((.*)\)/i);
  if (!match) return [];

  return match[1]
    .split(',')
    .map((segment) => segment.trim().split(/\s+/).slice(0, 2).map(Number))
    .filter(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat));
};

const mergeSelections = (target, selections = []) => {
  selections.forEach((selection) => {
    parseLineStringSelection(selection).forEach((coord) => appendCoordinate(target, coord));
  });
};

const buildFallbackRoute = (waypoints, reason = null, source = 'fallback') => ({
  geometry: waypoints.map((point) => [point.lng, point.lat]),
  distanceMeters: 0,
  durationSeconds: 0,
  maneuvers: [],
  source,
  error: reason
});

const make2GISPayload = (waypoints) => ({
  locale: 'ru',
  output: 'detailed',
  transport: 'walking',
  points: waypoints.map((point, index) => ({
    lat: point.lat,
    lon: point.lng,
    start: index === 0,
    type: index === 0 || index === waypoints.length - 1 ? 'walking' : 'pref'
  }))
});

const extract2GISRoute = (data, waypoints) => {
  const route = data?.result?.[0];
  if (!route) {
    return buildFallbackRoute(waypoints, 'empty result');
  }

  const geometry = [];
  mergeSelections(geometry, [route.begin_pedestrian_path?.geometry?.selection]);

  (route.maneuvers || []).forEach((maneuver) => {
    mergeSelections(
      geometry,
      (maneuver.outcoming_path?.geometry || []).map((segment) => segment.selection)
    );
  });

  mergeSelections(geometry, [route.end_pedestrian_path?.geometry?.selection]);

  if (!geometry.length) {
    mergeSelections(
      geometry,
      (route.geometry || []).map((segment) => segment.selection)
    );
  }

  if (!geometry.length) {
    return buildFallbackRoute(waypoints, 'missing geometry');
  }

  return {
    geometry,
    distanceMeters: Number(route.total_distance || 0),
    durationSeconds: Number(route.total_duration || 0),
    maneuvers: route.maneuvers || [],
    source: '2gis',
    error: null
  };
};

const fetchJson = async (url, options) => {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data?.message || `HTTP ${response.status}`);
    error.status = response.status;
    error.payload = data;
    throw error;
  }

  return data;
};

const request2GISRoute = async (waypoints) => {
  const data = await fetchJson(ROUTING_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(make2GISPayload(waypoints))
  });

  return extract2GISRoute(data, waypoints);
};

const requestOsrmRoute = async (waypoints) => {
  const coordinates = waypoints.map((point) => `${point.lng},${point.lat}`).join(';');
  const url = `${OSRM_BASE_URL}${coordinates}?overview=full&geometries=geojson&steps=false`;
  const data = await fetchJson(url);
  const route = data?.routes?.[0];

  if (!route?.geometry?.coordinates?.length) {
    return buildFallbackRoute(waypoints, 'osrm empty result', 'osrm');
  }

  return {
    geometry: route.geometry.coordinates,
    distanceMeters: Number(route.distance || 0),
    durationSeconds: Number(route.duration || 0),
    maneuvers: [],
    source: 'osrm',
    error: null
  };
};

const getCachedRoute = (key) => {
  const cached = routeCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.createdAt > ROUTE_CACHE_TTL_MS) {
    routeCache.delete(key);
    return null;
  }
  return cached.data;
};

const setCachedRoute = (key, data) => {
  routeCache.set(key, { createdAt: Date.now(), data });
  return data;
};

const requestPedestrianRoute = async (rawWaypoints) => {
  const waypoints = normalizeWaypoints(rawWaypoints);

  if (waypoints.length < 2) {
    return buildFallbackRoute(waypoints, null, 'local');
  }

  const cacheKey = buildRouteCacheKey(waypoints);
  const cached = getCachedRoute(cacheKey);
  if (cached) {
    return cached;
  }

  if (inFlightRoutes.has(cacheKey)) {
    return inFlightRoutes.get(cacheKey);
  }

  const promise = (async () => {
    try {
      const route = await request2GISRoute(waypoints);
      return setCachedRoute(cacheKey, route);
    } catch (error) {
      try {
        const osrmRoute = await requestOsrmRoute(waypoints);
        return setCachedRoute(cacheKey, {
          ...osrmRoute,
          error: error.message || '2GIS routing failed'
        });
      } catch (osrmError) {
        return setCachedRoute(
          cacheKey,
          buildFallbackRoute(waypoints, osrmError.message || error.message)
        );
      }
    } finally {
      inFlightRoutes.delete(cacheKey);
    }
  })();

  inFlightRoutes.set(cacheKey, promise);
  return promise;
};

const geocodeAddress = async (query) => {
  const normalizedQuery = ensureRyazanQuery(query);
  if (!normalizedQuery) {
    throw new Error('Empty geocoding query');
  }

  const url = new URL(GEOCODER_URL);
  url.searchParams.set('q', normalizedQuery);
  url.searchParams.set('fields', 'items.point,items.full_name,items.address_name');
  url.searchParams.set('key', TWOGIS_GEOCODER_KEY);

  const data = await fetchJson(url);
  const item = data?.result?.items?.[0];

  if (!item?.point) {
    throw new Error('Address not found');
  }

  return {
    title: item.full_name || item.name || normalizedQuery,
    address: item.address_name || normalizedQuery,
    lat: Number(item.point.lat),
    lng: Number(item.point.lon),
    raw: item
  };
};

const searchPlaces = async ({ query, location = RYAZAN_CENTER, limit = 8 }) => {
  const normalizedQuery = ensureRyazanQuery(query);
  if (!normalizedQuery) {
    return [];
  }

  const url = new URL(PLACES_URL);
  url.searchParams.set('q', normalizedQuery);
  url.searchParams.set('location', `${location.lng},${location.lat}`);
  url.searchParams.set('fields', 'items.point,items.full_name,items.address_name');
  url.searchParams.set('page_size', String(limit));
  url.searchParams.set('key', TWOGIS_PLACES_KEY);

  const data = await fetchJson(url);
  return (data?.result?.items || [])
    .filter((item) => item?.point)
    .map((item) => ({
      id: item.id,
      title: item.full_name || item.name,
      address: item.address_name || '',
      lat: Number(item.point.lat),
      lng: Number(item.point.lon),
      type: item.type || ''
    }));
};

const getPublicMapConfig = () => ({
  mapKey: TWOGIS_MAP_KEY,
  city: 'Рязань',
  center: RYAZAN_CENTER
});

module.exports = {
  RYAZAN_CENTER,
  geocodeAddress,
  getPublicMapConfig,
  requestPedestrianRoute,
  searchPlaces
};
