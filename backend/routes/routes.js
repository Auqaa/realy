const express = require('express');
const router = express.Router();
const { getDb } = require('../storage/fileDb');

const deriveThemes = (route, points) => {
  const source = [route.name, route.description, ...points.map((point) => `${point.name} ${point.description || ''} ${point.address || ''}`)]
    .join(' ')
    .toLowerCase();
  const themes = new Set();

  if (
    source.includes('музей') ||
    source.includes('кремл') ||
    source.includes('собор') ||
    source.includes('истор') ||
    source.includes('памятник')
  ) {
    themes.add('history');
    themes.add('popular');
  }

  if (source.includes('набереж') || source.includes('река') || source.includes('трубеж') || source.includes('вода')) {
    themes.add('water');
  }

  if (source.includes('парк') || source.includes('сад') || source.includes('бульвар')) {
    themes.add('parks');
  }

  if (!themes.size) {
    themes.add('popular');
  }

  return Array.from(themes);
};

const estimateDistanceKm = (points) => {
  if (points.length < 2) return 0;

  const total = points.reduce((sum, point, index) => {
    if (index === 0) return sum;
    const prev = points[index - 1];
    const dx = (point.lat - prev.lat) * 111;
    const dy = (point.lng - prev.lng) * 71;
    return sum + Math.sqrt(dx * dx + dy * dy);
  }, 0);

  return Number((total * 1.18).toFixed(1));
};

const estimateDurationMinutes = (distanceKm) => Math.max(10, Math.round((distanceKm / 4.4) * 60));

const decorateRoute = (route, points, db) => {
  const distanceKm = route.distanceKm || estimateDistanceKm(points);
  const durationMinutes = route.durationMinutes || estimateDurationMinutes(distanceKm);

  return {
    ...route,
    points,
    pointCount: points.length,
    themes: route.themes || deriveThemes(route, points),
    distanceKm,
    durationMinutes,
    optionalStops: db.optionalStops || []
  };
};

router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const pointsById = new Map(db.points.map((p) => [p._id, p]));
    const routes = db.routes.map((route) => {
      const points = (route.points || [])
        .map((id, index) => {
          const point = pointsById.get(id);
          return point ? { ...point, order: index + 1 } : null;
        })
        .filter(Boolean);
      return decorateRoute(route, points, db);
    });
    res.json(routes);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

router.get('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const route = db.routes.find((r) => r._id === req.params.id);
    if (!route) return res.status(404).json({ msg: 'Route not found' });

    const pointsById = new Map(db.points.map((p) => [p._id, p]));
    const points = (route.points || [])
      .map((id, index) => {
        const point = pointsById.get(id);
        return point ? { ...point, order: index + 1 } : null;
      })
      .filter(Boolean);
    res.json(decorateRoute(route, points, db));
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

module.exports = router;
