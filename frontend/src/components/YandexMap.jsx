import React, { useEffect, useMemo, useRef, useState } from 'react';
import loadMapgl from '../utils/loadMapgl';

const DEFAULT_CENTER = { lat: 54.629624, lng: 39.742445 };

const destroyObjects = (objects = []) => {
  objects.forEach((item) => {
    try {
      item?.destroy?.();
    } catch (error) {
      console.warn('Failed to destroy map object', error);
    }
  });
};

const buildBounds = (coordinates = []) => {
  if (!coordinates.length) return null;

  let minLng = coordinates[0][0];
  let maxLng = coordinates[0][0];
  let minLat = coordinates[0][1];
  let maxLat = coordinates[0][1];

  coordinates.forEach(([lng, lat]) => {
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  });

  return {
    northEast: [maxLng, maxLat],
    southWest: [minLng, minLat]
  };
};

const toSignature = (coordinates = []) =>
  coordinates.map(([lng, lat]) => `${Number(lng).toFixed(5)},${Number(lat).toFixed(5)}`).join(';');

const YandexMap = ({
  mapKey,
  routePoints = [],
  routeGeometry = [],
  userLocation,
  routingOrigin,
  placedStops = [],
  center = DEFAULT_CENTER,
  onPointClick,
  scannedPointIds = []
}) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const mapglRef = useRef(null);
  const pointMarkersRef = useRef([]);
  const stopMarkersRef = useRef([]);
  const userMarkerRef = useRef(null);
  const routeLineRef = useRef(null);
  const fittedSignatureRef = useRef('');
  const [mapError, setMapError] = useState('');

  const pointsById = useMemo(() => new Map(routePoints.map((point) => [point._id, point])), [routePoints]);
  const stopsById = useMemo(() => new Map(placedStops.map((entry) => [entry.stop._id, entry.stop])), [placedStops]);

  useEffect(() => {
    if (!containerRef.current || !mapKey || mapRef.current) return undefined;

    let cancelled = false;

    const initMap = async () => {
      try {
        const mapgl = await loadMapgl();
        if (cancelled || !containerRef.current || mapRef.current) return;

        mapglRef.current = mapgl;
        mapRef.current = new mapgl.Map(containerRef.current, {
          key: mapKey,
          center: [center.lng, center.lat],
          zoom: 13
        });
        setMapError('');
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setMapError('Не удалось загрузить карту. Остальная часть страницы продолжит работать.');
        }
      }
    };

    initMap();

    return () => {
      cancelled = true;
      destroyObjects(pointMarkersRef.current);
      destroyObjects(stopMarkersRef.current);
      destroyObjects([userMarkerRef.current, routeLineRef.current, mapRef.current]);
      pointMarkersRef.current = [];
      stopMarkersRef.current = [];
      userMarkerRef.current = null;
      routeLineRef.current = null;
      mapRef.current = null;
      mapglRef.current = null;
      fittedSignatureRef.current = '';
    };
  }, [center.lat, center.lng, mapKey]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const handleClick = (event) => {
      const pointNode = event.target.closest('[data-point-id]');
      if (pointNode) {
        const point = pointsById.get(pointNode.getAttribute('data-point-id'));
        if (point) onPointClick?.(point);
        return;
      }

      const stopNode = event.target.closest('[data-stop-id]');
      if (stopNode) {
        const stop = stopsById.get(stopNode.getAttribute('data-stop-id'));
        if (stop) {
          onPointClick?.({
            _id: `stop-${stop._id}`,
            name: stop.name,
            description: stop.address,
            image: '',
            facts: [
              {
                question: 'Остановка по пути',
                answer: `${stop.name}. ${stop.address || 'Адрес уточняется.'}`
              }
            ]
          });
        }
      }
    };

    container.addEventListener('click', handleClick);
    return () => container.removeEventListener('click', handleClick);
  }, [onPointClick, pointsById, stopsById]);

  useEffect(() => {
    const map = mapRef.current;
    const mapgl = mapglRef.current;
    if (!map || !mapgl) return;

    destroyObjects(pointMarkersRef.current);
    pointMarkersRef.current = routePoints.map((point) => {
      const isScanned = scannedPointIds.includes(point._id);
      const statusClass = isScanned ? 'is-done' : 'is-pending';
      return new mapgl.HtmlMarker(map, {
        coordinates: [point.lng, point.lat],
        html: `
          <button
            type="button"
            class="nrz-map-pin ${statusClass}"
            data-point-id="${point._id}"
            aria-label="${point.name}"
          >
            <span class="nrz-map-pin__dot"></span>
            <span class="nrz-map-pin__shadow"></span>
          </button>
        `
      });
    });

    return () => {
      destroyObjects(pointMarkersRef.current);
      pointMarkersRef.current = [];
    };
  }, [routePoints, scannedPointIds]);

  useEffect(() => {
    const map = mapRef.current;
    const mapgl = mapglRef.current;
    if (!map || !mapgl) return;

    destroyObjects(stopMarkersRef.current);
    stopMarkersRef.current = placedStops.map(({ stop }) => {
      const safeName = String(stop.name || 'Остановка').replace(/"/g, '&quot;');
      return new mapgl.HtmlMarker(map, {
        coordinates: [stop.lng, stop.lat],
        html: `
          <button
            type="button"
            class="nrz-map-stop"
            data-stop-id="${stop._id}"
            aria-label="${safeName}"
          >
            ${safeName}
          </button>
        `
      });
    });

    return () => {
      destroyObjects(stopMarkersRef.current);
      stopMarkersRef.current = [];
    };
  }, [placedStops]);

  useEffect(() => {
    const map = mapRef.current;
    const mapgl = mapglRef.current;
    if (!map || !mapgl) return;

    destroyObjects([routeLineRef.current]);
    routeLineRef.current = null;

    if (!routeGeometry.length) return undefined;

    routeLineRef.current = new mapgl.Polyline(map, {
      coordinates: routeGeometry,
      color: '#2563eb',
      width: 6
    });

    return () => {
      destroyObjects([routeLineRef.current]);
      routeLineRef.current = null;
    };
  }, [routeGeometry]);

  useEffect(() => {
    const map = mapRef.current;
    const mapgl = mapglRef.current;
    if (!map || !mapgl) return;

    destroyObjects([userMarkerRef.current]);
    userMarkerRef.current = null;

    if (!userLocation) return undefined;

    const markerHtml = routingOrigin
      ? '<div class="nrz-map-user is-routing-origin"><span></span></div>'
      : '<div class="nrz-map-user"><span></span></div>';

    userMarkerRef.current = new mapgl.HtmlMarker(map, {
      coordinates: [userLocation.lng, userLocation.lat],
      html: markerHtml
    });

    return () => {
      destroyObjects([userMarkerRef.current]);
      userMarkerRef.current = null;
    };
  }, [routingOrigin, userLocation]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const boundsSource =
      routeGeometry.length > 1
        ? routeGeometry
        : [
            ...routePoints.map((point) => [point.lng, point.lat]),
            ...placedStops.map(({ stop }) => [stop.lng, stop.lat]),
            ...(routingOrigin ? [[routingOrigin.lng, routingOrigin.lat]] : [])
          ];

    const signature = toSignature(boundsSource);
    if (!signature || fittedSignatureRef.current === signature) return;

    const bounds = buildBounds(boundsSource);
    if (!bounds) return;

    fittedSignatureRef.current = signature;
    map.fitBounds(bounds, {
      padding: { top: 72, bottom: 72, left: 56, right: 56 },
      maxZoom: 16
    });
  }, [placedStops, routeGeometry, routePoints, routingOrigin]);

  if (!mapKey) {
    return (
      <div className="naryazan-map flex items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600">
        Карта временно недоступна. Остальная часть страницы продолжит работать.
      </div>
    );
  }

  return (
    <div className="relative">
      <div ref={containerRef} className="naryazan-map" />
      {mapError && (
        <div className="absolute inset-x-4 top-4 rounded-2xl bg-white/95 p-3 text-sm text-slate-700 shadow-sm ring-1 ring-slate-200">
          {mapError}
        </div>
      )}
    </div>
  );
};

export default YandexMap;
