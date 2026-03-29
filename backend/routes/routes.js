const crypto = require('crypto');
const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const { getDb, withDb } = require('../storage/fileDb');

const router = express.Router();
const makeId = () => crypto.randomUUID();

const deriveThemes = (route, points) => {
  const source = [route.name, route.description, route.category, ...points.map((point) => `${point.name} ${point.description || ''} ${point.address || ''}`)]
    .join(' ')
    .toLowerCase();
  const themes = new Set();

  if (
    source.includes('музе') ||
    source.includes('кремл') ||
    source.includes('собор') ||
    source.includes('истор') ||
    source.includes('памятник')
  ) {
    themes.add('history');
    themes.add('popular');
  }

  if (source.includes('набереж') || source.includes('река') || source.includes('трубеж') || source.includes('вод')) {
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
  const orderedPoints = points.slice().sort((left, right) => (left.order || 0) - (right.order || 0));
  const distanceKm = route.distanceKm || estimateDistanceKm(orderedPoints);
  const durationMinutes = route.durationMinutes || estimateDurationMinutes(distanceKm);

  return {
    ...route,
    points: orderedPoints,
    pointCount: orderedPoints.length,
    themes: route.themes || deriveThemes(route, orderedPoints),
    distanceKm,
    durationMinutes,
    optionalStops: db.optionalStops || []
  };
};

const pointsForRoute = (db, route) => {
  const pointsById = new Map(db.points.map((point) => [point._id, point]));
  return (route.points || [])
    .map((id, index) => {
      const point = pointsById.get(id);
      if (!point) return null;
      return {
        ...point,
        order: Number.isFinite(point.order) ? point.order : index + 1
      };
    })
    .filter(Boolean)
    .sort((left, right) => (left.order || 0) - (right.order || 0));
};

const sanitizeText = (value) => String(value || '').trim();
const parseCoordinate = (value) => Number(value);

const makeQrValue = ({ routeId, waypointId, name, fallback }) => {
  const base = sanitizeText(fallback || name)
    .toLowerCase()
    .replace(/[^a-zа-яё0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);

  return [routeId, base || 'point', waypointId.slice(0, 8)].join('-');
};

const normalizeWaypointPayload = (routeId, waypoint, index, currentPoint) => {
  const pointId = currentPoint?._id || makeId();
  const name = sanitizeText(waypoint.name || waypoint.title);
  const description = sanitizeText(waypoint.description);
  const address = sanitizeText(waypoint.address);
  const lat = parseCoordinate(waypoint.lat);
  const lng = parseCoordinate(waypoint.lng);
  const waypointType = waypoint.waypointType === 'qr' ? 'qr' : 'regular';
  const qrCodeImage = sanitizeText(waypoint.qrCodeImage || currentPoint?.qrCodeImage || '');
  const image = sanitizeText(waypoint.image || currentPoint?.image || '');
  const qrCodeValue =
    sanitizeText(waypoint.qrCodeValue || currentPoint?.qrCodeValue) ||
    makeQrValue({ routeId, waypointId: pointId, name, fallback: currentPoint?.name });

  return {
    _id: pointId,
    name,
    address,
    description,
    lat,
    lng,
    qrCodeValue,
    qrCodeImage,
    reward: Number(currentPoint?.reward || 10),
    routeId,
    order: Number.isFinite(Number(waypoint.order)) ? Number(waypoint.order) : index + 1,
    facts: Array.isArray(currentPoint?.facts) ? currentPoint.facts : [],
    image,
    guideText: currentPoint?.guideText || '',
    guideAudioUrl: currentPoint?.guideAudioUrl || '',
    quiz: currentPoint?.quiz || undefined,
    puzzlePieceCount: currentPoint?.puzzlePieceCount,
    waypointType
  };
};

const ensureUniqueQrValues = (db, routeId, points) => {
  const nextValues = new Set();

  for (const point of points) {
    if (nextValues.has(point.qrCodeValue)) {
      return `Duplicate qrCodeValue inside route: ${point.qrCodeValue}`;
    }
    nextValues.add(point.qrCodeValue);
  }

  const conflict = db.points.find(
    (point) => point.routeId !== routeId && nextValues.has(point.qrCodeValue)
  );

  return conflict ? `QR value already used by another waypoint: ${conflict.qrCodeValue}` : null;
};

const validateRoutePayload = [
  body('name').isString().trim().isLength({ min: 2 }),
  body('description').optional({ checkFalsy: true }).isString(),
  body('category').isString().trim().isLength({ min: 2 }),
  body('image').optional({ checkFalsy: true }).isString(),
  body('waypoints').isArray({ min: 1 }),
  body('waypoints.*.name').isString().trim().isLength({ min: 2 }),
  body('waypoints.*.description').optional({ checkFalsy: true }).isString(),
  body('waypoints.*.address').optional({ checkFalsy: true }).isString(),
  body('waypoints.*.image').optional({ checkFalsy: true }).isString(),
  body('waypoints.*.qrCodeValue').optional({ checkFalsy: true }).isString(),
  body('waypoints.*._id').optional({ checkFalsy: true }).isString(),
  body('waypoints.*.lat').isFloat({ min: -90, max: 90 }),
  body('waypoints.*.lng').isFloat({ min: -180, max: 180 }),
  body('waypoints.*.order').isInt({ min: 1 }),
  body('waypoints.*.waypointType').isIn(['regular', 'qr']),
  body('waypoints').custom((waypoints) => {
    const usedOrders = new Set();
    for (const waypoint of waypoints) {
      const order = Number(waypoint.order);
      if (usedOrders.has(order)) {
        throw new Error('Waypoint order must be unique');
      }
      usedOrders.add(order);

      if (waypoint.waypointType === 'qr') {
        const qrCodeValue = sanitizeText(waypoint.qrCodeValue);
        if (!qrCodeValue) {
          throw new Error('QR waypoint requires qrCodeValue');
        }
      }

      if (sanitizeText(waypoint.qrCodeImage).length > 2_000_000) {
        throw new Error('QR image is too large');
      }

      if (sanitizeText(waypoint.image).length > 4_000_000) {
        throw new Error('Waypoint image is too large');
      }
    }
    return true;
  }),
  body('image').custom((value) => {
    if (sanitizeText(value).length > 4_000_000) {
      throw new Error('Route image is too large');
    }
    return true;
  })
];

router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const routes = db.routes.map((route) => decorateRoute(route, pointsForRoute(db, route), db));
    res.json(routes);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

router.get('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const route = db.routes.find((item) => item._id === req.params.id);
    if (!route) return res.status(404).json({ msg: 'Route not found' });
    res.json(decorateRoute(route, pointsForRoute(db, route), db));
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

router.post('/admin', auth, auth.requireAdmin, validateRoutePayload, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const routeId = makeId();
    const db = await getDb();
    const orderedWaypoints = req.body.waypoints.slice().sort((left, right) => Number(left.order) - Number(right.order));
    const points = orderedWaypoints.map((waypoint, index) => normalizeWaypointPayload(routeId, waypoint, index, null));
    const qrConflict = ensureUniqueQrValues(db, routeId, points);
    if (qrConflict) {
      return res.status(400).json({ msg: qrConflict });
    }
    const route = {
      _id: routeId,
      name: sanitizeText(req.body.name),
      description: sanitizeText(req.body.description),
      category: sanitizeText(req.body.category),
      points: points.map((point) => point._id),
      totalReward: points.reduce((sum, point) => sum + Number(point.reward || 0), 0),
      image: sanitizeText(req.body.image),
      city: 'Рязань',
      themes: deriveThemes(req.body, points)
    };

    await withDb(async (db) => {
      db.routes.push(route);
      db.points.push(...points);
    });

    const updatedDb = await getDb();
    res.status(201).json(decorateRoute(route, pointsForRoute(updatedDb, route), updatedDb));
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Failed to create route' });
  }
});

router.put('/admin/:id', auth, auth.requireAdmin, validateRoutePayload, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const db = await getDb();
    const existingRoute = db.routes.find((item) => item._id === req.params.id);
    if (!existingRoute) {
      return res.status(404).json({ msg: 'Route not found' });
    }

    const existingPointsById = new Map(
      db.points.filter((point) => point.routeId === existingRoute._id).map((point) => [point._id, point])
    );
    const orderedWaypoints = req.body.waypoints.slice().sort((left, right) => Number(left.order) - Number(right.order));
    const nextPoints = orderedWaypoints.map((waypoint, index) =>
      normalizeWaypointPayload(existingRoute._id, waypoint, index, existingPointsById.get(waypoint._id))
    );
    const qrConflict = ensureUniqueQrValues(db, existingRoute._id, nextPoints);
    if (qrConflict) {
      return res.status(400).json({ msg: qrConflict });
    }
    const nextPointIds = new Set(nextPoints.map((point) => point._id));

    const nextRoute = {
      ...existingRoute,
      name: sanitizeText(req.body.name),
      description: sanitizeText(req.body.description),
      category: sanitizeText(req.body.category),
      image: sanitizeText(req.body.image || existingRoute.image),
      points: nextPoints.map((point) => point._id),
      totalReward: nextPoints.reduce((sum, point) => sum + Number(point.reward || 0), 0),
      themes: deriveThemes(req.body, nextPoints)
    };

    await withDb(async (innerDb) => {
      innerDb.routes = innerDb.routes.map((route) => (route._id === existingRoute._id ? nextRoute : route));
      innerDb.points = innerDb.points
        .filter((point) => point.routeId !== existingRoute._id || nextPointIds.has(point._id))
        .map((point) => {
          if (point.routeId !== existingRoute._id) return point;
          return nextPoints.find((item) => item._id === point._id) || point;
        });

      nextPoints.forEach((point) => {
        if (!innerDb.points.some((item) => item._id === point._id)) {
          innerDb.points.push(point);
        }
      });
    });

    const updatedDb = await getDb();
    res.json(decorateRoute(nextRoute, pointsForRoute(updatedDb, nextRoute), updatedDb));
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Failed to update route' });
  }
});

router.delete('/admin/:id', auth, auth.requireAdmin, async (req, res) => {
  try {
    const db = await getDb();
    const existingRoute = db.routes.find((item) => item._id === req.params.id);
    if (!existingRoute) {
      return res.status(404).json({ msg: 'Route not found' });
    }

    await withDb(async (innerDb) => {
      innerDb.routes = innerDb.routes.filter((route) => route._id !== existingRoute._id);
      innerDb.points = innerDb.points.filter((point) => point.routeId !== existingRoute._id);
      innerDb.users = innerDb.users.map((user) => ({
        ...user,
        completedRoutes: (user.completedRoutes || []).filter((routeId) => routeId !== existingRoute._id),
        favoriteRoutes: (user.favoriteRoutes || []).filter((routeId) => routeId !== existingRoute._id),
        scannedPoints: (user.scannedPoints || []).filter((pointId) => !existingRoute.points.includes(pointId))
      }));
    });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Failed to delete route' });
  }
});

module.exports = router;
