const express = require('express');
const router = express.Router();
const { getDb } = require('../storage/fileDb');

router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    res.json(db.points);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

router.get('/:id/ask', async (req, res) => {
  try {
    const db = await getDb();
    const point = db.points.find((p) => p._id === req.params.id);
    if (!point) return res.status(404).json({ msg: 'Point not found' });
    res.json(point.facts || []);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

module.exports = router;
