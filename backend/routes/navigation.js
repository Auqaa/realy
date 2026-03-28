const express = require('express');
const { body, validationResult } = require('express-validator');
const { getDb } = require('../storage/fileDb');
const {
  geocodeAddress,
  getPublicMapConfig,
  requestPedestrianRoute,
  searchPlaces
} = require('../services/navigation');

const router = express.Router();

router.get('/config', (req, res) => {
  res.json(getPublicMapConfig());
});

router.get('/stops', async (req, res) => {
  try {
    const db = await getDb();
    res.json(db.optionalStops || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Failed to load stops' });
  }
});

router.post(
  '/routing/pedestrian',
  [body('waypoints').isArray({ min: 2 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const route = await requestPedestrianRoute(req.body.waypoints);
      res.json(route);
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: 'Failed to build route' });
    }
  }
);

router.post(
  '/geocode',
  [body('q').isString().isLength({ min: 2 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const result = await geocodeAddress(req.body.q);
      res.json(result);
    } catch (err) {
      console.error(err);
      res.status(404).json({ msg: err.message || 'Address not found' });
    }
  }
);

router.post(
  '/places/search',
  [body('q').optional({ checkFalsy: true }).isString()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const location = req.body.location || undefined;
      const items = await searchPlaces({
        query: req.body.q,
        location,
        limit: Number(req.body.limit || 8)
      });
      res.json(items);
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: 'Failed to search places' });
    }
  }
);

module.exports = router;
