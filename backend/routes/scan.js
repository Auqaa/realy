const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getDb, withDb } = require('../storage/fileDb');

router.post('/', auth, async (req, res) => {
  const { qrValue } = req.body;
  try {
    const db = await getDb();
    const point = db.points.find((p) => p.qrCodeValue === qrValue);
    if (!point) return res.status(404).json({ msg: 'Invalid QR code' });

    const user = db.users.find((u) => u._id === req.user.id);
    if (!user) return res.status(401).json({ msg: 'User not found' });

    // Идемпотентно: чтобы офлайн-очередь синхронизировалась без повторных ошибок.
    if ((user.scannedPoints || []).includes(point._id)) {
      return res.json({ success: true, reward: 0, newBalance: user.balance, point });
    }

    let newBalance = user.balance;
    await withDb(async (innerDb) => {
      const innerUser = innerDb.users.find((u) => u._id === req.user.id);
      const innerPoint = innerDb.points.find((p) => p._id === point._id);
      if (!innerUser || !innerPoint) return;

      innerUser.balance += innerPoint.reward;
      innerUser.scannedPoints = innerUser.scannedPoints || [];
      innerUser.scannedPoints.push(innerPoint._id);

      // Один и тот же чекпоинт может участвовать в нескольких маршрутах,
      // поэтому проверяем завершение по всем маршрутам, а не по point.routeId.
      const completedRouteIds = (innerDb.routes || [])
        .filter((route) => (route.points || []).every((pid) => innerUser.scannedPoints.includes(pid)))
        .map((route) => route._id);

      innerUser.completedRoutes = Array.from(
        new Set([...(innerUser.completedRoutes || []), ...completedRouteIds])
      );

      newBalance = innerUser.balance;
    });

    res.json({ success: true, reward: point.reward, newBalance, point });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

module.exports = router;
