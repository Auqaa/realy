const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getDb, withDb } = require('../storage/fileDb');

const mapRoutePreview = (route) =>
  route
    ? {
        _id: route._id,
        name: route.name,
        description: route.description,
        image: route.image || '',
        themes: route.themes || []
      }
    : null;

router.get('/me', auth, async (req, res) => {
  try {
    const db = await getDb();
    const user = db.users.find((u) => u._id === req.user.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    const completedRoutes = (user.completedRoutes || [])
      .map((routeId) => db.routes.find((r) => r._id === routeId))
      .filter(Boolean)
      .map((r) => ({ _id: r._id, name: r.name }));

    const scannedPoints = (user.scannedPoints || [])
      .map((pointId) => db.points.find((p) => p._id === pointId))
      .filter(Boolean)
      .map((p) => ({ _id: p._id, name: p.name }));

    const favoriteRoutes = (user.favoriteRoutes || [])
      .map((routeId) => mapRoutePreview(db.routes.find((route) => route._id === routeId)))
      .filter(Boolean);

    // Не отдаём хэш пароля.
    const { password, ...safeUser } = user;
    const verification = {
      email: {
        verified: safeUser.verification?.email?.verified ?? Boolean(safeUser.email)
      },
      phone: {
        verified: safeUser.verification?.phone?.verified ?? Boolean(safeUser.phone)
      }
    };

    res.json({
      ...safeUser,
      role: safeUser.role || 'User',
      favoriteRoutes,
      savedRoutes: favoriteRoutes,
      completedRoutes,
      scannedPoints,
      verification
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

router.get('/leaderboard', async (req, res) => {
  try {
    const db = await getDb();
    const users = db.users
      .slice()
      .filter((user) => !user.hideFromLeaderboard)
      .map((u) => ({ _id: u._id, name: u.name, balance: u.balance }))
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 10);
    res.json(users);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

router.patch('/me', auth, async (req, res) => {
  try {
    const db = await getDb();
    const user = db.users.find((item) => item._id === req.user.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    const nextName = String(req.body.name || user.name).trim();
    const hideFromLeaderboard =
      typeof req.body.hideFromLeaderboard === 'boolean' ? req.body.hideFromLeaderboard : Boolean(user.hideFromLeaderboard);
    const nextAvatar =
      typeof req.body.avatar === 'string'
        ? req.body.avatar.trim()
        : typeof user.avatar === 'string'
          ? user.avatar
          : '';

    if (nextAvatar && nextAvatar.length > 2_000_000) {
      return res.status(400).json({ msg: 'Файл аватарки слишком большой' });
    }

    await withDb(async (innerDb) => {
      const innerUser = innerDb.users.find((item) => item._id === req.user.id);
      if (!innerUser) return;
      innerUser.name = nextName || innerUser.name;
      innerUser.hideFromLeaderboard = hideFromLeaderboard;
      innerUser.avatar = nextAvatar;
    });

    const updatedDb = await getDb();
    const updatedUser = updatedDb.users.find((item) => item._id === req.user.id);
    const favoriteRoutes = (updatedUser.favoriteRoutes || [])
      .map((routeId) => mapRoutePreview(updatedDb.routes.find((route) => route._id === routeId)))
      .filter(Boolean);

    res.json({
      success: true,
      user: {
        ...updatedUser,
        completedRoutes: (updatedUser.completedRoutes || [])
          .map((routeId) => mapRoutePreview(updatedDb.routes.find((route) => route._id === routeId)))
          .filter(Boolean),
        favoriteRoutes,
        savedRoutes: favoriteRoutes
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

router.post('/favorites/:routeId', auth, async (req, res) => {
  try {
    const db = await getDb();
    const user = db.users.find((item) => item._id === req.user.id);
    const route = db.routes.find((item) => item._id === req.params.routeId);

    if (!user) return res.status(404).json({ msg: 'User not found' });
    if (!route) return res.status(404).json({ msg: 'Route not found' });

    const currentFavoriteRoutes = user.favoriteRoutes || [];
    const alreadyFavorite = currentFavoriteRoutes.includes(route._id);

    await withDb(async (innerDb) => {
      const innerUser = innerDb.users.find((item) => item._id === req.user.id);
      if (!innerUser) return;

      innerUser.favoriteRoutes = innerUser.favoriteRoutes || [];
      if (alreadyFavorite) {
        innerUser.favoriteRoutes = innerUser.favoriteRoutes.filter((routeId) => routeId !== route._id);
      } else {
        innerUser.favoriteRoutes.push(route._id);
      }
    });

    const updatedDb = await getDb();
    const updatedUser = updatedDb.users.find((item) => item._id === req.user.id);
    const favoriteRoutes = (updatedUser.favoriteRoutes || [])
      .map((routeId) => mapRoutePreview(updatedDb.routes.find((item) => item._id === routeId)))
      .filter(Boolean);

    res.json({
      success: true,
      isFavorite: !alreadyFavorite,
      favoriteRoutes,
      savedRoutes: favoriteRoutes
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

module.exports = router;
